import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { ExternalLink, FileText, Shield, Download, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const DISCORD_INVITE = "https://discord.gg/YOUR_INVITE_LINK"; // ← replace

const Dashboard = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">
          Session expired.{" "}
          <a href="/" className="text-primary underline">
            Go back
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 smoke-overlay pointer-events-none" />

      {/* Top bar */}
      <nav className="relative z-10 border-b border-border bg-card/60 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-display text-lg font-bold neon-text-blue text-primary">
            420 Clan
          </span>
          <div className="flex items-center gap-4">
            {user.is_staff && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 text-sm text-secondary hover:text-secondary/80 font-display"
              >
                <Shield className="w-4 h-4" /> Admin Panel
              </Link>
            )}
            <div className="flex items-center gap-2">
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt=""
                  className="w-8 h-8 rounded-full border border-border"
                />
              )}
              <span className="text-sm text-foreground">{user.username}</span>
            </div>
            <a
              href="/.netlify/functions/logout"
              className="text-xs text-muted-foreground hover:text-destructive transition"
            >
              Logout
            </a>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-16 max-w-2xl">
        {/* Not in guild */}
        {!user.in_guild && (
          <GateCard
            icon={<ExternalLink className="w-8 h-8 text-primary" />}
            title="Join our Discord first"
            description="You need to be in the 420 Clan Discord server before you can apply."
          >
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-display font-bold px-8 py-3 rounded-lg transition hover:scale-105"
            >
              <ExternalLink className="w-4 h-4" /> Join Discord
            </a>
          </GateCard>
        )}

        {/* In guild, no application yet */}
        {user.in_guild && !user.application && (
          <GateCard
            icon={<FileText className="w-8 h-8 text-primary" />}
            title="Apply for the 420 Clan"
            description="Fill out the application form to join us. Staff will review it soon."
          >
            <Link
              to="/apply"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold px-8 py-3 rounded-lg transition hover:scale-105"
            >
              <FileText className="w-4 h-4" /> Start Application
            </Link>
          </GateCard>
        )}

        {/* Application pending */}
        {user.in_guild && user.application?.status === "pending" && (
          <GateCard
            icon={<Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />}
            title="Application Pending"
            description="Your application is being reviewed by staff. Hang tight!"
          >
            <span className="text-yellow-400 font-display text-sm">
              Submitted{" "}
              {new Date(user.application.created_at).toLocaleDateString()}
            </span>
          </GateCard>
        )}

        {/* Application rejected */}
        {user.in_guild && user.application?.status === "rejected" && (
          <GateCard
            icon={<FileText className="w-8 h-8 text-destructive" />}
            title="Application Rejected"
            description="Unfortunately your application was not accepted. You may re-apply."
          >
            {user.application.reviewer_note && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-sm text-muted-foreground font-display font-bold mb-2">
                  Feedback from Staff:
                </p>
                <p className="text-sm text-foreground">
                  {user.application.reviewer_note}
                </p>
              </div>
            )}
            <Link
              to="/apply"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold px-8 py-3 rounded-lg transition hover:scale-105"
            >
              <FileText className="w-4 h-4" /> Re-Apply
            </Link>
          </GateCard>
        )}

        {/* Accepted → texture pack access */}
        {user.in_guild && user.application?.status === "accepted" && (
          <GateCard
            icon={<Download className="w-8 h-8 text-accent" />}
            title="Welcome to 420 Clan!"
            description="You've been accepted. Download the exclusive texture pack below."
          >
            <Link
              to="/pack"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-display font-bold px-8 py-3 rounded-lg transition hover:scale-105 neon-box-blue"
            >
              <Download className="w-4 h-4" /> View Texture Pack
            </Link>
          </GateCard>
        )}
      </div>
    </div>
  );
};

// Reusable card component
function GateCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="bg-card border border-border rounded-xl p-10 text-center neon-border-blue"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-center mb-4">{icon}</div>
      <h2 className="font-display text-2xl font-bold mb-2 text-foreground">
        {title}
      </h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        {description}
      </p>
      {children}
    </motion.div>
  );
}

export default Dashboard;
