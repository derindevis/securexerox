import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import { Clock, CheckCircle2, Copy, Check, Printer } from 'lucide-react';
import PageTransition from '../components/common/PageTransition';

// Real-world sensitive document choices
const SAMPLE_FILES = [
  { id: 'passport', name: 'Passport_US_Renewal.pdf', pages: 2, size: '1.8 MB' },
  { id: 'contract', name: 'Employment_NDA_Final.pdf', pages: 4, size: '2.1 MB' },
  { id: 'tax', name: 'IRS_Tax_Form_1040.pdf', pages: 6, size: '1.4 MB' },
];

export default function Demo() {
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
      <main className="sx-page overflow-hidden min-h-[calc(100vh-64px)] flex items-center justify-center py-12">
        <div className="sx-wrap w-full max-w-5xl">
          <div className="text-center mb-10 space-y-4">
            <h1 className="sx-title text-4xl sm:text-5xl text-[var(--ink)]">Interactive Handoff Demo</h1>
            <p className="text-[var(--ink-secondary)] max-w-2xl mx-auto">
              Experience the Zero-Trust Print Vault protocol in real-time. Select a file as the customer, send the code, and execute the print as the shop clerk.
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-2xl border border-[var(--line)] shadow-xl p-3 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 relative overflow-hidden max-w-4xl mx-auto w-full"
          >
            {/* Subtle top glare highlight for premium feel */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--line)] gap-3">
              <span className="font-mono text-[10px] sm:text-xs font-bold text-[var(--ink)] uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--emerald)] animate-pulse shadow-[0_0_8px_rgba(22,163,74,0.6)] shrink-0" />
                Live Environment Simulation
              </span>
              <button 
                onClick={handleRotateKey}
                className="text-[9px] sm:text-[10px] font-mono text-[var(--ink-secondary)] uppercase tracking-widest hover:text-[var(--ink)] transition-colors border border-[var(--line)] px-3 py-1 rounded-full w-max"
              >
                Reset Demo
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4 lg:gap-10 relative z-10 w-full">
              
              {/* STEP 1: Customer Mobile / Web Upload */}
              <div className="p-3 sm:p-5 rounded-xl bg-[var(--canvas)] border border-[var(--line)] space-y-4 sm:space-y-5 flex flex-col justify-between hover:border-[var(--line-strong)] transition-colors group cursor-default shadow-sm w-full overflow-hidden">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm font-mono mb-4 gap-2">
                    <span className="font-bold text-[var(--ink)]">1. Customer Device</span>
                    <span className="text-[var(--emerald)] font-semibold text-[9px] sm:text-[10px] uppercase tracking-wider bg-[var(--emerald-soft)] px-2.5 py-1 rounded-full w-max">ENCRYPTED</span>
                  </div>

                  {/* File selector */}
                  <div className="space-y-2 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {SAMPLE_FILES.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            setSelectedFile(f);
                            handleRotateKey();
                          }}
                          className={`p-2.5 sm:p-3 rounded-lg border text-left transition-all active:scale-[0.95] ${
                            selectedFile.id === f.id
                              ? 'bg-white border-[var(--ink)] text-[var(--ink)] shadow-md font-medium'
                              : 'bg-white/60 border-[var(--line)] text-[var(--ink-secondary)] hover:bg-white hover:border-[var(--line-strong)]'
                          }`}
                        >
                          <div className="text-[10px] sm:text-[11px] font-bold truncate">{f.name.split('_')[0]}</div>
                          <div className="text-[9px] sm:text-[10px] mt-1 opacity-80">{f.size}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* QR and Passcode Display */}
                  <div className="p-4 sm:p-6 bg-white rounded-xl border border-[var(--line)] text-center space-y-3 sm:space-y-4 shadow-sm w-full overflow-hidden">
                    {isWiped ? (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-8 space-y-2 text-center">
                        <CheckCircle2 size={32} className="text-[var(--emerald)] mx-auto" />
                        <div className="font-mono text-xs sm:text-sm font-bold text-[var(--ink)] tracking-wider">MEMORY WIPED</div>
                      </motion.div>
                    ) : (
                      <>
                        <div className="flex justify-center py-2">
                          <QRCodeSVG
                            value={`https://securexerox.app/verify/${passCode}`}
                            size={90}
                            level="M"
                            className="max-w-full"
                          />
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-mono text-xl sm:text-2xl font-extrabold tracking-widest text-[var(--ink)] truncate">
                            {passCode}
                          </span>
                          <button
                            onClick={handleCopyCode}
                            className="p-1.5 rounded hover:bg-black/5 text-[var(--ink-secondary)] active:scale-[0.9] transition-colors shrink-0"
                            title="Copy"
                          >
                            {copied ? <Check size={16} className="text-[var(--emerald)]" /> : <Copy size={16} />}
                          </button>
                        </div>
                        <div className="text-[10px] sm:text-xs font-mono text-[var(--amber)] flex items-center justify-center gap-1.5 bg-[var(--amber-soft)] w-max max-w-full mx-auto px-3 py-1 rounded-full font-semibold">
                          <Clock size={12} className="shrink-0" />
                          <span className="truncate">Purge: {formatTimer(timeLeft)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleQuickSend}
                  disabled={isWiped}
                  className="w-full py-2.5 sm:py-3 rounded-lg bg-[var(--ink)] hover:bg-black text-white text-xs sm:text-sm font-semibold transition-all disabled:opacity-40 active:scale-[0.98] shadow-sm whitespace-normal"
                >
                  Send Code to Terminal &rarr;
                </button>
              </div>

              {/* STEP 2: Shop Clerk Counter Kiosk */}
              <div className="p-3 sm:p-5 rounded-xl bg-[var(--canvas)] border border-[var(--line)] space-y-4 sm:space-y-5 flex flex-col justify-between hover:border-[var(--line-strong)] transition-colors cursor-default shadow-sm w-full overflow-hidden">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm font-mono mb-4 gap-2">
                    <span className="font-bold text-[var(--ink)]">2. Shop Terminal</span>
                    <span className="text-[var(--ink-secondary)] font-semibold text-[9px] sm:text-[10px] uppercase tracking-wider border border-[var(--line-strong)] bg-white px-2.5 py-1 rounded-full w-max">READ-ONLY</span>
                  </div>

                  {/* Code input */}
                  <div className="space-y-1 mb-6">
                    <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full">
                      <input
                        type="text"
                        placeholder="CODE"
                        value={kioskCode}
                        onChange={(e) => {
                          setKioskCode(e.target.value.toUpperCase());
                          setIsConnected(e.target.value.toUpperCase() === passCode);
                        }}
                        className="flex-1 min-w-[100px] w-full sm:w-auto px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-[var(--line-strong)] bg-white text-xs sm:text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-[var(--ink)] transition-colors shadow-sm"
                      />
                      <button
                        onClick={() => setIsConnected(kioskCode === passCode)}
                        className="flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-[var(--ink)] hover:bg-black text-white text-xs sm:text-sm font-semibold transition-transform active:scale-[0.95] shadow-sm whitespace-nowrap"
                      >
                        Verify
                      </button>
                    </div>
                  </div>

                  {/* Terminal Status Window */}
                  <div className="p-4 sm:p-6 bg-white rounded-xl border border-[var(--line)] min-h-[140px] sm:min-h-[180px] flex flex-col justify-center text-center shadow-sm w-full overflow-hidden">
                    {isPrinting ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 space-y-3">
                        <Printer size={32} className="text-[var(--emerald)] animate-bounce mx-auto" />
                        <div className="font-mono text-xs font-bold text-[var(--ink)] tracking-widest">SPOOLING STREAM...</div>
                      </motion.div>
                    ) : isWiped ? (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-4 space-y-2">
                        <div className="font-mono text-sm font-bold text-[var(--emerald)]">✓ PRINT EXECUTED</div>
                        <div className="text-xs text-[var(--ink-secondary)] font-mono">Memory zeroed from terminal</div>
                      </motion.div>
                    ) : isConnected ? (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 flex flex-col min-w-0">
                        <div className="text-sm font-mono font-bold text-[var(--emerald)] truncate px-2 bg-[var(--emerald-soft)] py-2 rounded-lg w-full">
                          ✓ {selectedFile.name}
                        </div>
                        <button
                          onClick={handleExecutePrint}
                          className="w-full py-3.5 rounded-lg bg-[var(--emerald)] hover:bg-[#15803D] text-white font-bold text-xs font-mono tracking-widest transition-transform active:scale-[0.97] flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 whitespace-nowrap"
                        >
                          <Printer size={16} />
                          <span>PRINT & SHRED</span>
                        </button>
                      </motion.div>
                    ) : (
                      <div className="text-xs text-[var(--ink-muted)] font-mono flex flex-col items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-[var(--line-strong)] animate-pulse" />
                        Waiting for code verification...
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[9px] sm:text-[11px] font-mono flex flex-col sm:flex-row justify-between uppercase tracking-widest text-[var(--ink-secondary)] bg-white p-2 sm:p-3 rounded-lg border border-[var(--line)] gap-2">
                  <span className="truncate">DRM: <strong className="text-[var(--ink)]">WATERMARKED</strong></span>
                  <span className="truncate">Disk: <strong className="text-[var(--danger)]">0 KB</strong></span>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </main>
    </PageTransition>
  );
}
