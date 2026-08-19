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
  Zap,
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
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
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
        hidden: { opacity: 0, y: reduce ? 0 : 20 },
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
      <main className="min-h-[100dvh] bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-100 font-sans overflow-hidden">
        
        {/* Background glow effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 py-12 md:py-24 relative z-10 space-y-32">
          
          {/* ─── 1. HERO SECTION ─── */}
          <section className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left: Headline & Actions */}
            <FadeInStagger className="lg:col-span-5 space-y-8">
              <FadeInItem>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-400 text-xs font-semibold uppercase tracking-widest font-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <ShieldCheck size={14} />
                  <span>Zero-Trust Print Vault</span>
                </div>
              </FadeInItem>

              <FadeInItem>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-normal leading-[1.05] tracking-tighter text-white">
                  Print the page.
                  <br />
                  <span className="text-zinc-500">Leave zero trace.</span>
                </h1>
              </FadeInItem>

              <FadeInItem>
                <p className="text-lg text-zinc-400 leading-relaxed max-w-[45ch]">
                  SecureXerox streams encrypted confidential files directly into print shop RAM with an automatic 10-minute shredder. <strong className="text-zinc-200 font-medium">No files left on local hard drives.</strong>
                </p>
              </FadeInItem>

              <FadeInItem>
                <div className="flex flex-wrap gap-4 items-center">
                  <Link 
                    to="/login" 
                    className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-full transition-all hover:scale-[0.98] active:scale-[0.95]"
                  >
                    <span>Create Print Pass</span>
                    <ArrowRight size={18} />
                  </Link>
                  <a 
                    href="#how" 
                    className="inline-flex px-8 py-4 bg-transparent hover:bg-zinc-900 text-zinc-300 font-medium rounded-full transition-colors border border-zinc-800"
                  >
                    View Architecture
                  </a>
                </div>
              </FadeInItem>
            </FadeInStagger>

            {/* Right: Glassmorphism Simulator */}
            <div className="lg:col-span-7 relative">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-zinc-800/80 shadow-2xl p-6 md:p-8 relative overflow-hidden"
              >
                {/* Simulator inner borders/refraction */}
                <div className="absolute inset-0 rounded-3xl border border-white/5 pointer-events-none" />
                
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-6">
                  <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Counter Handoff Simulator
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Live Demo
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-6 relative z-10">
                  
                  {/* STEP 1: Customer Mobile / Web Upload */}
                  <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4 flex flex-col justify-between relative group">
                    <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-4">
                        <span className="font-bold text-zinc-300">1. Customer App</span>
                        <span className="text-emerald-500 font-semibold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full">ENCRYPTED</span>
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
                              className={`p-2 rounded-xl border text-left transition-all ${
                                selectedFile.id === f.id
                                  ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:bg-zinc-800/80'
                              }`}
                            >
                              <div className="text-[10px] font-bold truncate">{f.name.split('_')[0]}</div>
                              <div className="text-[9px] mt-0.5">{f.size}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* QR and Passcode Display */}
                      <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-center relative overflow-hidden">
                        {isWiped ? (
                          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-6 space-y-2 text-center">
                            <CheckCircle2 size={24} className="text-emerald-500 mx-auto" />
                            <div className="font-mono text-xs font-bold text-zinc-300">MEMORY WIPED</div>
                          </motion.div>
                        ) : (
                          <>
                            <div className="flex justify-center py-2 bg-white rounded-lg p-2 max-w-fit mx-auto mb-3">
                              <QRCodeSVG value={`https://securexerox.app/verify/${passCode}`} size={70} level="M" />
                            </div>
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <span className="font-mono text-xl font-bold tracking-widest text-white">
                                {passCode}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-amber-500/80 flex items-center justify-center gap-1">
                              <Clock size={12} />
                              <span>Purge in {formatTimer(timeLeft)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleQuickSend}
                      disabled={isWiped}
                      className="w-full py-2.5 rounded-xl bg-zinc-200 hover:bg-white text-zinc-900 text-xs font-bold transition-all disabled:opacity-20 active:scale-[0.98]"
                    >
                      Scan at Kiosk &rarr;
                    </button>
                  </div>

                  {/* STEP 2: Shop Clerk Counter Kiosk */}
                  <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-4">
                        <span className="font-bold text-zinc-300">2. Shop Terminal</span>
                        <span className="text-zinc-500 font-semibold text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full">READ-ONLY</span>
                      </div>

                      {/* Code input */}
                      <div className="space-y-2 mb-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="CODE"
                            value={kioskCode}
                            onChange={(e) => {
                              setKioskCode(e.target.value.toUpperCase());
                              setIsConnected(e.target.value.toUpperCase() === passCode);
                            }}
                            className="flex-1 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-mono uppercase tracking-widest text-white focus:outline-none focus:border-zinc-600 transition-colors"
                          />
                          <button
                            onClick={() => setIsConnected(kioskCode === passCode)}
                            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors active:scale-[0.95]"
                          >
                            Enter
                          </button>
                        </div>
                      </div>

                      {/* Terminal Status Window */}
                      <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 min-h-[140px] flex flex-col justify-center text-center">
                        {isPrinting ? (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2 space-y-2">
                            <Printer size={24} className="text-emerald-500 mx-auto animate-pulse" />
                            <div className="font-mono text-[10px] font-bold text-emerald-400">SPOOLING STREAM...</div>
                          </motion.div>
                        ) : isWiped ? (
                          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-2 space-y-2">
                            <div className="font-mono text-[10px] font-bold text-zinc-500">TASK COMPLETE</div>
                            <div className="text-[10px] text-zinc-600 font-mono">0 Bytes Local</div>
                          </motion.div>
                        ) : isConnected ? (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                            <div className="text-xs font-mono font-bold text-emerald-400 truncate px-2">
                              {selectedFile.name}
                            </div>
                            <button
                              onClick={handleExecutePrint}
                              className="w-full py-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-[11px] font-mono tracking-widest transition-all flex items-center justify-center gap-2 border border-emerald-500/30 active:scale-[0.97]"
                            >
                              <Printer size={14} />
                              <span>PRINT & PURGE</span>
                            </button>
                          </motion.div>
                        ) : (
                          <div className="text-[10px] text-zinc-600 font-mono flex items-center justify-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse" />
                            Awaiting verification
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-[9px] font-mono flex justify-between uppercase tracking-widest text-zinc-600">
                      <span>Mem: <strong className="text-emerald-500/70">SECURE</strong></span>
                      <span>Disk: <strong className="text-zinc-400">0 KB</strong></span>
                    </div>
                  </div>

                </div>
              </motion.div>
            </div>
          </section>

          {/* ─── 2. TRUST MARQUEE ─── */}
          <section className="pt-8 border-t border-zinc-800/50">
            <div className="text-center mb-8">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600 font-bold">Trusted by compliance-first teams</span>
            </div>
            <div className="relative flex overflow-hidden mask-edges">
              <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{ ease: "linear", duration: 30, repeat: Infinity }}
                className="flex whitespace-nowrap gap-16 md:gap-24 items-center pl-16 md:pl-24"
              >
                {/* Duplicate list for infinite loop */}
                {[...LOGOS, ...LOGOS].map((logo, i) => (
                  <div key={i} className="text-zinc-600 font-serif italic text-xl md:text-2xl font-semibold opacity-50 hover:opacity-100 transition-opacity cursor-default">
                    {logo}
                  </div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* ─── 3. BENTO GRID PROTOCOL ─── */}
          <section id="how" className="space-y-12">
            <FadeInStagger className="max-w-xl">
              <FadeInItem>
                <h2 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
                  The Zero-Trust Architecture
                </h2>
              </FadeInItem>
              <FadeInItem>
                <p className="text-zinc-400 leading-relaxed">
                  Every print shop computer is a potential data leak. SecureXerox bypasses the hard drive entirely, guaranteeing your files are shredded the moment the paper drops.
                </p>
              </FadeInItem>
            </FadeInStagger>

            <div className="grid md:grid-cols-3 md:grid-rows-2 gap-4 md:gap-6 auto-rows-[250px]">
              
              {/* Box 1 (Large) */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="md:col-span-2 md:row-span-2 rounded-3xl bg-zinc-900/40 border border-zinc-800 p-8 md:p-12 relative overflow-hidden flex flex-col justify-end group cursor-default"
              >
                <div className="absolute top-0 right-0 p-8 text-zinc-800 group-hover:text-emerald-900/50 transition-colors">
                  <Lock size={120} strokeWidth={1} />
                </div>
                <div className="relative z-10 space-y-4 max-w-sm">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-300 flex items-center justify-center shadow-lg">
                    <Lock size={20} />
                  </div>
                  <h3 className="text-2xl font-medium text-white tracking-tight">End-to-End Encryption</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Documents are encrypted in your browser using AES-GCM-256 before upload. The decryption key never leaves your device until handed directly to the kiosk via QR.
                  </p>
                </div>
              </motion.div>

              {/* Box 2 */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="rounded-3xl bg-zinc-900/40 border border-zinc-800 p-8 relative overflow-hidden flex flex-col justify-between cursor-default"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Zap size={18} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-white tracking-tight">RAM-Only Spooling</h3>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Files stream straight to hardware memory. Nothing is written to the print shop's disk.
                  </p>
                </div>
              </motion.div>

              {/* Box 3 */}
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="rounded-3xl bg-zinc-900/40 border border-zinc-800 p-8 relative overflow-hidden flex flex-col justify-between cursor-default"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                  <Trash2 size={18} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-white tracking-tight">10-Minute Shredder</h3>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Even if the print is cancelled, the payload self-destructs globally in exactly 600 seconds.
                  </p>
                </div>
              </motion.div>

            </div>
          </section>

          {/* ─── 4. BOTTOM CTA ─── */}
          <section className="py-24 relative rounded-[3rem] overflow-hidden bg-zinc-900 border border-zinc-800 text-center px-6">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/20 to-transparent pointer-events-none" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-8">
              <h2 className="text-4xl md:text-5xl font-normal tracking-tight text-white">
                Ready to secure your documents?
              </h2>
              <p className="text-zinc-400">
                Stop emailing sensitive tax forms to `printshop123@gmail.com`. Use SecureXerox for zero-trace local printing.
              </p>
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-full transition-all hover:scale-[0.98] active:scale-[0.95]"
              >
                <span>Get Started Free</span>
              </Link>
            </div>
          </section>

          {/* ─── 5. MINIMAL CLEAN FOOTER ─── */}
          <footer className="pt-8 pb-12 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-zinc-600">
            <div className="flex items-center gap-2 text-zinc-400 font-mono">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>SECUREXEROX © 2026</span>
            </div>
            <div className="flex items-center gap-8 font-medium">
              <Link to="/login" className="hover:text-zinc-300 transition-colors">Sign In</Link>
              <a href="#how" className="hover:text-zinc-300 transition-colors">Architecture</a>
              <span className="px-2 py-1 rounded-md bg-zinc-900 text-zinc-500 font-mono border border-zinc-800">0 Bytes Persisted</span>
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