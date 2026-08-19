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

// Premium kinetic blur reveal for massive headlines
const BlurInItem = ({ children, className = "" }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, filter: reduce ? 'blur(0px)' : 'blur(12px)', y: reduce ? 0 : 10 },
        visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] } }
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
      <main className="sx-page overflow-hidden bg-[var(--canvas)]">
        <div className="sx-wrap space-y-16 lg:space-y-24 pt-6">
          
          {/* ─── 1. HERO SECTION (OVERHAULED) ─── */}
          <section className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left: Headline & Actions */}
            <FadeInStagger className="lg:col-span-6 space-y-8">
              <FadeInItem>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-[var(--line)] text-[var(--emerald)] text-xs font-semibold uppercase tracking-widest font-mono shadow-sm">
                  <ShieldCheck size={14} />
                  <span>Zero-Trust Print Vault</span>
                </div>
              </FadeInItem>

              {/* Massive Sans-Serif Headline with kinetic blur-in */}
              <BlurInItem>
                <h1 className="font-sans text-[3.5rem] sm:text-[4.5rem] lg:text-[5.5rem] font-bold tracking-tighter leading-[0.95] text-[var(--ink)]">
                  Print the page.
                  <br />
                  <em className="font-sans italic text-[var(--emerald)] pr-2">Leave zero trace.</em>
                </h1>
              </BlurInItem>

              <BlurInItem>
                <p className="text-lg text-[var(--ink-secondary)] leading-relaxed max-w-[45ch] font-medium">
                  SecureXerox streams encrypted confidential files directly into print shop RAM with an automatic 10-minute shredder. No files left on local hard drives.
                </p>
              </BlurInItem>

              <BlurInItem>
                <div className="flex flex-wrap gap-4 items-center pt-2">
                  <Link 
                    to="/login" 
                    className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--ink)] hover:bg-black text-white font-bold rounded-full transition-transform active:scale-[0.95] shadow-lg"
                  >
                    <span>Create Print Pass</span>
                    <ArrowRight size={18} />
                  </Link>
                  <a 
                    href="#how" 
                    className="inline-flex items-center justify-center px-8 py-4 bg-transparent hover:bg-black/5 text-[var(--ink)] font-bold rounded-full transition-colors"
                  >
                    How it works
                  </a>
                </div>
              </BlurInItem>
            </FadeInStagger>

            {/* Right: Liquid Glass Simulator */}
            <div className="lg:col-span-6 relative z-10">
              
              {/* Subtle Stage Glow for Depth */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[var(--emerald)] opacity-[0.12] blur-[100px] rounded-full pointer-events-none -z-10" />

              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 30, rotateX: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 1.0, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformPerspective: 1000 }}
                className="bg-white/60 backdrop-blur-2xl rounded-3xl border border-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,1)] p-5 sm:p-6 lg:p-8 space-y-6 relative overflow-hidden"
              >
                {/* Diagonal glare highlight */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-50 pointer-events-none" />
                
                <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]/50 relative z-10">
                  <span className="font-mono text-[11px] font-bold text-[var(--ink)] uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--emerald)] animate-pulse shadow-[0_0_12px_rgba(22,163,74,0.8)]" />
                    Interactive Counter Simulator
                  </span>
                  <span className="text-[10px] font-mono text-[var(--ink-secondary)] uppercase tracking-widest hidden sm:block font-bold">
                    Live Demo
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 lg:gap-6 relative z-10">
                  
                  {/* STEP 1: Customer Mobile / Web Upload */}
                  <div className="p-4 rounded-[1.25rem] bg-white/40 border border-white shadow-sm space-y-4 flex flex-col justify-between hover:bg-white/60 transition-colors group cursor-default">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-4">
                        <span className="font-bold text-[var(--ink)]">1. Customer</span>
                        <span className="text-[var(--emerald)] font-semibold text-[9px] uppercase tracking-wider bg-[var(--emerald)]/10 px-2 py-0.5 rounded-full shadow-sm">ENCRYPTED</span>
                      </div>

                      {/* File selector */}
                      <div className="space-y-2 mb-4">
                        <div className="grid grid-cols-3 gap-2">
                          {SAMPLE_FILES.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => {
                                setSelectedFile(f);
                                handleRotateKey();
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all active:scale-[0.95] ${
                                selectedFile.id === f.id
                                  ? 'bg-white border-[var(--ink)]/20 text-[var(--ink)] shadow-sm font-semibold'
                                  : 'bg-white/40 border-[var(--line)]/50 text-[var(--ink-secondary)] hover:bg-white hover:border-[var(--line)]/80'
                              }`}
                            >
                              <div className="text-[10px] truncate">{f.name.split('_')[0]}</div>
                              <div className="text-[9px] mt-0.5 opacity-70 font-mono">{f.size}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* QR and Passcode Display */}
                      <div className="p-5 bg-white rounded-[1.25rem] border border-[var(--line)]/50 text-center space-y-4 shadow-sm relative overflow-hidden">
                        {isWiped ? (
                          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-6 space-y-2 text-center">
                            <CheckCircle2 size={28} className="text-[var(--emerald)] mx-auto" />
                            <div className="font-mono text-xs font-bold text-[var(--ink)] tracking-wider">MEMORY WIPED</div>
                          </motion.div>
                        ) : (
                          <>
                            <div className="flex justify-center">
                              <div className="p-2 bg-white rounded-xl shadow-sm border border-[var(--line)]/30 inline-block">
                                <QRCodeSVG
                                  value={`https://securexerox.app/verify/${passCode}`}
                                  size={70}
                                  level="M"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-mono text-[22px] font-extrabold tracking-widest text-[var(--ink)]">
                                {passCode}
                              </span>
                              <button
                                onClick={handleCopyCode}
                                className="p-1.5 rounded-md hover:bg-black/5 text-[var(--ink-secondary)] active:scale-[0.9] transition-colors"
                                title="Copy"
                              >
                                {copied ? <Check size={14} className="text-[var(--emerald)]" /> : <Copy size={14} />}
                              </button>
                            </div>
                            <div className="text-[10px] font-mono text-[var(--amber)] flex items-center justify-center gap-1.5 bg-[var(--amber)]/10 w-max mx-auto px-3 py-1 rounded-full font-bold">
                              <Clock size={12} />
                              <span>Purge: {formatTimer(timeLeft)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleQuickSend}
                      disabled={isWiped}
                      className="w-full py-3 rounded-xl bg-[var(--ink)] hover:bg-black text-white text-xs font-bold transition-all disabled:opacity-30 active:scale-[0.98] shadow-md"
                    >
                      Send Code to Kiosk &rarr;
                    </button>
                  </div>

                  {/* STEP 2: Shop Clerk Counter Kiosk */}
                  <div className="p-4 rounded-[1.25rem] bg-white/40 border border-white shadow-sm space-y-4 flex flex-col justify-between hover:bg-white/60 transition-colors cursor-default">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-4">
                        <span className="font-bold text-[var(--ink)]">2. Shop Terminal</span>
                        <span className="text-[var(--ink-secondary)] font-semibold text-[9px] uppercase tracking-wider border border-[var(--line-strong)] bg-white/80 px-2 py-0.5 rounded-full shadow-sm">READ-ONLY</span>
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
                            className="flex-1 px-3 py-2.5 rounded-xl border border-[var(--line-strong)] bg-white text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-[var(--ink)] focus:ring-2 focus:ring-[var(--ink)]/10 transition-all shadow-sm"
                          />
                          <button
                            onClick={() => setIsConnected(kioskCode === passCode)}
                            className="px-4 py-2.5 rounded-xl bg-[var(--ink)] hover:bg-black text-white text-xs font-bold transition-transform active:scale-[0.95] shadow-md"
                          >
                            Verify
                          </button>
                        </div>
                      </div>

                      {/* Terminal Status Window */}
                      <div className="p-4 bg-white rounded-[1.25rem] border border-[var(--line)]/50 min-h-[150px] flex flex-col justify-center text-center shadow-sm relative overflow-hidden">
                        {isPrinting ? (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2 space-y-3">
                            <Printer size={26} className="text-[var(--emerald)] animate-bounce mx-auto" />
                            <div className="font-mono text-[11px] font-bold text-[var(--ink)] tracking-widest">SPOOLING STREAM...</div>
                          </motion.div>
                        ) : isWiped ? (
                          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-2 space-y-2">
                            <div className="font-mono text-xs font-bold text-[var(--emerald)]">✓ PRINT EXECUTED</div>
                            <div className="text-[10px] text-[var(--ink-secondary)] font-mono font-medium">Memory zeroed from terminal</div>
                          </motion.div>
                        ) : isConnected ? (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                            <div className="text-xs font-mono font-bold text-[var(--emerald)] truncate px-2 bg-[var(--emerald)]/5 py-1.5 rounded-md border border-[var(--emerald)]/20">
                              ✓ {selectedFile.name}
                            </div>
                            <button
                              onClick={handleExecutePrint}
                              className="w-full py-3 rounded-xl bg-[var(--emerald)] hover:bg-[#15803D] text-white font-bold text-[11px] font-mono tracking-widest transition-transform active:scale-[0.97] flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                            >
                              <Printer size={14} />
                              <span>PRINT & SHRED</span>
                            </button>
                          </motion.div>
                        ) : (
                          <div className="text-[10px] text-[var(--ink-muted)] font-mono flex flex-col items-center gap-2 font-medium">
                            <span className="w-2 h-2 rounded-full bg-[var(--line-strong)] animate-pulse" />
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

          {/* Metric Strip (Moved below Hero to satisfy rule) */}
          <FadeInStagger className="max-w-4xl mx-auto pt-8 border-t border-[var(--line)]/50">
            <FadeInItem>
              <div className="grid grid-cols-3 gap-4 font-mono text-center">
                <div className="p-5 rounded-2xl bg-white/60 border border-[var(--line)]/80 shadow-sm hover:shadow-md transition-shadow cursor-default backdrop-blur-sm">
                  <div className="text-xl md:text-3xl font-bold text-[var(--ink)] tracking-tight">0 Bytes</div>
                  <div className="text-[10px] md:text-[11px] text-[var(--ink-secondary)] mt-2 uppercase tracking-widest font-semibold">Disk Storage</div>
                </div>
                <div className="p-5 rounded-2xl bg-white/60 border border-[var(--line)]/80 shadow-sm hover:shadow-md hover:border-[var(--emerald)]/30 transition-all cursor-default backdrop-blur-sm">
                  <div className="text-xl md:text-3xl font-bold text-[var(--emerald)] tracking-tight">10 Min</div>
                  <div className="text-[10px] md:text-[11px] text-[var(--ink-secondary)] mt-2 uppercase tracking-widest font-semibold">Access Window</div>
                </div>
                <div className="p-5 rounded-2xl bg-white/60 border border-[var(--line)]/80 shadow-sm hover:shadow-md transition-shadow cursor-default backdrop-blur-sm">
                  <div className="text-xl md:text-3xl font-bold text-[var(--ink)] tracking-tight">AES-256</div>
                  <div className="text-[10px] md:text-[11px] text-[var(--ink-secondary)] mt-2 uppercase tracking-widest font-semibold">Client Encrypted</div>
                </div>
              </div>
            </FadeInItem>
          </FadeInStagger>

          {/* ─── 2. TRUST MARQUEE ─── */}
          <section className="pt-12">
            <div className="text-center mb-8">
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--ink-muted)] font-bold">
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
                  <div key={i} className="text-[var(--ink-secondary)] font-serif italic text-2xl md:text-3xl font-semibold opacity-50 hover:opacity-100 transition-opacity cursor-default">
                    {logo}
                  </div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* ─── 3. BENTO GRID PROTOCOL (HOW IT WORKS) ─── */}
          <section id="how" className="space-y-12 pt-16">
            <FadeInStagger className="max-w-xl text-center md:text-left mx-auto md:mx-0">
              <FadeInItem>
                <h2 className="font-sans text-4xl md:text-5xl font-bold tracking-tight text-[var(--ink)] mb-4 leading-tight">
                  The Zero-Trust Architecture
                </h2>
              </FadeInItem>
              <FadeInItem>
                <p className="text-[var(--ink-secondary)] leading-relaxed text-base md:text-lg font-medium">
                  Every print shop computer is a potential data leak. SecureXerox bypasses the hard drive entirely, guaranteeing your files are shredded the moment the paper drops.
                </p>
              </FadeInItem>
            </FadeInStagger>

            <div className="grid md:grid-cols-3 md:grid-rows-2 gap-4 md:gap-6 auto-rows-[minmax(220px,auto)]">
              
              {/* Box 1 (Large - End-to-End Encryption) */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="md:col-span-2 md:row-span-2 rounded-[2.5rem] bg-white border border-[var(--line)] shadow-sm p-10 md:p-14 relative overflow-hidden flex flex-col justify-end group cursor-default transition-all hover:border-[var(--line-strong)] hover:shadow-xl"
              >
                {/* Background visual asset satisfying "no pure-text minimalism" */}
                <div 
                  className="absolute inset-0 z-0 opacity-[0.35] group-hover:opacity-50 transition-opacity mix-blend-multiply pointer-events-none"
                  style={{
                    backgroundImage: "url('/crypto_vault_texture.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }}
                />
                
                {/* Fade overlay so text remains perfectly readable */}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent z-[5]" />
                
                <div className="absolute top-0 right-0 p-10 text-[var(--line)] group-hover:text-[var(--emerald)]/20 transition-colors z-[6]">
                  <Lock size={160} strokeWidth={1} />
                </div>
                
                <div className="relative z-10 space-y-5 max-w-md pt-48">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--emerald)]/10 text-[var(--emerald)] flex items-center justify-center border border-[var(--emerald)]/20 shadow-sm backdrop-blur-md">
                    <Lock size={24} />
                  </div>
                  <h3 className="text-3xl font-bold text-[var(--ink)] tracking-tight">End-to-End Encryption</h3>
                  <p className="text-[var(--ink-secondary)] text-[15px] leading-relaxed font-medium">
                    Documents are encrypted in your browser using AES-GCM-256 before upload. The decryption key never leaves your device until handed directly to the kiosk via the 6-digit Print ID.
                  </p>
                </div>
              </motion.div>

              {/* Box 2 (RAM Spooling) */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="rounded-[2.5rem] bg-white border border-[var(--line)] shadow-sm p-10 relative overflow-hidden flex flex-col justify-between cursor-default transition-all hover:border-[var(--emerald-soft)] hover:shadow-lg"
              >
                <div className="w-12 h-12 rounded-[1.25rem] bg-[var(--emerald-soft)] text-[var(--emerald)] flex items-center justify-center border border-[var(--emerald-soft)]">
                  <Printer size={22} />
                </div>
                <div className="space-y-3 mt-10 md:mt-0">
                  <h3 className="text-xl font-bold text-[var(--ink)] tracking-tight">RAM-Only Spooling</h3>
                  <p className="text-[var(--ink-secondary)] text-[14px] leading-relaxed font-medium">
                    Files stream straight to hardware memory. Nothing is ever written to the print shop's local disk.
                  </p>
                </div>
              </motion.div>

              {/* Box 3 (10-Minute Shredder) */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="rounded-[2.5rem] bg-white border border-[var(--line)] shadow-sm p-10 relative overflow-hidden flex flex-col justify-between cursor-default transition-all hover:border-[var(--amber-soft)] hover:shadow-lg"
              >
                <div className="w-12 h-12 rounded-[1.25rem] bg-[var(--amber-soft)] text-[var(--amber)] flex items-center justify-center border border-[var(--amber-soft)]">
                  <Trash2 size={22} />
                </div>
                <div className="space-y-3 mt-10 md:mt-0">
                  <h3 className="text-xl font-bold text-[var(--ink)] tracking-tight">10-Minute Shredder</h3>
                  <p className="text-[var(--ink-secondary)] text-[14px] leading-relaxed font-medium">
                    Even if the print is cancelled, the payload self-destructs globally in exactly 600 seconds.
                  </p>
                </div>
              </motion.div>

            </div>
          </section>

          {/* ─── 4. BOTTOM CTA ─── */}
          <section className="py-24 relative rounded-[3rem] overflow-hidden bg-[var(--ink)] text-center px-6 shadow-2xl mt-16">
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--emerald)]/20 to-transparent pointer-events-none opacity-50" />
            <div className="relative z-10 max-w-3xl mx-auto space-y-10">
              <h2 className="text-5xl md:text-6xl font-sans font-bold tracking-tight leading-[1.05] text-white">
                Ready to secure your documents?
              </h2>
              <p className="text-white/70 text-[17px] max-w-[50ch] mx-auto leading-relaxed font-medium">
                Stop emailing sensitive tax forms to `printshop123@gmail.com`. Use SecureXerox for zero-trace local printing.
              </p>
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 px-10 py-5 bg-white hover:bg-zinc-100 text-[var(--ink)] font-bold text-lg rounded-full transition-transform active:scale-[0.95] shadow-lg"
              >
                <span>Create Print Pass</span>
              </Link>
            </div>
          </section>

          {/* ─── 5. MINIMAL CLEAN FOOTER ─── */}
          <footer className="pt-8 pb-16 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-[var(--ink-muted)]">
            <div className="flex items-center gap-3 font-mono font-bold tracking-wider">
              <ShieldCheck size={18} className="text-[var(--emerald)]" />
              <span>SECUREXEROX © 2026</span>
            </div>
            <div className="flex items-center gap-8 font-semibold">
              <Link to="/login" className="hover:text-[var(--ink)] transition-colors">Sign In</Link>
              <a href="#how" className="hover:text-[var(--ink)] transition-colors">Architecture</a>
              <span className="px-3 py-1.5 rounded-lg bg-white shadow-sm text-[var(--ink-secondary)] font-mono border border-[var(--line)]">0 Bytes Persisted</span>
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