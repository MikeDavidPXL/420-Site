import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { ExternalLink, FileText, Loader2, ShieldAlert } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

const DISCORD_INVITE = "https://discord.gg/qBpYXRgmcH"; // ← replace

const Dashboard = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // No session → back to login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Staff or Private → straight to pack page
  if (user.is_staff || user.is_private) {
    return <Navigate to="/pack" replace />;
  }

  // Not in guild at all → join Discord card
  if (!user.in_guild) {
    return (
      <GatePage>
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
      </GatePage>
    );
  }

  // In guild but no KOTH role → must verify first
  if (!user.is_koth) {
    return (
      <GatePage>
        <GateCard
          icon={<ShieldAlert className="w-8 h-8 text-yellow-400" />}
          title="Verify in Discord"
          description="You need to verify in the Discord server to get the KOTH Player role before you can apply."
        >
          <span className="text-muted-foreground text-sm">
            Once verified, refresh this page.
          </span>
        </GateCard>
      </GatePage>
    );
  }

  // Has KOTH role → show application flow
  return (
    <GatePage>
      {/* No application yet */}
      {!user.application && (
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
      {user.application?.status === "pending" && (
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

      {/* Application accepted (but no private role yet — edge case) */}
      {user.application?.status === "accepted" && (
        <GateCard
          icon={<Loader2 className="w-8 h-8 text-green-400 animate-spin" />}
          title="Application Accepted!"
          description="Your application was accepted. Your role should update shortly — refresh this page."
        >
          <span className="text-green-400 font-display text-sm">
            Accepted! Waiting for role sync...
          </span>
        </GateCard>
      )}

      {/* Application rejected */}
      {user.application?.status === "rejected" && (
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
    </GatePage>
  );
};

// Page shell
function GatePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 smoke-overlay pointer-events-none" />
      <nav className="relative z-10 border-b border-border bg-card/60 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-display text-lg font-bold neon-text-blue text-primary">
            420 Clan
          </span>
          <a
            href="/.netlify/functions/logout"
            className="text-xs text-muted-foreground hover:text-destructive transition"
          >
            Logout
          </a>
        </div>
      </nav>
      <div className="relative z-10 container mx-auto px-4 py-16 max-w-2xl">
        {children}
      </div>
    </div>
  );
}

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
