import { useState, useEffect, useRef, useCallback } from 'react';
import * as faceDetection from '@tensorflow-models/face-detection';
import * as tf from '@tensorflow/tfjs';

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceKeypoint {
  x: number;
  y: number;
  name?: string;
}

export interface FaceDetectionResult {
  boxes: FaceBox[];
  keypoints: FaceKeypoint[];
  hasFace: boolean;
  error: string | null;
  modelStatus: 'idle' | 'loading' | 'ready' | 'error';
}

export interface UseFaceDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  minScore?: number;
  onFaceDetected?: (result: FaceDetectionResult) => void;
}

export interface UseFaceDetectionReturn extends FaceDetectionResult {
  start: () => void;
  stop: () => void;
  isDetecting: boolean;
}

/**
 * Custom hook for face detection using TensorFlow.js and MediaPipe
 * Provides real-time face detection with bounding boxes and keypoints
 */
export function useFaceDetection({
  videoRef,
  minScore = 0.5,
  onFaceDetected
}: UseFaceDetectionOptions): UseFaceDetectionReturn {
  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [boxes, setBoxes] = useState<FaceBox[]>([]);
  const [keypoints, setKeypoints] = useState<FaceKeypoint[]>([]);
  const [hasFace, setHasFace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  
  const detectorRef = useRef<faceDetection.FaceDetector | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize the face detection model
  const initializeModel = useCallback(async () => {
    if (isInitializedRef.current) return;
    
    try {
      setModelStatus('loading');
      setError(null);

      // Initialize TensorFlow.js backend
      await tf.ready();
      console.log('TensorFlow.js backend:', tf.getBackend());

      // Use MediaPipe face detection with proper configuration
      console.log('Initializing MediaPipe face detector...');
      const detector = await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        {
          runtime: 'tfjs',
          modelType: 'full'
        }
      );
      console.log('MediaPipe face detector initialized successfully');

      detectorRef.current = detector;
      setModelStatus('ready');
      isInitializedRef.current = true;
    } catch (err) {
      console.error('Failed to initialize face detection model:', err);
      setError(err instanceof Error ? err.message : 'Failed to load face detection model');
      setModelStatus('error');
    }
  }, []);

  // Start face detection
  const start = useCallback(() => {
    if (!detectorRef.current || !videoRef.current) {
      console.warn('Face detector or video element not ready');
      return;
    }

    if (videoRef.current.readyState < 2) {
      console.warn('Video not ready, readyState:', videoRef.current.readyState);
      return;
    }

    setIsDetecting(true);
    setError(null);

    const detectFaces = async () => {
      if (!detectorRef.current || !videoRef.current || !isDetecting) {
        return;
      }

      try {
        const video = videoRef.current;
        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
          animationFrameRef.current = requestAnimationFrame(detectFaces);
          return;
        }

        // Detect faces in the current frame
        const faces = await detectorRef.current.estimateFaces(video, {
          flipHorizontal: false,
        });

        console.log('Face detection result:', faces.length, 'faces found');

        if (faces.length > 0) {
          // Get the face with highest confidence
          const bestFace = faces.reduce((prev, current) => {
            const currentScore = (current as any).detectionConfidence || (current as any).score || 0;
            const prevScore = (prev as any).detectionConfidence || (prev as any).score || 0;
            return currentScore > prevScore ? current : prev;
          });

          const faceScore = (bestFace as any).detectionConfidence || (bestFace as any).score || 0;
          
          if (faceScore >= minScore || faceScore === 0) {
            // Extract bounding box
            const bbox = (bestFace as any).box || (bestFace as any).boundingBox;
            const faceBox: FaceBox = {
              x: bbox.xCenter - bbox.width / 2,
              y: bbox.yCenter - bbox.height / 2,
              width: bbox.width,
              height: bbox.height
            };

            // Extract keypoints if available
            const faceKeypoints: FaceKeypoint[] = [];
            if (bestFace.keypoints) {
              bestFace.keypoints.forEach((keypoint: any) => {
                faceKeypoints.push({
                  x: keypoint.x,
                  y: keypoint.y,
                  name: keypoint.name
                });
              });
            }

            setBoxes([faceBox]);
            setKeypoints(faceKeypoints);
            setHasFace(true);

            // Call callback if provided
            if (onFaceDetected) {
              console.log('Calling onFaceDetected callback');
              onFaceDetected({
                boxes: [faceBox],
                keypoints: faceKeypoints,
                hasFace: true,
                error: null,
                modelStatus
              });
            }
          } else {
            // Face detected but confidence too low
            setBoxes([]);
            setKeypoints([]);
            setHasFace(false);
          }
        } else {
          // No faces detected
          setBoxes([]);
          setKeypoints([]);
          setHasFace(false);
        }
      } catch (err) {
        console.error('Face detection error:', err);
        setError(err instanceof Error ? err.message : 'Face detection failed');
        setHasFace(false);
      }

      // Continue detection loop
      if (isDetecting) {
        animationFrameRef.current = requestAnimationFrame(detectFaces);
      }
    };

    detectFaces();
  }, [videoRef, minScore, onFaceDetected, modelStatus, isDetecting]);

  // Stop face detection
  const stop = useCallback(() => {
    setIsDetecting(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Initialize model on mount
  useEffect(() => {
    initializeModel();
  }, [initializeModel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      if (detectorRef.current) {
        detectorRef.current = null;
      }
    };
  }, [stop]);

  return {
    boxes,
    keypoints,
    hasFace,
    error,
    modelStatus,
    start,
    stop,
    isDetecting
  };
}

/**
 * Utility function to calculate head movement direction
 * @param keypoints - Array of face keypoints
 * @param videoWidth - Width of the video element
 * @returns Object with movement direction and normalized position
 */
export function calculateHeadMovement(
  keypoints: FaceKeypoint[],
  videoWidth: number
): {
  direction: 'left' | 'right' | 'center' | 'unknown';
  normalizedX: number;
  isMoving: boolean;
} {
  if (keypoints.length === 0) {
    return { direction: 'unknown', normalizedX: 0.5, isMoving: false };
  }

  // Try to find nose tip first, then use first keypoint as fallback
  let noseKeypoint = keypoints.find(kp => kp.name === 'noseTip') || keypoints[0];
  
  if (!noseKeypoint) {
    return { direction: 'unknown', normalizedX: 0.5, isMoving: false };
  }

  const normalizedX = noseKeypoint.x / videoWidth;
  
  // Determine direction based on normalized position
  let direction: 'left' | 'right' | 'center' | 'unknown' = 'unknown';
  
  if (normalizedX < 0.4) {
    direction = 'left';
  } else if (normalizedX > 0.6) {
    direction = 'right';
  } else if (normalizedX >= 0.4 && normalizedX <= 0.6) {
    direction = 'center';
  }

  return {
    direction,
    normalizedX,
    isMoving: normalizedX < 0.4 || normalizedX > 0.6
  };
}