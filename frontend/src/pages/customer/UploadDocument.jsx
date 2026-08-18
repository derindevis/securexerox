import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, Minus, Plus, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import PageTransition from '../../components/common/PageTransition';

const allowed = ['application/pdf', 'image/jpeg', 'image/png'];

export default function UploadDocument() {
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [settings, setSettings] = useState({
    copies: 1,
    paperSize: 'A4',
    colorMode: 'Black & White',
    orientation: 'Portrait',
    pageRange: 'All',
  });
  const input = useRef();
  const nav = useNavigate();
  const { createJob, addToast } = useApp();

  const choose = (f) => {
    if (!f) return;
    if (!allowed.includes(f.type) || f.size > 10 * 1024 * 1024) {
      addToast('Choose a PDF, JPG, or PNG up to 10 MB.', 'error');
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!file) { addToast('Choose a document first.', 'warning'); return; }
    const data = {
      name: file.name,
      type: file.type.includes('pdf') ? 'pdf' : file.type.includes('png') ? 'png' : 'jpg',
      size: file.size,
    };
    const job = await createJob(data, settings, file);
    nav(`/customer/print-id/${job.id}`);
  };

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap">
          <p className="sx-kicker">New print handoff</p>
          <h1 className="sx-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.2rem)' }}>
            Prepare the<br /><em>one-time access.</em>
          </h1>

          <div className="sx-grid mt-10">
            {/* Upload Zone */}
            <section className="sx-panel col-span-12 lg:col-span-7">
              <p className="sx-kicker mb-4">01 · Document</p>
              <button
                type="button"
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files[0]); }}
                onClick={() => input.current.click()}
                className={`sx-dropzone ${drag ? 'sx-dropzone--active' : ''}`}
              >
                <FileUp size={30} className="mx-auto text-[var(--ink-secondary)]" />
                <strong className="mt-4 block text-[var(--ink)]">
                  {file ? file.name : 'Drop a document here'}
                </strong>
                <span className="mt-2 block text-sm text-[var(--ink-muted)]">
                  PDF, JPG or PNG · up to 10 MB
                </span>
              </button>
              <input
                ref={input}
                onChange={(e) => choose(e.target.files[0])}
                className="hidden"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              {file && (
                <button onClick={() => setFile(null)} className="mt-4 flex items-center gap-2 text-sm text-[var(--danger)]">
                  <X size={15} /> Remove document
                </button>
              )}
            </section>

            {/* Settings */}
            <aside className="sx-panel col-span-12 lg:col-span-5">
              <p className="sx-kicker mb-4">02 · Print preferences</p>
              <div className="sx-field">
                <label>Copies</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSettings(s => ({ ...s, copies: Math.max(1, s.copies - 1) }))}
                    className="p-2 border border-[var(--line-strong)] rounded-lg hover:bg-black/3 transition-colors"
                  >
                    <Minus size={15} />
                  </button>
                  <b className="text-lg">{settings.copies}</b>
                  <button
                    onClick={() => setSettings(s => ({ ...s, copies: s.copies + 1 }))}
                    className="p-2 border border-[var(--line-strong)] rounded-lg hover:bg-black/3 transition-colors"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
              {[['paperSize', ['A4', 'A3']], ['colorMode', ['Black & White', 'Color']], ['orientation', ['Portrait', 'Landscape']]].map(([key, values]) => (
                <div className="sx-field" key={key}>
                  <label>{key.replace(/([A-Z])/g, ' $1')}</label>
                  <select value={settings[key]} onChange={(e) => setSettings(s => ({ ...s, [key]: e.target.value }))}>
                    {values.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              ))}
              <button onClick={submit} className="sx-button mt-6 w-full">
                Create Print ID
              </button>
            </aside>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}