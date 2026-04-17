import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Camera, CameraOff, Music, ExternalLink } from "lucide-react";
import Layout from "@/components/Layout";
import * as faceapi from "face-api.js";

const MOOD_PLAYLISTS: Record<string, { label: string; url: string; emoji: string }> = {
  happy: { label: "Feel Good Hits", url: "https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC", emoji: "😊" },
  sad: { label: "Mood Booster", url: "https://open.spotify.com/playlist/37i9dQZF1DX3rxVfibe1L0", emoji: "😢" },
  angry: { label: "Calm Vibes", url: "https://open.spotify.com/playlist/37i9dQZF1DWXe9gFZP0gtP", emoji: "😤" },
  surprised: { label: "Discover Weekly", url: "https://open.spotify.com/playlist/37i9dQZF1EIhuFg7VNlJEr", emoji: "😮" },
  neutral: { label: "Chill Hits", url: "https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6", emoji: "😐" },
  fearful: { label: "Peaceful Piano", url: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO", emoji: "😰" },
  disgusted: { label: "Deep Focus", url: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ", emoji: "🤢" },
};

const FaceDetection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [expression, setExpression] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  const loadModels = useCallback(async () => {
    try {
      const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      setIsLoading(false);
    } catch {
      setError("Failed to load face detection models");
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [loadModels]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      startDetection();
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraOn(false);
    setExpression(null);
  };

  const startDetection = () => {
    intervalRef.current = window.setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      if (video.readyState < 2 || !video.videoWidth) return;

      const detections = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);

      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);

      if (detections) {
        const resized = faceapi.resizeResults(detections, displaySize);
        faceapi.draw.drawDetections(canvas, resized);

        const sorted = Object.entries(detections.expressions).sort((a, b) => b[1] - a[1]);
        if (sorted[0][1] > 0.5) {
          setExpression(sorted[0][0]);
        }
      }
    }, 500);
  };

  const playlist = expression ? MOOD_PLAYLISTS[expression] : null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
          <h1 className="font-heading text-4xl font-bold mb-2 text-gradient">Mood Detection</h1>
          <p className="text-muted-foreground mb-8">Let AI read your expression and suggest the perfect playlist</p>

          {error && (
            <div className="glass rounded-xl p-4 mb-6 border-destructive/50 text-destructive">{error}</div>
          )}

          {/* Camera View */}
          <div className="glass rounded-2xl overflow-hidden mb-8">
            <div className="relative aspect-video bg-secondary flex items-center justify-center">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
              {!cameraOn && (
                <div className="text-center z-10">
                  <CameraOff className="text-muted-foreground mx-auto mb-3" size={48} />
                  <p className="text-muted-foreground">Camera is off</p>
                </div>
              )}
            </div>
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={cameraOn ? stopCamera : startCamera}
                disabled={isLoading}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  cameraOn
                    ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                    : "bg-primary/20 text-primary hover:bg-primary/30"
                } disabled:opacity-50`}
              >
                {cameraOn ? <CameraOff size={16} /> : <Camera size={16} />}
                {isLoading ? "Loading models..." : cameraOn ? "Stop Camera" : "Start Camera"}
              </button>

              {expression && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="text-2xl">{playlist?.emoji}</span>
                  <span className="text-foreground font-medium capitalize">{expression}</span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Playlist Suggestion */}
          {playlist && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 glow-primary"
            >
              <div className="flex items-center gap-3 mb-4">
                <Music className="text-primary" size={24} />
                <h2 className="font-heading text-xl font-semibold">Suggested Playlist</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Based on your <span className="text-primary capitalize">{expression}</span> mood, we recommend:
              </p>
              <a
                href={playlist.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                <span>Open "{playlist.label}" on Spotify</span>
                <ExternalLink size={16} />
              </a>
            </motion.div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
};

export default FaceDetection;
