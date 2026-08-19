import { useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileUp, Minus, Plus, X, ShieldCheck, Store, Printer,
  AlertCircle, CheckCircle2, Search, Palette, Sparkles, RefreshCw,
  Camera, Copy, Trash2, Layers, ChevronDown, ChevronUp, FileText, Lock, ArrowRight
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
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const fileInputRef = useRef();
  const manualInputRef = useRef();
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
        setIsChangingShop(false);
        // If shop lacks color capability, force all existing documents to B&W
        if (!info.isColorCapable) {
          setDocuments(prev => prev.map(d => ({ ...d, colorMode: 'Black & White' })));
        }
      } catch (err) {
        console.error('Failed to load shop info:', err);
        setShopError(`Shop '${idToLookup}' not found. Please verify the code or scan the counter QR.`);
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
    if (!clean) {
      addToast('Please enter a valid Shop ID (e.g. SX-SHOP-0042)', 'warning');
      return;
    }
    setSearchParams({ shop: clean });
  };

  const handleClearShop = () => {
    setSearchParams({});
    setTargetShop(null);
    setShopError(null);
    setIsChangingShop(false);
  };

  const handleScanSuccess = (scannedShopId) => {
    if (scannedShopId) {
      setSearchParams({ shop: scannedShopId });
      addToast(`Connected to Shop '${scannedShopId}'`, 'success');
    }
  };

  // Add files to documents state
  const handleAddFiles = (fileList) => {
    if (!targetShop) {
      addToast('Please select a destination print shop in Step 1 first.', 'warning');
      return;
    }
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
        orientation: 'Portrait',
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
    if (!targetShop) {
      addToast('Please lock in a destination print shop in Step 1.', 'warning');
      return;
    }
    if (documents.length === 0) {
      addToast('Please add at least one document to the batch.', 'warning');
      return;
    }

    for (const doc of documents) {
      if (!targetShop.isColorCapable && doc.colorMode === 'Color') {
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
        shopPublicId: targetShop.shopPublicId,
      };

      const job = await createJob(documents, globalSettings);
      nav(`/customer/print-id/${job.id}`);
    } catch (err) {
      console.error('Batch upload error:', err);
      addToast(err.message || 'Failed to encrypt and upload batch', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCopies = documents.reduce((sum, d) => sum + Number(d.copies || 1), 0);
  const colorCount = documents.filter(d => d.colorMode === 'Color').length;

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap">

          {/* ── Page Title Header ── */}
          <div className="mb-8">
            <p className="sx-kicker flex items-center gap-2">
              <ShieldCheck size={14} className="text-[var(--emerald)]" />
              Direct Encrypted Print Dispatch
            </p>
            <h1 className="sx-title" style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)' }}>
              Send encrypted files<br /><em>to a print counter.</em>
            </h1>
            <p className="sx-lede text-sm mt-1">
              Select your destination counter, configure per-document specs, and release with a 10-minute PIN.
            </p>
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* STEP 1: MANDATORY DESTINATION PRINT SHOP SELECTION */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <section className="mb-8 p-5 md:p-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--line)]">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-muted)] flex items-center gap-2">
                <Store size={15} className="text-[var(--ink)]" />
                Step 1: Choose Print Destination (Required)
              </span>
              {targetShop && (
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--emerald)] px-2 py-0.5 rounded-md bg-[var(--emerald-soft)] border border-[var(--emerald)]/20">
                  Target Locked
                </span>
              )}
            </div>

            {targetShop ? (
              /* Locked Shop Card */
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-2xl bg-[var(--emerald-soft)] text-[var(--emerald)] shrink-0 border border-[var(--emerald)]/20">
                    <Store size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-base font-bold text-[var(--ink)] block">
                        {targetShop.shopName}
                      </strong>
                      <span className="font-mono text-xs font-bold text-[var(--ink)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-md border border-[var(--line)]">
                        {targetShop.shopPublicId}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ink-muted)] flex items-center gap-2 mt-1">
                      <span className="text-[var(--emerald)] font-semibold">● Hardware Ready</span>
                      <span>•</span>
                      <span>{targetShop.isColorCapable ? 'Color & B&W Spoolers Online' : 'B&W Spooler Only (Color disabled)'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="sx-button text-xs py-2 px-3.5 cursor-pointer"
                  >
                    <Camera size={13} /> Re-scan QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChangingShop(true)}
                    className="text-xs text-[var(--ink)] font-semibold hover:bg-[var(--surface-muted)] px-3 py-2 rounded-xl border border-[var(--line)] transition-colors cursor-pointer"
                  >
                    Change Shop
                  </button>
                  <button
                    type="button"
                    onClick={handleClearShop}
                    className="text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)] p-2 rounded-xl transition-colors cursor-pointer"
                    title="Clear destination shop"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              /* Unselected Destination Prompt */
              <div className="flex flex-col gap-4">
                <div>
                  <strong className="text-sm font-semibold text-[var(--ink)] block">
                    Select the print shop you want to send your documents to:
                  </strong>
                  <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                    Scan the counter standee QR with your camera or enter the shop's 6-character ID.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="sx-button text-xs py-3 px-5 justify-center flex-1 sm:flex-none cursor-pointer shadow-sm"
                  >
                    <Camera size={16} /> Scan Shop Standee QR
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingShop(true);
                      setTimeout(() => manualInputRef.current?.focus(), 100);
                    }}
                    className="text-xs font-semibold text-[var(--ink)] px-4 py-3 rounded-xl border border-[var(--line)] bg-[var(--canvas)] hover:bg-[var(--surface-muted)] transition-colors flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-none shadow-2xs"
                  >
                    <Search size={14} /> Enter Shop Code Manually
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {shopError && (
              <div className="mt-4 p-3 rounded-xl bg-[var(--danger-soft)] text-[var(--danger)] text-xs flex items-center gap-2 border border-[var(--danger)]/20">
                <AlertCircle size={15} className="shrink-0" />
                <span>{shopError}</span>
              </div>
            )}

            {/* Manual Shop Entry Drawer */}
            {isChangingShop && (
              <div className="mt-4 pt-4 border-t border-[var(--line)] flex flex-col gap-3 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    ref={manualInputRef}
                    type="text"
                    placeholder="Enter Shop Code (e.g. SX-SHOP-3AA0)"
                    value={manualShopInput}
                    onChange={(e) => setManualShopInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyManualShop(manualShopInput);
                    }}
                    className="w-full sm:w-80 p-2.5 text-xs rounded-xl border border-[var(--line)] bg-[var(--canvas)] font-mono uppercase"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyManualShop(manualShopInput)}
                      className="sx-button text-xs py-2.5 px-4 justify-center flex-1 sm:flex-none cursor-pointer"
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
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink-muted)] mt-1">
                    <span>Available Counters:</span>
                    {publicShops.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleApplyManualShop(s.shopPublicId)}
                        className="px-2.5 py-1 rounded-lg bg-[var(--surface-muted)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] transition-colors cursor-pointer text-xs font-medium"
                      >
                        {s.shopName} ({s.shopPublicId})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* STEP 2: GATED DOCUMENT UPLOAD & PER-FILE PRINT SETTINGS */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {!targetShop ? (
            /* Gated Placeholder when Step 1 is incomplete */
            <section className="p-8 md:p-12 rounded-3xl border-2 border-dashed border-[var(--line)] bg-[var(--surface)] text-center flex flex-col items-center justify-center opacity-70">
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-muted)] text-[var(--ink-muted)] flex items-center justify-center mb-3">
                <Lock size={22} />
              </div>
              <strong className="text-base font-semibold text-[var(--ink)] block mb-1">
                Step 2: Upload Documents & Configure
              </strong>
              <p className="text-xs text-[var(--ink-muted)] max-w-sm">
                Please complete <strong>Step 1</strong> above to select or scan your destination print shop before uploading documents.
              </p>
            </section>
          ) : (
            /* Active Step 2 Section */
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-muted)] flex items-center gap-2">
                  <FileUp size={15} className="text-[var(--ink)]" />
                  Step 2: Upload Files & Configure Print Specs
                </span>
                <span className="text-xs text-[var(--ink-muted)]">
                  Locked to <strong>{targetShop.shopName}</strong>
                </span>
              </div>

              {/* Multi-File Dropzone */}
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
                  {documents.length === 0 ? 'Upload Documents for Printing' : 'Add More Files to Batch'}
                </strong>
                <p className="text-xs text-[var(--ink-muted)] max-w-md">
                  Drag & drop PDFs, Images, or DOCX files here, or click to browse. Select multiple files for one release PIN.
                </p>
                <span className="mt-3 text-[11px] font-mono px-2.5 py-1 rounded-md bg-[var(--canvas)] border border-[var(--line)] text-[var(--ink-muted)]">
                  PDF • JPG • PNG • DOCX (Max 10 MB per file)
                </span>
              </div>

              {/* Document List & Per-File Configurations */}
              {documents.length > 0 && (
                <div className="mb-8 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers size={18} className="text-[var(--ink)]" />
                      <h2 className="text-lg font-bold text-[var(--ink)]">
                        Batch Documents ({documents.length})
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
                      className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5 shadow-xs transition-all"
                    >
                      {/* Card Header Row */}
                      <div className="flex items-start md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[var(--canvas)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)] shrink-0 font-bold text-xs">
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
                              className="p-2 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                              title="Apply this file's settings to all files"
                            >
                              <Copy size={16} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeDoc(doc.id)}
                            className="p-2 rounded-lg hover:bg-[var(--danger-soft)] text-[var(--danger)] transition-colors cursor-pointer"
                            title="Remove file"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateDocConfig(doc.id, 'isExpanded', !doc.isExpanded)}
                            className="p-2 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--ink)] transition-colors cursor-pointer"
                          >
                            {doc.isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Per-Document Settings Sub-Form */}
                      {doc.isExpanded && (
                        <div className="mt-4 pt-4 border-t border-[var(--line)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-150">
                          
                          {/* Copies Stepper */}
                          <div className="sx-field" style={{ margin: 0 }}>
                            <label className="text-xs font-medium text-[var(--ink-muted)]">Copies</label>
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => updateDocConfig(doc.id, 'copies', Math.max(1, doc.copies - 1))}
                                className="w-8 h-8 rounded-lg border border-[var(--line)] bg-[var(--canvas)] hover:bg-[var(--surface-muted)] flex items-center justify-center text-[var(--ink)] font-bold cursor-pointer"
                              >
                                <Minus size={13} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={doc.copies}
                                onChange={(e) => updateDocConfig(doc.id, 'copies', Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-14 text-center p-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--canvas)] font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => updateDocConfig(doc.id, 'copies', Math.min(100, doc.copies + 1))}
                                className="w-8 h-8 rounded-lg border border-[var(--line)] bg-[var(--canvas)] hover:bg-[var(--surface-muted)] flex items-center justify-center text-[var(--ink)] font-bold cursor-pointer"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Color Mode (Respects Shop Capabilities) */}
                          <div className="sx-field" style={{ margin: 0 }}>
                            <label className="text-xs font-medium text-[var(--ink-muted)]">Color Mode</label>
                            <select
                              value={doc.colorMode}
                              disabled={!targetShop.isColorCapable}
                              onChange={(e) => updateDocConfig(doc.id, 'colorMode', e.target.value)}
                              className="w-full mt-1 p-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink)] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <option value="Black & White">Black & White</option>
                              <option value="Color" disabled={!targetShop.isColorCapable}>
                                Color {!targetShop.isColorCapable ? '(Shop lacks color)' : ''}
                              </option>
                            </select>
                          </div>

                          {/* Paper Size */}
                          <div className="sx-field" style={{ margin: 0 }}>
                            <label className="text-xs font-medium text-[var(--ink-muted)]">Paper Size</label>
                            <select
                              value={doc.paperSize}
                              onChange={(e) => updateDocConfig(doc.id, 'paperSize', e.target.value)}
                              className="w-full mt-1 p-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink)]"
                            >
                              {PAPER_SIZES.map((size) => (
                                <option key={size} value={size}>{size}</option>
                              ))}
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
                              className="w-full mt-1 p-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink)]"
                            />
                          </div>

                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Batch Summary & Submit Action */}
              {documents.length > 0 && (
                <div className="p-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <strong className="text-base font-bold text-[var(--ink)] block">
                        Batch Print Summary
                      </strong>
                      <span className="text-xs text-[var(--ink-muted)]">
                        {documents.length} {documents.length === 1 ? 'document' : 'documents'} • {totalCopies} total {totalCopies === 1 ? 'copy' : 'copies'}
                        {colorCount > 0 ? ` (${colorCount} color, ${documents.length - colorCount} B&W)` : ' (All B&W)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                      <Lock size={14} className="text-[var(--emerald)]" />
                      <span>Direct Ephemeral Encryption</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={submitBatch}
                    disabled={isSubmitting}
                    className="sx-button sx-button--lg w-full justify-center py-4 text-base font-semibold shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-[var(--canvas)]/30 border-t-[var(--canvas)] rounded-full animate-spin" />
                        Encrypting & Dispatching to {targetShop.shopName}...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={20} />
                        Generate Batch Print PIN ({documents.length} {documents.length === 1 ? 'File' : 'Files'})
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Camera QR Scanner Modal */}
      <QrScannerModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onScanSuccess={handleScanSuccess}
        onManualEntryClick={() => {
          setIsChangingShop(true);
          setTimeout(() => manualInputRef.current?.focus(), 100);
        }}
      />
    </PageTransition>
  );
}