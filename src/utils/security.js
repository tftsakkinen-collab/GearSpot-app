/**
 * Vuokraajanne.com — Security & Input Sanitization Utilities
 */

/**
 * Sanitizes user input text to prevent XSS and script injection attacks.
 * @param {string} str - Raw user input text
 * @returns {string} - Cleaned text
 */
export function sanitizeInput(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim()
}

/**
 * Validates whether a honeypot field has been filled (bot detection).
 * @param {string} honeypotValue - Value of the hidden honeypot field
 * @returns {boolean} - True if human (honeypot empty), False if bot
 */
export function validateHoneypot(honeypotValue) {
  return !honeypotValue || honeypotValue.trim() === ''
}

/**
 * Validates standard email format.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email.trim())
}
