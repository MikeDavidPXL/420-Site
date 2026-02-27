import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Download, FileArchive, HardDrive, Hash } from "lucide-react";

const DownloadSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [latestVersion, setLatestVersion] = useState("1.2.0");
  const [fileSize, setFileSize] = useState("601.6 MB");

  useEffect(() => {
    fetch("/changelog.json")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          setLatestVersion(data[0].version);
          if (data[0].fileSize) {
            setFileSize(data[0].fileSize);
          }
        }
      })
      .catch(console.error);
  }, []);

  return (
    <section id="download" className="py-24 relative smoke-overlay">
      <div className="container mx-auto px-4" ref={ref}>
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

          {/* File info card */}
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
              href="/pack#download"
              download
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
    </section>
  );
};

export default DownloadSection;
