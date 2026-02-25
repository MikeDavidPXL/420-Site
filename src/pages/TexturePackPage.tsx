import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import {
  Download,
  FileArchive,
  HardDrive,
  Hash,
  ArrowLeft,
  Play,
} from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
  fileSize?: string;
}

const DOWNLOAD_URL =
  "https://drive.google.com/drive/u/0/folders/1-rMFHAWvzPGLfbwvgcGsbM5_fB0cdHwa";

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

  // Guard: must be logged in + accepted
  if (!loading && (!user || !user.is_member)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 smoke-overlay pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase mb-3 neon-text-blue text-primary">
            420 Texture Pack
          </h1>
          <p className="text-muted-foreground">
            Your exclusive access to the clan texture pack.
          </p>
        </motion.div>

        {/* Download card */}
        <motion.div
          className="bg-card border border-border rounded-xl p-8 mb-10 text-center neon-border-blue"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
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
          <p className="text-muted-foreground text-xs mt-4">
            You need{" "}
            <span className="text-primary">WinRAR</span> or{" "}
            <span className="text-primary">7-Zip</span> to extract this file.
          </p>
        </motion.div>

        {/* YouTube showcase */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-display text-2xl font-bold mb-4 text-center neon-text-purple text-secondary">
            <Play className="w-5 h-5 inline mr-2" />
            Showcase
          </h2>
          <div className="rounded-xl overflow-hidden border border-border neon-border-purple">
            <div
              className="relative w-full"
              style={{ paddingBottom: "56.25%" }}
            >
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/9uN9U3PjRVk"
                title="420 Clan Showcase"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </motion.div>

        {/* Changelog */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-display text-2xl font-bold mb-6 text-center neon-text-purple text-secondary">
            Changelog
          </h2>
          <div className="space-y-4">
            {changelog.map((entry) => (
              <div
                key={entry.version}
                className="bg-card border border-border rounded-lg p-5 hover:neon-border-purple transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-display text-sm font-bold text-secondary">
                    v{entry.version}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {entry.date}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold mb-2 text-foreground">
                  {entry.title}
                </h3>
                <ul className="space-y-1">
                  {entry.changes.map((change, j) => (
                    <li
                      key={j}
                      className="text-muted-foreground text-sm flex items-start gap-2"
                    >
                      <span className="text-primary flex-shrink-0">•</span>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TexturePackPage;
