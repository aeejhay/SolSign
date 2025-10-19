const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { generateVerificationCode, sendVerificationCode, sendVerificationSuccess } = require('../services/emailService');
const { transferSOLSIGNTokens } = require('../services/tokenTransferService');
const rateLimit = require('express-rate-limit');

// Rate limiting for profile verification
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 verification attempts per windowMs
  message: 'Too many verification attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for code verification
const codeVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 code verification attempts per windowMs
  message: 'Too many code verification attempts. Please try again later.',
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

// POST /api/profile/verify - Submit user verification data and send email code
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

      // Generate verification code
      const verificationCode = generateVerificationCode();
      const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

      // Insert new verification record
      const [result] = await connection.execute(
        `INSERT INTO user_verifications 
         (username, email, phone_number, wallet_address, consent_given, verification_status, verification_code, code_expires_at, created_at) 
         VALUES (?, ?, ?, ?, ?, 'code_sent', ?, ?, NOW())`,
        [username, email, phone, walletAddress, consentGiven, verificationCode, codeExpiresAt]
      );

      // Send verification email
      const emailResult = await sendVerificationCode(email, username, verificationCode);
      
      if (!emailResult.success) {
        // If email fails, update status back to pending
        await connection.execute(
          'UPDATE user_verifications SET verification_status = ? WHERE id = ?',
          ['pending', result.insertId]
        );
        
        return res.status(500).json({
          message: 'Failed to send verification email. Please try again later.'
        });
      }

      console.log(`New user verification submitted: ${username} (${email}) - Wallet: ${walletAddress} - Code sent`);

      res.status(201).json({
        message: 'Verification code sent to your email. Please check your inbox and enter the code to complete verification.',
        verificationId: result.insertId,
        status: 'code_sent',
        emailSent: true
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

// POST /api/profile/verify-code - Verify the email code
router.post('/verify-code', codeVerificationLimiter, async (req, res) => {
  const { verificationCode, walletAddress } = req.body;

  if (!verificationCode || !walletAddress) {
    return res.status(400).json({
      message: 'Verification code and wallet address are required'
    });
  }

  if (verificationCode.length !== 6 || !/^\d{6}$/.test(verificationCode)) {
    return res.status(400).json({
      message: 'Verification code must be a 6-digit number'
    });
  }

  try {
    const connection = await pool.getConnection();

    try {
      // Find the verification record
      const [rows] = await connection.execute(
        `SELECT id, username, email, verification_code, code_expires_at, verification_status, tokens_rewarded 
         FROM user_verifications 
         WHERE wallet_address = ? AND verification_status = 'code_sent'`,
        [walletAddress]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          message: 'No pending verification found for this wallet address'
        });
      }

      const verification = rows[0];

      // Check if code has expired
      if (new Date() > new Date(verification.code_expires_at)) {
        return res.status(400).json({
          message: 'Verification code has expired. Please request a new code.'
        });
      }

      // Check if code matches
      if (verification.verification_code !== verificationCode) {
        return res.status(400).json({
          message: 'Invalid verification code. Please check and try again.'
        });
      }

      // Check if tokens have already been rewarded
      if (verification.tokens_rewarded) {
        return res.status(400).json({
          message: 'Tokens have already been rewarded for this verification.'
        });
      }

      // Transfer SOLSIGN tokens to user's wallet
      console.log(`🎁 Transferring 8 SOLSIGN tokens to ${walletAddress}...`);
      const transferResult = await transferSOLSIGNTokens(walletAddress, 8);

      if (!transferResult.success) {
        console.error('❌ Token transfer failed:', transferResult.error);
        return res.status(500).json({
          message: 'Email verification successful, but token transfer failed. Please contact support.',
          status: 'verified',
          username: verification.username,
          email: verification.email,
          transferError: transferResult.error
        });
      }

      // Update verification status and token transfer info
      await connection.execute(
        `UPDATE user_verifications 
         SET verification_status = ?, tokens_rewarded = ?, transaction_signature = ?, transaction_explorer_url = ?, updated_at = NOW() 
         WHERE id = ?`,
        ['verified', true, transferResult.signature, transferResult.explorerUrl, verification.id]
      );

      // Send success email
      await sendVerificationSuccess(verification.email, verification.username, 8);

      console.log(`✅ User verification completed: ${verification.username} (${verification.email}) - Wallet: ${walletAddress}`);
      console.log(`🔗 Transaction: ${transferResult.signature}`);

      res.json({
        message: 'Email verification successful! Welcome to SolSign!',
        status: 'verified',
        username: verification.username,
        email: verification.email,
        rewardAmount: 8,
        rewardMessage: '8 SOLSIGN tokens have been sent to your wallet as a welcome reward!',
        transactionSignature: transferResult.signature,
        explorerUrl: transferResult.explorerUrl
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({
      message: 'Internal server error. Please try again later.'
    });
  }
});

// POST /api/profile/resend-code - Resend verification code
router.post('/resend-code', verificationLimiter, async (req, res) => {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({
      message: 'Wallet address is required'
    });
  }

  try {
    const connection = await pool.getConnection();

    try {
      // Find the verification record
      const [rows] = await connection.execute(
        `SELECT id, username, email, verification_status 
         FROM user_verifications 
         WHERE wallet_address = ? AND verification_status = 'code_sent'`,
        [walletAddress]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          message: 'No pending verification found for this wallet address'
        });
      }

      const verification = rows[0];

      // Generate new verification code
      const verificationCode = generateVerificationCode();
      const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

      // Update the verification record with new code
      await connection.execute(
        'UPDATE user_verifications SET verification_code = ?, code_expires_at = ?, updated_at = NOW() WHERE id = ?',
        [verificationCode, codeExpiresAt, verification.id]
      );

      // Send new verification email
      const emailResult = await sendVerificationCode(verification.email, verification.username, verificationCode);
      
      if (!emailResult.success) {
        return res.status(500).json({
          message: 'Failed to resend verification email. Please try again later.'
        });
      }

      console.log(`Verification code resent to: ${verification.email}`);

      res.json({
        message: 'New verification code sent to your email.',
        status: 'code_sent'
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error resending code:', error);
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
        'SELECT username, email, verification_status, tokens_rewarded, reward_amount, transaction_signature, transaction_explorer_url, created_at FROM user_verifications WHERE wallet_address = ?',
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
        tokensRewarded: verification.tokens_rewarded,
        rewardAmount: verification.reward_amount,
        transactionSignature: verification.transaction_signature,
        explorerUrl: verification.transaction_explorer_url,
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
        `SELECT id, username, email, phone_number, wallet_address, verification_status, tokens_rewarded, reward_amount, created_at 
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

module.exports = router;