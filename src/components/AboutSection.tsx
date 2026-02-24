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
            Over 420 Clan
          </h2>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Wij zijn de <span className="text-primary font-semibold">420 Clan</span> — een 
            community van dedicated FiveM spelers die de game naar een hoger level tillen. 
            Ons texture pack is speciaal ontworpen om je server ervaring compleet te transformeren 
            met custom content van de hoogste kwaliteit.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { number: "50+", label: "Custom Textures" },
              { number: "1K+", label: "Downloads" },
              { number: "24/7", label: "Community Support" },
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
