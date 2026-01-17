import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";

interface CameraFeedProps {
  className?: string;
}

export function CameraFeed({ className }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsActive(true);
        setError(null);
      }
    } catch (err) {
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
      setIsActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
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
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
        
        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black">
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
          <button
            onClick={stopCamera}
            className="absolute top-4 right-4 p-3 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-full transition-all duration-200 border border-pink-500/30 shadow-lg hover:shadow-pink-500/20"
          >
            <CameraOff className="w-5 h-5 text-pink-400" />
          </button>
        )}

        {isActive && (
          <div className="absolute top-4 left-4 px-4 py-2 bg-black/80 backdrop-blur-sm rounded-full border border-pink-500/30">
            <p className="text-xs font-semibold text-pink-400">Live</p>
          </div>
        )}
      </div>
    </div>
  );
}