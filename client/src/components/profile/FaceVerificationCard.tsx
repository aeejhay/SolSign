import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFaceDetection, calculateHeadMovement } from '../../hooks/useFaceDetection';
import { sha256Base64 } from '../../lib/hash';
import './FaceVerificationCard.css';

export interface FaceVerificationCardProps {
  userId: string;
  onVerified?: (payload: { timestamp: string; snapshotHash?: string }) => void;
  onError?: (error: string) => void;
}

type VerificationPhase = 'idle' | 'camera_ready' | 'detecting' | 'phase_left' | 'phase_right' | 'phase_center' | 'success' | 'fail';

interface LivenessState {
  phase: VerificationPhase;
  timeRemaining: number;
  leftCompleted: boolean;
  rightCompleted: boolean;
  centerCompleted: boolean;
  faceLostTime: number;
  startTime: number;
  leftStartTime: number;
  rightStartTime: number;
  centerStartTime: number;
}

const VERIFICATION_TIMEOUT = 10000; // 10 seconds
const FACE_LOST_TIMEOUT = 3000; // 3 seconds

const FaceVerificationCard: React.FC<FaceVerificationCardProps> = ({
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
  
  const [livenessState, setLivenessState] = useState<LivenessState>({
    phase: 'idle',
    timeRemaining: VERIFICATION_TIMEOUT,
    leftCompleted: false,
    rightCompleted: false,
    centerCompleted: false,
    faceLostTime: 0,
    startTime: 0,
    leftStartTime: 0,
    rightStartTime: 0,
    centerStartTime: 0
  });

  // Simple test version - bypass face detection and use timer
  const handleFaceDetection = useCallback((result: any) => {
    console.log('Face detection result:', result);
    console.log('Current phase:', livenessState.phase);
    
    // Simple test: just start timer when we reach detecting phase
    if (livenessState.phase === 'detecting') {
      console.log('Starting 10-second test timer');
      const now = Date.now();
      setLivenessState(prev => {
        console.log('Setting state to phase_left with startTime:', now);
        return { 
          ...prev, 
          phase: 'phase_left',
          startTime: now
        };
      });
      console.log('Test timer started at:', now);
    } else {
      console.log('Phase is not detecting, current phase:', livenessState.phase);
    }
  }, [livenessState.phase]);

  const { 
    boxes, 
    keypoints, 
    hasFace, 
    error: detectionError, 
    modelStatus, 
    start: startDetection, 
    stop: stopDetection,
    isDetecting 
  } = useFaceDetection({
    videoRef,
    minScore: 0.5,
    onFaceDetected: (result) => {
      console.log('Face detection callback triggered:', result);
      handleFaceDetection(result);
    }
  });

  // Start camera and detection
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
          console.log('Video metadata loaded');
          setLivenessState(prev => ({ ...prev, phase: 'camera_ready' }));
          
          // Wait for model to be ready before starting detection
          const checkModelReady = () => {
            if (modelStatus === 'ready') {
              console.log('Model ready, starting detection');
              startDetection();
              setLivenessState(prev => ({ ...prev, phase: 'detecting' }));
              
              // Face detection will trigger the timer via callback
            } else {
              console.log('Model not ready yet, waiting...');
              setTimeout(checkModelReady, 100);
            }
          };
          
          checkModelReady();
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
    if (livenessState.phase === 'phase_left' && livenessState.startTime > 0) {
      console.log('Starting countdown timer for phase:', livenessState.phase);
      const timer = setInterval(() => {
        const elapsed = Date.now() - livenessState.startTime;
        const remaining = Math.max(0, VERIFICATION_TIMEOUT - elapsed);
        
        console.log(`Timer: ${elapsed}ms elapsed, ${remaining}ms remaining`);
        setLivenessState(prev => ({ ...prev, timeRemaining: remaining }));

        if (remaining === 0) {
          console.log('Verification timed out!');
          setLivenessState(prev => ({ ...prev, phase: 'fail' }));
          clearInterval(timer);
        }
      }, 100);

      return () => clearInterval(timer);
    }
  }, [livenessState.phase, livenessState.startTime]);

  // Draw face detection overlay
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bounding boxes
    boxes.forEach(box => {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    });

    // Draw keypoints
    keypoints.forEach(keypoint => {
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [boxes, keypoints]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      stopDetection();
    };
  }, [stopDetection]);

  const getInstructionText = () => {
    switch (livenessState.phase) {
      case 'idle':
        return 'Click Start to begin face verification';
      case 'camera_ready':
        return 'Position your face in the camera';
      case 'detecting':
        return 'Face detected! Keep looking at the camera';
      case 'phase_left':
        return 'Keep your face in view for 10 seconds...';
      case 'success':
        return 'Verification successful!';
      case 'fail':
        return 'Verification failed. Please try again.';
      default:
        return '';
    }
  };

  const getProgressDots = () => {
    const isVerifying = livenessState.phase === 'phase_left';
    const isCompleted = livenessState.phase === 'success';
    
    return (
      <div className="progress-dots">
        <div className={`progress-dot ${isVerifying ? 'active' : ''} ${isCompleted ? 'completed' : ''}`} />
        <div className="progress-text">
          {isVerifying ? 'Verifying...' : isCompleted ? 'Complete!' : 'Ready'}
        </div>
      </div>
    );
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
          {getProgressDots()}
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
        />
      </div>

      <div className="verification-content">
        <div className="instruction-text">
          {getInstructionText()}
        </div>

        {livenessState.phase === 'phase_left' && (
          <div className="countdown">
            Time remaining: {formatTime(livenessState.timeRemaining)}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {detectionError && (
          <div className="error-message">
            Detection error: {detectionError}
          </div>
        )}

        <div className="verification-controls">
          {livenessState.phase === 'idle' && (
            <button
              onClick={startVerification}
              disabled={isLoading || modelStatus === 'loading'}
              className="start-button"
            >
              {isLoading ? 'Starting...' : 'Start Verification'}
            </button>
          )}

          {(livenessState.phase === 'fail' || livenessState.phase === 'success') && (
            <button
              onClick={() => {
                setLivenessState({
                  phase: 'idle',
                  timeRemaining: VERIFICATION_TIMEOUT,
                  leftCompleted: false,
                  rightCompleted: false,
                  centerCompleted: false,
                  faceLostTime: 0,
                  startTime: 0,
                  leftStartTime: 0,
                  rightStartTime: 0,
                  centerStartTime: 0
                });
                setError(null);
              }}
              className="retry-button"
            >
              {livenessState.phase === 'success' ? 'Verified Again' : 'Retry'}
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

export default FaceVerificationCard;