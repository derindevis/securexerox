import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Printer,
  Clock,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  KeyRound,
  Zap
} from 'lucide-react';
import PageTransition from '../components/common/PageTransition';

// Real-world sensitive document choices
const SAMPLE_FILES = [
  { id: 'passport', name: 'Passport_US_Renewal.pdf', pages: 2, size: '1.8 MB' },
  { id: 'contract', name: 'Employment_NDA_Final.pdf', pages: 4, size: '2.1 MB' },
  { id: 'tax', name: 'IRS_Tax_Form_1040.pdf', pages: 6, size: '1.4 MB' },
];

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
  // ─── Customer Upload / Pass State ───
  const [selectedFile, setSelectedFile] = useState(SAMPLE_FILES[0]);
  const [passCode, setPassCode] = useState('SX-8492');
  const [timeLeft, setTimeLeft] = useState(599); // 10:00 countdown
  const [copied, setCopied] = useState(false);

  // ─── Print Shop Kiosk State ───
  const [kioskCode, setKioskCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isWiped, setIsWiped] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (isWiped) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isWiped]);

  const formatTimer = (s) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleRotateKey = () => {
    setIsWiped(false);
    setIsPrinting(false);
    setIsConnected(false);
    setKioskCode('');
    setPassCode(`SX-${Math.floor(1000 + Math.random() * 9000)}`);
    setTimeLeft(600);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(passCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleQuickSend = () => {
    setKioskCode(passCode);
    setIsConnected(true);
  };

  const handleExecutePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      setIsPrinting(false);
      setIsWiped(true);
      setIsConnected(false);
    }, 1400);
  };

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
                  SecureXerox streams encrypted confidential files directly into print shop RAM with an automatic 10-minute shredder. No files left on local hard drives.
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

              {/* Metric Strip */}
              <FadeInItem>
                <div className="grid grid-cols-3 gap-2 pt-6 border-t border-[var(--line)] font-mono text-center">
                  <div className="p-3 rounded-xl bg-white border border-[var(--line)] hover:border-[var(--line-strong)] transition-colors cursor-default">
                    <div className="text-base font-bold text-[var(--ink)]">0 Bytes</div>
                    <div className="text-[10px] text-[var(--ink-secondary)] mt-0.5 uppercase tracking-wider">Disk Storage</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[var(--line)] hover:border-[var(--emerald-soft)] transition-colors cursor-default">
                    <div className="text-base font-bold text-[var(--emerald)]">10 Min</div>
                    <div className="text-[10px] text-[var(--ink-secondary)] mt-0.5 uppercase tracking-wider">Access Window</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[var(--line)] hover:border-[var(--line-strong)] transition-colors cursor-default">
                    <div className="text-base font-bold text-[var(--ink)]">AES-256</div>
                    <div className="text-[10px] text-[var(--ink-secondary)] mt-0.5 uppercase tracking-wider">Client Encrypted</div>
                  </div>
                </div>
              </FadeInItem>
            </FadeInStagger>

            {/* Right: Live Interactive Counter Handoff Simulator */}
            <div className="lg:col-span-7">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-2xl border border-[var(--line)] shadow-xl p-5 sm:p-6 lg:p-8 space-y-6 relative overflow-hidden"
              >
                {/* Subtle top glare highlight for premium feel */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
                
                <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
                  <span className="font-mono text-[11px] font-bold text-[var(--ink)] uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--emerald)] animate-pulse shadow-[0_0_8px_rgba(22,163,74,0.6)]" />
                    Interactive Counter Simulator
                  </span>
                  <span className="text-[10px] font-mono text-[var(--ink-secondary)] uppercase tracking-widest hidden sm:block">
                    Live Demo
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 lg:gap-6 relative z-10">
                  
                  {/* STEP 1: Customer Mobile / Web Upload */}
                  <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--line)] space-y-4 flex flex-col justify-between hover:border-[var(--line-strong)] transition-colors group cursor-default">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-3">
                        <span className="font-bold text-[var(--ink)]">1. Customer Device</span>
                        <span className="text-[var(--emerald)] font-semibold text-[9px] uppercase tracking-wider bg-[var(--emerald-soft)] px-2 py-0.5 rounded-full">ENCRYPTED</span>
                      </div>

                      {/* File selector */}
                      <div className="space-y-1.5 mb-4">
                        <div className="grid grid-cols-3 gap-1.5">
                          {SAMPLE_FILES.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => {
                                setSelectedFile(f);
                                handleRotateKey();
                              }}
                              className={`p-2 rounded-lg border text-left transition-all active:scale-[0.95] ${
                                selectedFile.id === f.id
                                  ? 'bg-white border-[var(--ink)] text-[var(--ink)] shadow-sm'
                                  : 'bg-white/60 border-[var(--line)] text-[var(--ink-secondary)] hover:bg-white hover:border-[var(--line-strong)]'
                              }`}
                            >
                              <div className="text-[10px] font-bold truncate">{f.name.split('_')[0]}</div>
                              <div className="text-[9px] mt-0.5 opacity-80">{f.size}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* QR and Passcode Display */}
                      <div className="p-4 bg-white rounded-xl border border-[var(--line)] text-center space-y-3 shadow-sm">
                        {isWiped ? (
                          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-6 space-y-1 text-center">
                            <CheckCircle2 size={24} className="text-[var(--emerald)] mx-auto" />
                            <div className="font-mono text-xs font-bold text-[var(--ink)] tracking-wider">MEMORY WIPED</div>
                          </motion.div>
                        ) : (
                          <>
                            <div className="flex justify-center py-1">
                              <QRCodeSVG
                                value={`https://securexerox.app/verify/${passCode}`}
                                size={76}
                                level="M"
                              />
                            </div>
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-mono text-xl font-extrabold tracking-widest text-[var(--ink)]">
                                {passCode}
                              </span>
                              <button
                                onClick={handleCopyCode}
                                className="p-1 rounded hover:bg-black/5 text-[var(--ink-secondary)] active:scale-[0.9]"
                                title="Copy"
                              >
                                {copied ? <Check size={14} className="text-[var(--emerald)]" /> : <Copy size={14} />}
                              </button>
                            </div>
                            <div className="text-[10px] font-mono text-[var(--amber)] flex items-center justify-center gap-1.5 bg-[var(--amber-soft)] w-max mx-auto px-2 py-0.5 rounded-full font-semibold">
                              <Clock size={11} />
                              <span>Purge: {formatTimer(timeLeft)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleQuickSend}
                      disabled={isWiped}
                      className="w-full py-2.5 rounded-lg bg-[var(--ink)] hover:bg-black text-white text-xs font-semibold transition-all disabled:opacity-40 active:scale-[0.98] shadow-sm"
                    >
                      Send Code to Kiosk &rarr;
                    </button>
                  </div>

                  {/* STEP 2: Shop Clerk Counter Kiosk */}
                  <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--line)] space-y-4 flex flex-col justify-between hover:border-[var(--line-strong)] transition-colors cursor-default">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-3">
                        <span className="font-bold text-[var(--ink)]">2. Shop Terminal</span>
                        <span className="text-[var(--ink-secondary)] font-semibold text-[9px] uppercase tracking-wider border border-[var(--line-strong)] bg-white px-2 py-0.5 rounded-full">READ-ONLY</span>
                      </div>

                      {/* Code input */}
                      <div className="space-y-1 mb-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="CODE"
                            value={kioskCode}
                            onChange={(e) => {
                              setKioskCode(e.target.value.toUpperCase());
                              setIsConnected(e.target.value.toUpperCase() === passCode);
                            }}
                            className="flex-1 px-3 py-2 rounded-lg border border-[var(--line-strong)] bg-white text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-[var(--ink)] transition-colors shadow-sm"
                          />
                          <button
                            onClick={() => setIsConnected(kioskCode === passCode)}
                            className="px-4 py-2 rounded-lg bg-[var(--ink)] hover:bg-black text-white text-xs font-semibold transition-transform active:scale-[0.95] shadow-sm"
                          >
                            Verify
                          </button>
                        </div>
                      </div>

                      {/* Terminal Status Window */}
                      <div className="p-4 bg-white rounded-xl border border-[var(--line)] min-h-[140px] flex flex-col justify-center text-center shadow-sm">
                        {isPrinting ? (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2 space-y-2">
                            <Printer size={22} className="text-[var(--emerald)] animate-bounce mx-auto" />
                            <div className="font-mono text-[11px] font-bold text-[var(--ink)] tracking-widest">SPOOLING STREAM...</div>
                          </motion.div>
                        ) : isWiped ? (
                          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-2 space-y-1">
                            <div className="font-mono text-xs font-bold text-[var(--emerald)]">✓ PRINT EXECUTED</div>
                            <div className="text-[10px] text-[var(--ink-secondary)] font-mono">Memory zeroed from terminal</div>
                          </motion.div>
                        ) : isConnected ? (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                            <div className="text-xs font-mono font-bold text-[var(--emerald)] truncate px-2">
                              ✓ {selectedFile.name}
                            </div>
                            <button
                              onClick={handleExecutePrint}
                              className="w-full py-2.5 rounded-lg bg-[var(--emerald)] hover:bg-[#15803D] text-white font-bold text-[11px] font-mono tracking-widest transition-transform active:scale-[0.97] flex items-center justify-center gap-2 shadow-sm"
                            >
                              <Printer size={13} />
                              <span>PRINT & SHRED</span>
                            </button>
                          </motion.div>
                        ) : (
                          <div className="text-[10px] text-[var(--ink-muted)] font-mono flex flex-col items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--line-strong)] animate-pulse" />
                            Waiting for code verification...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] font-mono flex justify-between uppercase tracking-widest text-[var(--ink-secondary)]">
                      <span>DRM: <strong className="text-[var(--ink)]">WATERMARKED</strong></span>
                      <span>Disk: <strong className="text-[var(--danger)]">0 KB</strong></span>
                    </div>
                  </div>

                </div>
              </motion.div>
            </div>

          </section>

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
                <span className="sx-kicker mb-3 block">Cryptographic Protocol</span>
              </FadeInItem>
              <FadeInItem>
                <h2 className="sx-title text-3xl md:text-4xl font-normal text-[var(--ink)] mb-4 leading-tight">
                  The Zero-Trust Architecture
                </h2>
              </FadeInItem>
              <FadeInItem>
                <p className="text-[var(--ink-secondary)] leading-relaxed text-sm md:text-base">
                  Every print shop computer is a potential data leak. SecureXerox bypasses the hard drive entirely, guaranteeing your files are shredded the moment the paper drops.
                </p>
              </FadeInItem>
            </FadeInStagger>

            <div className="grid md:grid-cols-3 md:grid-rows-2 gap-4 md:gap-6 auto-rows-[minmax(200px,auto)]">
              
              {/* Box 1 (Large - End-to-End Encryption) */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="md:col-span-2 md:row-span-2 rounded-[2rem] bg-white border border-[var(--line)] shadow-sm p-8 md:p-12 relative overflow-hidden flex flex-col justify-end group cursor-default transition-all hover:border-[var(--line-strong)] hover:shadow-md"
              >
                <div className="absolute top-0 right-0 p-8 text-[var(--line)] group-hover:text-[var(--sage)] transition-colors">
                  <Lock size={140} strokeWidth={1} />
                </div>
                <div className="relative z-10 space-y-4 max-w-md">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--sage)] text-[var(--ink)] flex items-center justify-center border border-[var(--line)]">
                    <Lock size={22} />
                  </div>
                  <h3 className="text-2xl font-semibold text-[var(--ink)] tracking-tight">End-to-End Encryption</h3>
                  <p className="text-[var(--ink-secondary)] text-sm leading-relaxed">
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
                  <h3 className="text-lg font-semibold text-[var(--ink)] tracking-tight">10-Minute Shredder</h3>
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
              <h2 className="sx-title text-4xl md:text-5xl font-normal tracking-tight text-white">
                Ready to secure your documents?
              </h2>
              <p className="text-zinc-300 text-[15px] max-w-[50ch] mx-auto">
                Stop emailing sensitive tax forms to `printshop123@gmail.com`. Use SecureXerox for zero-trace local printing.
              </p>
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-zinc-100 text-[var(--ink)] font-bold rounded-full transition-transform active:scale-[0.95]"
              >
                <span>Get Started Free</span>
              </Link>
            </div>
          </section>

          {/* ─── 5. MINIMAL CLEAN FOOTER ─── */}
          <footer className="pt-4 pb-12 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[var(--ink-muted)]">
            <div className="flex items-center gap-2 font-mono font-semibold">
              <ShieldCheck size={16} className="text-[var(--emerald)]" />
              <span>SECUREXEROX © 2026</span>
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