import { Play, Pause, Gauge } from "lucide-react";
import { cn } from "@/app/components/ui/utils";

interface PlaybackControlsProps {
  isPlaying: boolean;
  playbackSpeed: number;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
}

const speeds = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

export function PlaybackControls({
  isPlaying,
  playbackSpeed,
  onTogglePlay,
  onSpeedChange,
}: PlaybackControlsProps) {
  return (
    <div className="bg-black border-t-2 border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Play/Pause Button */}
        <button
          onClick={onTogglePlay}
          className="flex items-center gap-3 px-6 py-3 bg-[#fe2c55] hover:bg-[#e01d46] text-white font-bold rounded-full transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {isPlaying ? (
            <>
              <Pause className="w-5 h-5 fill-white" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-white" />
              <span>Play</span>
            </>
          )}
        </button>

        {/* Speed Control */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white">
            <Gauge className="w-5 h-5 text-[#00f2ea]" />
            <span className="font-medium">Speed:</span>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-900 p-2 rounded-full">
            {speeds.map((speed) => (
              <button
                key={speed}
                onClick={() => onSpeedChange(speed)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-200",
                  playbackSpeed === speed
                    ? "bg-gradient-to-r from-[#00f2ea] to-[#fe2c55] text-black shadow-md"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                {speed === 1 ? "1.0x" : `${speed.toFixed(1)}x`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
