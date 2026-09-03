/**
 * Vuokraajanne.com — Privacy-friendly Analytics Helper
 * Tracks user interaction events only when consent is given.
 */

export function trackEvent(eventName, payload = {}) {
  try {
    const consent = localStorage.getItem('cookie_consent')
    if (consent !== 'all' && consent !== 'necessary') {
      return
    }
    
    // Privacy-focused telemetry stub
    if (import.meta.env.DEV) {
      console.log(`[Analytics Event]: ${eventName}`, payload)
    }

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, payload)
    }
  } catch (e) {
    // Fail silently to avoid breaking UX
  }
}
