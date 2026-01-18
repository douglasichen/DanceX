import { useState, useEffect, useRef } from "react";
import { VideoCarousel } from "@/app/components/VideoCarousel";
import { VideoPlayer } from "@/app/components/VideoPlayer";
import { CameraFeed } from "@/app/components/CameraFeed";
import { Upload, Loader2 } from "lucide-react";
import sampleVideo from "../../media/C_720_shorter.mp4";
import { max } from "date-fns";
import { getIntervals } from "../utils/gemini";
import { getRandomArmTip, getRandomLegTip } from "@/app/components/Tips";
import { playSound } from "./components/Sounds";

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
  const abortControllerRef = useRef<AbortController | null>(null);
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
    // Cancel previous analysis
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const signal = abortController.signal;

    setIsAnalyzing(true);
    setChunks([]); // Clear previous chunks

    try {
      if (signal.aborted) return;

      // Get video duration
      const video = document.createElement("video");
      video.src = url;
      await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve(true);
      });
      const duration = video.duration;

      // Generate intervals using Gemini
      if (signal.aborted) return;
      const intervals = await getIntervals(file, signal);
      if (signal.aborted) return;
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

      if (signal.aborted) return;

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
      
      if (signal.aborted) return;
      
      setChunks(allChunks);
      console.log("allChunks: ", allChunks);
      
      if (newChunks.length > 0) {
        setSelectedChunk(newChunks[0].id);
      } else {
        setSelectedChunk(0);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log("Video analysis aborted.");
        return;
      }
      console.error("Error analyzing video:", error);
      // alert("Failed to analyze video intervals. Please try again.");
    } finally {
      // Only turn off analyzing if this is still the active request
      if (abortControllerRef.current === abortController) {
        setIsAnalyzing(false);
      }
    }
  };
  const [showScoreScreen, setShowScoreScreen] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [armsScore, setArmsScore] = useState(0);
  const [legsScore, setLegsScore] = useState(0);
  const [armsTip, setArmsTip] = useState("");
  const [legsTip, setLegsTip] = useState("");
  
  // A simple counter to track frames for the interval logic
  const frameCounterRef = useRef(0);
  const totalErrorRef = useRef(0);
  const totalSquaredErrorRef = useRef(0);
  const comparisonCountRef = useRef(0);

  const armsTotalErrorRef = useRef(0);
  const armsTotalSquaredErrorRef = useRef(0);
  const armsComparisonCountRef = useRef(0);

  const legsTotalErrorRef = useRef(0);
  const legsTotalSquaredErrorRef = useRef(0);
  const legsComparisonCountRef = useRef(0);

  const comparisonResultsRef = useRef<Record<number, number>>({});
  const videoAnglesRef = useRef<Record<number, number>>({});
  
  // Buffer to store recent video frames for latency compensation
  // Stores up to 30 frames (~1 second at 30fps)
  const videoHistoryRef = useRef<Array<Record<number, number>>>([]);

  const handleVideoAnglesUpdate = (angles: Record<number, number>) => {
    // Update the current reference for display purposes
    videoAnglesRef.current = angles;
    
    // Add to history buffer
    videoHistoryRef.current.push(angles);
    
    // Keep buffer size limited (e.g., last 30 frames)
    if (videoHistoryRef.current.length > 10) {
      videoHistoryRef.current.shift();
    }
  };

  const handleCameraResults = (camAngles: Record<number, number>) => {
    frameCounterRef.current++;

    // Only compare every 10 frames (~3 times a second at 30fps)
    if (frameCounterRef.current % 10 === 0) {
      
      // Find the best matching frame in our history buffer
      let bestFrameError = Infinity;
      let bestFrameDiffs: Record<number, number> = {};
      
      // If history is empty, fallback to current (though it shouldn't be if video is playing)
      const framesToCompare = videoHistoryRef.current.length > 0 
        ? videoHistoryRef.current 
        : [videoAnglesRef.current];

      console.log('CamAngles :', camAngles);

      framesToCompare.forEach((videoAngles) => {
        let currentFrameError = 0;
        let currentFrameDiffs: Record<number, number> = {};
        let jointCount = 0;

        // Calculate error for this specific video frame
        Object.keys(videoAngles).forEach((key) => {
          const idx = parseInt(key);
          let diff = 90; // Default large penalty

          if (camAngles[idx] !== undefined) {
             diff = Math.abs(camAngles[idx] - videoAngles[idx]);
          }
          
          currentFrameDiffs[idx] = diff;
          // Use squared error for finding best match to penalize outliers heavily
          currentFrameError += diff * diff;
          jointCount++;
        });

        // Normalize error by joint count to treat frames equally
        if (jointCount > 0) {
            currentFrameError = currentFrameError / jointCount;
        }

        // If this frame is a better match than previous ones, keep it
        if (currentFrameError < bestFrameError) {
            bestFrameError = currentFrameError;
            bestFrameDiffs = currentFrameDiffs;
        }
      });

      console.log("Best frame diffs: ", bestFrameDiffs);

      // Now accumulate the stats from the BEST matching frame
      Object.entries(bestFrameDiffs).forEach(([key, diff]) => {
          totalErrorRef.current += diff;
          totalSquaredErrorRef.current += diff * diff;
          comparisonCountRef.current++;

          const jointIdx = Number(key);
          if (!isNaN(jointIdx)) {
            if ([11, 12, 13, 14].includes(jointIdx)) {
              armsTotalErrorRef.current += diff;
              armsTotalSquaredErrorRef.current += diff * diff;
              armsComparisonCountRef.current++;
            } else if ([23, 24, 25, 26].includes(jointIdx)) {
              legsTotalErrorRef.current += diff;
              legsTotalSquaredErrorRef.current += diff * diff;
              legsComparisonCountRef.current++;
            }
          }
      });
      
      comparisonResultsRef.current = bestFrameDiffs;
    }
  };

  const handleVideoEnd = () => {
    let scorePercent = 0;
    let armsScorePercent = 0;
    let legsScorePercent = 0;

    const calculateScore = (totalSquared: number, count: number) => {
      if (count === 0) return 0;
      const rmsError = Math.sqrt(totalSquared / count);
      const maxTolerableError = 45;
      return Math.max(0, 100 * (1 - Math.pow(rmsError / maxTolerableError, 3)));
    };

    if (comparisonCountRef.current > 0) {
      const averageError = totalErrorRef.current / comparisonCountRef.current;
      const rmsError = Math.sqrt(totalSquaredErrorRef.current / comparisonCountRef.current);
      
      console.log(`Total Error: ${totalErrorRef.current.toFixed(2)}°`);
      console.log(`Average Error per Joint: ${averageError.toFixed(2)}°`);
      console.log(`RMS Error: ${rmsError.toFixed(2)}°`);
      console.log(`Total Comparisons: ${comparisonCountRef.current}`);
      console.log(`Arms Comparisons: ${armsComparisonCountRef.current}`);
      console.log(`Legs Comparisons: ${legsComparisonCountRef.current}`);

      // Calculate score using a cubic curve to separate good/bad performances
      // RMS Error of 0  => 100%
      // RMS Error of 26 => ~80% (Trying)
      // RMS Error of 34 => ~57% (Standing still)
      // RMS Error of 45+ => 0%
      const maxTolerableError = 45;
      scorePercent = Math.max(0, 100 * (1 - Math.pow(rmsError / maxTolerableError, 3)));

      armsScorePercent = calculateScore(armsTotalSquaredErrorRef.current, armsComparisonCountRef.current);
      legsScorePercent = calculateScore(legsTotalSquaredErrorRef.current, legsComparisonCountRef.current);
    }

    setFinalScore(scorePercent);
    setArmsScore(armsScorePercent);
    setLegsScore(legsScorePercent);

    setArmsTip(getRandomArmTip(armsScorePercent));
    setLegsTip(getRandomLegTip(legsScorePercent));

    setShowScoreScreen(true);

    playSound(scorePercent);

    // Reset counters for next video
    totalErrorRef.current = 0;
    totalSquaredErrorRef.current = 0;
    comparisonCountRef.current = 0;

    armsTotalErrorRef.current = 0;
    armsTotalSquaredErrorRef.current = 0;
    armsComparisonCountRef.current = 0;

    legsTotalErrorRef.current = 0;
    legsTotalSquaredErrorRef.current = 0;
    legsComparisonCountRef.current = 0;

    frameCounterRef.current = 0;

    comparisonResultsRef.current = {};
    videoAnglesRef.current = {};
    videoHistoryRef.current = [];
  };

  const handleRestartVideo = () => {
    setShowScoreScreen(false);
    setIsPlaying(true);

    frameCounterRef.current = 0;
    totalErrorRef.current = 0;
    totalSquaredErrorRef.current = 0;
    comparisonCountRef.current = 0;

    armsTotalErrorRef.current = 0;
    armsTotalSquaredErrorRef.current = 0;
    armsComparisonCountRef.current = 0;

    legsTotalErrorRef.current = 0;
    legsTotalSquaredErrorRef.current = 0;
    legsComparisonCountRef.current = 0;

    comparisonResultsRef.current = {};
    videoAnglesRef.current = {};
    videoHistoryRef.current = [];
  };

  useEffect(() => {
    // Set document title from env var
    document.title = import.meta.env.VITE_APP_TITLE || "Dance CV";

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
          <h2 className="bungee-inline text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 font-bold text-4xl mb-4 tracking-wide">Dance CV</h2>
          
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
              onAnglesUpdate={handleVideoAnglesUpdate}
              onVideoEnd={handleVideoEnd}
              onRestart={handleRestartVideo}
              className="w-[450px] h-[800px] relative z-10"
              startTime={(chunks.find(c => c.id === selectedChunk)?.startTime || 0) / 1000}
              endTime={(chunks.find(c => c.id === selectedChunk)?.endTime || 0)/1000}
            />
            {showScoreScreen && (
                <div className="absolute inset-0 bg-black/95 rounded-2xl flex flex-col items-center justify-center z-50">
                  <h1 className="bungee-inline text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 mb-8">Score: {finalScore.toFixed(1)}%</h1>
                  
                  <div className="flex gap-8 mb-8">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-cyan-400">{armsScore.toFixed(1)}%</span>
                      <span className="text-gray-400 text-sm uppercase tracking-wider">Arms</span>
                    </div>
                    <div className="w-px bg-gray-700"></div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-pink-500">{legsScore.toFixed(1)}%</span>
                      <span className="text-gray-400 text-sm uppercase tracking-wider">Legs</span>
                    </div>
                  </div>

                  {/* Tips Section */}
                  <div className="w-full max-w-md mb-12 space-y-6 px-6">
                    {/* Arms Tip */}
                    <div className="flex gap-3 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                      <span className="text-cyan-400 font-bold text-lg flex-shrink-0">💪</span>
                      <p className="text-cyan-300 text-sm leading-relaxed">{armsTip}</p>
                    </div>

                    {/* Legs Tip */}
                    <div className="flex gap-3 p-4 bg-pink-500/10 border border-pink-500/30 rounded-lg">
                      <span className="text-pink-400 font-bold text-lg flex-shrink-0">🦵</span>
                      <p className="text-pink-300 text-sm leading-relaxed">{legsTip}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleRestartVideo}
                    className="mt-4 px-8 py-3 bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 rounded-full font-bold text-black transition-all duration-200 shadow-[0_0_20px_rgba(0,242,234,0.5)] hover:shadow-[0_0_30px_rgba(0,242,234,0.8)]"
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
