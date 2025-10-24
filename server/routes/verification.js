const express = require('express');
const router = express.Router();

// In-memory store for demo purposes
// In production, this would be replaced with a real database
const verificationStore = new Map();

// GET /api/verification/status
router.get('/status', (req, res) => {
  try {
    // For demo, use a default user ID
    // In production, this would come from authentication
    const userId = req.headers['x-user-id'] || 'demo-user-1';
    
    const verification = verificationStore.get(userId);
    
    if (verification) {
      res.json({
        verified: verification.verified,
        lastVerifiedAt: verification.lastVerifiedAt,
        snapshotHash: verification.snapshotHash
      });
    } else {
      res.json({
        verified: false,
        lastVerifiedAt: null,
        snapshotHash: null
      });
    }
  } catch (error) {
    console.error('Error getting verification status:', error);
    res.status(500).json({ error: 'Failed to get verification status' });
  }
});

// POST /api/verification/complete
router.post('/complete', (req, res) => {
  try {
    const { verified, snapshotHash, timestamp, userId } = req.body;
    
    // Validate required fields
    if (typeof verified !== 'boolean') {
      return res.status(400).json({ error: 'verified field is required and must be boolean' });
    }
    
    if (!timestamp) {
      return res.status(400).json({ error: 'timestamp field is required' });
    }
    
    // For demo, use provided userId or default
    const finalUserId = userId || 'demo-user-1';
    
    // Store verification result
    verificationStore.set(finalUserId, {
      verified,
      lastVerifiedAt: timestamp,
      snapshotHash: snapshotHash || null
    });
    
    console.log(`Verification completed for user ${finalUserId}:`, {
      verified,
      timestamp,
      hasSnapshotHash: !!snapshotHash
    });
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error completing verification:', error);
    res.status(500).json({ error: 'Failed to complete verification' });
  }
});

// GET /api/verification/clear (for testing purposes)
router.get('/clear', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'demo-user-1';
    verificationStore.delete(userId);
    res.json({ ok: true, message: 'Verification data cleared' });
  } catch (error) {
    console.error('Error clearing verification:', error);
    res.status(500).json({ error: 'Failed to clear verification' });
  }
});

module.exports = router;