import { useState, useEffect } from "react";
import { VideoCarousel } from "@/app/components/VideoCarousel";
import { VideoPlayer } from "@/app/components/VideoPlayer";
import { CameraFeed } from "@/app/components/CameraFeed";
import { Upload, Loader2 } from "lucide-react";
import sampleVideo from "../../media/C_720_shorter.mp4";
import { getIntervals } from "../utils/gemini";

// Mock video chunks data
const INITIAL_CHUNKS = [
  {
    id: 1,
    title: "Intro Move",
    duration: "0:00-0:05",
    thumbnail: "https://images.unsplash.com/photo-1768244016517-2ec30e558a78?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYW5jaW5nJTIwcGVyc29ufGVufDF8fHx8MTc2ODY3NzMxNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: 2,
    title: "Hip Sway",
    duration: "0:05-0:10",
    thumbnail: "https://images.unsplash.com/photo-1565784796667-98515d255f7d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXAlMjBob3AlMjBkYW5jZXJ8ZW58MXx8fHwxNzY4NjgxNjAxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: 3,
    title: "Body Roll",
    duration: "0:10-0:15",
    thumbnail: "https://images.unsplash.com/photo-1718908721930-31120bc1beb5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYW5jZSUyMHBlcmZvcm1hbmNlfGVufDF8fHx8MTc2ODU3OTA2Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: 4,
    title: "Arm Wave",
    duration: "0:15-0:20",
    thumbnail: "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlZXQlMjBkYW5jZXxlbnwxfHx8fDE3Njg2ODE2MDF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: 5,
    title: "Spin Move",
    duration: "0:20-0:25",
    thumbnail: "https://images.unsplash.com/photo-1547153760-18fc86324498?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBkYW5jZXJ8ZW58MXx8fHwxNzY4NjgxNjAxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
];

// Sample video URL - In production, this would change based on selected chunk
const SAMPLE_VIDEO = sampleVideo;

const generateThumbnail = (videoUrl: string, time: number): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.currentTime = time+0.1;
    video.onloadeddata = () => {
      // Small delay to ensure frame is ready
      setTimeout(() => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg");
          resolve(dataUrl);
        }
      }, 200);
    };
    video.load();
  });
};

export default function App() {
  const [chunks, setChunks] = useState(INITIAL_CHUNKS);
  const [selectedChunk, setSelectedChunk] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [videoUrl, setVideoUrl] = useState<string>(SAMPLE_VIDEO);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Set document title from env var
    document.title = import.meta.env.VITE_APP_TITLE || "DanceX";

    const loadDefaultThumbnail = async () => {
      try {
        const thumbnail = await generateThumbnail(SAMPLE_VIDEO, 0);
        setChunks(prevChunks => prevChunks.map(chunk => ({
          ...chunk,
          thumbnail
        })));
      } catch (error) {
        console.error("Error generating default thumbnail:", error);
      }
    };

    loadDefaultThumbnail();
  }, []);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const handleSelectChunk = (id: number) => {
    setSelectedChunk(id);
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "video/mp4") {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setIsPlaying(false);
      setIsAnalyzing(true);
      setChunks([]); // Clear previous chunks

      try {
        // Generate intervals using Gemini
        const intervals = await getIntervals(file);
        console.log("Intervals: ", intervals);
        
        // Convert intervals to chunks with thumbnails
        const newChunks = await Promise.all(intervals.map(async (interval: any, index: number) => {
          const startSeconds = interval.start / 1000;
          const endSeconds = interval.end / 1000;
          
          const formatTime = (seconds: number) => {
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return `${m}:${s.toString().padStart(2, '0')}`;
          };

          let thumbnail = "";
          try {
            thumbnail = await generateThumbnail(url, startSeconds);
          } catch (e) {
            console.error("Failed to generate thumbnail for interval", index, e);
          }

          return {
            id: index + 1,
            title: interval.chunk_title,
            duration: `${formatTime(startSeconds)}-${formatTime(endSeconds)}`,
            thumbnail
          };
        }));

        setChunks(newChunks);
        if (newChunks.length > 0) {
          setSelectedChunk(newChunks[0].id);
        }
      } catch (error) {
        console.error("Error analyzing video:", error);
        alert("Failed to analyze video intervals. Please try again.");
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-black">
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Carousel Sidebar */}
        <div className="w-64 flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-black border-r border-cyan-500/20 p-6 shadow-[4px_0_20px_rgba(0,242,234,0.1)] relative">
          <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 font-bold text-lg mb-4 tracking-wide">Dance Sections</h2>
          
          {/* Upload Video Button */}
          <label className="mb-6 block cursor-pointer group">
            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500/10 to-pink-500/10 hover:from-cyan-500/20 hover:to-pink-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-xl transition-all duration-200">
              <Upload className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
              <span className="text-sm font-semibold text-cyan-400 group-hover:text-cyan-300">Upload Video</span>
            </div>
            <input
              type="file"
              accept="video/mp4"
              onChange={handleVideoUpload}
              className="hidden"
            />
          </label>
          
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-cyan-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium animate-pulse text-center">Analyzing moves...</p>
            </div>
          ) : (
            <VideoCarousel
              chunks={chunks}
              selectedChunk={selectedChunk}
              onSelectChunk={handleSelectChunk}
            />
          )}
        </div>

        {/* Video Display Area */}
        <div className="flex-1 flex items-center justify-center gap-12 p-8 bg-gradient-to-br from-gray-950 via-black to-gray-950 relative overflow-hidden">
          {/* Animated Background Effects */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          
          {/* Tutorial Video */}
          <div className="flex flex-col items-center relative z-10">
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-2xl opacity-20 blur-xl" />
            <VideoPlayer
              src={videoUrl}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              onTogglePlay={handleTogglePlay}
              onSpeedChange={handleSpeedChange}
              className="w-[450px] h-[800px] relative z-10"
            />
          </div>

          {/* Camera Feed */}
          <div className="flex flex-col items-center relative z-10">
            <div className="absolute -inset-4 bg-gradient-to-r from-pink-500 to-cyan-500 rounded-2xl opacity-20 blur-xl" />
            <CameraFeed className="w-[450px] h-[800px] relative z-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
