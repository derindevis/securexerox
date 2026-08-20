import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Printer,
  Trash2
} from 'lucide-react';
import PageTransition from '../components/common/PageTransition';

// Logos for infinite marquee
const LOGOS = [
  "Acme Corp", "Globex", "Soylent Corp", "Initech", "Umbrella Corp", 
  "Stark Ind.", "Wayne Ent.", "Cyberdyne", "Massive Dynamic"
];

// Reusable animated container for staggered reveals
const FadeInStagger = ({ children, className = "" }) => {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.1 }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const FadeInItem = ({ children, className = "" }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: reduce ? 0 : 24 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default function Landing() {
  return (
    <PageTransition>
      <main className="sx-page overflow-hidden">
        <div className="sx-wrap space-y-16 lg:space-y-24 pt-6">
          
          {/* ─── 1. HERO SECTION ─── */}
          <section className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left: Headline & Actions */}
            <FadeInStagger className="lg:col-span-5 space-y-6">
              <FadeInItem>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[var(--line)] text-[var(--emerald)] text-xs font-semibold uppercase tracking-widest font-mono shadow-sm">
                  <ShieldCheck size={14} />
                  <span>Zero-Trust Print Vault</span>
                </div>
              </FadeInItem>

              <FadeInItem>
                <h1 className="sx-title text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.05] tracking-tight text-[var(--ink)]">
                  Print the page.
                  <br />
                  <em className="text-[var(--emerald)]">Leave zero trace.</em>
                </h1>
              </FadeInItem>

              <FadeInItem>
                <p className="text-base text-[var(--ink-secondary)] leading-relaxed max-w-[45ch]">
                  ZeroLeak Print streams encrypted confidential files directly into print shop RAM with an automatic 30-minute shredder. No files left on local hard drives.
                </p>
              </FadeInItem>

              <FadeInItem>
                <div className="flex flex-wrap gap-3 items-center pt-2">
                  <Link 
                    to="/login" 
                    className="sx-button sx-button--lg hover:scale-[0.98] active:scale-[0.95] transition-transform"
                  >
                    <span>Create Print Pass</span>
                    <ArrowRight size={16} />
                  </Link>
                  <a 
                    href="#how" 
                    className="sx-button sx-button--ghost sx-button--lg hover:bg-black/5 transition-colors"
                  >
                    How it works
                  </a>
                </div>
              </FadeInItem>
            </FadeInStagger>

            {/* Right: High-End Visual Asset (Replaces Simulator) */}
            <div className="lg:col-span-7">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative rounded-2xl overflow-hidden aspect-[4/3] lg:aspect-[16/10] border border-[var(--line)] shadow-xl group"
              >
                {/* Background visual asset */}
                <div 
                  className="absolute inset-0 z-0 bg-[var(--canvas)] transition-transform duration-700 group-hover:scale-105"
                  style={{
                    backgroundImage: "url('/crypto_vault_texture.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }}
                />
                
                {/* Fade overlay so the asset isn't too harsh */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent z-[1]" />
                
                <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-2">
                  <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg border border-white shadow-sm inline-flex items-center gap-2 w-max">
                    <Lock size={14} className="text-[var(--emerald)]" />
                    <span className="text-xs font-mono font-bold text-[var(--ink)] tracking-widest">AES-GCM-256</span>
                  </div>
                  <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg border border-white shadow-sm inline-flex items-center gap-2 w-max">
                    <ShieldCheck size={14} className="text-[var(--emerald)]" />
                    <span className="text-xs font-mono font-bold text-[var(--ink)] tracking-widest">END-TO-END ENCRYPTED</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Metric Strip (Moved below Hero) */}
          <FadeInStagger className="max-w-4xl mx-auto">
            <FadeInItem>
              <div className="grid grid-cols-3 gap-4 font-mono text-center pb-4">
                <div className="p-4 rounded-xl bg-white border border-[var(--line)] shadow-sm hover:shadow-md transition-shadow cursor-default">
                  <div className="text-xl md:text-2xl font-bold text-[var(--ink)]">0 Bytes</div>
                  <div className="text-[10px] md:text-xs text-[var(--ink-secondary)] mt-1 uppercase tracking-widest">Disk Storage</div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[var(--line)] shadow-sm hover:shadow-md transition-shadow cursor-default">
                  <div className="text-xl md:text-2xl font-bold text-[var(--emerald)]">30 Min</div>
                  <div className="text-[10px] md:text-xs text-[var(--ink-secondary)] mt-1 uppercase tracking-widest">Access Window</div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[var(--line)] shadow-sm hover:shadow-md transition-shadow cursor-default">
                  <div className="text-xl md:text-2xl font-bold text-[var(--ink)]">AES-256</div>
                  <div className="text-[10px] md:text-xs text-[var(--ink-secondary)] mt-1 uppercase tracking-widest">Client Encrypted</div>
                </div>
              </div>
            </FadeInItem>
          </FadeInStagger>

          {/* ─── 2. TRUST MARQUEE ─── */}
          <section className="pt-4 border-t border-[var(--line)]">
            <div className="text-center mb-6">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--ink-muted)] font-bold">
                Trusted by compliance-first teams
              </span>
            </div>
            <div className="relative flex overflow-hidden mask-edges">
              <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{ ease: "linear", duration: 30, repeat: Infinity }}
                className="flex whitespace-nowrap gap-16 md:gap-24 items-center pl-16 md:pl-24"
              >
                {/* Duplicate list for infinite loop */}
                {[...LOGOS, ...LOGOS].map((logo, i) => (
                  <div key={i} className="text-[var(--ink-secondary)] font-serif italic text-xl md:text-2xl font-semibold opacity-60 hover:opacity-100 transition-opacity cursor-default">
                    {logo}
                  </div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* ─── 3. BENTO GRID PROTOCOL (HOW IT WORKS) ─── */}
          <section id="how" className="space-y-10 lg:space-y-12">
            <FadeInStagger className="max-w-xl text-center md:text-left mx-auto md:mx-0">
              <FadeInItem>
                <h2 className="sx-title text-3xl md:text-4xl font-normal text-[var(--ink)] mb-4 leading-tight">
                  The Zero-Trust Architecture
                </h2>
              </FadeInItem>
              <FadeInItem>
                <p className="text-[var(--ink-secondary)] leading-relaxed text-sm md:text-base">
                  Every print shop computer is a potential data leak. ZeroLeak Print bypasses the hard drive entirely, guaranteeing your files are shredded the moment the paper drops.
                </p>
              </FadeInItem>
            </FadeInStagger>

            <div className="grid md:grid-cols-3 md:grid-rows-2 gap-4 md:gap-6 auto-rows-[minmax(200px,auto)]">
              
              {/* Box 1 (Large - End-to-End Encryption) */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="md:col-span-2 md:row-span-2 rounded-[2rem] bg-white border border-[var(--line)] shadow-sm p-8 md:p-12 relative overflow-hidden flex flex-col justify-end group cursor-default transition-all hover:border-[var(--line-strong)] hover:shadow-md"
              >
                {/* Background visual asset satisfying "no pure-text minimalism" */}
                <div 
                  className="absolute inset-0 z-0 opacity-40 group-hover:opacity-60 transition-opacity mix-blend-multiply pointer-events-none"
                  style={{
                    backgroundImage: "url('/crypto_vault_texture.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }}
                />
                
                {/* Fade overlay so text remains perfectly readable */}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent z-[5]" />
                
                <div className="absolute top-0 right-0 p-8 text-[var(--line)] group-hover:text-[var(--sage)] transition-colors z-[6]">
                  <Lock size={140} strokeWidth={1} />
                </div>
                
                <div className="relative z-10 space-y-4 max-w-md pt-40">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--sage)] text-[var(--ink)] flex items-center justify-center border border-[var(--line)] shadow-sm">
                    <Lock size={22} />
                  </div>
                  <h3 className="text-2xl font-semibold text-[var(--ink)] tracking-tight">End-to-End Encryption</h3>
                  <p className="text-[var(--ink-secondary)] text-sm leading-relaxed font-medium">
                    Documents are encrypted in your browser using AES-GCM-256 before upload. The decryption key never leaves your device until handed directly to the kiosk via the 6-digit Print ID.
                  </p>
                </div>
              </motion.div>

              {/* Box 2 (RAM Spooling) */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="rounded-[2rem] bg-white border border-[var(--line)] shadow-sm p-8 relative overflow-hidden flex flex-col justify-between cursor-default transition-all hover:border-[var(--emerald-soft)] hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--emerald-soft)] text-[var(--emerald)] flex items-center justify-center border border-[var(--emerald-soft)]">
                  <Printer size={20} />
                </div>
                <div className="space-y-2 mt-8 md:mt-0">
                  <h3 className="text-lg font-semibold text-[var(--ink)] tracking-tight">RAM-Only Spooling</h3>
                  <p className="text-[var(--ink-secondary)] text-[13px] leading-relaxed">
                    Files stream straight to hardware memory. Nothing is ever written to the print shop's local disk.
                  </p>
                </div>
              </motion.div>

              {/* Box 3 (10-Minute Shredder) */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="rounded-[2rem] bg-white border border-[var(--line)] shadow-sm p-8 relative overflow-hidden flex flex-col justify-between cursor-default transition-all hover:border-[var(--amber-soft)] hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--amber-soft)] text-[var(--amber)] flex items-center justify-center border border-[var(--amber-soft)]">
                  <Trash2 size={20} />
                </div>
                <div className="space-y-2 mt-8 md:mt-0">
                  <h3 className="text-lg font-semibold text-[var(--ink)] tracking-tight">30-Minute Shredder</h3>
                  <p className="text-[var(--ink-secondary)] text-[13px] leading-relaxed">
                    Even if the print is cancelled, the payload self-destructs globally in exactly 600 seconds.
                  </p>
                </div>
              </motion.div>

            </div>
          </section>

          {/* ─── 4. BOTTOM CTA ─── */}
          <section className="py-20 relative rounded-[3rem] overflow-hidden bg-[var(--ink)] text-center px-6 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--emerald)]/20 to-transparent pointer-events-none opacity-50" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-8">
              <h2 className="text-4xl md:text-5xl font-serif text-white font-normal tracking-tight leading-tight">
                Ready to secure your documents?
              </h2>
              <p className="text-white/70 text-[15px] max-w-[50ch] mx-auto leading-relaxed">
                Stop emailing sensitive tax forms to `printshop123@gmail.com`. Use ZeroLeak Print for zero-trace local printing.
              </p>
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-zinc-100 text-[var(--ink)] font-bold rounded-full transition-transform active:scale-[0.95]"
              >
                <span>Create Print Pass</span>
              </Link>
            </div>
          </section>

          {/* ─── 5. MINIMAL CLEAN FOOTER ─── */}
          <footer className="pt-4 pb-12 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[var(--ink-muted)]">
            <div className="flex items-center gap-2 font-mono font-semibold">
              <ShieldCheck size={16} className="text-[var(--emerald)]" />
              <span>ZEROLEAK PRINT © 2026</span>
            </div>
            <div className="flex items-center gap-6 font-medium">
              <Link to="/login" className="hover:text-[var(--ink)] transition-colors">Sign In</Link>
              <a href="#how" className="hover:text-[var(--ink)] transition-colors">Architecture</a>
              <span className="px-2 py-1 rounded-md bg-[var(--line)]/50 text-[var(--ink-secondary)] font-mono border border-[var(--line)]">0 Bytes Persisted</span>
            </div>
          </footer>

        </div>
      </main>
      
      {/* CSS for edge masking on marquee */}
      <style dangerouslySetInnerHTML={{__html: `
        .mask-edges {
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
      `}} />
    </PageTransition>
  );
}