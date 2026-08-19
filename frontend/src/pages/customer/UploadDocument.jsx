import { useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileUp, Minus, Plus, X, ShieldCheck, Store, Printer,
  AlertCircle, CheckCircle2, Search, Palette, Sparkles, RefreshCw,
  Camera, Copy, Trash2, Layers, ChevronDown, ChevronUp, FileText, Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import PageTransition from '../../components/common/PageTransition';
import QrScannerModal from '../../components/common/QrScannerModal';
import { api } from '../../utils/api';
import { PAPER_SIZES, COLOR_MODES, ORIENTATIONS, formatFileSize } from '../../utils/constants';

const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];

export default function UploadDocument() {
  const [searchParams, setSearchParams] = useSearchParams();
  const shopParam = searchParams.get('shop');

  // Multi-document array state
  // Each entry: { id, file, copies, paperSize, colorMode, orientation, pageRange, isExpanded }
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
        // If shop lacks color capability, adjust any color documents to Black & White
        if (!info.isColorCapable) {
          setDocuments(prev => prev.map(d => ({ ...d, colorMode: 'Black & White' })));
        }
      } catch (err) {
        console.error('Failed to load shop info:', err);
        setShopError(`Shop '${idToLookup}' not found. Defaulting to Universal Vault Mode.`);
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

  const handleScanSuccess = (scannedShopId) => {
    if (scannedShopId) {
      setSearchParams({ shop: scannedShopId });
      addToast(`Connected to Shop '${scannedShopId}'`, 'success');
    }
  };

  // Add files to documents state
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
        colorMode: targetShop && !targetShop.isColorCapable ? 'Black & White' : 'Black & White',
        orientation: 'Portrait',
        pageRange: 'All',
        isExpanded: documents.length === 0 && i === 0, // expand first by default
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
        // Color capability check
        if (key === 'colorMode' && val === 'Color' && targetShop && !targetShop.isColorCapable) {
          addToast(`'${targetShop.shopName}' only supports Black & White printing.`, 'error');
          return doc;
        }
        return { ...doc, [key]: val };
      }
      return doc;
    }));
  };

  // Remove document from batch
  const removeDoc = (id) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  // Duplicate settings to all documents
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
      addToast('Please add at least one document.', 'warning');
      return;
    }

    // Pre-flight validation
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

          {/* ── Header ── */}
          <div className="mb-6">
            <p className="sx-kicker flex items-center gap-2">
              <ShieldCheck size={14} className="text-[var(--emerald)]" />
              Client-Side RAM Encryption Vault
            </p>
            <h1 className="sx-title" style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)' }}>
              Prepare batch<br /><em>print access.</em>
            </h1>
            <p className="sx-lede text-sm mt-1">
              Encrypted in browser memory. Individual configurations per file. Ephemeral single-use PIN release.
            </p>
          </div>

          {/* ── Print Destination Banner (QR Scan / Shop Code Entry) ── */}
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
                        Verified Counter Target
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
                    onClick={() => setIsQrModalOpen(true)}
                    className="sx-button text-xs py-1.5 px-3 cursor-pointer"
                  >
                    <Camera size={13} /> Re-scan QR
                  </button>
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
                      Scan the shop's counter standee QR or type their Shop ID to link this batch directly.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="sx-button text-xs py-2 px-3.5 justify-center flex-1 md:flex-none cursor-pointer"
                  >
                    <Camera size={14} /> Scan Shop QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChangingShop(true)}
                    className="text-xs font-semibold text-[var(--ink)] px-3 py-2 rounded-xl border border-[var(--line)] hover:bg-[var(--surface-muted)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer flex-1 md:flex-none"
                  >
                    <Search size={13} /> Enter Shop Code
                  </button>
                </div>
              </div>
            )}

            {/* Shop Error Alert */}
            {shopError && (
              <div className="mt-3 p-2.5 rounded-xl bg-[var(--danger-soft)] text-[var(--danger)] text-xs flex items-center gap-2 border border-[var(--danger)]/20">
                <AlertCircle size={14} className="shrink-0" />
                <span>{shopError}</span>
              </div>
            )}

            {/* Manual Shop Entry Drawer */}
            {isChangingShop && (
              <div className="mt-4 pt-4 border-t border-[var(--line)] flex flex-col gap-3 animate-in fade-in duration-150">
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
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink-muted)] mt-1">
                    <span>Available Shops:</span>
                    {publicShops.slice(0, 4).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleApplyManualShop(s.shopPublicId)}
                        className="px-2 py-1 rounded-md bg-[var(--surface-muted)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] transition-colors cursor-pointer text-[11px]"
                      >
                        {s.shopName} ({s.shopPublicId})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Multi-File Dropzone ── */}
          <div className="mb-8">
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
              className={`p-8 md:p-10 rounded-3xl border-2 border-dashed transition-all duration-200 text-center cursor-pointer flex flex-col items-center justify-center ${
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
          </div>

          {/* ── Document List & Per-File Configuration Cards ── */}
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

                      {/* Color Mode */}
                      <div className="sx-field" style={{ margin: 0 }}>
                        <label className="text-xs font-medium text-[var(--ink-muted)]">Color Mode</label>
                        <select
                          value={doc.colorMode}
                          onChange={(e) => updateDocConfig(doc.id, 'colorMode', e.target.value)}
                          className="w-full mt-1 p-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink)]"
                        >
                          {COLOR_MODES.map((mode) => (
                            <option
                              key={mode}
                              value={mode}
                              disabled={mode === 'Color' && targetShop && !targetShop.isColorCapable}
                            >
                              {mode} {mode === 'Color' && targetShop && !targetShop.isColorCapable ? '(Shop lacks color)' : ''}
                            </option>
                          ))}
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

          {/* ── Batch Summary & Submit Action ── */}
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
                  <span>Ephemeral Client-Side AES-256</span>
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
                    Encrypting & Dispatching Batch...
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
      </main>

      {/* Camera QR Scanner Modal */}
      <QrScannerModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </PageTransition>
  );
}