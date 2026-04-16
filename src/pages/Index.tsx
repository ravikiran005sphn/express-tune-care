import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Brain, Hand, Heart, Sparkles } from "lucide-react";
import Layout from "@/components/Layout";

const features = [
  {
    to: "/face-detection",
    icon: Brain,
    title: "Mood Detection",
    desc: "AI reads your facial expressions and suggests music to match or uplift your mood",
    gradient: "from-primary/20 to-primary/5",
    glow: "glow-primary",
  },
  {
    to: "/hand-gesture",
    icon: Hand,
    title: "Gesture Control",
    desc: "Control music playback with hand gestures — play, pause, skip, and shuffle",
    gradient: "from-accent/20 to-accent/5",
    glow: "glow-accent",
  },
  {
    to: "/wellness",
    icon: Heart,
    title: "Wellness Guide",
    desc: "Gratitude journal, exercises, food tips, and travel suggestions for mental health",
    gradient: "from-primary/20 to-accent/5",
    glow: "glow-primary",
  },
];

const Index = () => (
  <Layout>
    <div className="container mx-auto px-4 py-20">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-20"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="inline-block mb-6"
        >
          <Sparkles className="text-primary" size={48} />
        </motion.div>
        <h1 className="font-heading text-5xl md:text-7xl font-bold mb-6">
          <span className="text-gradient">MoodSync</span>
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          Your AI-powered wellness companion. Detect emotions, control music with gestures,
          and nurture your mental health — all in one place.
        </p>
      </motion.div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {features.map((f, i) => (
          <motion.div
            key={f.to}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.15, duration: 0.6 }}
          >
            <Link to={f.to} className="block group">
              <div
                className={`glass glass-hover rounded-2xl p-8 h-full ${f.glow} animate-pulse-glow`}
                style={{ animationDelay: `${i * 1}s` }}
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-5`}
                >
                  <f.icon className="text-primary" size={26} />
                </div>
                <h3 className="font-heading font-semibold text-xl mb-3 text-foreground group-hover:text-primary transition-colors">
                  {f.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  </Layout>
);

export default Index;
