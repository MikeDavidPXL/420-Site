import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import FeaturesSection from "@/components/FeaturesSection";
import VideoSection from "@/components/VideoSection";
import ChangelogSection from "@/components/ChangelogSection";
import DownloadSection from "@/components/DownloadSection";
import Footer from "@/components/Footer";

const NAV_THRESHOLD = 100;
const CONTENT_THRESHOLD = 150;

const Index = () => {
  const [scrollY, setScrollY] = useState(0);
  const initialHeight = useRef(
    typeof window !== "undefined" ? window.innerHeight : 800
  );

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hero fades out over 70% of the initial viewport height
  const heroOpacity = Math.max(0, 1 - scrollY / (initialHeight.current * 0.7));
  const showNav = scrollY > NAV_THRESHOLD;
  const showContent = scrollY > CONTENT_THRESHOLD;

  return (
    <div className="min-h-screen bg-background">
      <Navbar visible={showNav} />

      {/* Hero - fades out as user scrolls */}
      <div
        style={{ opacity: heroOpacity }}
        className="will-change-[opacity]"
      >
        <HeroSection />
      </div>

      {/* Content sections - revealed after scroll threshold */}
      <div
        className={`transition-all duration-700 ease-out ${
          showContent
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-8"
        }`}
      >
        <AboutSection />
        <FeaturesSection />
        <VideoSection />
        <ChangelogSection />
        <DownloadSection />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
