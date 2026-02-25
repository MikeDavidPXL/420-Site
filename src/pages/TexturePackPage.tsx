// Pack page — restored old look with full section layout
// Staff sees admin panel link in navbar; private/staff both see this page
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import {
  Download,
  FileArchive,
  HardDrive,
  Hash,
  Crosshair,
  Car,
  Zap,
  RefreshCw,
  Tag,
  Shield,
  Loader2,
  LogOut,
  BookOpen,
  Users,
  Menu,
  X,
} from "lucide-react";
import clanLogo from "@/assets/clan-logo.png";
import heroBanner from "@/assets/420Gif.png";

// ── Types ─────────────────────────────────────────────────
interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
  fileSize?: string;
}

const DOWNLOAD_URL =
  "https://drive.google.com/drive/u/0/folders/1-rMFHAWvzPGLfbwvgcGsbM5_fB0cdHwa";

const features = [
  { icon: Crosshair, title: "Weapon Skins", description: "Exclusive weapon textures for all weapons in CosmicV" },
  { icon: Car, title: "Vehicle Liveries", description: "!!STILL A WIP!!" },
  { icon: Zap, title: "Performance Friendly", description: "Optimized as best i can for minimal FPS impact with the beautiful textures. It will cost some fps." },
  { icon: RefreshCw, title: "Regular Updates", description: "New content and improvements when i got time... This is all still a test." },
];

// ── Nav items (staff gets Admin Panel link, private/staff get Installation) ──
const getNavItems = (isStaff: boolean) => {
  const items = [
    { label: "Home", href: "#hero" },
    { label: "About Us", href: "#about" },
    { label: "Features", href: "#features" },
    { label: "Showcase", href: "#video" },
    { label: "Changelog", href: "#changelog" },
    { label: "Download", href: "#download" },
    { label: "Installation", href: "/installation", route: true },
  ];
  // Staff-only items are now in the shield dropdown menu
  return items;
};

// ══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════
const POLL_INTERVAL = 10_000; // 10s

