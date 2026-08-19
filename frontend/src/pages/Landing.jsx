import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Printer,
  Clock,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  KeyRound,
  FileCheck,
} from 'lucide-react';
import PageTransition from '../components/common/PageTransition';

// Real-world sensitive document choices
const SAMPLE_FILES = [
  { id: 'passport', name: 'Passport_US_Renewal.pdf', pages: 2, size: '1.8 MB' },
  { id: 'contract', name: 'Employment_NDA_Final.pdf', pages: 4, size: '2.1 MB' },
  { id: 'tax', name: 'IRS_Tax_Form_1040.pdf', pages: 6, size: '1.4 MB' },
];

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
      <main className="sx-page">
        <div className="sx-wrap space-y-16">
          
          {/* ─── 1. HERO SECTION ─── */}
          <section className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center pt-2">
            
            {/* Left: Headline & Actions */}
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--sage)] text-[var(--emerald)] text-xs font-semibold uppercase tracking-wider font-mono">
                <ShieldCheck size={14} />
                <span>Zero-Trust Print Vault</span>
              </div>

              <h1 className="sx-title text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.05] tracking-tight text-[var(--ink)]">
                Print the page.
                <br />
                <em className="text-[var(--emerald)]">Leave zero trace.</em>
              </h1>

              <p className="text-base text-[var(--ink-secondary)] leading-relaxed">
                SecureXerox streams encrypted confidential files directly into print shop RAM with an automatic 10-minute shredder. No files left on local hard drives.
              </p>

              <div className="flex flex-wrap gap-3 items-center pt-1">
                <Link to="/login" className="sx-button sx-button--lg">
                  <span>Create Print Pass</span>
                  <ArrowRight size={16} />
                </Link>
                <a href="#how" className="sx-button sx-button--ghost sx-button--lg">
                  How it works
                </a>
              </div>

              {/* Metric Strip */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[var(--line)] font-mono text-center">
                <div className="p-2.5 rounded-xl bg-white border border-[var(--line)]">
                  <div className="text-base font-bold text-[var(--ink)]">0 Bytes</div>
                  <div className="text-[10px] text-[var(--ink-secondary)] mt-0.5">Disk Storage</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[var(--line)]">
                  <div className="text-base font-bold text-[var(--emerald)]">10 Min</div>
                  <div className="text-[10px] text-[var(--ink-secondary)] mt-0.5">Access Window</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[var(--line)]">
                  <div className="text-base font-bold text-[var(--ink)]">AES-256</div>
                  <div className="text-[10px] text-[var(--ink-secondary)] mt-0.5">Client Encrypted</div>
                </div>
              </div>
            </div>

            {/* Right: Live Interactive Counter Handoff Simulator */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl border border-[var(--line)] shadow-sm p-5 sm:p-6 space-y-5">
                
                <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                  <span className="font-mono text-xs font-bold text-[var(--ink)] uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--emerald)] animate-pulse" />
                    Interactive Counter Handoff Simulator
                  </span>
                  <span className="text-[11px] font-mono text-[var(--ink-secondary)]">
                    Try the 2-step flow below
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  
                  {/* STEP 1: Customer Mobile / Web Upload */}
                  <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--line)] space-y-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-2">
                        <span className="font-bold text-[var(--ink)]">1. Customer Device</span>
                        <span className="text-[var(--emerald)] font-semibold">ENCRYPTED</span>
                      </div>

                      {/* File selector */}
                      <div className="space-y-1.5 mb-3">
                        <label className="text-[10px] font-mono text-[var(--ink-secondary)] uppercase">
                          Select Document:
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {SAMPLE_FILES.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => {
                                setSelectedFile(f);
                                handleRotateKey();
                              }}
                              className={`p-1.5 rounded-lg border text-[11px] font-medium text-left truncate transition-colors ${
                                selectedFile.id === f.id
                                  ? 'bg-white border-[var(--ink)] text-[var(--ink)] font-bold shadow-xs'
                                  : 'bg-white/60 border-[var(--line)] text-[var(--ink-secondary)] hover:bg-white'
                              }`}
                            >
                              <div className="truncate">{f.name.split('_')[0]}</div>
                              <div className="text-[9px] text-[var(--ink-muted)]">{f.size}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* QR and Passcode Display */}
                      <div className="p-3 bg-white rounded-lg border border-[var(--line)] text-center space-y-2">
                        {isWiped ? (
                          <div className="py-4 space-y-1 text-center">
                            <CheckCircle2 size={24} className="text-[var(--emerald)] mx-auto" />
                            <div className="font-mono text-xs font-bold text-[var(--ink)]">MEMORY WIPED</div>
                            <div className="text-[10px] text-[var(--ink-secondary)]">0 bytes remain in RAM</div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-center py-1">
                              <QRCodeSVG
                                value={`https://securexerox.app/verify/${passCode}`}
                                size={80}
                                level="M"
                              />
                            </div>
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-mono text-xl font-extrabold tracking-widest text-[var(--ink)]">
                                {passCode}
                              </span>
                              <button
                                onClick={handleCopyCode}
                                className="p-1 rounded hover:bg-neutral-100 text-[var(--ink-secondary)]"
                                title="Copy"
                              >
                                {copied ? <Check size={13} className="text-[var(--emerald)]" /> : <Copy size={13} />}
                              </button>
                            </div>
                            <div className="text-[10px] font-mono text-[var(--amber)] flex items-center justify-center gap-1">
                              <Clock size={11} />
                              <span>Auto-purge: {formatTimer(timeLeft)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleQuickSend}
                      disabled={isWiped}
                      className="w-full py-2 rounded-lg bg-[var(--ink)] hover:bg-black text-white text-xs font-semibold transition-colors disabled:opacity-40"
                    >
                      Send Code to Kiosk &rarr;
                    </button>
                  </div>

                  {/* STEP 2: Shop Clerk Counter Kiosk */}
                  <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--line)] space-y-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-2">
                        <span className="font-bold text-[var(--ink)]">2. Shop Terminal</span>
                        <span className="text-[var(--ink-secondary)]">READ-ONLY</span>
                      </div>

                      {/* Code input */}
                      <div className="space-y-1 mb-3">
                        <label className="text-[10px] font-mono text-[var(--ink-secondary)] uppercase">
                          Clerk Enters Code:
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="e.g. SX-8492"
                            value={kioskCode}
                            onChange={(e) => {
                              setKioskCode(e.target.value.toUpperCase());
                              setIsConnected(e.target.value.toUpperCase() === passCode);
                            }}
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-[var(--line-strong)] bg-white text-xs font-mono uppercase tracking-wider"
                          />
                          <button
                            onClick={() => setIsConnected(kioskCode === passCode)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--ink)] text-white text-xs font-semibold"
                          >
                            Verify
                          </button>
                        </div>
                      </div>

                      {/* Terminal Status Window */}
                      <div className="p-3 bg-white rounded-lg border border-[var(--line)] min-h-[120px] flex flex-col justify-center text-center">
                        {isPrinting ? (
                          <div className="py-2 space-y-1">
                            <Printer size={22} className="text-[var(--emerald)] animate-bounce mx-auto" />
                            <div className="font-mono text-xs font-bold text-[var(--ink)]">PRINTING TO PAPER...</div>
                            <div className="text-[10px] text-[var(--ink-secondary)]">Spooling RAM stream</div>
                          </div>
                        ) : isWiped ? (
                          <div className="py-2 space-y-1">
                            <div className="font-mono text-xs font-bold text-[var(--emerald)]">✓ PRINT EXECUTED</div>
                            <div className="text-[10px] text-[var(--ink-secondary)]">Memory zeroed from terminal</div>
                          </div>
                        ) : isConnected ? (
                          <div className="space-y-2">
                            <div className="text-xs font-mono font-bold text-[var(--emerald)]">
                              ✓ {selectedFile.name}
                            </div>
                            <div className="text-[10px] text-[var(--ink-secondary)] font-mono">
                              {selectedFile.pages} Pages • Read-Only Sandbox
                            </div>
                            <button
                              onClick={handleExecutePrint}
                              className="w-full py-1.5 rounded-md bg-[var(--emerald)] hover:bg-[#15803D] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Printer size={13} />
                              <span>Execute Print & Shred</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-[var(--ink-muted)] font-mono">
                            Waiting for code verification...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-[var(--ink-secondary)] flex justify-between">
                      <span>DRM: <strong className="text-[var(--ink)]">WATERMARKED</strong></span>
                      <span>DISK: <strong className="text-[var(--danger)]">0 KB</strong></span>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </section>

          {/* ─── 2. HOW IT WORKS (CLEAN 4-STEP PROTOCOL) ─── */}
          <section id="how" className="space-y-6 pt-4">
            <div className="text-center space-y-2">
              <span className="sx-kicker">Cryptographic Protocol</span>
              <h2 className="sx-title text-3xl sm:text-4xl font-normal text-[var(--ink)]">
                Four steps from <em>upload</em> to complete closure.
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl bg-white border border-[var(--line)] space-y-2.5 shadow-xs">
                <div className="font-mono text-xs font-bold text-[var(--ink-muted)]">01</div>
                <div className="w-8 h-8 rounded-lg bg-[var(--sage)] text-[var(--ink)] flex items-center justify-center">
                  <Lock size={16} />
                </div>
                <h3 className="font-semibold text-sm text-[var(--ink)]">Client Encryption</h3>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                  WebCrypto converts your document into an encrypted binary stream before it leaves your browser.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white border border-[var(--line)] space-y-2.5 shadow-xs">
                <div className="font-mono text-xs font-bold text-[var(--ink-muted)]">02</div>
                <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
                  <KeyRound size={16} />
                </div>
                <h3 className="font-semibold text-sm text-[var(--ink)]">6-Digit Print ID</h3>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                  Hand the operator a short-lived passcode instead of emailing raw attachments.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white border border-[var(--line)] space-y-2.5 shadow-xs">
                <div className="font-mono text-xs font-bold text-[var(--ink-muted)]">03</div>
                <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                  <Printer size={16} />
                </div>
                <h3 className="font-semibold text-sm text-[var(--ink)]">In-RAM Spooling</h3>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                  The operator station streams read-only bytes directly to physical printer hardware.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white border border-[var(--line)] space-y-2.5 shadow-xs">
                <div className="font-mono text-xs font-bold text-[var(--ink-muted)]">04</div>
                <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] text-[var(--danger)] flex items-center justify-center">
                  <Trash2 size={16} />
                </div>
                <h3 className="font-semibold text-sm text-[var(--ink)]">Memory Shredding</h3>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                  Upon print complete or 10-minute expiry, transient memory buffers are wiped clean.
                </p>
              </div>
            </div>
          </section>

          {/* ─── 3. MINIMAL CLEAN FOOTER ─── */}
          <footer className="pt-8 pb-6 border-t border-[var(--line)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--ink-muted)]">
            <div className="flex items-center gap-2 text-[var(--ink)] font-semibold">
              <ShieldCheck size={16} className="text-[var(--emerald)]" />
              <span>SecureXerox — Zero-Trust Document Vault</span>
            </div>
            <div className="flex items-center gap-5">
              <Link to="/login" className="hover:text-[var(--ink)] transition-colors">Sign In</Link>
              <a href="#how" className="hover:text-[var(--ink)] transition-colors">Protocol</a>
              <span>0 Bytes Persisted</span>
            </div>
          </footer>

        </div>
      </main>
    </PageTransition>
  );
}