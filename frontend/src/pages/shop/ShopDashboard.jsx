import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  ScanLine, ShieldCheck, Printer, Plus, RefreshCw, Trash2, CheckCircle2,
  AlertTriangle, Server, Palette, Cpu, QrCode, FileText
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { JOB_STATUS, formatRelativeTime } from '../../utils/constants';
import PageTransition from '../../components/common/PageTransition';
import Modal from '../../components/common/Modal';
import CounterStandeeModal from '../../components/shop/CounterStandeeModal';
import { api } from '../../utils/api';

export default function ShopDashboard() {
  const { jobs, currentUser, addToast } = useApp();
  const queue = jobs.filter(j => ['WAITING', 'PRINT_ID_GENERATED', 'SECURE_SESSION', 'PRINTING'].includes(j.status));
  const completed = jobs.filter(j => j.status === JOB_STATUS.DESTROYED);

  const [printers, setPrinters] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(true);
  const [testingId, setTestingId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);
  const [newPrinter, setNewPrinter] = useState({
    printerName: '',
    printerProtocol: 'socket',
    printerEndpoint: '',
    printerColorCapable: false,
  });

  const shopPublicId = currentUser?.shopPublicId || currentUser?.shop_public_id || (currentUser?.id ? `SX-SHOP-${currentUser.id.slice(0, 4).toUpperCase()}` : 'SX-SHOP-DEFAULT');
  const shopQrUrl = currentUser?.shopQrPayload || currentUser?.shop_qr_payload || `${window.location.origin}/customer/upload?shop=${shopPublicId}`;

  const loadPrinters = async () => {
    try {
      setLoadingPrinters(true);
      const data = await api.getPrinters();
      setPrinters(data);
    } catch (err) {
      console.error('Failed to load printers:', err);
    } finally {
      setLoadingPrinters(false);
    }
  };

  useEffect(() => {
    loadPrinters();
  }, []);

  const handleTestPrinter = async (printerId) => {
    try {
      setTestingId(printerId);
      const res = await api.testPrinter(printerId);
      if (res.success) {
        addToast(`Printer is ONLINE (${res.latencyMs}ms)`, 'success');
      } else {
        addToast(res.message || 'Printer connection failed', 'error');
      }
      loadPrinters();
    } catch (err) {
      addToast(err.message || 'Printer test failed', 'error');
    } finally {
      setTestingId(null);
    }
  };

  const handleCreatePrinter = async (e) => {
    e.preventDefault();
    if (!newPrinter.printerName.trim() || !newPrinter.printerEndpoint.trim()) {
      addToast('Please enter both name and endpoint (IP:Port)', 'error');
      return;
    }
    try {
      await api.createPrinter(newPrinter);
      addToast('Hardware printer registered!', 'success');
      setIsAddModalOpen(false);
      setNewPrinter({
        printerName: '',
        printerProtocol: 'socket',
        printerEndpoint: '',
        printerColorCapable: false,
      });
      loadPrinters();
    } catch (err) {
      addToast(err.message || 'Failed to add printer', 'error');
    }
  };

  const handleDeletePrinter = async (printerId) => {
    try {
      await api.deletePrinter(printerId);
      addToast('Printer removed', 'info');
      loadPrinters();
    } catch (err) {
      addToast(err.message || 'Failed to delete printer', 'error');
    }
  };

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap">
          {/* Header */}
          <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="sx-kicker">Operator console</p>
              <h1 className="sx-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.2rem)' }}>
                Print with<br /><em>restraint.</em>
              </h1>
              <p className="sx-lede">Verify a customer's Print ID, confirm parameters, and stream directly to hardware.</p>
            </div>
            <Link to="/shop/print" className="sx-button">
              <ScanLine size={16} /> Verify Print ID
            </Link>
          </header>

          {/* Stats */}
          <section className="sx-statline">
            <div className="sx-stat">
              <strong>{queue.length}</strong>
              <span>Waiting or active</span>
            </div>
            <div className="sx-stat">
              <strong>{completed.length}</strong>
              <span>Removal recorded</span>
            </div>
            <div className="sx-stat">
              <strong>{printers.length}</strong>
              <span>Hardware Spoolers</span>
            </div>
          </section>

          {/* Permanent Counter QR & Standee Banner */}
          <section className="sx-section">
            <div className="p-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-white rounded-xl border border-[var(--line)] shadow-xs shrink-0">
                  <QRCodeSVG value={shopQrUrl} size={68} level="M" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--emerald)] px-2 py-0.5 rounded-md bg-[var(--emerald-soft)] border border-[var(--emerald)]/20">
                      Counter QR Active
                    </span>
                    <span className="font-mono text-xs font-bold text-[var(--ink)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-md border border-[var(--line)]">
                      {shopPublicId}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--ink)] mt-1.5" style={{ fontFamily: 'var(--serif)' }}>
                    Permanent Desk Standee Poster
                  </h3>
                  <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                    Customers scan this counter QR with their mobile camera to immediately route prints to this shop.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setIsStandeeModalOpen(true)}
                  className="sx-button justify-center text-xs py-2.5 px-4 w-full md:w-auto cursor-pointer"
                >
                  <Printer size={15} /> Print Desk Standee
                </button>
              </div>
            </div>
          </section>

          {/* Queue */}
          <section className="sx-section">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-xl font-medium text-[var(--ink)]" style={{ fontFamily: 'var(--serif)' }}>
                  Next in line
                </h2>
              </div>
              <Link className="text-sm font-medium text-[var(--ink-secondary)] hover:text-[var(--ink)]" to="/shop/queue">Open queue</Link>
            </div>

            <div className="sx-list">
              {queue.slice(0, 5).map((job, index) => (
                <div className="sx-row" key={job.id}>
                  <div className="flex gap-4">
                    <span className="text-[var(--emerald)] font-mono font-bold">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong className="text-[var(--ink)] font-medium">
                        {job.documents && job.documents.length > 1
                          ? `${job.documents[0].fileName} + ${job.documents.length - 1} more (${job.documents.length} files)`
                          : job.documents?.[0]?.fileName || job.fileName || 'Batch Print Job'}
                      </strong>
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">{job.printId} · {formatRelativeTime(job.createdAt || job.created_at)}</p>
                    </div>
                  </div>
                  <span className="sx-status">{job.status.replaceAll('_', ' ')}</span>
                </div>
              ))}
              {queue.length === 0 && (
                <div className="sx-panel text-[var(--ink-secondary)] mt-4">The queue is clear.</div>
              )}
            </div>
          </section>

          {/* Hardware Printers Registry Panel */}
          <section className="sx-section">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-xl font-medium text-[var(--ink)] flex items-center gap-2" style={{ fontFamily: 'var(--serif)' }}>
                  <Printer size={20} className="text-[var(--ink)]" />
                  Hardware Printers
                </h2>
                <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                  Registered network spoolers (RAW Socket 9100 / IPP 631) for direct backend streaming.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs font-semibold text-[var(--ink)] px-3 py-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--surface-muted)] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Add Printer
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {printers.map((p) => (
                <div key={p.id} className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] flex flex-col justify-between gap-3 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-semibold text-[var(--ink)]">{p.printerName}</strong>
                        {p.printerColorCapable && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20 flex items-center gap-1">
                            <Palette size={10} /> Color
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-[var(--ink-muted)] mt-1">{p.printerEndpoint} ({p.printerProtocol.toUpperCase()})</p>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                      p.printerStatus === 'online'
                        ? 'bg-[var(--emerald-soft)] text-[var(--emerald)]'
                        : p.printerStatus === 'offline'
                        ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
                        : 'bg-[var(--surface-muted)] text-[var(--ink-muted)]'
                    }`}>
                      {p.printerStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--line)] text-xs">
                    <button
                      type="button"
                      disabled={testingId === p.id}
                      onClick={() => handleTestPrinter(p.id)}
                      className="text-[var(--ink)] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={12} className={testingId === p.id ? 'animate-spin' : ''} />
                      {testingId === p.id ? 'Testing ping...' : 'Test Connection'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePrinter(p.id)}
                      className="text-[var(--danger)] hover:opacity-80 cursor-pointer p-1"
                      title="Remove Printer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}

              {printers.length === 0 && !loadingPrinters && (
                <div className="md:col-span-2 p-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-center text-xs text-[var(--ink-muted)]">
                  <Server size={22} className="mx-auto text-[var(--ink-muted)] mb-2" />
                  <p className="font-medium text-[var(--ink)]">No Physical Printers Registered</p>
                  <p className="mt-1">SecureXerox will use the internal virtual loopback spooler until you add a physical device.</p>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--ink)] text-[var(--surface)] cursor-pointer"
                  >
                    <Plus size={13} /> Add Network Printer
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Info */}
          <aside className="sx-infobar">
            <ShieldCheck className="shrink-0" size={18} />
            <p>Direct Hardware Spooler active. Documents stream directly to printer endpoints with zero browser rendering.</p>
          </aside>
        </div>
      </main>

      {/* Add Printer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Hardware Printer"
      >
        <form onSubmit={handleCreatePrinter} className="flex flex-col gap-4 p-2">
          <div className="sx-field">
            <label htmlFor="printer-name">Printer Friendly Name</label>
            <input
              id="printer-name"
              required
              type="text"
              placeholder="e.g. Front Counter Xerox B&W"
              value={newPrinter.printerName}
              onChange={(e) => setNewPrinter({ ...newPrinter, printerName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="sx-field">
              <label htmlFor="printer-protocol">Protocol</label>
              <select
                id="printer-protocol"
                value={newPrinter.printerProtocol}
                onChange={(e) => setNewPrinter({ ...newPrinter, printerProtocol: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm"
              >
                <option value="socket">RAW Socket (Port 9100)</option>
                <option value="ipp">IPP (Port 631)</option>
              </select>
            </div>

            <div className="sx-field">
              <label htmlFor="printer-color">Color Capability</label>
              <div className="flex items-center h-[42px]">
                <label className="flex items-center gap-2 text-xs font-medium text-[var(--ink)] cursor-pointer">
                  <input
                    id="printer-color"
                    type="checkbox"
                    checked={newPrinter.printerColorCapable}
                    onChange={(e) => setNewPrinter({ ...newPrinter, printerColorCapable: e.target.checked })}
                    className="accent-[var(--ink)]"
                  />
                  <span>Color Capable</span>
                </label>
              </div>
            </div>
          </div>

          <div className="sx-field">
            <label htmlFor="printer-endpoint">Network Endpoint (IP:Port)</label>
            <input
              id="printer-endpoint"
              required
              type="text"
              placeholder="e.g. 192.168.1.150:9100 or 127.0.0.1:9100"
              value={newPrinter.printerEndpoint}
              onChange={(e) => setNewPrinter({ ...newPrinter, printerEndpoint: e.target.value })}
            />
            <p className="text-[11px] text-[var(--ink-muted)] mt-1">
              Use your printer's LAN IP address or <code>127.0.0.1:9100</code> for test loopback.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] py-2 px-3"
            >
              Cancel
            </button>
            <button type="submit" className="sx-button justify-center text-xs py-2 px-4">
              Register Printer
            </button>
          </div>
        </form>
      </Modal>

      {/* Counter Standee Modal */}
      <CounterStandeeModal
        isOpen={isStandeeModalOpen}
        onClose={() => setIsStandeeModalOpen(false)}
        shopUser={currentUser}
      />
    </PageTransition>
  );
}