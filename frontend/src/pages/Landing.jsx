import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FileKey2,
  Printer,
  ShieldCheck,
  Upload,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import PageTransition from '../components/common/PageTransition';

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload once',
    text: 'Client-side AES-256 encryption converts your PDF or image into a time-bound, protected print buffer.',
  },
  {
    number: '02',
    icon: FileKey2,
    title: 'Share a Print ID',
    text: 'Hand the operator a 6-character ephemeral passcode (e.g. SX-7K4P92) instead of emailing your file.',
  },
  {
    number: '03',
    icon: Printer,
    title: 'Print with purpose',
    text: 'The shop opens a restricted, read-only session in RAM with zero download or export permissions.',
  },
  {
    number: '04',
    icon: ShieldCheck,
    title: 'Automatic RAM shredding',
    text: 'Once printed or upon expiry, the document is irrevocably wiped from memory with zero persistent trace.',
  },
];

export default function Landing() {
  return (
    <PageTransition>
      <main className="vault-page">
        <div className="vault-wrap space-y-12">
          {/* HERO SECTION */}
          <section className="vault-hero" aria-labelledby="hero-title">
            <div className="space-y-6">
              <span className="vault-kicker">Private Document Handoff Vault</span>

              <h1 id="hero-title" className="vault-title">
                Print the page.<br />
                <em>Not the history.</em>
              </h1>

              <p className="vault-lede">
                SecureXerox turns sensitive documents into short-lived, encrypted print handoffs—so local print shops get what they need to execute your print job without retaining a permanent digital copy.
              </p>

              <div className="mt-8 flex flex-wrap gap-4 items-center">
                <Link to="/login" className="vault-button">
                  Create a Print ID <ArrowRight size={16} />
                </Link>
                <a className="vault-button vault-button--quiet" href="#how">
                  How it works
                </a>
              </div>

              {/* Security Telemetry Summary Pills */}
              <div className="pt-6 grid grid-cols-3 gap-3 border-t border-white/10 max-w-lg">
                <div>
                  <strong className="block text-[var(--paper)] text-base font-serif">0 Bytes</strong>
                  <span className="text-xs text-slate-400">Post-Print Storage</span>
                </div>
                <div>
                  <strong className="block text-[var(--lime)] text-base font-serif">10 Max Min</strong>
                  <span className="text-xs text-slate-400">Time-To-Live Window</span>
                </div>
                <div>
                  <strong className="block text-sky-400 text-base font-serif">AES-256</strong>
                  <span className="text-xs text-slate-400">GCM Encryption</span>
                </div>
              </div>
            </div>

            {/* REAL-WORLD PRINT SHOP HERO IMAGE CARD */}
            <div className="landing-image-card group">
              <img
                src="/landing_hero_print_shop.jpg"
                alt="Customer using SecureXerox Print ID at a modern print shop printer"
                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
              />
              <div className="landing-image-overlay" />

              {/* Floating Live Telemetry Badge Overlay */}
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/15 shadow-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--lime)]/10 text-[var(--lime)]">
                    <Lock size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                      TEMPORARY PRINT ACCESS
                    </span>
                    <span className="font-mono text-lg font-bold text-[var(--paper)]">
                      SX-7K4P92
                    </span>
                  </div>
                </div>
                <span className="vault-orbit__chip !mt-0 text-[10px]">
                  ACCESS WINDOW ACTIVE
                </span>
              </div>
            </div>
          </section>

          {/* THE LIFECYCLE & WORKSPACE DOCUMENT SECURITY */}
          <section id="how" className="vault-section" aria-labelledby="how-title">
            <div className="mb-8">
              <p className="vault-kicker">The Cryptographic Lifecycle</p>
              <h2 id="how-title" className="vault-title !text-[clamp(2rem,3.8vw,4.2rem)]">
                A clear route from <em>upload</em> to closure.
              </h2>
            </div>

            <div className="grid gap-8 lg:grid-cols-12 items-center">
              {/* Process Steps List */}
              <div className="lg:col-span-7 vault-process !mt-0 !grid-cols-1 sm:!grid-cols-2 rounded-xl overflow-hidden">
                {steps.map(({ number, icon: Icon, title, text }) => (
                  <article className="vault-step p-5" key={number}>
                    <span className="vault-step__number font-mono">{number}</span>
                    <Icon size={20} className="mt-3 text-[var(--lime)]" />
                    <h3 className="!mt-2 font-serif text-lg">{title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{text}</p>
                  </article>
                ))}
              </div>

              {/* REAL-WORLD WORKSPACE ENCRYPTION IMAGE */}
              <div className="lg:col-span-5 landing-image-card group">
                <img
                  src="/landing_document_security.jpg"
                  alt="Laptop displaying client-side document encryption and legal agreements"
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                <div className="landing-image-overlay" />
                <div className="absolute bottom-4 left-4 right-4 p-3 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 text-xs text-slate-300">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={14} className="text-[var(--lime)]" />
                    <span className="font-semibold text-white">Client-Side Encryption</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Files are encrypted locally before transmission. Raw documents never touch unencrypted disk storage.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* REAL OPERATOR INTERFACE SHOWCASE */}
          <section className="vault-section">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5 space-y-4">
                <p className="vault-kicker">Designed for real handoffs</p>
                <h2 className="vault-title !text-[clamp(1.8rem,3.5vw,3.8rem)]">
                  No hidden journey.<br />
                  <em>Every state is visible.</em>
                </h2>
                <p className="text-sm leading-7 text-slate-300">
                  Customers follow a single guided flow while print operators verify Print IDs in a restricted, read-only printing sandbox. The interface continuously monitors session time and forces immediate memory shredding when complete.
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <Link to="/login" className="vault-button">
                    Open SecureXerox <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

              {/* SESSION MOCKUP SHOWCASE */}
              <div className="lg:col-span-7 landing-image-card p-2 bg-slate-900/90 border border-white/15">
                <img
                  src="/session-mockup.png"
                  alt="SecureXerox Operator Printing Sandbox Interface"
                  className="w-full h-auto rounded-lg object-cover"
                />
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="border-t border-white/10 py-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span>SecureXerox · Ephemeral, Zero-Trust Document Handoff Vault</span>
            <div className="flex items-center gap-4">
              <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
              <a href="#how" className="hover:text-white transition-colors">How it works</a>
            </div>
          </footer>
        </div>
      </main>
    </PageTransition>
  );
}