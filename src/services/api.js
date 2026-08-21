// GearSpot API and Database Service Layer
// ALL keys and endpoints are strictly loaded from environment variables (.env.local)
// No secrets or credentials are hardcoded.

import { MOCK_LISTINGS } from '../data/mockListings'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''
const API_KEY = import.meta.env.VITE_API_KEY || ''

/**
 * Fetch gear listings dynamically from backend API or database endpoint.
 * Fallbacks cleanly to local dataset if endpoint is not defined or unreachable.
 * 
 * @param {Object} params - Query filters
 * @param {string} [params.search] - Search text keyword
 * @param {string} [params.category] - Category ID filter
 * @param {string} [params.location] - City or district filter
 * @returns {Promise<Array>} List of gear items
 */
export async function fetchListings(params = {}) {
  const { search = '', category = 'all', location = 'Koko Oulu' } = params

  // If backend API URL is configured in .env.local, fetch dynamic data from server
  if (API_BASE_URL) {
    try {
      const url = new URL(`${API_BASE_URL.replace(/\/$/, '')}/listings`)
      if (search) url.searchParams.set('q', search)
      if (category && category !== 'all') url.searchParams.set('category', category)
      if (location && location !== 'Koko Oulu') url.searchParams.set('location', location)

      const headers = {
        'Content-Type': 'application/json',
      }
      if (API_KEY) {
        headers['Authorization'] = `Bearer ${API_KEY}`
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      if (Array.isArray(data)) {
        return data
      } else if (data && Array.isArray(data.items)) {
        return data.items
      }
    } catch (err) {
      console.warn('Backend API request failed or timed out. Falling back to local data:', err.message)
    }
  }

  // Local filtering fallback (simulation of dynamic DB response)
  return filterLocalListings(MOCK_LISTINGS, { search, category, location })
}

/**
 * Helper to filter listings in memory
 */
export function filterLocalListings(items, { search = '', category = 'all', location = 'Koko Oulu' } = {}) {
  return items.filter(item => {
    // Category filter
    const matchesCategory = category === 'all' || item.category === category

    // Search query filter (matches title, brand, description, specs, model)
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || (
      item.title?.toLowerCase().includes(q) ||
      item.brand?.toLowerCase().includes(q) ||
      item.model?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.location?.toLowerCase().includes(q) ||
      (Array.isArray(item.specs) && item.specs.some(s => s.toLowerCase().includes(q)))
    )

    // Location filter
    const matchesLocation = location === 'Koko Oulu' || (
      item.location?.toLowerCase().includes(location.toLowerCase()) ||
      item.city?.toLowerCase().includes(location.toLowerCase())
    )

    return matchesCategory && matchesSearch && matchesLocation
  })
}
