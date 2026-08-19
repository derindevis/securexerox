import { useParams, Link } from 'react-router-dom';
import { Check, Copy, ArrowRight, Clock, Layers, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../context/AppContext';
import { useCountdown } from '../../utils/timers';
import PageTransition from '../../components/common/PageTransition';
import { api } from '../../utils/api';

export default function PrintIDPage() {
  const { jobId } = useParams();
  const { jobs } = useApp();
  const [copied, setCopied] = useState(false);
  const [job, setJob] = useState(() => jobs.find(j => j.id === jobId) || null);
  const time = useCountdown(600, true);

  useEffect(() => {
    if (!job) {
      api.getJob(jobId).then(setJob).catch(() => {});
    }
  }, [jobId, job]);

  const printIdVal = job?.printId || job?.print_id || '------';

  const copy = async () => {
    if (printIdVal) {
      await navigator.clipboard.writeText(printIdVal);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  if (!job) return (
    <main className="sx-page">
      <div className="sx-wrap">Job not found.</div>
    </main>
  );

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap">
          <p className="sx-kicker">Access created</p>
          <h1 className="sx-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.2rem)' }}>
            Give the shop<br /><em>only this.</em>
          </h1>

          <div className="sx-grid mt-10">
            {/* Print ID Card */}
            <section className="sx-panel col-span-12 lg:col-span-8">
              <p className="sx-kicker">Temporary Print ID</p>
              <p className="sx-id mt-6" style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)' }}>
                {printIdVal}
              </p>
              <button onClick={copy} className="sx-button mt-8">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy Print ID'}
              </button>
              <div className="mt-10 border-t border-[var(--line)] pt-6">
                <p className="text-sm leading-7 text-[var(--ink-secondary)]">
                  Share this ID verbally or show the QR code. Do not share the original file with the shop.
                </p>
              </div>
            </section>

            {/* Timer & QR */}
            <aside className="sx-panel col-span-12 lg:col-span-4 text-center">
              <Clock className="mx-auto text-[var(--ink-secondary)]" />
              <p className="mt-4 text-sm text-[var(--ink-muted)]">Access window</p>
              <p className="mt-2 text-5xl text-[var(--ink)]" style={{ fontFamily: 'var(--serif)' }}>
                {String(Math.floor(time.seconds / 60)).padStart(2, '0')}:{String(time.seconds % 60).padStart(2, '0')}
              </p>
              <div className="mt-7 inline-block bg-white p-3 rounded-xl border border-[var(--line)]">
                <QRCodeSVG value={printIdVal} size={132} />
              </div>
            </aside>

            {/* Next Steps */}
            <section className="sx-panel col-span-12">
              <p className="sx-kicker">Next steps</p>
              <div className="mt-4 grid gap-5 md:grid-cols-3 text-sm text-[var(--ink-secondary)]">
                <p>
                  <b className="text-[var(--ink)] font-mono">01</b><br />
                  Give the operator this Print ID.
                </p>
                <p>
                  <b className="text-[var(--ink)] font-mono">02</b><br />
                  They start a purpose-limited print session.
                </p>
                <p>
                  <b className="text-[var(--ink)] font-mono">03</b><br />
                  Follow the documented closure of the job.
                </p>
              </div>
              <Link to={`/customer/jobs/${job.id}`} className="sx-button sx-button--ghost mt-7">
                Track job <ArrowRight size={16} />
              </Link>
            </section>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}