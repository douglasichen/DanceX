import { useState, useEffect } from "react";
import { VideoCarousel } from "@/app/components/VideoCarousel";
import { VideoPlayer } from "@/app/components/VideoPlayer";
import { CameraFeed } from "@/app/components/CameraFeed";
import { Upload, Loader2 } from "lucide-react";
import sampleVideo from "../../media/C_720_shorter.mp4";
import { getIntervals } from "../utils/gemini";

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
  const [chunks, setChunks] = useState<any[]>([]);
  const [selectedChunk, setSelectedChunk] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [videoUrl, setVideoUrl] = useState<string>(SAMPLE_VIDEO);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const processVideo = async (file: File, url: string) => {
    setIsAnalyzing(true);
    setChunks([]); // Clear previous chunks

    try {
      // Get video duration
      const video = document.createElement("video");
      video.src = url;
      await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve(true);
      });
      const duration = video.duration;

      // Generate intervals using Gemini
      const intervals = await getIntervals(file);
      console.log("Intervals: ", intervals);
      
      // Convert intervals to chunks with thumbnails
      const newChunks = await Promise.all(intervals.map(async (interval: any, index: number) => {
        const startSeconds = interval.start / 1000;
        const endSeconds = interval.end / 1000;

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
          thumbnail,
          startTime: interval.start,
          endTime: interval.end,
        };
      }));

      // Create Full Song chunk
      let fullSongThumbnail = "";
      try {
        fullSongThumbnail = await generateThumbnail(url, 0);
      } catch (e) {
        console.error("Failed to generate thumbnail for full song", e);
      }

      const fullSongChunk = {
        id: 0,
        title: "Full Song",
        duration: formatTime(duration),
        thumbnail: fullSongThumbnail,
        startTime: 0,
        endTime: duration * 1000,
      };

      const allChunks = [fullSongChunk, ...newChunks];
      setChunks(allChunks);
      console.log("allChunks: ", allChunks);
      
      if (newChunks.length > 0) {
        setSelectedChunk(newChunks[0].id);
      } else {
        setSelectedChunk(0);
      }
    } catch (error) {
      console.error("Error analyzing video:", error);
      // alert("Failed to analyze video intervals. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    // Set document title from env var
    document.title = import.meta.env.VITE_APP_TITLE || "DanceX";

    const initVideo = async () => {
      try {
        const response = await fetch(SAMPLE_VIDEO);
        const blob = await response.blob();
        const file = new File([blob], "sample.mp4", { type: "video/mp4" });
        await processVideo(file, SAMPLE_VIDEO);
      } catch (error) {
        console.error("Error initializing video:", error);
      }
    };

    initVideo();
  }, []);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const handleSelectChunk = (id: number) => {
    console.log("Selected chunk: ", id);
    console.log(chunks.find(c => c.id === id));
    setSelectedChunk(id);
    setIsPlaying(false);
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "video/mp4") {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setIsPlaying(false);
      
      await processVideo(file, url);
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
              startTime={(chunks.find(c => c.id === selectedChunk)?.startTime || 0) / 1000}
              endTime={(chunks.find(c => c.id === selectedChunk)?.endTime || 0)/1000}
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
