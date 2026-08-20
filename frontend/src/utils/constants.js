// ============================================
// ZeroLeak Print — System Constants & UI Helpers
// ============================================

// Status constants for print job lifecycle
export const JOB_STATUS = {
  UPLOADED: 'UPLOADED',
  PRINT_ID_GENERATED: 'PRINT_ID_GENERATED',
  WAITING: 'WAITING',
  SECURE_SESSION: 'SECURE_SESSION',
  PRINTING: 'PRINTING',
  COMPLETED: 'COMPLETED',
  ACCESS_REVOKED: 'ACCESS_REVOKED',
  DESTROYED: 'DESTROYED',
  EXPIRED: 'EXPIRED',
  FAILED: 'FAILED',
};

// Status display config
export const STATUS_CONFIG = {
  [JOB_STATUS.UPLOADED]: { label: 'Uploaded', color: 'blue', icon: 'Upload' },
  [JOB_STATUS.PRINT_ID_GENERATED]: { label: 'Print ID Generated', color: 'indigo', icon: 'Key' },
  [JOB_STATUS.WAITING]: { label: 'Waiting in Queue', color: 'yellow', icon: 'Clock' },
  [JOB_STATUS.SECURE_SESSION]: { label: 'Secure Session Active', color: 'cyan', icon: 'Shield' },
  [JOB_STATUS.PRINTING]: { label: 'Printing...', color: 'blue', icon: 'Printer' },
  [JOB_STATUS.COMPLETED]: { label: 'Print Completed', color: 'green', icon: 'CheckCircle' },
  [JOB_STATUS.ACCESS_REVOKED]: { label: 'Access Revoked', color: 'orange', icon: 'Lock' },
  [JOB_STATUS.DESTROYED]: { label: 'Document Removed', color: 'green', icon: 'ShieldCheck' },
  [JOB_STATUS.EXPIRED]: { label: 'Expired', color: 'red', icon: 'XCircle' },
  [JOB_STATUS.FAILED]: { label: 'Print Failed', color: 'red', icon: 'AlertTriangle' },
};

// Document lifecycle stages (in order)
export const LIFECYCLE_STAGES = [
  { key: 'upload', label: 'Document Uploaded', icon: 'Upload', status: JOB_STATUS.UPLOADED },
  { key: 'printId', label: 'Print ID Generated', icon: 'Key', status: JOB_STATUS.PRINT_ID_GENERATED },
  { key: 'waiting', label: 'Waiting in Queue', icon: 'Clock', status: JOB_STATUS.WAITING },
  { key: 'session', label: 'Secure Session', icon: 'Shield', status: JOB_STATUS.SECURE_SESSION },
  { key: 'printing', label: 'Printing', icon: 'Printer', status: JOB_STATUS.PRINTING },
  { key: 'completed', label: 'Print Completed', icon: 'CheckCircle', status: JOB_STATUS.COMPLETED },
  { key: 'revoked', label: 'Access Revoked', icon: 'Lock', status: JOB_STATUS.ACCESS_REVOKED },
  { key: 'destroyed', label: 'Document Removed', icon: 'ShieldCheck', status: JOB_STATUS.DESTROYED },
];

// Print settings options
export const PAPER_SIZES = ['A4', 'A3', 'Letter', 'Legal'];
export const COLOR_MODES = ['Color', 'Black & White'];
export const ORIENTATIONS = ['Portrait', 'Landscape'];

// Helper: format file size
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper: format date relative
export function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Helper: get status step index for lifecycle
export function getStatusStepIndex(status) {
  const statusOrder = [
    JOB_STATUS.UPLOADED,
    JOB_STATUS.PRINT_ID_GENERATED,
    JOB_STATUS.WAITING,
    JOB_STATUS.SECURE_SESSION,
    JOB_STATUS.PRINTING,
    JOB_STATUS.COMPLETED,
    JOB_STATUS.ACCESS_REVOKED,
    JOB_STATUS.DESTROYED,
  ];
  return statusOrder.indexOf(status);
}
