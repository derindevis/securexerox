// ============================================
// SecureXerox — Print ID Utilities
// ============================================

// Characters used for Print ID generation (excluding confusing ones like 0/O, 1/I/l)
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a random Print ID in format SX-XXXXXX
 * @returns {string} Print ID like "SX-7K4P92"
 */
export function generatePrintId() {
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return `SX-${id}`;
}

/**
 * Validate Print ID format
 * @param {string} id - The Print ID to validate
 * @returns {boolean} Whether the ID matches the expected format
 */
export function isValidPrintIdFormat(id) {
  if (!id || typeof id !== 'string') return false;
  const cleaned = id.trim().toUpperCase();
  return /^SX-[A-Z0-9]{6}$/.test(cleaned);
}

/**
 * Format a Print ID to uppercase with proper prefix
 * @param {string} input - Raw user input
 * @returns {string} Formatted Print ID
 */
export function formatPrintIdInput(input) {
  if (!input) return '';
  let cleaned = input.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  
  // Auto-add SX- prefix if user starts typing without it
  if (cleaned.length > 0 && !cleaned.startsWith('S') && !cleaned.startsWith('SX')) {
    cleaned = 'SX-' + cleaned;
  }
  
  // Ensure it doesn't exceed max length
  if (cleaned.length > 9) {
    cleaned = cleaned.substring(0, 9);
  }
  
  return cleaned;
}

/**
 * Generate a unique job ID
 * @returns {string} Job ID like "job_a1b2c3"
 */
export function generateJobId() {
  return 'job_' + Math.random().toString(36).substring(2, 8);
}
