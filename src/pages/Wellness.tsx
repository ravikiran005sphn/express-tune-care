import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Dumbbell,
  UtensilsCrossed,
  MapPin,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";
import Layout from "@/components/Layout";

type Tab = "gratitude" | "exercises" | "food" | "travel";

const EXERCISES = [
  { title: "5-Minute Breathing", desc: "Box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s. Repeat 5 rounds.", icon: "🧘" },
  { title: "Morning Walk", desc: "A 20-minute walk in nature. Focus on sounds, smells, and textures around you.", icon: "🚶" },
  { title: "Gentle Yoga Flow", desc: "Sun salutations for 10 minutes. Move slowly, breathe deeply.", icon: "🤸" },
  { title: "Body Scan Meditation", desc: "Lie down, close eyes. Slowly scan from toes to head, releasing tension.", icon: "💆" },
  { title: "Journaling", desc: "Write 3 things you're grateful for and 1 thing you'd like to improve.", icon: "📝" },
  { title: "Progressive Muscle Relaxation", desc: "Tense and release each muscle group for 5 seconds, head to toe.", icon: "💪" },
];

const FOODS = [
  { title: "Dark Chocolate", desc: "Rich in antioxidants and boosts serotonin. Aim for 70%+ cacao.", icon: "🍫" },
  { title: "Salmon & Fatty Fish", desc: "Omega-3 fatty acids reduce inflammation and support brain health.", icon: "🐟" },
  { title: "Berries", desc: "Blueberries, strawberries — packed with antioxidants that fight oxidative stress.", icon: "🫐" },
  { title: "Nuts & Seeds", desc: "Walnuts, almonds, flaxseeds — healthy fats and magnesium for mood.", icon: "🥜" },
  { title: "Leafy Greens", desc: "Spinach, kale — folate supports neurotransmitter production.", icon: "🥬" },
  { title: "Fermented Foods", desc: "Yogurt, kimchi — gut health directly impacts mood via the gut-brain axis.", icon: "🥛" },
];

const PLACES = [
  { title: "Beach / Ocean", desc: "The sound of waves and salty air have proven calming effects on the brain.", icon: "🏖️" },
  { title: "Mountain Trails", desc: "Hiking in elevation gives perspective, fresh air, and natural endorphins.", icon: "🏔️" },
  { title: "Botanical Gardens", desc: "Surrounded by greenery, flowers, and gentle paths for mindful walking.", icon: "🌿" },
  { title: "Hot Springs", desc: "Warm mineral water relaxes muscles and calms the nervous system.", icon: "♨️" },
  { title: "Forest Retreat", desc: "Forest bathing (Shinrin-yoku) reduces cortisol and boosts immunity.", icon: "🌲" },
  { title: "Lakeside Cabin", desc: "Stillness of a lake, campfires, and disconnection from screens.", icon: "🏕️" },
];

const tabs: { id: Tab; label: string; icon: typeof Heart }[] = [
  { id: "gratitude", label: "Gratitude", icon: Heart },
  { id: "exercises", label: "Exercises", icon: Dumbbell },
  { id: "food", label: "Food", icon: UtensilsCrossed },
  { id: "travel", label: "Travel", icon: MapPin },
];

const Wellness = () => {
  const [activeTab, setActiveTab] = useState<Tab>("gratitude");
  const [entries, setEntries] = useState<{ id: number; text: string; date: string }[]>(() => {
    const saved = localStorage.getItem("gratitude-entries");
    return saved ? JSON.parse(saved) : [];
  });
  const [newEntry, setNewEntry] = useState("");

  const addEntry = () => {
    if (!newEntry.trim()) return;
    const updated = [
      { id: Date.now(), text: newEntry.trim(), date: new Date().toLocaleDateString() },
      ...entries,
    ];
    setEntries(updated);
    localStorage.setItem("gratitude-entries", JSON.stringify(updated));
    setNewEntry("");
  };

  const removeEntry = (id: number) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    localStorage.setItem("gratitude-entries", JSON.stringify(updated));
  };

  const renderCards = (items: { title: string; desc: string; icon: string }[]) => (
    <div className="grid sm:grid-cols-2 gap-4">
      {items.map((item, i) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="glass glass-hover rounded-xl p-5"
        >
          <span className="text-2xl mb-3 block">{item.icon}</span>
          <h3 className="font-heading font-semibold mb-1">{item.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
        </motion.div>
      ))}
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="text-primary" size={28} />
            <h1 className="font-heading text-4xl font-bold text-gradient">Wellness Guide</h1>
          </div>
          <p className="text-muted-foreground mb-8">Your personal companion for mental health and self-care</p>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 flex-wrap">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === id
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-secondary text-secondary-foreground hover:bg-muted"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {activeTab === "gratitude" && (
                <div>
                  <div className="glass rounded-xl p-4 mb-6 flex gap-3">
                    <input
                      value={newEntry}
                      onChange={(e) => setNewEntry(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addEntry()}
                      placeholder="What are you grateful for today?"
                      className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                      onClick={addEntry}
                      className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>

                  {entries.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <Heart className="mx-auto mb-3 opacity-50" size={48} />
                      <p>Start your gratitude journey. Write your first entry above.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {entries.map((entry, i) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="glass rounded-xl p-4 flex items-start justify-between gap-4 group"
                        >
                          <div>
                            <p className="text-foreground">{entry.text}</p>
                            <p className="text-xs text-muted-foreground mt-1">{entry.date}</p>
                          </div>
                          <button
                            onClick={() => removeEntry(entry.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === "exercises" && renderCards(EXERCISES)}
              {activeTab === "food" && renderCards(FOODS)}
              {activeTab === "travel" && renderCards(PLACES)}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Wellness;
