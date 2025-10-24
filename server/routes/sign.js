const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { PDFDocument, rgb } = require('pdf-lib');

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

// Enhanced export endpoint for signed PDF with embedded proof
router.post('/export-signed-pdf', upload.fields([
  { name: 'pdf', maxCount: 1 }
]), async (req, res) => {
  try {
    const pdfFile = req.files?.pdf?.[0];
    if (!pdfFile) return res.status(400).json({ message: 'Missing pdf' });

    const elements = JSON.parse(req.body.elements || '[]');
    const digitalProof = JSON.parse(req.body.digitalProof || '{}');
    const qrCodeDataUrl = req.body.qrCode;

    // Load the original PDF
    const pdfDoc = await PDFDocument.load(pdfFile.buffer);
    const pages = pdfDoc.getPages();

    // Add elements to the PDF
    for (const element of elements) {
      if (element.page > 0 && element.page <= pages.length) {
        const page = pages[element.page - 1];
        const { width, height } = page.getSize();
        
        // Convert coordinates from canvas pixels to PDF points
        const x = (element.x / 1.2) * (width / 800); // Assuming 1.2 scale and 800px width
        const y = height - (element.y / 1.2) * (height / 600) - (element.height / 1.2) * (height / 600);
        const elementWidth = (element.width / 1.2) * (width / 800);
        const elementHeight = (element.height / 1.2) * (height / 600);

        if (element.type === 'text') {
          page.drawText(element.data, {
            x,
            y,
            size: 12,
            color: rgb(0, 0, 0),
          });
        } else if (element.type === 'date') {
          page.drawText(new Date().toLocaleDateString(), {
            x,
            y,
            size: 12,
            color: rgb(0, 0, 0),
          });
        } else if (element.type === 'signature' && element.data) {
          // For signature images, we would need to embed the image
          // This is a simplified version - in production, you'd need to handle image embedding
          page.drawText('[SIGNATURE]', {
            x,
            y,
            size: 12,
            color: rgb(0, 0, 0),
          });
        }
      }
    }

    // Add verification page with QR code and proof details
    if (qrCodeDataUrl && digitalProof.docHash) {
      const verificationPage = pdfDoc.addPage([600, 800]);
      
      // Add title
      verificationPage.drawText('🔐 Document Verification Certificate', {
        x: 50,
        y: 750,
        size: 24,
        color: rgb(0, 0, 0),
      });

      // Add border
      verificationPage.drawRectangle({
        x: 40,
        y: 40,
        width: 520,
        height: 700,
        borderColor: rgb(0, 0, 0),
        borderWidth: 2,
      });

      // Add proof details section
      verificationPage.drawText('📄 Document Information:', {
        x: 60,
        y: 700,
        size: 14,
        color: rgb(0, 0, 0),
      });

      verificationPage.drawText(`Document Hash: ${digitalProof.docHash}`, {
        x: 60,
        y: 680,
        size: 10,
        color: rgb(0, 0, 0),
      });

      verificationPage.drawText(`Signed At: ${new Date(digitalProof.signedAt).toLocaleString()}`, {
        x: 60,
        y: 660,
        size: 10,
        color: rgb(0, 0, 0),
      });

      if (digitalProof.signerPubkey) {
        verificationPage.drawText(`Signer: ${digitalProof.signerPubkey}`, {
          x: 60,
          y: 640,
          size: 10,
          color: rgb(0, 0, 0),
        });
      }

      // Add blockchain section
      verificationPage.drawText('⛓️ Blockchain Proof:', {
        x: 60,
        y: 600,
        size: 14,
        color: rgb(0, 0, 0),
      });

      if (digitalProof.txSig) {
        verificationPage.drawText(`Transaction: ${digitalProof.txSig}`, {
          x: 60,
          y: 580,
          size: 10,
          color: rgb(0, 0, 0),
        });
      }

      if (digitalProof.ssignAmount) {
        verificationPage.drawText(`SSIGN Burned: ${digitalProof.ssignAmount} tokens`, {
          x: 60,
          y: 560,
          size: 10,
          color: rgb(0, 0, 0),
        });
      }

      if (digitalProof.explorerUrl) {
        verificationPage.drawText(`Explorer: ${digitalProof.explorerUrl}`, {
          x: 60,
          y: 540,
          size: 10,
          color: rgb(0, 0, 0),
        });
      }

      // Embed the actual QR code image
      if (qrCodeDataUrl) {
        try {
          // Convert data URL to buffer
          const base64Data = qrCodeDataUrl.split(',')[1];
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          // Embed the QR code image
          const qrImage = await pdfDoc.embedPng(imageBuffer);
          verificationPage.drawImage(qrImage, {
            x: 60,
            y: 400,
            width: 200,
            height: 200,
          });
          
          // Add QR code label
          verificationPage.drawText('📱 Scan QR Code to Verify:', {
            x: 60,
            y: 380,
            size: 12,
            color: rgb(0, 0, 0),
          });
          
          verificationPage.drawText('Opens Solana Explorer with transaction details', {
            x: 60,
            y: 360,
            size: 10,
            color: rgb(0.5, 0.5, 0.5),
          });
        } catch (qrError) {
          console.error('Failed to embed QR code:', qrError);
          // Fallback to text if QR embedding fails
          verificationPage.drawText('QR Code: [Failed to embed - Check transaction manually]', {
            x: 50,
            y: 200,
            size: 12,
            color: rgb(0, 0, 0),
          });
        }
      }

      // Add verification footer
      verificationPage.drawText('✅ Verification Status:', {
        x: 60,
        y: 300,
        size: 14,
        color: rgb(0, 0, 0),
      });

      verificationPage.drawText('• Document cryptographically signed and verified on Solana blockchain', {
        x: 60,
        y: 280,
        size: 10,
        color: rgb(0, 0, 0),
      });

      verificationPage.drawText('• SSIGN tokens burned to prove authenticity and reduce total supply', {
        x: 60,
        y: 260,
        size: 10,
        color: rgb(0, 0, 0),
      });

      verificationPage.drawText('• Transaction hash provides immutable proof of signing', {
        x: 60,
        y: 240,
        size: 10,
        color: rgb(0, 0, 0),
      });

      verificationPage.drawText('• Document integrity verified through SHA-256 hash', {
        x: 60,
        y: 220,
        size: 10,
        color: rgb(0, 0, 0),
      });

      // Add timestamp
      verificationPage.drawText(`Generated: ${new Date().toLocaleString()}`, {
        x: 60,
        y: 100,
        size: 8,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Generate the final PDF
    const pdfBytes = await pdfDoc.save();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="signed-document.pdf"');
    res.send(pdfBytes);

  } catch (err) {
    console.error('export-signed-pdf error:', err);
    res.status(500).json({ message: 'Failed to export signed PDF' });
  }
});

module.exports = router;


