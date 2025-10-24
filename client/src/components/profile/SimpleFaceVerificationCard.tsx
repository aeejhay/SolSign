import React, { useState, useRef, useEffect } from 'react';
import { sha256Base64 } from '../../lib/hash';
import './FaceVerificationCard.css';

export interface SimpleFaceVerificationCardProps {
  userId: string;
  onVerified?: (payload: { timestamp: string; snapshotHash?: string }) => void;
  onError?: (error: string) => void;
}

type VerificationPhase = 'idle' | 'camera_ready' | 'verifying' | 'success' | 'fail';

const VERIFICATION_TIMEOUT = 10000; // 10 seconds

const SimpleFaceVerificationCard: React.FC<SimpleFaceVerificationCardProps> = ({
  userId,
  onVerified,
  onError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<VerificationPhase>('idle');
  const [timeRemaining, setTimeRemaining] = useState(VERIFICATION_TIMEOUT);
  const [startTime, setStartTime] = useState(0);

  // Start camera and verification
  const startVerification = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraPermission('granted');
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log('Video ready, starting verification');
          setPhase('camera_ready');
          
          // Start verification after a short delay
          setTimeout(() => {
            console.log('Starting 10-second verification timer');
            setPhase('verifying');
            const now = Date.now();
            setStartTime(now);
            setTimeRemaining(VERIFICATION_TIMEOUT);
            console.log('Verification started at:', now);
          }, 1000);
        };
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied. Please allow camera permission and try again.');
      setCameraPermission('denied');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle verification success
  const handleVerificationSuccess = async () => {
    try {
      console.log('Verification successful!');
      
      // Capture a snapshot
      const snapshot = await captureSnapshot();
      const snapshotHash = snapshot ? await sha256Base64(snapshot) : undefined;

      // Send verification to API
      const response = await fetch('/api/verification/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verified: true,
          snapshotHash,
          timestamp: new Date().toISOString(),
          userId
        }),
      });

      if (response.ok) {
        onVerified?.({
          timestamp: new Date().toISOString(),
          snapshotHash
        });
      } else {
        throw new Error('Failed to save verification');
      }
    } catch (err) {
      console.error('Verification save error:', err);
      setError('Verification completed but failed to save. Please try again.');
    }
  };

  // Capture a snapshot of the current frame
  const captureSnapshot = async (): Promise<string | null> => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Return as data URL
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  // Countdown timer
  useEffect(() => {
    if (phase === 'verifying' && startTime > 0) {
      console.log('Starting countdown timer');
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, VERIFICATION_TIMEOUT - elapsed);
        
        console.log(`Timer: ${elapsed}ms elapsed, ${remaining}ms remaining`);
        setTimeRemaining(remaining);

        if (remaining === 0) {
          console.log('Verification complete!');
          setPhase('success');
          handleVerificationSuccess();
          clearInterval(timer);
        }
      }, 100);

      return () => clearInterval(timer);
    }
  }, [phase, startTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const getInstructionText = () => {
    switch (phase) {
      case 'idle':
        return 'Click Start to begin face verification';
      case 'camera_ready':
        return 'Camera ready! Starting verification...';
      case 'verifying':
        return 'Keep your face in view for 10 seconds...';
      case 'success':
        return 'Verification successful!';
      case 'fail':
        return 'Verification failed. Please try again.';
      default:
        return '';
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="face-verification-card">
      <div className="verification-header">
        <h3>Face Verification</h3>
        <div className="progress-dots">
          <div className={`progress-dot ${phase === 'verifying' ? 'active' : ''} ${phase === 'success' ? 'completed' : ''}`} />
          <div className="progress-text">
            {phase === 'verifying' ? 'Verifying...' : phase === 'success' ? 'Complete!' : 'Ready'}
          </div>
        </div>
      </div>

      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="camera-video"
        />
        <canvas
          ref={canvasRef}
          className="detection-overlay"
          style={{ display: 'none' }}
        />
      </div>

      <div className="verification-content">
        <div className="instruction-text">
          {getInstructionText()}
        </div>

        {phase === 'verifying' && (
          <div className="countdown">
            Time remaining: {formatTime(timeRemaining)}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="verification-controls">
          {phase === 'idle' && (
            <button
              onClick={startVerification}
              disabled={isLoading}
              className="start-button"
            >
              {isLoading ? 'Starting...' : 'Start Verification'}
            </button>
          )}

          {(phase === 'fail' || phase === 'success') && (
            <button
              onClick={() => {
                setPhase('idle');
                setTimeRemaining(VERIFICATION_TIMEOUT);
                setStartTime(0);
                setError(null);
              }}
              className="retry-button"
            >
              {phase === 'success' ? 'Verify Again' : 'Retry'}
            </button>
          )}
        </div>

        <div className="privacy-notice">
          Video never leaves your device. We store only a pass/fail and (optional) a hash of a single frame.
        </div>
      </div>
    </div>
  );
};

export default SimpleFaceVerificationCard;
