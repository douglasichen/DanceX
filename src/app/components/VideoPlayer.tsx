import { useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  isPlaying: boolean;
  playbackSpeed: number;
  className?: string;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
}

export function VideoPlayer({ src, isPlaying, playbackSpeed, className, onTogglePlay, onSpeedChange }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

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
  };

  return (
    <div className={className}>
      <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden border-2 border-gray-800/50 shadow-2xl group">
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-cover"
          loop
          playsInline
        />
        
        {/* Overlay Controls */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300">
          {/* Play/Pause Button - Center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={onTogglePlay}
              className="bg-gradient-to-br from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 rounded-full p-5 transition-all duration-200 shadow-[0_0_30px_rgba(0,242,234,0.5)] hover:shadow-[0_0_40px_rgba(0,242,234,0.8)] transform hover:scale-110"
            >
              {isPlaying ? (
                <Pause className="w-10 h-10 text-black" fill="currentColor" />
              ) : (
                <Play className="w-10 h-10 text-black" fill="currentColor" />
              )}
            </button>
          </div>

          {/* Speed Control - Bottom */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/90 backdrop-blur-md rounded-full px-4 py-3 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
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
                onClick={() => onSpeedChange(speed)}
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