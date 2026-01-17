import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff, Scan, Eye, EyeOff } from "lucide-react";
import { Pose, POSE_CONNECTIONS, Results } from "@mediapipe/pose";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import * as Cam from "@mediapipe/camera_utils";
import { calculateAngle } from "@/utils/pose";

interface CameraFeedProps {
  className?: string;
}

export function CameraFeed({ className }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(true);
  const showDebugRef = useRef(true); // Ref for access inside callback without dependency issues
  const cameraRef = useRef<Cam.Camera | null>(null);
  const poseRef = useRef<Pose | null>(null);

  // Sync ref with state
  useEffect(() => {
    showDebugRef.current = showDebug;
  }, [showDebug]);

  const onResults = useCallback((results: Results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Only draw if debug mode is enabled
    if (!showDebugRef.current) {
        ctx.restore();
        return;
    }

    // Draw only the skeleton, video is already in the background element
    // But we need to flip the context if we want the skeleton to match the mirrored video
    // The video element is CSS mirrored with scale-x-[-1]
    // So we should mirror the canvas drawing too
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);

    if (results.poseLandmarks) {
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 4,
      });
      drawLandmarks(ctx, results.poseLandmarks, {
        color: "#FF0000",
        lineWidth: 2,
      });

      // Calculate and draw angles
      const landmarks = results.poseLandmarks;
      
      const getCoords = (index: number) => ({
        x: landmarks[index].x * canvas.width,
        y: landmarks[index].y * canvas.height
      });

      const angles: Record<number, number> = {};

      // 1. ELBOW ANGLES (Shoulder -> Elbow -> Wrist)
      // Left: 11 -> 13 -> 15
      if (landmarks[11] && landmarks[13] && landmarks[15]) {
         angles[13] = calculateAngle(getCoords(11), getCoords(13), getCoords(15));
      }
      // Right: 12 -> 14 -> 16
      if (landmarks[12] && landmarks[14] && landmarks[16]) {
         angles[14] = calculateAngle(getCoords(12), getCoords(14), getCoords(16));
      }

      // 2. SHOULDER ANGLES (Hip -> Shoulder -> Elbow)
      // Left: 23 -> 11 -> 13
      if (landmarks[23] && landmarks[11] && landmarks[13]) {
        angles[11] = calculateAngle(getCoords(23), getCoords(11), getCoords(13));
      }
      // Right: 24 -> 12 -> 14
      if (landmarks[24] && landmarks[12] && landmarks[14]) {
        angles[12] = calculateAngle(getCoords(24), getCoords(12), getCoords(14));
      }

      // 3. KNEE ANGLES (Hip -> Knee -> Ankle)
      // Left: 23 -> 25 -> 27
      if (landmarks[23] && landmarks[25] && landmarks[27]) {
        angles[25] = calculateAngle(getCoords(23), getCoords(25), getCoords(27));
      }
      // Right: 24 -> 26 -> 28
      if (landmarks[24] && landmarks[26] && landmarks[28]) {
        angles[26] = calculateAngle(getCoords(24), getCoords(26), getCoords(28));
      }

      // 4. HIP/TORSO ANGLES (Shoulder -> Hip -> Knee)
      // Left: 11 -> 23 -> 25
      if (landmarks[11] && landmarks[23] && landmarks[25]) {
        angles[23] = calculateAngle(getCoords(11), getCoords(23), getCoords(25));
      }
      // Right: 12 -> 24 -> 26
      if (landmarks[12] && landmarks[24] && landmarks[26]) {
        angles[24] = calculateAngle(getCoords(12), getCoords(24), getCoords(26));
      }

      // Draw angles
      ctx.fillStyle = "white";
      ctx.font = "bold 16px Arial";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "black";

      Object.entries(angles).forEach(([index, angle]) => {
        const idx = parseInt(index);
        const pos = getCoords(idx);
        const text = Math.round(angle).toString();
        
        ctx.strokeText(text, pos.x + 10, pos.y - 10);
        ctx.fillText(text, pos.x + 10, pos.y - 10);
      });
    }
    ctx.restore();
  }, []);

  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      },
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults(onResults);
    poseRef.current = pose;

    return () => {
      pose.close();
    };
  }, [onResults]);

  const startCamera = async () => {
    try {
      if (videoRef.current && poseRef.current) {
        const camera = new Cam.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && poseRef.current) {
              await poseRef.current.send({ image: videoRef.current });
            }
          },
          width: 1280,
          height: 720,
        });
        
        cameraRef.current = camera;
        await camera.start();
        setIsActive(true);
        setError(null);
      }
    } catch (err) {
      handleCameraError(err);
      setIsActive(false);
    }
  };

  const handleCameraError = (err: unknown) => {
    if (err instanceof Error) {
      if (err.name === "NotAllowedError") {
        setError("Camera access was denied. Please allow camera access in your browser settings.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else if (err.name === "NotReadableError") {
        setError("Camera is already in use by another application.");
      } else {
        setError("Unable to access camera. Please check your browser settings.");
      }
    } else {
      setError("Unable to access camera. Please check your browser settings.");
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    const stream = videoRef.current?.srcObject as MediaStream;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
    setIsActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className={className}>
      <div className="relative w-full h-full bg-gradient-to-br from-gray-950 to-gray-900 rounded-2xl overflow-hidden border-2 border-gray-800/50 shadow-2xl">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
        />
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover"
        />
        
        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black z-10">
            {error ? (
              <>
                <div className="relative">
                  <div className="absolute inset-0 bg-pink-500/20 blur-2xl rounded-full" />
                  <CameraOff className="w-16 h-16 text-pink-400 mb-6 relative z-10" />
                </div>
                <p className="text-gray-300 text-sm text-center px-8 mb-6 max-w-[280px] leading-relaxed">{error}</p>
              </>
            ) : (
              <>
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full" />
                  <Camera className="w-16 h-16 text-cyan-400 mb-6 relative z-10 animate-pulse" />
                </div>
                <p className="text-gray-300 text-base mb-6 font-medium">Camera Off</p>
              </>
            )}
            <button
              onClick={startCamera}
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold rounded-full transition-all duration-200 shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:shadow-[0_0_30px_rgba(236,72,153,0.6)] transform hover:scale-105"
            >
              {error ? "Try Again" : "Enable Camera"}
            </button>
          </div>
        )}

        {isActive && (
          <>
            <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
                <div className="px-4 py-2 bg-black/80 backdrop-blur-sm rounded-full border border-pink-500/30">
                  <p className="text-xs font-semibold text-pink-400">Live Pose</p>
                </div>
            </div>

            <div className="absolute top-4 right-4 flex items-center gap-3 z-20">
                <button
                    onClick={() => setShowDebug(!showDebug)}
                    className={`p-3 backdrop-blur-sm rounded-full transition-all duration-200 border shadow-lg ${
                        showDebug 
                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30" 
                        : "bg-black/70 border-gray-500/30 text-gray-400 hover:bg-black/90 hover:text-white"
                    }`}
                    title={showDebug ? "Hide Skeleton" : "Show Skeleton"}
                >
                    {showDebug ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>

                <button
                    onClick={stopCamera}
                    className="p-3 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-full transition-all duration-200 border border-pink-500/30 shadow-lg hover:shadow-pink-500/20"
                    title="Stop Camera"
                >
                    <CameraOff className="w-5 h-5 text-pink-400" />
                </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
