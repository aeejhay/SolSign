const express = require('express');
const multer = require('multer');
const crypto = require('crypto');

// Minimal in-memory storage with size limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'pdf') {
      if (file.mimetype === 'application/pdf') return cb(null, true);
      return cb(new Error('Only PDF is allowed for pdf field'));
    }
    if (file.fieldname === 'signatureImage') {
      if (['image/png', 'image/jpeg'].includes(file.mimetype)) return cb(null, true);
      return cb(new Error('Signature image must be PNG or JPEG'));
    }
    cb(null, true);
  }
});

const router = express.Router();

// Stub implementation: echoes back a hash of the uploaded PDF and returns the same PDF as base64
router.post('/sign-document', upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'signatureImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const pdfFile = req.files?.pdf?.[0];
    if (!pdfFile) return res.status(400).json({ message: 'Missing pdf' });

    // In a future step: place visible signature with pdf-lib and apply digital signature
    const pdfBuffer = Buffer.from(pdfFile.buffer);
    const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    const signedPdfBase64 = pdfBuffer.toString('base64');

    // Echo back minimal meta
    const placement = (() => {
      try { return JSON.parse(req.body.placement || '{}'); } catch { return {}; }
    })();
    const pageNumber = Number(req.body.pageNumber || 1);

    res.json({
      signedPdfBase64,
      sha256,
      meta: { pageNumber, placement }
    });
  } catch (err) {
    console.error('sign-document error:', err);
    res.status(500).json({ message: 'Failed to sign document' });
  }
});

module.exports = router;