const TexturePackPage = () => {
  const { user, loading } = useAuth();
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [latestVersion, setLatestVersion] = useState("1.2.0");
  const [fileSize, setFileSize] = useState("601.6 MB");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch("/changelog.json")
      .then((res) => res.json())
      .then((data: ChangelogEntry[]) => {
        setChangelog(data);
        if (data.length > 0) {
          setLatestVersion(data[0].version);
          if (data[0].fileSize) setFileSize(data[0].fileSize);
        }
      })
      .catch(console.error);
  }, []);

  // ── Pending count polling (staff only) ──────────────────
  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await fetch("/.netlify/functions/admin-pending-count");
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.pending ?? 0);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!user?.is_staff) return;
    fetchPendingCount();
    const id = setInterval(fetchPendingCount, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [user, fetchPendingCount]);

  // Guard: must be logged in + have private or staff role
  if (!loading && (!user || (!user.is_private && !user.is_staff))) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const navItems = getNavItems(user!.is_staff);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navbar ────────────────────────────────────────── */}
      <PackNavbar navItems={navItems} user={user!} pendingCount={pendingCount} />

      {/* ── Hero Section ─────────────────────────────────── */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBanner} alt="420 Clan Banner" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-background/60" />
          <div className="absolute inset-0 smoke-overlay" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>
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
            style={{ WebkitTextStroke: "2px rgba(0, 0, 0, 0.2)" }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            420 Clan Texture Pack
          </motion.h1>
          <motion.p
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-8 font-body"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            Upgrade your FiveM experience with our exclusive custom textures.
            Clothing, weapons, vehicles, and more — all in one pack.
          </motion.p>
          <motion.a
            href="#download"
            className="inline-flex items-center gap-3 bg-primary text-primary-foreground font-display font-bold text-lg px-8 py-4 rounded-lg neon-box-blue hover:scale-105 transition-transform duration-200 uppercase tracking-wider"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <Download className="w-5 h-5" />
            Download Now
          </motion.a>
        </div>
      </section>

      {/* ── About Section ────────────────────────────────── */}
      <AnimatedSection id="about" className="py-24 relative smoke-overlay">
        {(isInView) => (
          <div className="container mx-auto px-4">
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
        )}
      </AnimatedSection>

      {/* ── Features Section ─────────────────────────────── */}
      <AnimatedSection id="features" className="py-24 relative">
        {(isInView) => (
          <div className="container mx-auto px-4">
            <motion.h2
              className="font-display text-3xl sm:text-4xl font-bold uppercase mb-12 text-center neon-text-purple text-secondary"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
            >
              What's Included?
            </motion.h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  className="bg-card border border-border rounded-lg p-6 group hover:neon-border-purple transition-all duration-300"
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.1 * i, duration: 0.5 }}
                >
                  <feature.icon className="w-10 h-10 text-secondary mb-4 group-hover:drop-shadow-[0_0_10px_hsl(270_80%_60%_/_0.6)] transition-all duration-300" />
                  <h3 className="font-display text-lg font-bold mb-2 text-foreground">{feature.title}</h3>
                  <p className={`text-sm ${feature.description.includes("WIP") ? "text-secondary neon-text-purple font-semibold tracking-wider uppercase animate-pulse" : "text-muted-foreground"}`}>
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </AnimatedSection>

      {/* ── Video Section ────────────────────────────────── */}
      <AnimatedSection id="video" className="py-24 relative smoke-overlay">
        {(isInView) => (
          <div className="container mx-auto px-4">
            <motion.h2
              className="font-display text-3xl sm:text-4xl font-bold uppercase mb-4 text-center neon-text-blue text-primary"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
            >
              Update & Showcase
            </motion.h2>
            <motion.p
              className="text-muted-foreground text-center mb-10 max-w-lg mx-auto"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Check out the latest updates and a preview of our textures in action.
            </motion.p>
            <motion.div
              className="max-w-4xl mx-auto rounded-xl overflow-hidden border border-border neon-border-blue"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/9uN9U3PjRVk"
                  title="420 Clan Showcase"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatedSection>

      {/* ── Changelog Section ────────────────────────────── */}
      <AnimatedSection id="changelog" className="py-24 relative">
        {(isInView) => (
          <div className="container mx-auto px-4">
            <motion.h2
              className="font-display text-3xl sm:text-4xl font-bold uppercase mb-12 text-center neon-text-purple text-secondary"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
            >
              Changelog
            </motion.h2>
            <div className="max-w-3xl mx-auto space-y-6">
              {changelog.map((entry, i) => (
                <motion.div
                  key={entry.version}
                  className="bg-card border border-border rounded-lg p-6 hover:neon-border-purple transition-all duration-300"
                  initial={{ opacity: 0, x: -30 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.1 * i, duration: 0.5 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Tag className="w-5 h-5 text-secondary" />
                    <span className="font-display text-sm font-bold text-secondary">v{entry.version}</span>
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
        )}
      </AnimatedSection>

      {/* ── Download Section ─────────────────────────────── */}
      <AnimatedSection id="download" className="py-24 relative smoke-overlay">
        {(isInView) => (
          <div className="container mx-auto px-4">
            <motion.div
              className="max-w-2xl mx-auto text-center"
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase mb-6 neon-text-blue text-primary">
                Download
              </h2>
              <p className="text-muted-foreground mb-10">
                Grab the texture pack and transform your FiveM experience today.
              </p>
              <motion.div
                className="bg-card border border-border rounded-xl p-8 mb-8 neon-border-blue"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="flex items-center justify-center gap-3 mb-6">
                  <FileArchive className="w-8 h-8 text-primary" />
                  <span className="font-display text-xl font-bold text-foreground">
                    420_Clan_TexturePack.rar
                  </span>
                </div>
                <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground mb-8">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-secondary" />
                    <span>v{latestVersion}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-secondary" />
                    <span>{fileSize}</span>
                  </div>
                </div>
                <a
                  href={DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-primary text-primary-foreground font-display font-bold text-lg px-10 py-4 rounded-lg neon-box-blue hover:scale-105 animate-pulse-neon transition-all duration-1000 ease-in-out uppercase tracking-wider"
                >
                  <Download className="w-6 h-6" />
                  Download .RAR
                </a>
              </motion.div>
              <p className="text-muted-foreground text-xs">
                You need <span className="text-primary">WinRAR</span> or <span className="text-primary">7-Zip</span> to extract this file.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatedSection>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <img src={clanLogo} alt="420 Clan" className="w-6 h-6 rounded-full" />
              <span className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wider">
                420 Clan © 2026
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Not affiliated with Rockstar Games or FiveM.
            </p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-muted-foreground text-xs font-semibold">
              Pack made by <span className="text-primary">Mike</span>
            </p>
            <p className="text-muted-foreground text-xs">
              For any questions send a DM on Discord: <span className="text-primary font-mono">m1k3_1206</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
//  NAVBAR (with user info + auth links)
// ══════════════════════════════════════════════════════════
function PackNavbar({
  navItems,
  user,
  pendingCount = 0,
}: {
  navItems: { label: string; href: string; route?: boolean }[];
  user: { avatar: string | null; username: string; is_staff: boolean };
  pendingCount?: number;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shieldOpen, setShieldOpen] = useState(false);
  const shieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close shield dropdown when clicking outside
  useEffect(() => {
    if (!shieldOpen) return;
    const onClick = (e: MouseEvent) => {
      if (shieldRef.current && !shieldRef.current.contains(e.target as Node)) {
        setShieldOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [shieldOpen]);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <a href="#hero" className="flex items-center gap-2">
          <img src={clanLogo} alt="420 Clan Logo" className="w-10 h-10 rounded-full" />
          <span className="font-display text-lg font-bold gradient-neon-text hidden sm:block">
            420 CLAN
          </span>
        </a>
        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const isInstall = item.label === "Installation";
            const cls =
              "font-body text-sm font-medium hover:text-primary transition-colors duration-200 uppercase tracking-wider";

            if (item.route) {
              return (
                <Link key={item.href} to={item.href} className={cls}>
                  {isInstall && <BookOpen className="w-3.5 h-3.5 inline mr-1" />}
                  {item.label}
                </Link>
              );
            }

            return (
              <a key={item.href} href={item.href} className={cls}>
                {item.label}
              </a>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {user.avatar && (
              <img src={user.avatar} alt="" className="w-8 h-8 rounded-full border border-border" />
            )}
            <span className="text-sm text-foreground hidden sm:block">{user.username}</span>
          </div>

          {/* ── Shield dropdown (staff only) ── */}
          {user.is_staff && (
            <div className="relative" ref={shieldRef}>
              <button
                type="button"
                onClick={() => setShieldOpen((o) => !o)}
                className={`relative transition ${
                  shieldOpen
                    ? "text-secondary drop-shadow-[0_0_6px_rgba(168,85,247,0.7)]"
                    : "text-secondary/70 hover:text-secondary hover:drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]"
                }`}
                aria-label="Admin tools"
              >
                <Shield className="w-5 h-5" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-0.5 animate-pulse">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </button>
              {shieldOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-secondary/40 rounded-lg shadow-xl shadow-secondary/10 overflow-hidden z-50">
                  <Link
                    to="/admin"
                    onClick={() => setShieldOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-display font-bold text-secondary hover:bg-secondary/10 transition"
                  >
                    <Shield className="w-4 h-4" />
                    Admin Panel
                    {pendingCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                        {pendingCount > 99 ? "99+" : pendingCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/clan-list"
                    onClick={() => setShieldOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-display font-bold text-secondary hover:bg-secondary/10 transition border-t border-secondary/20"
                  >
                    <Users className="w-4 h-4" />
                    Clan List
                  </Link>
                </div>
              )}
            </div>
          )}

          <a
            href="/.netlify/functions/logout"
            className="text-muted-foreground hover:text-destructive transition"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="md:hidden text-muted-foreground hover:text-foreground transition"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-md">
          <div className="px-4 py-4 flex flex-col gap-3">
            {navItems.map((item) => {
              const isInstall = item.label === "Installation";
              const cls =
                "font-body text-sm font-medium uppercase tracking-wider transition-colors duration-200 text-foreground";

              if (item.route) {
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cls}
                    onClick={() => setMobileOpen(false)}
                  >
                    {isInstall && <BookOpen className="w-4 h-4 inline mr-2" />}
                    {item.label}
                  </Link>
                );
              }

              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={cls}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </motion.nav>
  );
}

// ══════════════════════════════════════════════════════════
//  ANIMATED SECTION WRAPPER
// ══════════════════════════════════════════════════════════
function AnimatedSection({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: (isInView: boolean) => React.ReactNode;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section id={id} className={className} ref={ref}>
      {children(isInView)}
    </section>
  );
}

export default TexturePackPage;
