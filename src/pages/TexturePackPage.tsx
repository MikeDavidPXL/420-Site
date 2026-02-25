// Pack page — restored old look with full section layout
// Staff sees admin panel tab in navbar; private/staff both see this page
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
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
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  LogOut,
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

interface AdminApp {
  id: string;
  discord_id: string;
  discord_name: string;
  uid: string;
  age: number;
  speaks_english: boolean;
  timezone: string;
  activity: string;
  level: string;
  playstyle: string;
  banned_koth_cheating: boolean;
  looking_for: string;
  has_mic: boolean;
  clan_history: string;
  status: string;
  reviewer_note: string | null;
  created_at: string;
}

type Filter = "all" | "pending" | "accepted" | "rejected";

const DOWNLOAD_URL =
  "https://drive.google.com/drive/u/0/folders/1-rMFHAWvzPGLfbwvgcGsbM5_fB0cdHwa";

const features = [
  { icon: Crosshair, title: "Weapon Skins", description: "Exclusive weapon textures for all weapons in CosmicV" },
  { icon: Car, title: "Vehicle Liveries", description: "!!STILL A WIP!!" },
  { icon: Zap, title: "Performance Friendly", description: "Optimized as best i can for minimal FPS impact with the beautiful textures. It will cost some fps." },
  { icon: RefreshCw, title: "Regular Updates", description: "New content and improvements when i got time... This is all still a test." },
];

// ── Nav items (staff gets Admin Panel) ────────────────────
const getNavItems = (isStaff: boolean) => {
  const items = [
    { label: "Home", href: "#hero" },
    { label: "About Us", href: "#about" },
    { label: "Features", href: "#features" },
    { label: "Showcase", href: "#video" },
    { label: "Changelog", href: "#changelog" },
    { label: "Download", href: "#download" },
  ];
  if (isStaff) items.push({ label: "Admin Panel", href: "#admin" });
  return items;
};

// ══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════
const TexturePackPage = () => {
  const { user, loading } = useAuth();
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [latestVersion, setLatestVersion] = useState("1.2.0");
  const [fileSize, setFileSize] = useState("601.6 MB");

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
      <PackNavbar navItems={navItems} user={user!} />

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

      {/* ── Admin Panel (staff only) ─────────────────────── */}
      {user!.is_staff && <AdminSection />}

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
}: {
  navItems: { label: string; href: string }[];
  user: { avatar: string | null; username: string; is_staff: boolean };
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`font-body text-sm font-medium hover:text-primary transition-colors duration-200 uppercase tracking-wider ${
                item.label === "Admin Panel" ? "text-secondary hover:text-secondary/80" : ""
              }`}
            >
              {item.label === "Admin Panel" && <Shield className="w-3.5 h-3.5 inline mr-1" />}
              {item.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {user.avatar && (
              <img src={user.avatar} alt="" className="w-8 h-8 rounded-full border border-border" />
            )}
            <span className="text-sm text-foreground hidden sm:block">{user.username}</span>
          </div>
          <a
            href="/.netlify/functions/logout"
            className="text-muted-foreground hover:text-destructive transition"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </a>
        </div>
      </div>
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

// ══════════════════════════════════════════════════════════
//  ADMIN SECTION (embedded, staff only)
// ══════════════════════════════════════════════════════════
function AdminSection() {
  const [apps, setApps] = useState<AdminApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter === "all" ? "" : `?status=${filter}`;
      const res = await fetch(`/.netlify/functions/admin-list${qs}`);
      const data = await res.json();
      setApps(data.applications ?? []);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const review = async (appId: string, action: "accept" | "reject") => {
    setActionLoading(appId);
    try {
      const res = await fetch("/.netlify/functions/admin-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: appId, action, note }),
      });
      if (res.ok) {
        setNote("");
        setExpanded(null);
        await fetchApps();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const statusIcon = (s: string) => {
    if (s === "pending") return <Clock className="w-4 h-4 text-yellow-400" />;
    if (s === "accepted") return <CheckCircle className="w-4 h-4 text-green-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  return (
    <section id="admin" className="py-24 relative">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Shield className="w-7 h-7 text-secondary" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase neon-text-purple text-secondary">
            Admin Panel
          </h2>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          {(["pending", "accepted", "rejected", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`font-display text-sm px-4 py-1.5 rounded-lg border transition ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span className="ml-auto text-sm text-muted-foreground self-center">
            {apps.length} result{apps.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
          </div>
        )}

        {!loading && apps.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No applications found.</p>
        )}

        <div className="space-y-3">
          {apps.map((app) => (
            <div
              key={app.id}
              className="bg-card border border-border rounded-lg overflow-hidden hover:neon-border-blue transition-all duration-300"
            >
              <button
                onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
              >
                {statusIcon(app.status)}
                <span className="font-display text-sm font-bold text-foreground flex-1">
                  {app.discord_name}{" "}
                  <span className="text-muted-foreground font-normal">(UID: {app.uid})</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(app.created_at).toLocaleDateString()}
                </span>
                {expanded === app.id ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {expanded === app.id && (
                <div className="border-t border-border px-5 py-5 space-y-3">
                  <Detail label="Discord ID" value={app.discord_id} />
                  <Detail label="UID" value={app.uid} />
                  <Detail label="Age" value={String(app.age)} />
                  <Detail label="Speaks English" value={yesNo(app.speaks_english)} />
                  <Detail label="Timezone" value={app.timezone} />
                  <Detail label="Activity" value={app.activity} />
                  <Detail label="Level" value={app.level} />
                  <Detail label="Preferred playstyle" value={app.playstyle} />
                  <Detail label="Banned from KOTH (cheating)" value={yesNo(app.banned_koth_cheating)} />
                  <Detail label="Looking for in a clan" value={app.looking_for} />
                  <Detail label="Has mic" value={yesNo(app.has_mic)} />
                  <Detail label="Current/previous clan membership" value={app.clan_history} />
                  {app.reviewer_note && <Detail label="Reviewer note" value={app.reviewer_note} />}

                  {app.status === "pending" && (
                    <div className="pt-3 border-t border-border space-y-3">
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Optional note (shown to user if rejected)..."
                        rows={2}
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => review(app.id, "accept")}
                          disabled={actionLoading === app.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-display font-bold py-2.5 rounded-lg transition disabled:opacity-50"
                        >
                          {actionLoading === app.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Accept
                        </button>
                        <button
                          onClick={() => review(app.id, "reject")}
                          disabled={actionLoading === app.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-display font-bold py-2.5 rounded-lg transition disabled:opacity-50"
                        >
                          {actionLoading === app.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Helpers ──────────────────────────────────────────────
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-display text-muted-foreground uppercase tracking-wider">{label}</span>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

export default TexturePackPage;
