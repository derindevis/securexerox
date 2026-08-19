import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
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

// Premium Magnetic Button Micro-interaction
const MagneticButton = ({ children, className = "", as: Component = Link, ...props }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const reduce = useReducedMotion();
  
  const handleMouseMove = (e) => {
    if (reduce) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = e.currentTarget.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    // Move the content subtly towards the mouse
    setPosition({ x: middleX * 0.15, y: middleY * 0.15 });
  };
  const reset = () => setPosition({ x: 0, y: 0 });

  return (
    <Component
      onMouseMove={handleMouseMove}
      onMouseLeave={reset}
      {...props}
      className={`relative ${className}`}
    >
      <motion.div
        animate={{ x: position.x, y: position.y }}
        transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
        className="flex items-center justify-center gap-2 pointer-events-none w-full h-full"
      >
        {children}
      </motion.div>
    </Component>
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
  
  // Parallax Scroll for Bento Grid
  const { scrollYProgress } = useScroll();
  const yParallax = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const reduceMotion = useReducedMotion();

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
        {/* Adjusted spacing for responsive scaling (tighter on mobile, massive on desktop) */}
        <div className="sx-wrap space-y-20 lg:space-y-32 pt-10 pb-20">
          
          {/* ─── 1. HERO SECTION ─── */}
          <section className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left: Headline & Actions */}
            <FadeInStagger className="lg:col-span-5 space-y-8">
              <FadeInItem>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[var(--line)] text-[var(--emerald)] text-xs font-semibold uppercase tracking-widest font-mono shadow-sm">
                  <ShieldCheck size={14} />
                  <span>Zero-Trust Print Vault</span>
                </div>
              </FadeInItem>

              <FadeInItem>
                <h1 className="sx-title text-5xl sm:text-6xl lg:text-[4.5rem] font-normal leading-[1.05] tracking-tight text-[var(--ink)]">
                  Print the page.
                  <br />
                  <em className="text-[var(--emerald)]">Leave zero trace.</em>
                </h1>
              </FadeInItem>

              <FadeInItem>
                <p className="text-lg text-[var(--ink-secondary)] leading-relaxed max-w-[42ch]">
                  SecureXerox streams encrypted confidential files directly into print shop RAM with an automatic 10-minute shredder. No files left on local hard drives.
                </p>
              </FadeInItem>

              <FadeInItem>
                <div className="flex flex-wrap gap-4 items-center pt-2">
                  <MagneticButton 
                    to="/login" 
                    className="sx-button sx-button--lg overflow-hidden group hover:shadow-xl transition-all"
                  >
                    <span>Create Print Pass</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </MagneticButton>
                  <a 
                    href="#how" 
                    className="sx-button sx-button--ghost sx-button--lg hover:bg-black/5 transition-colors"
                  >
                    How it works
                  </a>
                </div>
              </FadeInItem>
            </FadeInStagger>

            {/* Right: Live Interactive Counter Handoff Simulator */}
            <div className="lg:col-span-7 relative">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Continuous Breathing Animation Wrapper */}
                <motion.div 
                  animate={reduceMotion ? {} : { y: [0, -10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-white rounded-[2rem] border border-[var(--line)] shadow-xl p-5 sm:p-8 space-y-6 relative overflow-hidden"
                >
                  {/* Subtle top glare highlight for premium feel */}
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
                  
                  <div className="flex items-center justify-between pb-5 border-b border-[var(--line)]">
                    <span className="font-mono text-xs font-bold text-[var(--ink)] uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--emerald)] animate-pulse shadow-[0_0_8px_rgba(22,163,74,0.6)]" />
                      Interactive Counter Simulator
                    </span>
                    <span className="text-[10px] font-mono text-[var(--ink-secondary)] uppercase tracking-widest hidden sm:block">
                      Live Demo
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5 lg:gap-6 relative z-10">
                    
                    {/* STEP 1: Customer Mobile / Web Upload */}
                    <div className="p-5 rounded-2xl bg-[var(--canvas)] border border-[var(--line)] space-y-5 flex flex-col justify-between transition-colors group cursor-default">
                      <div>
                        <div className="flex items-center justify-between text-xs font-mono mb-4">
                          <span className="font-bold text-[var(--ink)]">1. Customer Device</span>
                          <span className="text-[var(--emerald)] font-semibold text-[9px] uppercase tracking-wider bg-[var(--emerald-soft)] px-2 py-0.5 rounded-full">ENCRYPTED</span>
                        </div>

                        {/* File selector */}
                        <div className="space-y-1.5 mb-5">
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
                                    ? 'bg-white border-[var(--ink)] text-[var(--ink)] shadow-sm'
                                    : 'bg-white/60 border-[var(--line)] text-[var(--ink-secondary)] hover:bg-white hover:border-[var(--line-strong)]'
                                }`}
                              >
                                <div className="text-[10px] font-bold truncate">{f.name.split('_')[0]}</div>
                                <div className="text-[9px] mt-1 opacity-80">{f.size}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* QR and Passcode Display */}
                        <div className="p-5 bg-white rounded-2xl border border-[var(--line)] text-center space-y-4 shadow-sm">
                          {isWiped ? (
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-7 space-y-2 text-center">
                              <CheckCircle2 size={26} className="text-[var(--emerald)] mx-auto" />
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
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-mono text-[22px] font-extrabold tracking-widest text-[var(--ink)]">
                                  {passCode}
                                </span>
                                <button
                                  onClick={handleCopyCode}
                                  className="p-1.5 rounded-md hover:bg-black/5 text-[var(--ink-secondary)] active:scale-[0.9] transition-colors"
                                  title="Copy"
                                >
                                  {copied ? <Check size={16} className="text-[var(--emerald)]" /> : <Copy size={16} />}
                                </button>
                              </div>
                              <div className="text-[11px] font-mono text-[var(--amber)] flex items-center justify-center gap-1.5 bg-[var(--amber-soft)] w-max mx-auto px-3 py-1 rounded-full font-semibold">
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
                        className="w-full py-3 rounded-xl bg-[var(--ink)] hover:bg-black text-white text-xs font-semibold transition-all disabled:opacity-40 active:scale-[0.98] shadow-sm"
                      >
                        Send Code to Kiosk &rarr;
                      </button>
                    </div>

                    {/* STEP 2: Shop Clerk Counter Kiosk */}
                    <div className="p-5 rounded-2xl bg-[var(--canvas)] border border-[var(--line)] space-y-5 flex flex-col justify-between transition-colors cursor-default">
                      <div>
                        <div className="flex items-center justify-between text-xs font-mono mb-4">
                          <span className="font-bold text-[var(--ink)]">2. Shop Terminal</span>
                          <span className="text-[var(--ink-secondary)] font-semibold text-[9px] uppercase tracking-wider border border-[var(--line-strong)] bg-white px-2 py-0.5 rounded-full">READ-ONLY</span>
                        </div>

                        {/* Code input */}
                        <div className="space-y-1 mb-5">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="CODE"
                              value={kioskCode}
                              onChange={(e) => {
                                setKioskCode(e.target.value.toUpperCase());
                                setIsConnected(e.target.value.toUpperCase() === passCode);
                              }}
                              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--line-strong)] bg-white text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-[var(--ink)] transition-colors shadow-sm"
                            />
                            <button
                              onClick={() => setIsConnected(kioskCode === passCode)}
                              className="px-5 py-2.5 rounded-xl bg-[var(--ink)] hover:bg-black text-white text-xs font-semibold transition-transform active:scale-[0.95] shadow-sm"
                            >
                              Verify
                            </button>
                          </div>
                        </div>

                        {/* Terminal Status Window */}
                        <div className="p-5 bg-white rounded-2xl border border-[var(--line)] min-h-[160px] flex flex-col justify-center text-center shadow-sm">
                          {isPrinting ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-3 space-y-3">
                              <Printer size={24} className="text-[var(--emerald)] animate-bounce mx-auto" />
                              <div className="font-mono text-xs font-bold text-[var(--ink)] tracking-widest">SPOOLING STREAM...</div>
                            </motion.div>
                          ) : isWiped ? (
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-3 space-y-2">
                              <div className="font-mono text-sm font-bold text-[var(--emerald)]">✓ PRINT EXECUTED</div>
                              <div className="text-[11px] text-[var(--ink-secondary)] font-mono">Memory zeroed from terminal</div>
                            </motion.div>
                          ) : isConnected ? (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                              <div className="text-sm font-mono font-bold text-[var(--emerald)] truncate px-2">
                                ✓ {selectedFile.name}
                              </div>
                              <button
                                onClick={handleExecutePrint}
                                className="w-full py-3 rounded-xl bg-[var(--emerald)] hover:bg-[#15803D] text-white font-bold text-xs font-mono tracking-widest transition-transform active:scale-[0.97] flex items-center justify-center gap-2 shadow-sm"
                              >
                                <Printer size={14} />
                                <span>PRINT & SHRED</span>
                              </button>
                            </motion.div>
                          ) : (
                            <div className="text-[11px] text-[var(--ink-muted)] font-mono flex flex-col items-center gap-2">
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
              </motion.div>
            </div>
          </section>

          {/* Metric Strip (Moved below Hero) */}
          <FadeInStagger className="max-w-4xl mx-auto border-t border-[var(--line)] pt-8 lg:pt-12">
            <FadeInItem>
              <div className="grid grid-cols-3 gap-4 font-mono text-center pb-4">
                <div className="p-5 md:p-6 rounded-2xl bg-white border border-[var(--line)] shadow-sm hover:shadow-md transition-shadow cursor-default">
                  <div className="text-2xl md:text-3xl font-bold text-[var(--ink)]">0 Bytes</div>
                  <div className="text-[11px] md:text-xs text-[var(--ink-secondary)] mt-2 uppercase tracking-widest">Disk Storage</div>
                </div>
                <div className="p-5 md:p-6 rounded-2xl bg-white border border-[var(--line)] shadow-sm hover:shadow-md transition-shadow cursor-default">
                  <div className="text-2xl md:text-3xl font-bold text-[var(--emerald)]">10 Min</div>
                  <div className="text-[11px] md:text-xs text-[var(--ink-secondary)] mt-2 uppercase tracking-widest">Access Window</div>
                </div>
                <div className="p-5 md:p-6 rounded-2xl bg-white border border-[var(--line)] shadow-sm hover:shadow-md transition-shadow cursor-default">
                  <div className="text-2xl md:text-3xl font-bold text-[var(--ink)]">AES-256</div>
                  <div className="text-[11px] md:text-xs text-[var(--ink-secondary)] mt-2 uppercase tracking-widest">Client Encrypted</div>
                </div>
              </div>
            </FadeInItem>
          </FadeInStagger>

          {/* ─── 2. TRUST MARQUEE ─── */}
          <section className="pt-8 lg:pt-12">
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
                  <div key={i} className="text-[var(--ink-secondary)] font-serif italic text-2xl md:text-3xl font-semibold opacity-60 hover:opacity-100 transition-opacity cursor-default">
                    {logo}
                  </div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* ─── 3. BENTO GRID PROTOCOL (HOW IT WORKS) ─── */}
          <section id="how" className="space-y-12 lg:space-y-16 pt-12 lg:pt-16">
            <FadeInStagger className="max-w-2xl text-center md:text-left mx-auto md:mx-0">
              <FadeInItem>
                <h2 className="sx-title text-4xl md:text-5xl font-normal text-[var(--ink)] mb-6 leading-tight">
                  The Zero-Trust Architecture
                </h2>
              </FadeInItem>
              <FadeInItem>
                <p className="text-[var(--ink-secondary)] leading-relaxed text-base md:text-lg">
                  Every print shop computer is a potential data leak. SecureXerox bypasses the hard drive entirely, guaranteeing your files are shredded the moment the paper drops.
                </p>
              </FadeInItem>
            </FadeInStagger>

            <div className="grid md:grid-cols-3 md:grid-rows-2 gap-4 md:gap-6 auto-rows-[minmax(240px,auto)]">
              
              {/* Box 1 (Large - End-to-End Encryption with Parallax) */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="md:col-span-2 md:row-span-2 rounded-[2.5rem] bg-white border border-[var(--line)] shadow-sm p-10 md:p-14 relative overflow-hidden flex flex-col justify-end group cursor-default transition-transform hover:border-[var(--line-strong)] hover:shadow-lg"
              >
                {/* Background visual asset with subtle Parallax scroll physics */}
                <motion.div 
                  style={reduceMotion ? {} : { y: yParallax, scale: 1.25 }}
                  className="absolute inset-0 z-0 opacity-40 group-hover:opacity-60 transition-opacity mix-blend-multiply pointer-events-none origin-top"
                >
                  <div 
                    className="w-full h-full"
                    style={{
                      backgroundImage: "url('/crypto_vault_texture.jpg')",
                      backgroundSize: "cover",
                      backgroundPosition: "center"
                    }}
                  />
                </motion.div>
                
                {/* Fade overlay so text remains perfectly readable */}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent z-[5]" />
                
                <div className="absolute top-0 right-0 p-10 text-[var(--line)] group-hover:text-[var(--sage)] transition-colors z-[6]">
                  <Lock size={160} strokeWidth={1} />
                </div>
                
                <div className="relative z-10 space-y-5 max-w-md pt-48">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--sage)] text-[var(--ink)] flex items-center justify-center border border-[var(--line)] shadow-sm">
                    <Lock size={26} />
                  </div>
                  <h3 className="text-3xl font-semibold text-[var(--ink)] tracking-tight">End-to-End Encryption</h3>
                  <p className="text-[var(--ink-secondary)] text-base leading-relaxed font-medium">
                    Documents are encrypted in your browser using AES-GCM-256 before upload. The decryption key never leaves your device until handed directly to the kiosk via the 6-digit Print ID.
                  </p>
                </div>
              </motion.div>

              {/* Box 2 (RAM Spooling) */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="rounded-[2.5rem] bg-white border border-[var(--line)] shadow-sm p-10 relative overflow-hidden flex flex-col justify-between cursor-default transition-transform hover:border-[var(--emerald-soft)] hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-2xl bg-[var(--emerald-soft)] text-[var(--emerald)] flex items-center justify-center border border-[var(--emerald-soft)]">
                  <Printer size={24} />
                </div>
                <div className="space-y-3 mt-10 md:mt-0">
                  <h3 className="text-xl font-semibold text-[var(--ink)] tracking-tight">RAM-Only Spooling</h3>
                  <p className="text-[var(--ink-secondary)] text-sm leading-relaxed">
                    Files stream straight to hardware memory. Nothing is ever written to the print shop's local disk.
                  </p>
                </div>
              </motion.div>

              {/* Box 3 (10-Minute Shredder) */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="rounded-[2.5rem] bg-white border border-[var(--line)] shadow-sm p-10 relative overflow-hidden flex flex-col justify-between cursor-default transition-transform hover:border-[var(--amber-soft)] hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-2xl bg-[var(--amber-soft)] text-[var(--amber)] flex items-center justify-center border border-[var(--amber-soft)]">
                  <Trash2 size={24} />
                </div>
                <div className="space-y-3 mt-10 md:mt-0">
                  <h3 className="text-xl font-semibold text-[var(--ink)] tracking-tight">10-Minute Shredder</h3>
                  <p className="text-[var(--ink-secondary)] text-sm leading-relaxed">
                    Even if the print is cancelled, the payload self-destructs globally in exactly 600 seconds.
                  </p>
                </div>
              </motion.div>

            </div>
          </section>

          {/* ─── 4. BOTTOM CTA ─── */}
          <section className="py-24 md:py-32 relative rounded-[3rem] overflow-hidden bg-[var(--ink)] text-center px-6 shadow-2xl mt-12 lg:mt-24">
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--emerald)]/20 to-transparent pointer-events-none opacity-50" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-10">
              <h2 className="text-5xl md:text-6xl font-serif text-white font-normal tracking-tight leading-tight">
                Ready to secure your documents?
              </h2>
              <p className="text-white/70 text-[17px] max-w-[50ch] mx-auto leading-relaxed">
                Stop emailing sensitive tax forms to `printshop123@gmail.com`. Use SecureXerox for zero-trace local printing.
              </p>
              <MagneticButton 
                to="/login" 
                className="inline-flex items-center gap-2 px-10 py-5 bg-white hover:bg-zinc-100 text-[var(--ink)] font-bold text-lg rounded-full transition-transform active:scale-[0.95]"
              >
                <span>Create Print Pass</span>
              </MagneticButton>
            </div>
          </section>

          {/* ─── 5. MINIMAL CLEAN FOOTER ─── */}
          <footer className="pt-6 pb-16 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-[var(--ink-muted)] border-t border-[var(--line)]">
            <div className="flex items-center gap-2 font-mono font-semibold">
              <ShieldCheck size={18} className="text-[var(--emerald)]" />
              <span>SECUREXEROX © 2026</span>
            </div>
            <div className="flex items-center gap-8 font-medium">
              <Link to="/login" className="hover:text-[var(--ink)] transition-colors">Sign In</Link>
              <a href="#how" className="hover:text-[var(--ink)] transition-colors">Architecture</a>
              <span className="px-3 py-1.5 rounded-md bg-[var(--line)]/50 text-[var(--ink-secondary)] font-mono border border-[var(--line)]">0 Bytes Persisted</span>
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