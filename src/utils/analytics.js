/**
 * Vuokraajanne.com — Privacy-friendly Analytics Helper
 * Tracks user interaction events via Microsoft Clarity & Google Analytics when consent is given.
 */

export function trackEvent(eventName, payload = {}) {
  try {
    const consent = localStorage.getItem('cookie_consent')
    if (consent !== 'all' && consent !== 'necessary') {
      return
    }
    
    // Privacy-focused telemetry logging in dev mode
    if (import.meta.env.DEV) {
      console.log(`[Analytics Event]: ${eventName}`, payload)
    }

    // Google Analytics integration
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, payload)
    }

    // Microsoft Clarity custom event tracking
    if (typeof window !== 'undefined' && window.clarity) {
      window.clarity('event', eventName)
    }
  } catch (e) {
    // Fail silently to avoid breaking UX
  }
}
