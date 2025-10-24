# Face Verification Feature for SOLSIGN

This document describes the face verification feature added to the SOLSIGN Profile page.

## Overview

The face verification feature provides a privacy-conscious, real-time face detection system that requires users to complete a liveness test before proceeding with profile verification. The system uses TensorFlow.js with MediaPipe for face detection and implements a simple movement-based liveness test.

## Features

- **Real-time Face Detection**: Uses @tensorflow-models/face-detection with MediaPipe runtime
- **Liveness Test**: Requires users to turn left, right, and center within 20 seconds
- **Privacy-First**: Video never leaves the device; only pass/fail result and optional hash stored
- **Responsive Design**: Works on desktop and mobile browsers
- **Accessibility**: Clear instructions and error states

## Installation

The required dependencies have been installed:

```bash
npm install @tensorflow-models/face-detection @mediapipe/face_detection
```

## Architecture

### Components

1. **FaceVerificationCard.tsx** - Main UI component for face verification
2. **useFaceDetection.ts** - Custom hook for face detection logic
3. **hash.ts** - Utility for SHA-256 hashing of snapshots

### API Routes

- `GET /api/verification/status` - Check verification status
- `POST /api/verification/complete` - Mark user as verified
- `DELETE /api/verification/reset` - Reset verification (testing)
- `GET /api/verification/stats` - Get verification statistics

### Flow

1. User clicks "I want to verify myself"
2. Consent message appears with face verification details
3. After consent, face verification card appears
4. User completes liveness test (left → right → center)
5. On success, proceeds to email verification form
6. Both verifications required for full profile verification

## Technical Details

### Liveness Test Specification

- **Phase 1**: Detect face present for > 1 second
- **Phase 2**: Turn left (nose.x < centerX - threshold) for ≥500ms
- **Phase 3**: Turn right (nose.x > centerX + threshold) for ≥500ms  
- **Phase 4**: Center (|nose.x - centerX| < small threshold) for ≥500ms
- **Timeout**: 20 seconds total, 3 seconds face lost tolerance

### Privacy Implementation

- Video stream never sent to server
- Optional snapshot capture for proof (client-side only)
- SHA-256 hash of snapshot stored (optional)
- Only pass/fail result persisted to server

### Browser Compatibility

- Chrome/Chromium-based browsers (recommended)
- Firefox (with getUserMedia support)
- Safari (with getUserMedia support)
- Mobile browsers with camera access

## Usage

### For Users

1. Connect your Solana wallet
2. Navigate to Profile page
3. Click "I want to verify myself"
4. Accept the consent terms
5. Complete the face verification liveness test
6. Complete the email verification
7. Receive 8 SOLSIGN tokens as welcome reward

### For Developers

```typescript
// Using the FaceVerificationCard component
<FaceVerificationCard
  userId="user-123"
  onVerified={(payload) => console.log('Verified:', payload)}
  onError={(error) => console.error('Error:', error)}
/>
```

## Configuration

### Environment Variables

No additional environment variables required. The system uses:
- Client-side camera access
- In-memory storage (replace with database in production)
- CDN-hosted MediaPipe models

### Customization

- Modify movement thresholds in `useFaceDetection.ts`
- Adjust timeout values in `FaceVerificationCard.tsx`
- Customize UI styling in `FaceVerificationCard.css`

## Security Considerations

- Camera permissions required
- HTTPS recommended for production
- No biometric data stored
- Optional snapshot hashing for audit trails
- GDPR compliant data handling

## Troubleshooting

### Common Issues

1. **Camera not working**: Check browser permissions
2. **Model loading fails**: Ensure stable internet connection
3. **Face not detected**: Ensure good lighting and clear face view
4. **Movement not detected**: Ensure clear head movements

### Debug Mode

Enable console logging by setting `localStorage.debug = 'face-verification'`

## Future Enhancements

- Blink detection for additional liveness
- Multiple movement patterns
- Database integration for production
- Advanced anti-spoofing measures
- Mobile-optimized UI improvements

## Dependencies

- @tensorflow-models/face-detection: ^0.1.0
- @mediapipe/face_detection: ^0.4.0
- React: ^19.1.1
- TypeScript support included

## License

This feature is part of the SOLSIGN project and follows the same licensing terms.
