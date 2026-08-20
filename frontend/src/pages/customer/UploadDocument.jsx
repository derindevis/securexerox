import { useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileUp, Minus, Plus, X, ShieldCheck, Store, Globe,
  AlertCircle, Search, Copy, Trash2, Layers, ChevronDown, ChevronUp, Lock, CheckCircle2, Camera
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import PageTransition from '../../components/common/PageTransition';
import QrScannerModal from '../../components/common/QrScannerModal';
import { api } from '../../utils/api';
import { PAPER_SIZES, COLOR_MODES, ORIENTATIONS, formatFileSize } from '../../utils/constants';

export default function UploadDocument() {
  const [searchParams, setSearchParams] = useSearchParams();
  const shopParam = searchParams.get('shop');

  // Multi-document array state: [{ id, file, copies, paperSize, colorMode, orientation, pageRange, isExpanded }]
  const [documents, setDocuments] = useState([]);
  const [drag, setDrag] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shop destination state
  const [targetShop, setTargetShop] = useState(null);
  const [loadingShop, setLoadingShop] = useState(false);
  const [shopError, setShopError] = useState(null);
  const [manualShopInput, setManualShopInput] = useState('');
  const [isChangingShop, setIsChangingShop] = useState(false);
  const [publicShops, setPublicShops] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const fileInputRef = useRef();
  const manualInputRef = useRef();
  const nav = useNavigate();
  const { createJob, addToast } = useApp();

  // Load shop information if shop query parameter is present (e.g. from Standee QR scan)
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
        setIsChangingShop(false);
        // If shop lacks color capability, adjust existing documents to B&W
        if (!info.isColorCapable) {
          setDocuments(prev => prev.map(d => ({ ...d, colorMode: 'Black & White' })));
        }
      } catch (err) {
        console.error('Failed to load shop info:', err);
        setShopError(`Shop '${idToLookup}' not found. Defaulting to Universal Mode.`);
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

  const handleApplyShop = (shopIdToApply) => {
    const clean = shopIdToApply.trim().toUpperCase();
    if (!clean) {
      addToast('Please enter a valid Shop ID (e.g. SX-SHOP-387B)', 'warning');
      return;
    }
    setSearchParams({ shop: clean });
    setIsChangingShop(false);
  };

  const handleClearShop = () => {
    setSearchParams({});
    setTargetShop(null);
    setShopError(null);
    setIsChangingShop(false);
  };

  // Add files to documents state (Always unlocked)
  const handleAddFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const newDocs = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (f.size > 10 * 1024 * 1024) {
        addToast(`'${f.name}' exceeds 10 MB limit.`, 'error');
        continue;
      }
      newDocs.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: f,
        copies: 1,
        paperSize: 'A4',
        colorMode: 'Black & White',
        twoSided: 'One-Sided',
        pageRange: 'All',
        isExpanded: documents.length === 0 && i === 0,
      });
    }

    if (newDocs.length > 0) {
      setDocuments(prev => [...prev, ...newDocs]);
    }
  };

  // Update specific document configuration
  const updateDocConfig = (id, key, val) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id === id) {
        if (key === 'colorMode' && val === 'Color' && targetShop && !targetShop.isColorCapable) {
          addToast(`'${targetShop.shopName}' only supports Black & White printing.`, 'error');
          return doc;
        }
        return { ...doc, [key]: val };
      }
      return doc;
    }));
  };

  const removeDoc = (id) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const applySettingsToAll = (sourceDoc) => {
    setDocuments(prev => prev.map(d => ({
      ...d,
      copies: sourceDoc.copies,
      paperSize: sourceDoc.paperSize,
      colorMode: sourceDoc.colorMode,
      orientation: sourceDoc.orientation,
      pageRange: sourceDoc.pageRange,
    })));
    addToast('Applied specifications to all documents in batch.', 'info');
  };

  // Submit batch job
  const submitBatch = async () => {
    if (documents.length === 0) {
      addToast('Please add at least one document to upload.', 'warning');
      return;
    }

    for (const doc of documents) {
      if (targetShop && !targetShop.isColorCapable && doc.colorMode === 'Color') {
        addToast(`'${targetShop.shopName}' only supports Black & White printing.`, 'error');
        return;
      }
      if (doc.copies < 1 || doc.copies > 100) {
        addToast(`Copies must be between 1 and 100 for '${doc.file.name}'.`, 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const globalSettings = {
        shopPublicId: targetShop?.shopPublicId || null,
      };

      const job = await createJob(documents, globalSettings);
      
      if (globalSettings.shopPublicId) {
        nav(`/customer/track/${job.id}`);
      } else {
        nav(`/customer/print-id/${job.id}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      addToast(err.message || 'Failed to encrypt and upload documents', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredShops = publicShops.filter(s => 
    s.shopName.toLowerCase().includes(searchFilter.toLowerCase()) || 
    s.shopPublicId.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const totalCopies = documents.reduce((sum, d) => sum + Number(d.copies || 1), 0);
  const colorCount = documents.filter(d => d.colorMode === 'Color').length;

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap">

          {/* ── Header ── */}
          <div className="mb-6">
            <p className="sx-kicker flex items-center gap-2">
              <ShieldCheck size={14} className="text-[var(--emerald)]" />
              Secure Zero-Trust Print Vault
            </p>
            <h1 className="sx-title" style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)' }}>
              Encrypted print,<br /><em>zero residue.</em>
            </h1>
            <p className="sx-lede text-sm mt-1">
              Upload documents, configure print specifications, and release with a secure temporary PIN.
            </p>
          </div>

          {/* ── Mode Selector (Two distinct flows) ── */}
          <section className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Universal Mode Card */}
              <div 
                onClick={handleClearShop}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-3 ${(!targetShop && !isChangingShop && !isQrModalOpen) ? 'border-[var(--ink)] bg-[var(--surface)] ring-1 ring-[var(--ink)] shadow-md' : 'border-[var(--line)] bg-transparent hover:bg-[var(--surface-muted)] opacity-70 hover:opacity-100'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 border ${(!targetShop && !isChangingShop && !isQrModalOpen) ? 'bg-[var(--ink)] text-white border-[var(--ink)]' : 'bg-[var(--surface-muted)] text-[var(--ink)] border-[var(--line)]'}`}>
                    <Globe size={22} />
                  </div>
                  <div>
                    <strong className="text-sm font-semibold text-[var(--ink)]">Print Anywhere (Unique Code)</strong>
                    <p className="text-xs text-[var(--ink-muted)] mt-0.5">Generate a 6-digit PIN to release at any counter.</p>
                  </div>
                </div>
                {/* active state indicator if selected */}
                {(!targetShop && !isChangingShop && !isQrModalOpen) && (
                  <div className="mt-2 text-xs text-[var(--ink)] font-medium flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-[var(--emerald)]" /> Universal Mode Active
                  </div>
                )}
              </div>

              {/* Direct to Shop Card */}
              <div 
                onClick={() => !targetShop && setIsChangingShop(true)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-3 ${(targetShop || isChangingShop || isQrModalOpen) ? 'border-[var(--emerald)] bg-[var(--surface)] ring-1 ring-[var(--emerald)] shadow-md' : 'border-[var(--line)] bg-transparent hover:bg-[var(--surface-muted)] opacity-70 hover:opacity-100'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 border ${(targetShop || isChangingShop || isQrModalOpen) ? 'bg-[var(--emerald-soft)] text-[var(--emerald)] border-[var(--emerald)]/20' : 'bg-[var(--surface-muted)] text-[var(--ink)] border-[var(--line)]'}`}>
                      <Store size={22} />
                    </div>
                    <div>
                      <strong className="text-sm font-semibold text-[var(--ink)]">Direct to Counter</strong>
                      <p className="text-xs text-[var(--ink-muted)] mt-0.5">Send directly to a specific shop's print queue.</p>
                    </div>
                  </div>
                </div>
                
                {targetShop ? (
                  <div className="mt-auto p-3 rounded-xl bg-[var(--emerald-soft)] border border-[var(--emerald)]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <strong className="text-sm font-bold text-[var(--ink)]">{targetShop.shopName}</strong>
                      <span className="ml-2 font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-[var(--line)]">{targetShop.shopPublicId}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsChangingShop(true); }}
                      className="text-xs font-semibold hover:underline px-2 py-1 bg-white/50 rounded-lg shrink-0 cursor-pointer"
                    >
                      Change Counter
                    </button>
                  </div>
                ) : (
                  <div className="mt-auto flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsQrModalOpen(true); }}
                      className="flex-1 sx-button py-2 text-xs justify-center shrink-0 cursor-pointer"
                    >
                      <Camera size={14} /> Scan QR
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsChangingShop(true); setTimeout(() => manualInputRef.current?.focus(), 100); }}
                      className="flex-1 sx-button py-2 text-xs justify-center shrink-0 bg-transparent text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--surface-muted)] cursor-pointer"
                    >
                      <Search size={14} /> Search
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {shopError && (
              <div className="mt-4 p-3 rounded-xl bg-[var(--danger-soft)] text-[var(--danger)] text-sm flex items-center gap-2 border border-[var(--danger)]/20">
                <AlertCircle size={16} className="shrink-0" />
                <span>{shopError}</span>
              </div>
            )}

            {/* Shop Counter Selection Drawer */}
            {isChangingShop && (
              <div className="mt-4 p-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-2xs animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
                    <input
                      ref={manualInputRef}
                      type="text"
                      placeholder="Search shop name or code (e.g. SX-SHOP-387B)"
                      value={manualShopInput}
                      onChange={(e) => {
                        setManualShopInput(e.target.value);
                        setSearchFilter(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleApplyShop(manualShopInput);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[var(--line)] bg-[var(--canvas)] font-mono uppercase focus:ring-2 focus:ring-[var(--ink)] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyShop(manualShopInput)}
                      className="sx-button text-sm py-2.5 px-4 justify-center flex-1 sm:flex-none cursor-pointer"
                    >
                      Connect
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChangingShop(false)}
                      className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] px-3 py-2 cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {publicShops.length > 0 && (
                  <div className="flex flex-col gap-2 mt-4">
                    <span className="text-xs text-[var(--ink-muted)] font-semibold uppercase tracking-wider">Registered Counters:</span>
                    <div className="flex flex-wrap items-center gap-2 max-h-40 overflow-y-auto pr-2 pb-2">
                      {filteredShops.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleApplyShop(s.shopPublicId)}
                          className="px-3 py-2 rounded-xl bg-[var(--surface-muted)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] transition-colors cursor-pointer text-sm font-medium flex items-center gap-2"
                        >
                          <Store size={14} className="text-[var(--emerald)]" />
                          <span>{s.shopName}</span>
                          <span className="font-mono text-xs text-[var(--ink-muted)]">({s.shopPublicId})</span>
                        </button>
                      ))}
                      {filteredShops.length === 0 && (
                        <span className="text-sm text-[var(--ink-muted)] py-2">No matching counters found.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Multi-File Upload Dropzone (Always Active) ── */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden"
            onChange={(e) => handleAddFiles(e.target.files)}
          />

          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              handleAddFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 md:p-10 rounded-3xl border-2 border-dashed transition-all duration-200 text-center cursor-pointer flex flex-col items-center justify-center mb-6 ${
              drag
                ? 'border-[var(--ink)] bg-[var(--surface-muted)] scale-[0.99]'
                : 'border-[var(--line)] bg-[var(--surface)] hover:border-[var(--ink-muted)] hover:bg-[var(--surface-muted)]/50'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--surface-muted)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)] mb-3 shadow-xs">
              <FileUp size={26} />
            </div>
            <strong className="text-base font-semibold text-[var(--ink)] block mb-1">
              {documents.length === 0 ? 'Drop Documents to Print' : 'Add More Files to Batch'}
            </strong>
            <p className="text-xs text-[var(--ink-muted)] max-w-md">
              Drag & drop PDFs, Images, or DOCX files here, or click to browse. Select multiple files for one release PIN.
            </p>
            <span className="mt-3 text-[11px] font-mono px-2.5 py-1 rounded-md bg-[var(--canvas)] border border-[var(--line)] text-[var(--ink-muted)]">
              PDF • JPG • PNG • DOCX (Max 10 MB per file)
            </span>
          </div>

          {/* ── Document List & Per-File Configurations ── */}
          {documents.length > 0 && (
            <div className="mb-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={17} className="text-[var(--ink)]" />
                  <h2 className="text-base font-bold text-[var(--ink)]">
                    Documents in Vault ({documents.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-[var(--ink)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} /> Add Another File
                </button>
              </div>

              {documents.map((doc, index) => (
                <div
                  key={doc.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-xs transition-all"
                >
                  {/* Card Header Row */}
                  <div className="flex items-start md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[var(--canvas)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)] shrink-0 font-bold text-xs">
                        #{index + 1}
                      </div>
                      <div className="min-w-0">
                        <strong className="text-sm font-semibold text-[var(--ink)] block truncate max-w-xs md:max-w-md">
                          {doc.file.name}
                        </strong>
                        <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)] mt-0.5">
                          <span>{formatFileSize(doc.file.size)}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px]">
                            {doc.copies} {doc.copies === 1 ? 'copy' : 'copies'} • {doc.colorMode} • {doc.paperSize}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {documents.length > 1 && (
                        <button
                          type="button"
                          onClick={() => applySettingsToAll(doc)}
                          className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                          title="Apply this file's settings to all files"
                        >
                          <Copy size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeDoc(doc.id)}
                        className="p-1.5 rounded-lg hover:bg-[var(--danger-soft)] text-[var(--danger)] transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateDocConfig(doc.id, 'isExpanded', !doc.isExpanded)}
                        className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--ink)] transition-colors cursor-pointer"
                      >
                        {doc.isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Per-Document Settings Sub-Form */}
                  {doc.isExpanded && (
                    <div className="mt-3.5 pt-3.5 border-t border-[var(--line)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 animate-in fade-in duration-150">
                      
                      {/* Copies Stepper */}
                      <div className="sx-field" style={{ margin: 0 }}>
                        <label className="text-xs font-medium text-[var(--ink-muted)]">Copies</label>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => updateDocConfig(doc.id, 'copies', Math.max(1, doc.copies - 1))}
                            className="w-7 h-7 rounded-lg border border-[var(--line)] bg-[var(--canvas)] hover:bg-[var(--surface-muted)] flex items-center justify-center text-[var(--ink)] font-bold cursor-pointer"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={doc.copies}
                            onChange={(e) => updateDocConfig(doc.id, 'copies', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-12 text-center p-1 text-xs rounded-lg border border-[var(--line)] bg-[var(--canvas)] font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => updateDocConfig(doc.id, 'copies', Math.min(100, doc.copies + 1))}
                            className="w-7 h-7 rounded-lg border border-[var(--line)] bg-[var(--canvas)] hover:bg-[var(--surface-muted)] flex items-center justify-center text-[var(--ink)] font-bold cursor-pointer"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Color Mode */}
                      <div className="sx-field" style={{ margin: 0 }}>
                        <label className="text-xs font-medium text-[var(--ink-muted)]">Color Mode</label>
                        <select
                          value={doc.colorMode}
                          disabled={targetShop && !targetShop.isColorCapable}
                          onChange={(e) => updateDocConfig(doc.id, 'colorMode', e.target.value)}
                          className="w-full mt-1 p-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink)] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value="Black & White">Black & White</option>
                          <option value="Color" disabled={targetShop && !targetShop.isColorCapable}>
                            Color {targetShop && !targetShop.isColorCapable ? '(Shop lacks color)' : ''}
                          </option>
                        </select>
                      </div>

                      {/* Paper Size */}
                      <div className="sx-field" style={{ margin: 0 }}>
                        <label className="text-xs font-medium text-[var(--ink-muted)]">Paper Size</label>
                        <select
                          value={doc.paperSize}
                          onChange={(e) => updateDocConfig(doc.id, 'paperSize', e.target.value)}
                          className="w-full mt-1 p-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink)]"
                        >
                          {PAPER_SIZES.map((size) => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      </div>

                      {/* Two Sided */}
                      <div className="sx-field" style={{ margin: 0 }}>
                        <label className="text-xs font-medium text-[var(--ink-muted)]">Two-Sided</label>
                        <select
                          value={doc.twoSided}
                          onChange={(e) => updateDocConfig(doc.id, 'twoSided', e.target.value)}
                          className="w-full mt-1 p-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink)]"
                        >
                          <option value="One-Sided">One-Sided</option>
                          <option value="Two-Sided (Long Edge)">Two-Sided (Long Edge)</option>
                          <option value="Two-Sided (Short Edge)">Two-Sided (Short Edge)</option>
                        </select>
                      </div>

                      {/* Page Range */}
                      <div className="sx-field" style={{ margin: 0 }}>
                        <label className="text-xs font-medium text-[var(--ink-muted)]">Page Range</label>
                        <input
                          type="text"
                          value={doc.pageRange}
                          placeholder="All or 1-5"
                          onChange={(e) => updateDocConfig(doc.id, 'pageRange', e.target.value)}
                          className="w-full mt-1 p-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink)]"
                        />
                      </div>

                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Summary & Submit Action ── */}
          {documents.length > 0 && (
            <div className="p-5 md:p-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <strong className="text-base font-bold text-[var(--ink)] block">
                    Vault Print Summary
                  </strong>
                  <span className="text-xs text-[var(--ink-muted)]">
                    {documents.length} {documents.length === 1 ? 'document' : 'documents'} • {totalCopies} total {totalCopies === 1 ? 'copy' : 'copies'}
                    {colorCount > 0 ? ` (${colorCount} color, ${documents.length - colorCount} B&W)` : ' (All B&W)'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
                  <Lock size={13} className="text-[var(--emerald)]" />
                  <span>Direct Ephemeral Encryption</span>
                </div>
              </div>

              <button
                type="button"
                onClick={submitBatch}
                disabled={isSubmitting}
                className="sx-button sx-button--lg w-full justify-center py-3.5 text-base font-semibold shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[var(--canvas)]/30 border-t-[var(--canvas)] rounded-full animate-spin" />
                    Encrypting & Dispatching...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={19} />
                    Generate Secure Print PIN ({documents.length} {documents.length === 1 ? 'File' : 'Files'})
                  </>
                )}
              </button>
            </div>
          )}

        </div>

        <QrScannerModal 
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          onScanSuccess={(shopId) => {
            handleApplyShop(shopId);
          }}
          onManualEntryClick={() => {
            setIsChangingShop(true);
            setTimeout(() => manualInputRef.current?.focus(), 100);
          }}
        />
      </main>
    </PageTransition>
  );
}