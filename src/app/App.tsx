import { useState, useEffect, useRef } from "react";
import { VideoCarousel } from "@/app/components/VideoCarousel";
import { VideoPlayer } from "@/app/components/VideoPlayer";
import { CameraFeed } from "@/app/components/CameraFeed";
import { Upload } from "lucide-react";
import sampleVideo from "../../media/C_720_shorter.mp4";
import { max } from "date-fns";

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

const generateThumbnail = (videoUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.currentTime = 0.1; // First frame
    video.onloadeddata = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        resolve(dataUrl);
      }
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
  // const [comparisonResults, setComparisonResults] = useState<Record<number, number>>({});
  
  // A simple counter to track frames for the interval logic
  const frameCounterRef = useRef(0);
  const totalErrorRef = useRef(0);
  const comparisonCountRef = useRef(0);
  const comparisonResultsRef = useRef<Record<number, number>>({});
  const videoAnglesRef = useRef<Record<number, number>>({});

  const handleCameraResults = (camAngles: Record<number, number>) => {
    frameCounterRef.current++;

    // Only compare every 5 frames (~4 times a second at 20-30fps)
    if (frameCounterRef.current % 1 === 0) {
      const diffs: Record<number, number> = {};

      Object.keys(camAngles).forEach((key) => {
        const idx = parseInt(key);
        if (videoAnglesRef.current[idx] !== undefined) {
          // Calculate the difference between the two sources
          diffs[idx] = Math.abs(camAngles[idx] - videoAnglesRef.current[idx]);
          totalErrorRef.current += diffs[idx];
          comparisonCountRef.current++;

          maxScore.current += 2; // Max 2 points per joint

          if (diffs[idx] < 15) {
            currentScore.current += 2;
          } else if (diffs[idx] < 30) {
            currentScore.current += 1;
          } else {
            currentScore.current += 0;
          }
        }
      });
      comparisonResultsRef.current = diffs;
    }
  };

  const handleVideoEnd = () => {
    if (comparisonCountRef.current > 0) {
      const averageError = totalErrorRef.current / comparisonCountRef.current;
      console.log(`Total Error: ${totalErrorRef.current.toFixed(2)}°`);
      console.log(`Average Error per Joint: ${averageError.toFixed(2)}°`);
      console.log(`Total Comparisons: ${comparisonCountRef.current}`);
    }
    // Calculate and store the final score as a percentage
    const scorePercent = maxScore.current > 0 
      ? (currentScore.current / maxScore.current) * 100 
      : 0;
    setFinalScore(scorePercent);

    setShowScoreScreen(true);

    // Reset counters for next video
    totalErrorRef.current = 0;
    comparisonCountRef.current = 0;
    frameCounterRef.current = 0;
    currentScore.current = 0;
    maxScore.current = 0;

    setComparisonResults({});
    setVideoAngles({});
  };

  const handleRestartVideo = () => {
    setShowScoreScreen(false);
    setIsPlaying(true);

    frameCounterRef.current = 0;
    totalErrorRef.current = 0;
    comparisonCountRef.current = 0;
    maxScore.current = 0;
    currentScore.current = 0;

    setComparisonResults({});
    setVideoAngles({});
  };

  useEffect(() => {
    const loadDefaultThumbnail = async () => {
      try {
        const thumbnail = await generateThumbnail(SAMPLE_VIDEO);
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
      setIsPlaying(false); // Pause when new video is loaded

      // Generate thumbnail from first frame
      const thumbnail = await generateThumbnail(url);
      
      // Update all chunks with new thumbnail
      setChunks(prevChunks => prevChunks.map(chunk => ({
        ...chunk,
        thumbnail
      })));
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-black">
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Carousel Sidebar */}
        <div className="w-64 flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-black border-r border-cyan-500/20 p-6 shadow-[4px_0_20px_rgba(0,242,234,0.1)]">
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
          
          <VideoCarousel
            chunks={chunks}
            selectedChunk={selectedChunk}
            onSelectChunk={handleSelectChunk}
          />
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
              onAnglesUpdate={videoAnglesRef}
              onVideoEnd={handleVideoEnd}
              onRestart={handleRestartVideo}
              className="w-[450px] h-[800px] relative z-10"
            />
            {showScoreScreen && (
                <div className="absolute inset-0 bg-black/95 rounded-2xl flex flex-col items-center justify-center z-50">
                  <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 mb-8">Score: {finalScore.toFixed(1)}%</h1>
                  <button
                    onClick={handleRestartVideo}
                    className="mt-8 px-8 py-3 bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 rounded-full font-bold text-black transition-all duration-200 shadow-[0_0_20px_rgba(0,242,234,0.5)] hover:shadow-[0_0_30px_rgba(0,242,234,0.8)]"
                  >
                    Try Again
                  </button>
                </div>
              )}
            {/* <div className="mt-4 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-pink-500/20 rounded-full border border-cyan-500/30">
              <p className="text-cyan-400 font-semibold text-sm">Tutorial</p>
            </div> */}
          </div>

          {/* Camera Feed */}
          <div className="flex flex-col items-center relative z-10">
            <div className="absolute -inset-4 bg-gradient-to-r from-pink-500 to-cyan-500 rounded-2xl opacity-20 blur-xl" />
            <CameraFeed 
            referenceAngles={videoAnglesRef.current} 
            comparisonResults={comparisonResultsRef.current}
            onCompare={handleCameraResults}
            className="w-[450px] h-[800px] relative z-10" />
            {/* <div className="mt-4 px-4 py-2 bg-gradient-to-r from-pink-500/20 to-cyan-500/20 rounded-full border border-pink-500/30">
              <p className="text-pink-400 font-semibold text-sm">Your Practice</p>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}