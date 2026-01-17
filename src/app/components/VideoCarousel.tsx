import { cn } from "@/app/components/ui/utils";

interface VideoChunk {
  id: number;
  title: string;
  duration: string;
  thumbnail: string;
}

interface VideoCarouselProps {
  chunks: VideoChunk[];
  selectedChunk: number;
  onSelectChunk: (id: number) => void;
}

export function VideoCarousel({ chunks, selectedChunk, onSelectChunk }: VideoCarouselProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4 overflow-y-auto py-2 pr-2 scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-gray-800/50">
      {chunks.map((chunk) => (
        <button
          key={chunk.id}
          onClick={() => onSelectChunk(chunk.id)}
          className={cn(
            "relative flex-shrink-0 rounded-xl overflow-hidden transition-all duration-300 border-2",
            selectedChunk === chunk.id
              ? "border-cyan-400 shadow-[0_0_20px_rgba(0,242,234,0.6)] ring-2 ring-cyan-400/20"
              : "border-gray-700/50 hover:border-pink-400/50 hover:shadow-[0_0_15px_rgba(236,72,153,0.3)]"
          )}
        >
          <div className="aspect-[9/16] w-full bg-gray-900 relative">
            <img
              src={chunk.thumbnail}
              alt={chunk.title}
              className="w-full h-full object-cover"
            />
            {selectedChunk === chunk.id && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/30 via-transparent to-transparent" />
                <div className="absolute top-2 right-2 w-3 h-3 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(0,242,234,0.8)]" />
              </>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-3">
            <p className={cn(
              "text-xs font-semibold truncate",
              selectedChunk === chunk.id ? "text-cyan-400" : "text-white"
            )}>{chunk.title}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{chunk.duration}</p>
          </div>
        </button>
      ))}
    </div>
  );
}