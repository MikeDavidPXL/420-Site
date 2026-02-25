import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Tag } from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

const ChangelogSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    fetch("/changelog.json")
      .then((res) => res.json())
      .then((data) => setEntries(data))
      .catch(console.error);
  }, []);

  return (
    <section id="changelog" className="py-24 relative">
      <div className="container mx-auto px-4" ref={ref}>
        <motion.h2
          className="font-display text-3xl sm:text-4xl font-bold uppercase mb-12 text-center neon-text-purple text-secondary"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          Changelog
        </motion.h2>
        <div className="max-w-3xl mx-auto space-y-6">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.version}
              className="bg-card border border-border rounded-lg p-6 hover:neon-border-purple transition-all duration-300"
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Tag className="w-5 h-5 text-secondary" />
                <span className="font-display text-sm font-bold text-secondary">
                  v{entry.version}
                </span>
                <span className="text-muted-foreground text-xs">{entry.date}</span>
              </div>
              <h3 className="font-display text-lg font-bold mb-3 text-foreground">{entry.title}</h3>
              <ul className="space-y-1.5">
                {entry.changes.map((change, j) => (
                  <li key={j} className="text-muted-foreground text-sm flex items-start gap-2">
                    <span className="text-primary flex-shrink-0 leading-[1.25rem]">•</span>
                    {change}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ChangelogSection;