import { useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileUp, Minus, Plus, X, ShieldCheck, Store, Printer,
  AlertCircle, CheckCircle2, Search, Palette, Sparkles, RefreshCw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import PageTransition from '../../components/common/PageTransition';
import { api } from '../../utils/api';

const allowed = ['application/pdf', 'image/jpeg', 'image/png'];

export default function UploadDocument() {
  const [searchParams, setSearchParams] = useSearchParams();
  const shopParam = searchParams.get('shop');

  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [settings, setSettings] = useState({
    copies: 1,
    paperSize: 'A4',
    colorMode: 'Black & White',
    orientation: 'Portrait',
    pageRange: 'All',
  });

  const [targetShop, setTargetShop] = useState(null);
  const [loadingShop, setLoadingShop] = useState(false);
  const [shopError, setShopError] = useState(null);
  const [manualShopInput, setManualShopInput] = useState('');
  const [isChangingShop, setIsChangingShop] = useState(false);
  const [publicShops, setPublicShops] = useState([]);

  const input = useRef();
  const nav = useNavigate();
  const { createJob, addToast } = useApp();

  // Load shop information if shop query is present
  useEffect(() => {
    async function loadShopInfo(idToLookup) {
      if (!idToLookup) {
        setTargetShop(null);
        return;
      }
      setLoadingShop(true);
      setShopError(null);
      try {
        const info = await api.getShopPublicInfo(idToLookup);
        setTargetShop(info);
        // Enforce B&W if shop lacks color capability
        if (!info.isColorCapable) {
          setSettings(s => ({ ...s, colorMode: 'Black & White' }));
        }
      } catch (err) {
        console.error('Failed to load shop info:', err);
        setShopError(`Shop '${idToLookup}' not found. You can still upload to Universal Vault.`);
        setTargetShop(null);
      } finally {
        setLoadingShop(false);
      }
    }

    if (shopParam) {
      loadShopInfo(shopParam);
    } else {
      setTargetShop(null);
    }
  }, [shopParam]);

  // Load public shops list for selection helper
  useEffect(() => {
    async function loadPublicShops() {
      try {
        const list = await api.getPublicShops();
        setPublicShops(list);
      } catch (e) {
        // non-fatal
      }
    }
    loadPublicShops();
  }, []);

  const handleApplyManualShop = (shopIdToApply) => {
    const clean = shopIdToApply.trim().toUpperCase();
    if (!clean) return;
    setSearchParams({ shop: clean });
    setIsChangingShop(false);
  };

  const handleClearShop = () => {
    setSearchParams({});
    setTargetShop(null);
    setShopError(null);
    setIsChangingShop(false);
  };

  const choose = (f) => {
    if (!f) return;
    if (!allowed.includes(f.type) || f.size > 10 * 1024 * 1024) {
      addToast('Choose a PDF, JPG, or PNG up to 10 MB.', 'error');
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!file) {
      addToast('Choose a document first.', 'warning');
      return;
    }

    // Validate color capability on frontend before submitting
    if (targetShop && !targetShop.isColorCapable && settings.colorMode === 'Color') {
      addToast(`'${targetShop.shopName}' only supports Black & White printing.`, 'error');
      return;
    }

    const data = {
      name: file.name,
      type: file.type.includes('pdf') ? 'pdf' : file.type.includes('png') ? 'png' : 'jpg',
      size: file.size,
    };

    const finalSettings = {
      ...settings,
      shopPublicId: targetShop?.shopPublicId || null,
    };

    try {
      const job = await createJob(data, finalSettings, file);
      nav(`/customer/print-id/${job.id}`);
    } catch (err) {
      addToast(err.message || 'Failed to upload document', 'error');
    }
  };

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap">
          
          {/* Header */}
          <div className="mb-6">
            <p className="sx-kicker flex items-center gap-2">
              <ShieldCheck size={14} className="text-[var(--emerald)]" />
              Zero-Knowledge Document Vault
            </p>
            <h1 className="sx-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.2rem)' }}>
              Prepare the<br /><em>one-time access.</em>
            </h1>
            <p className="sx-lede text-sm mt-1">
              Encrypted in client-side RAM. Never written to unencrypted disk. Ephemeral 10-minute PIN release.
            </p>
          </div>

          {/* Shop Destination Banner (Path A: Scanned QR / Path B: Manual Shop ID) */}
          <section className="mb-8 p-4 md:p-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-xs">
            {targetShop ? (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-[var(--emerald-soft)] text-[var(--emerald)] shrink-0 border border-[var(--emerald)]/20">
                    <Store size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--emerald)] px-2 py-0.5 rounded-md bg-[var(--emerald-soft)]">
                        Verified Shop Target
                      </span>
                      <span className="font-mono text-xs font-bold text-[var(--ink)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-md border border-[var(--line)]">
                        {targetShop.shopPublicId}
                      </span>
                    </div>
                    <strong className="text-base font-semibold text-[var(--ink)] block mt-0.5">
                      {targetShop.shopName}
                    </strong>
                    <p className="text-xs text-[var(--ink-muted)] flex items-center gap-2 mt-0.5">
                      <span>🟢 Hardware Ready</span>
                      <span>•</span>
                      <span>{targetShop.isColorCapable ? 'Color & B&W Spoolers' : 'B&W Spooler Only'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsChangingShop(true)}
                    className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] px-3 py-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
                  >
                    Change Shop
                  </button>
                  <button
                    type="button"
                    onClick={handleClearShop}
                    className="text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)] p-1.5 rounded-lg transition-colors cursor-pointer"
                    title="Remove shop lock"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-[var(--surface-muted)] text-[var(--ink-muted)] shrink-0 border border-[var(--line)]">
                    <Store size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                      Print Destination
                    </span>
                    <strong className="text-sm font-semibold text-[var(--ink)] block">
                      Universal Vault Mode (Release at any counter)
                    </strong>
                    <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                      Scan a shop's counter QR or enter their Shop ID to lock this job to a specific counter.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsChangingShop(true)}
                  className="text-xs font-semibold text-[var(--ink)] px-3 py-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--surface-muted)] transition-colors flex items-center gap-1.5 cursor-pointer w-full md:w-auto justify-center"
                >
                  <Search size={13} /> Select Shop ID
                </button>
              </div>
            )}

            {/* Change / Select Shop Drawer */}
            {isChangingShop && (
              <div className="mt-4 pt-4 border-t border-[var(--line)] flex flex-col gap-3">
                <div className="flex flex-col md:flex-row items-center gap-3">
                  <input
                    type="text"
                    placeholder="Enter Shop Code (e.g. SX-SHOP-0042)"
                    value={manualShopInput}
                    onChange={(e) => setManualShopInput(e.target.value)}
                    className="w-full md:w-80 p-2 text-xs rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] font-mono uppercase"
                  />
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={() => handleApplyManualShop(manualShopInput)}
                      className="sx-button text-xs py-2 px-4 justify-center flex-1 md:flex-none cursor-pointer"
                    >
                      Lock In Shop
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChangingShop(false)}
                      className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] px-3 py-2 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {publicShops.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] text-[var(--ink-muted)]">Available Shops:</span>
                    {publicShops.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleApplyManualShop(s.shopPublicId)}
                        className="text-[11px] font-mono px-2 py-1 rounded-md bg-[var(--surface-muted)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--ink)] transition-colors cursor-pointer"
                      >
                        {s.shopName} ({s.shopPublicId})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {shopError && (
              <div className="mt-3 p-2.5 rounded-xl bg-[var(--amber-soft)] border border-[var(--amber)]/20 text-[var(--amber)] text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{shopError}</span>
              </div>
            )}
          </section>

          <div className="sx-grid">
            {/* Upload Zone */}
            <section className="sx-panel col-span-12 lg:col-span-7">
              <p className="sx-kicker mb-4">01 · Document</p>
              <button
                type="button"
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files[0]); }}
                onClick={() => input.current.click()}
                className={`sx-dropzone ${drag ? 'sx-dropzone--active' : ''} cursor-pointer`}
              >
                <FileUp size={30} className="mx-auto text-[var(--ink-secondary)]" />
                <strong className="mt-4 block text-[var(--ink)] font-semibold">
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
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="mt-4 flex items-center gap-2 text-sm text-[var(--danger)] cursor-pointer"
                >
                  <X size={15} /> Remove document
                </button>
              )}
            </section>

            {/* Settings */}
            <aside className="sx-panel col-span-12 lg:col-span-5">
              <p className="sx-kicker mb-4">02 · Print preferences</p>
              
              {/* Copies */}
              <div className="sx-field">
                <label>Copies</label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, copies: Math.max(1, s.copies - 1) }))}
                    className="p-2 border border-[var(--line-strong)] rounded-lg hover:bg-black/3 transition-colors cursor-pointer"
                  >
                    <Minus size={15} />
                  </button>
                  <b className="text-lg font-mono">{settings.copies}</b>
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, copies: s.copies + 1 }))}
                    className="p-2 border border-[var(--line-strong)] rounded-lg hover:bg-black/3 transition-colors cursor-pointer"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* Paper Size */}
              <div className="sx-field">
                <label>Paper Size</label>
                <select
                  value={settings.paperSize}
                  onChange={(e) => setSettings(s => ({ ...s, paperSize: e.target.value }))}
                >
                  <option value="A4">A4 (Standard)</option>
                  <option value="A3">A3 (Large)</option>
                  <option value="Letter">Letter</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>

              {/* Color Mode with Smart Capability Enforcement */}
              <div className="sx-field">
                <div className="flex items-center justify-between mb-1">
                  <label>Color Mode</label>
                  {targetShop && !targetShop.isColorCapable && (
                    <span className="text-[10px] text-[var(--ink-muted)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-md border border-[var(--line)] font-medium">
                      🔒 Shop offers B&W only
                    </span>
                  )}
                </div>
                <select
                  value={settings.colorMode}
                  onChange={(e) => setSettings(s => ({ ...s, colorMode: e.target.value }))}
                  disabled={targetShop && !targetShop.isColorCapable}
                >
                  <option value="Black & White">Black & White (Monochrome)</option>
                  {(!targetShop || targetShop.isColorCapable) && (
                    <option value="Color">Full Color</option>
                  )}
                </select>
              </div>

              {/* Orientation */}
              <div className="sx-field">
                <label>Orientation</label>
                <select
                  value={settings.orientation}
                  onChange={(e) => setSettings(s => ({ ...s, orientation: e.target.value }))}
                >
                  <option value="Portrait">Portrait</option>
                  <option value="Landscape">Landscape</option>
                </select>
              </div>

              {/* Page Range */}
              <div className="sx-field">
                <label>Page Range</label>
                <input
                  type="text"
                  placeholder="e.g. All or 1-5"
                  value={settings.pageRange}
                  onChange={(e) => setSettings(s => ({ ...s, pageRange: e.target.value }))}
                />
              </div>

              <button
                type="button"
                onClick={submit}
                className="sx-button mt-6 w-full justify-center text-sm py-3 cursor-pointer shadow-sm"
              >
                Create Ephemeral Print ID
              </button>
            </aside>
          </div>

        </div>
      </main>
    </PageTransition>
  );
}