const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const rateLimit = require('express-rate-limit');

// Rate limiting for profile verification
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 verification attempts per windowMs
  message: 'Too many verification attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation middleware
const validateVerificationData = (req, res, next) => {
  const { username, email, phone, walletAddress, consentGiven } = req.body;

  // Check required fields
  if (!username || !email || !walletAddress || !consentGiven) {
    return res.status(400).json({
      message: 'Missing required fields: username, email, walletAddress, and consentGiven are required'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      message: 'Invalid email format'
    });
  }

  // Validate username (alphanumeric and underscore only, 3-20 characters)
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({
      message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores'
    });
  }

  // Validate wallet address (basic Solana address format)
  if (walletAddress.length < 32 || walletAddress.length > 44) {
    return res.status(400).json({
      message: 'Invalid wallet address format'
    });
  }

  // Validate phone number if provided (basic international format)
  if (phone && phone.trim() !== '') {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return res.status(400).json({
        message: 'Invalid phone number format'
      });
    }
  }

  // Sanitize input data
  req.sanitizedData = {
    username: username.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : null,
    walletAddress: walletAddress.trim(),
    consentGiven: Boolean(consentGiven)
  };

  next();
};

// POST /api/profile/verify - Submit user verification data
router.post('/verify', verificationLimiter, validateVerificationData, async (req, res) => {
  const { username, email, phone, walletAddress, consentGiven } = req.sanitizedData;

  try {
    const connection = await pool.getConnection();

    try {
      // Check if username already exists
      const [usernameCheck] = await connection.execute(
        'SELECT id FROM user_verifications WHERE username = ?',
        [username]
      );

      if (usernameCheck.length > 0) {
        return res.status(409).json({
          message: 'Username already exists. Please choose a different username.'
        });
      }

      // Check if email already exists
      const [emailCheck] = await connection.execute(
        'SELECT id FROM user_verifications WHERE email = ?',
        [email]
      );

      if (emailCheck.length > 0) {
        return res.status(409).json({
          message: 'Email address already exists. Please use a different email.'
        });
      }

      // Check if wallet address already exists
      const [walletCheck] = await connection.execute(
        'SELECT id FROM user_verifications WHERE wallet_address = ?',
        [walletAddress]
      );

      if (walletCheck.length > 0) {
        return res.status(409).json({
          message: 'Wallet address already verified. This wallet is already associated with a verified account.'
        });
      }

      // Insert new verification record
      const [result] = await connection.execute(
        `INSERT INTO user_verifications 
         (username, email, phone_number, wallet_address, consent_given, verification_status, created_at) 
         VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
        [username, email, phone, walletAddress, consentGiven]
      );

      console.log(`New user verification submitted: ${username} (${email}) - Wallet: ${walletAddress}`);

      res.status(201).json({
        message: 'Verification data submitted successfully',
        verificationId: result.insertId,
        status: 'pending'
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error submitting verification:', error);
    
    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'A record with this information already exists'
      });
    }

    res.status(500).json({
      message: 'Internal server error. Please try again later.'
    });
  }
});

// GET /api/profile/status/:walletAddress - Check verification status
router.get('/status/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;

  if (!walletAddress || walletAddress.length < 32 || walletAddress.length > 44) {
    return res.status(400).json({
      message: 'Invalid wallet address format'
    });
  }

  try {
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.execute(
        'SELECT username, email, verification_status, created_at FROM user_verifications WHERE wallet_address = ?',
        [walletAddress]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          message: 'No verification record found for this wallet address'
        });
      }

      const verification = rows[0];
      res.json({
        username: verification.username,
        email: verification.email,
        status: verification.verification_status,
        submittedAt: verification.created_at
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({
      message: 'Internal server error. Please try again later.'
    });
  }
});

// GET /api/profile/verifications - Get all verifications (admin endpoint)
router.get('/verifications', async (req, res) => {
  try {
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.execute(
        `SELECT id, username, email, phone_number, wallet_address, verification_status, created_at 
         FROM user_verifications 
         ORDER BY created_at DESC`
      );

      res.json({
        verifications: rows,
        total: rows.length
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error fetching verifications:', error);
    res.status(500).json({
      message: 'Internal server error. Please try again later.'
    });
  }
});

// PUT /api/profile/verifications/:id/status - Update verification status (admin endpoint)
router.put('/verifications/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      message: 'Invalid status. Must be one of: pending, approved, rejected'
    });
  }

  try {
    const connection = await pool.getConnection();

    try {
      const [result] = await connection.execute(
        'UPDATE user_verifications SET verification_status = ?, updated_at = NOW() WHERE id = ?',
        [status, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: 'Verification record not found'
        });
      }

      res.json({
        message: 'Verification status updated successfully',
        status: status
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error updating verification status:', error);
    res.status(500).json({
      message: 'Internal server error. Please try again later.'
    });
  }
});

module.exports = router;
