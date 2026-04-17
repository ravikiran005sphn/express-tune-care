import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Play, Pause, SkipForward, Shuffle, Volume2 } from "lucide-react";
import Layout from "@/components/Layout";

const SAMPLE_TRACKS = [
  { title: "Calm Waves", artist: "Nature Sounds", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { title: "Morning Light", artist: "Ambient", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { title: "Deep Focus", artist: "Lo-Fi Beats", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { title: "Sunset Drive", artist: "Chillhop", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
];

type Gesture = "open_palm" | "fist" | "point_up" | "thumbs_up" | null;
type Landmark = { x: number; y: number; z: number };

function detectGesture(landmarks: Landmark[]): Gesture {
  if (!landmarks || landmarks.length < 21) return null;
  const fingerTips = [8, 12, 16, 20];
  const fingerPIPs = [6, 10, 14, 18];
  const fingersUp = fingerTips.map((tip, i) => landmarks[tip].y < landmarks[fingerPIPs[i]].y);
  const thumbUp = landmarks[4].y < landmarks[3].y;
  const extendedCount = fingersUp.filter(Boolean).length + (thumbUp ? 1 : 0);

  if (extendedCount >= 4) return "open_palm";
  if (extendedCount <= 1 && !fingersUp[0]) return "fist";
  if (fingersUp[0] && !fingersUp[1] && !fingersUp[2] && !fingersUp[3]) return "point_up";
  if (thumbUp && !fingersUp[0] && !fingersUp[1] && !fingersUp[2] && !fingersUp[3]) return "thumbs_up";
  return null;
}

const GESTURE_INFO: Record<string, { label: string; emoji: string }> = {
  open_palm: { label: "Pause", emoji: "✋" },
  fist: { label: "Play", emoji: "✊" },
  point_up: { label: "Next Track", emoji: "☝️" },
  thumbs_up: { label: "Shuffle", emoji: "👍" },
};

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const MP_VERSION = "0.4.1646424915";
const MP_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MP_VERSION}`;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

const HandGesture = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handsRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastGestureRef = useRef<Gesture>(null);
  const gestureCountRef = useRef(0);
  const cooldownRef = useRef(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gesture, setGesture] = useState<Gesture>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleGestureAction = useCallback((g: Gesture) => {
    if (!g || !audioRef.current) return;
    switch (g) {
      case "open_palm":
        audioRef.current.pause();
        setIsPlaying(false);
        break;
      case "fist":
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
        break;
      case "point_up":
        setTrackIndex((p) => (p + 1) % SAMPLE_TRACKS.length);
        break;
      case "thumbs_up":
        setTrackIndex(Math.floor(Math.random() * SAMPLE_TRACKS.length));
        break;
    }
  }, []);

  const drawFrame = (results: { image: CanvasImageSource; multiHandLandmarks?: Landmark[][] }) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // mirror
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (const lm of results.multiHandLandmarks) {
        ctx.strokeStyle = "hsl(174, 72%, 50%)";
        ctx.lineWidth = 3;
        for (const [a, b] of HAND_CONNECTIONS) {
          ctx.beginPath();
          ctx.moveTo(lm[a].x * canvas.width, lm[a].y * canvas.height);
          ctx.lineTo(lm[b].x * canvas.width, lm[b].y * canvas.height);
          ctx.stroke();
        }
        ctx.fillStyle = "hsl(280, 60%, 55%)";
        for (const p of lm) {
          ctx.beginPath();
          ctx.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const detected = detectGesture(results.multiHandLandmarks[0]);
      if (detected && cooldownRef.current <= 0) {
        if (detected === lastGestureRef.current) {
          gestureCountRef.current++;
        } else {
          gestureCountRef.current = 1;
          lastGestureRef.current = detected;
        }
        if (gestureCountRef.current >= 3) {
          setGesture(detected);
          handleGestureAction(detected);
          gestureCountRef.current = 0;
          cooldownRef.current = 30; // ~1s cooldown at 30fps
        }
      }
    }
    if (cooldownRef.current > 0) cooldownRef.current--;
    ctx.restore();
  };

  const startCamera = async () => {
    setError(null);
    setLoading(true);
    try {
      // Load MediaPipe from CDN to avoid Vite WASM bundling issues
      await loadScript(`${MP_BASE}/hands.js`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const HandsCtor = (window as any).Hands;
      if (!HandsCtor) throw new Error("MediaPipe Hands failed to load from CDN");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const hands = new HandsCtor({
        locateFile: (file: string) => `${MP_BASE}/${file}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });
      hands.onResults(drawFrame);
      handsRef.current = hands;

      const loop = async () => {
        if (!videoRef.current || !handsRef.current) return;
        if (videoRef.current.readyState >= 2) {
          try {
            await handsRef.current.send({ image: videoRef.current });
          } catch (e) {
            console.error("hands.send error", e);
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);

      setCameraOn(true);
    } catch (err) {
      console.error("Hand gesture start error:", err);
      setError(`Failed to start: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (handsRef.current) {
      try { handsRef.current.close(); } catch { /* ignore */ }
      handsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setGesture(null);
    lastGestureRef.current = null;
    gestureCountRef.current = 0;
    cooldownRef.current = 0;
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (handsRef.current) { try { handsRef.current.close(); } catch { /* ignore */ } }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      const wasPlaying = isPlaying;
      audioRef.current.src = SAMPLE_TRACKS[trackIndex].src;
      if (wasPlaying) audioRef.current.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIndex]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
          <h1 className="font-heading text-4xl font-bold mb-2 text-gradient">Gesture Control</h1>
          <p className="text-muted-foreground mb-8">Control music with your hands</p>

          {error && (
            <div className="glass rounded-xl p-4 mb-6 border border-destructive/50 text-destructive">{error}</div>
          )}

          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <div className="glass rounded-2xl overflow-hidden">
                <div className="relative aspect-video bg-secondary flex items-center justify-center">
                  <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none" muted playsInline autoPlay />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
                  {!cameraOn && !loading && (
                    <div className="text-center z-10">
                      <CameraOff className="text-muted-foreground mx-auto mb-3" size={48} />
                      <p className="text-muted-foreground">Camera is off</p>
                    </div>
                  )}
                  {loading && (
                    <div className="text-center z-10">
                      <p className="text-muted-foreground animate-pulse">Loading MediaPipe…</p>
                    </div>
                  )}
                </div>
                <div className="p-4 flex items-center justify-between">
                  <button
                    onClick={cameraOn ? stopCamera : startCamera}
                    disabled={loading}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-50 ${
                      cameraOn
                        ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                        : "bg-primary/20 text-primary hover:bg-primary/30"
                    }`}
                  >
                    {cameraOn ? <CameraOff size={16} /> : <Camera size={16} />}
                    {cameraOn ? "Stop Camera" : loading ? "Starting…" : "Start Camera"}
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

            <div className="lg:col-span-2 space-y-6">
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
                        if (isPlaying) audioRef.current.pause();
                        else audioRef.current.play().catch(() => {});
                        setIsPlaying(!isPlaying);
                      }
                    }}
                    className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <button
                    onClick={() => setTrackIndex((p) => (p + 1) % SAMPLE_TRACKS.length)}
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
