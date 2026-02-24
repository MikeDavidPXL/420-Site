import { motion } from "framer-motion";
import { Download } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";
import clanLogo from "@/assets/clan-logo.png";

const HeroSection = () => {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroBanner}
          alt="420 Clan Banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/60" />
        <div className="absolute inset-0 smoke-overlay" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <motion.img
          src={clanLogo}
          alt="420 Clan Logo"
          className="w-28 h-28 mx-auto mb-6 rounded-full neon-box-blue"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
        />
        <motion.h1
          className="font-display text-4xl sm:text-5xl md:text-7xl font-black uppercase mb-4 gradient-neon-text"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          420 Clan Texture Pack
        </motion.h1>
        <motion.p
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 font-body"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          Upgrade je FiveM ervaring met onze exclusieve custom textures. 
          Kleding, wapens, voertuigen en meer — alles in één pack.
        </motion.p>
        <motion.a
          href="#download"
          className="inline-flex items-center gap-3 bg-primary text-primary-foreground font-display font-bold text-lg px-8 py-4 rounded-lg neon-box-blue hover:scale-105 transition-transform duration-200 uppercase tracking-wider"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <Download className="w-5 h-5" />
          Download Nu
        </motion.a>
      </div>
    </section>
  );
};

export default HeroSection;
