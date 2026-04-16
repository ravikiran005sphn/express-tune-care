import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Play, Pause, SkipForward, Shuffle, Volume2 } from "lucide-react";
import Layout from "@/components/Layout";
import { Hands, Results } from "@mediapipe/hands";
import { Camera as MPCamera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";

const SAMPLE_TRACKS = [
  { title: "Calm Waves", artist: "Nature Sounds", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { title: "Morning Light", artist: "Ambient", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { title: "Deep Focus", artist: "Lo-Fi Beats", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { title: "Sunset Drive", artist: "Chillhop", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
];

type Gesture = "open_palm" | "fist" | "point_up" | "thumbs_up" | null;

function detectGesture(landmarks: Results["multiHandLandmarks"][0]): Gesture {
  if (!landmarks || landmarks.length < 21) return null;

  const fingerTips = [8, 12, 16, 20]; // index, middle, ring, pinky tips
  const fingerPIPs = [6, 10, 14, 18]; // PIP joints
  const thumbTip = 4;
  const thumbIP = 3;

  // Check if each finger is extended
  const fingersUp = fingerTips.map((tip, i) => landmarks[tip].y < landmarks[fingerPIPs[i]].y);
  const thumbUp = landmarks[thumbTip].y < landmarks[thumbIP].y;

  const extendedCount = fingersUp.filter(Boolean).length + (thumbUp ? 1 : 0);

  // Open palm: all 5 fingers extended
  if (extendedCount >= 4) return "open_palm";

  // Fist: no fingers extended
  if (extendedCount <= 1 && !fingersUp[0]) return "fist";

  // Point up: only index finger extended
  if (fingersUp[0] && !fingersUp[1] && !fingersUp[2] && !fingersUp[3]) return "point_up";

  // Thumbs up: only thumb extended
  if (thumbUp && !fingersUp[0] && !fingersUp[1] && !fingersUp[2] && !fingersUp[3]) return "thumbs_up";

  return null;
}

const GESTURE_INFO: Record<string, { label: string; icon: typeof Play; emoji: string }> = {
  open_palm: { label: "Pause", icon: Pause, emoji: "✋" },
  fist: { label: "Play", icon: Play, emoji: "✊" },
  point_up: { label: "Next Track", icon: SkipForward, emoji: "☝️" },
  thumbs_up: { label: "Shuffle", icon: Shuffle, emoji: "👍" },
};

const HandGesture = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const cameraRef = useRef<MPCamera | null>(null);
  const lastGestureRef = useRef<Gesture>(null);
  const gestureCountRef = useRef(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [gesture, setGesture] = useState<Gesture>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleGestureAction = useCallback(
    (g: Gesture) => {
      if (!g || !audioRef.current) return;

      switch (g) {
        case "open_palm":
          audioRef.current.pause();
          setIsPlaying(false);
          break;
        case "fist":
          audioRef.current.play();
          setIsPlaying(true);
          break;
        case "point_up":
          setTrackIndex((prev) => (prev + 1) % SAMPLE_TRACKS.length);
          break;
        case "thumbs_up":
          setTrackIndex(Math.floor(Math.random() * SAMPLE_TRACKS.length));
          break;
      }
    },
    []
  );

  const startCamera = async () => {
    if (!videoRef.current) return;
    try {
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results: Results) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = results.image.width;
        canvas.height = results.image.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: "hsl(174, 72%, 50%)", lineWidth: 2 });
            drawLandmarks(ctx, landmarks, { color: "hsl(280, 60%, 55%)", lineWidth: 1, radius: 3 });
          }

          const detected = detectGesture(results.multiHandLandmarks[0]);
          if (detected) {
            if (detected === lastGestureRef.current) {
              gestureCountRef.current++;
            } else {
              gestureCountRef.current = 1;
              lastGestureRef.current = detected;
            }

            // Require 3 consecutive frames of same gesture to trigger
            if (gestureCountRef.current === 3) {
              setGesture(detected);
              handleGestureAction(detected);
              gestureCountRef.current = 0;
            }
          }
        }
      });

      const camera = new MPCamera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) await hands.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });

      await camera.start();
      cameraRef.current = camera;
      setCameraOn(true);
    } catch {
      setError("Camera access denied or MediaPipe failed to load.");
    }
  };

  const stopCamera = () => {
    cameraRef.current?.stop();
    setCameraOn(false);
    setGesture(null);
  };

  // Update audio source when track changes
  useEffect(() => {
    if (audioRef.current) {
      const wasPlaying = isPlaying;
      audioRef.current.src = SAMPLE_TRACKS[trackIndex].src;
      if (wasPlaying) {
        audioRef.current.play();
      }
    }
  }, [trackIndex]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
          <h1 className="font-heading text-4xl font-bold mb-2 text-gradient">Gesture Control</h1>
          <p className="text-muted-foreground mb-8">Control music with your hands</p>

          {error && (
            <div className="glass rounded-xl p-4 mb-6 border-destructive/50 text-destructive">{error}</div>
          )}

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Camera */}
            <div className="lg:col-span-3">
              <div className="glass rounded-2xl overflow-hidden">
                <div className="relative aspect-video bg-secondary flex items-center justify-center">
                  <video ref={videoRef} className="hidden" muted playsInline />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
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
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
                      cameraOn
                        ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                        : "bg-primary/20 text-primary hover:bg-primary/30"
                    }`}
                  >
                    {cameraOn ? <CameraOff size={16} /> : <Camera size={16} />}
                    {cameraOn ? "Stop Camera" : "Start Camera"}
                  </button>

                  <AnimatePresence mode="wait">
                    {gesture && GESTURE_INFO[gesture] && (
                      <motion.div
                        key={gesture}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20"
                      >
                        <span className="text-xl">{GESTURE_INFO[gesture].emoji}</span>
                        <span className="text-primary font-medium text-sm">{GESTURE_INFO[gesture].label}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Controls & Track Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Now Playing */}
              <div className="glass rounded-2xl p-6 glow-primary">
                <div className="flex items-center gap-2 mb-4">
                  <Volume2 className="text-primary" size={20} />
                  <span className="text-sm font-medium text-muted-foreground">Now Playing</span>
                </div>
                <h3 className="font-heading text-lg font-semibold">{SAMPLE_TRACKS[trackIndex].title}</h3>
                <p className="text-muted-foreground text-sm">{SAMPLE_TRACKS[trackIndex].artist}</p>
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        if (isPlaying) {
                          audioRef.current.pause();
                        } else {
                          audioRef.current.play();
                        }
                        setIsPlaying(!isPlaying);
                      }
                    }}
                    className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <button
                    onClick={() => setTrackIndex((prev) => (prev + 1) % SAMPLE_TRACKS.length)}
                    className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <SkipForward size={18} />
                  </button>
                  <button
                    onClick={() => setTrackIndex(Math.floor(Math.random() * SAMPLE_TRACKS.length))}
                    className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Shuffle size={18} />
                  </button>
                </div>
                <audio ref={audioRef} src={SAMPLE_TRACKS[trackIndex].src} />
              </div>

              {/* Gesture Guide */}
              <div className="glass rounded-2xl p-6">
                <h3 className="font-heading font-semibold mb-4">Gesture Guide</h3>
                <div className="space-y-3">
                  {Object.entries(GESTURE_INFO).map(([key, info]) => (
                    <div
                      key={key}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        gesture === key ? "bg-primary/10 border border-primary/20" : ""
                      }`}
                    >
                      <span className="text-xl">{info.emoji}</span>
                      <div>
                        <span className="text-sm font-medium">{info.label}</span>
                        <p className="text-xs text-muted-foreground capitalize">{key.replace("_", " ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default HandGesture;
