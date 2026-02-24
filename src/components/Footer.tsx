import clanLogo from "@/assets/clan-logo.png";

const Footer = () => (
  <footer className="border-t border-border py-8">
    <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <img src={clanLogo} alt="420 Clan" className="w-6 h-6 rounded-full" />
        <span className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wider">
          420 Clan © 2026
        </span>
      </div>
      <p className="text-muted-foreground text-xs">
        Niet geaffilieerd met Rockstar Games of FiveM.
      </p>
    </div>
  </footer>
);

export default Footer;
