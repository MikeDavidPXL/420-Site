import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const AboutSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="about" className="py-24 relative smoke-overlay">
      <div className="container mx-auto px-4" ref={ref}>
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase mb-6 neon-text-blue text-primary">
            About 420 Clan
          </h2>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            We are <span className="text-primary font-semibold">420 Clan</span> — a 
            community of dedicated FiveM players who take CosmicV to the next level. 
            Our texture pack made by <span className="text-primary font-semibold">M1K3</span> is designed to fully transform your server experience 
            with high-quality custom content.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { number: "50+", label: "Custom Textures" },
              { number: "24/7", label: "Community Support In Discord" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="bg-card border border-border rounded-lg p-6 neon-border-blue"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              >
                <div className="font-display text-3xl font-black gradient-neon-text mb-1">
                  {stat.number}
                </div>
                <div className="text-muted-foreground text-sm uppercase tracking-wider">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
