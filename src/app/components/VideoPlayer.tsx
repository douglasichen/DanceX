import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, Eye, EyeOff } from "lucide-react";
import { Pose, POSE_CONNECTIONS, Results } from "@mediapipe/pose";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { calculateAngle } from "@/utils/pose";

interface VideoPlayerProps {
  src: string;
  isPlaying: boolean;
  playbackSpeed: number;
  className?: string;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onAnglesUpdate?: (angles: Record<number, number>) => void;
  onVideoEnd?: () => void;
  onRestart?: () => void;
}

export function VideoPlayer({ src, isPlaying, playbackSpeed, className, onTogglePlay, onSpeedChange, onAnglesUpdate, onVideoEnd, onRestart }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const showSkeletonRef = useRef(true);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    showSkeletonRef.current = showSkeleton;
  }, [showSkeleton]);

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

    if (!showSkeletonRef.current) {
        ctx.restore();
        return;
    }

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

      if (onAnglesUpdate) {
        onAnglesUpdate(angles);
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
  }, [onAnglesUpdate]);

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

  useEffect(() => {
    if (videoRef.current) {
      const handleEnded = () => {
        onVideoEnd?.();
      };
      
      const video = videoRef.current;
      video.addEventListener('ended', handleEnded);
      return () => {
        video.removeEventListener('ended', handleEnded);
      };
    }
  }, [onVideoEnd]);

  const processFrame = useCallback(async (now: number, metadata: any) => {
    if (videoRef.current && poseRef.current) {
        try {
            await poseRef.current.send({ image: videoRef.current });
        } catch (error) {
            console.error("Pose send error:", error);
        }
        
        if (isPlaying && videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
             // Cast to any to avoid TS error if types are missing
             if ('requestVideoFrameCallback' in videoRef.current) {
                requestRef.current = (videoRef.current as any).requestVideoFrameCallback(processFrame);
             } else {
                 requestRef.current = requestAnimationFrame(() => processFrame(performance.now(), null));
             }
        }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play();
        if ('requestVideoFrameCallback' in videoRef.current) {
             requestRef.current = (videoRef.current as any).requestVideoFrameCallback(processFrame);
        } else {
            requestRef.current = requestAnimationFrame(() => processFrame(performance.now(), null));
        }
      } else {
        videoRef.current.pause();
        if (requestRef.current) {
            if ('cancelVideoFrameCallback' in videoRef.current) {
                (videoRef.current as any).cancelVideoFrameCallback(requestRef.current);
            } else {
                cancelAnimationFrame(requestRef.current);
            }
        }
      }
    }
  }, [isPlaying, processFrame]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const speeds = [0.25, 0.5, 0.75, 1.0];

  const handleRestart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    if (!isPlaying) {
      onTogglePlay();
    }

    onRestart?.();
  };

  return (
    <div className={className}>
      <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden border-2 border-gray-800/50 shadow-2xl group">
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-cover"
          // loop
          playsInline
        />
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
        
        {/* Skeleton Toggle - Top Right */}
        <div className="absolute top-4 right-4 z-20">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setShowSkeleton(!showSkeleton);
                }}
                className={`p-3 backdrop-blur-sm rounded-full transition-all duration-200 border shadow-lg ${
                    showSkeleton 
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30" 
                    : "bg-black/70 border-gray-500/30 text-gray-400 hover:bg-black/90 hover:text-white"
                }`}
                title={showSkeleton ? "Hide Skeleton" : "Show Skeleton"}
            >
                {showSkeleton ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
        </div>

        {/* Overlay Controls */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300">
          {/* Play/Pause Button - Center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              onClick={(e) => {
                  e.stopPropagation(); // Prevent propagation if overlay clicked
                  onTogglePlay();
              }}
              className="pointer-events-auto bg-gradient-to-br from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 rounded-full p-5 transition-all duration-200 shadow-[0_0_30px_rgba(0,242,234,0.5)] hover:shadow-[0_0_40px_rgba(0,242,234,0.8)] transform hover:scale-110"
            >
              {isPlaying ? (
                <Pause className="w-10 h-10 text-black" fill="currentColor" />
              ) : (
                <Play className="w-10 h-10 text-black" fill="currentColor" />
              )}
            </button>
          </div>

          {/* Speed Control - Bottom */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/90 backdrop-blur-md rounded-full px-4 py-3 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,0,0,0.8)] pointer-events-auto">
            <button
              onClick={handleRestart}
              className="p-1.5 rounded-full text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200"
              title="Restart Video"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-700" />
            <div className="flex gap-1.5">
            {speeds.map((speed) => (
              <button
                key={speed}
                onClick={(e) => {
                    e.stopPropagation();
                    onSpeedChange(speed);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                  playbackSpeed === speed
                    ? "bg-gradient-to-r from-cyan-400 to-pink-500 text-black shadow-[0_0_10px_rgba(0,242,234,0.6)]"
                    : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
                }`}
              >
                {speed.toFixed(1)}x
              </button>
            ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
