import React, { useState, useEffect } from 'react'
import {
  Search,
  MapPin,
  Calendar,
  Compass,
  Waves,
  Flame,
  ShieldCheck,
  Star,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  ChevronRight,
  PlusCircle,
  Menu,
  X,
  Heart,
  CheckCircle2,
  Package,
  RotateCcw,
  Sun,
  Moon
} from 'lucide-react'
import { fetchListings } from './services/api'
import { MOCK_LISTINGS } from './data/mockListings'
import AvatarInitials from './components/AvatarInitials'

const CATEGORIES = [
  { id: 'all', name: 'Kaikki varusteet', icon: Compass },
  { id: 'sup_boards', name: 'SUP-laudat & Vesi', icon: Waves },
  { id: 'cooking', name: 'Retkikeittimet & Ruokailu', icon: Flame },
]

const LOCATIONS = [
  'Koko Oulu',
  'Tuira',
  'Nallikari',
  'Keskusta',
  'Linnanmaa',
  'Kaakkuri'
]

export default function App() {
  const [listings, setListings] = useState(MOCK_LISTINGS)
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('Koko Oulu')
  const [favorites, setFavorites] = useState([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    try {
      return document.documentElement.getAttribute('data-theme') || 'light'
    } catch (e) {
      return 'light'
    }
  })

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    try {
      document.documentElement.setAttribute('data-theme', nextTheme)
      localStorage.setItem('theme', nextTheme)
    } catch (e) {}
  }

  // Intersection Observer elementtien reveal-ilmaantumiselle
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', 'true')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    const elements = document.querySelectorAll('[data-reveal]')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [listings])

  // Dynaaminen tietokanta-/API-haku
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        setLoading(true)
        const data = await fetchListings({
          search: searchQuery,
          category: selectedCategory,
          location: selectedLocation
        })
        if (isMounted) {
          setListings(data)
        }
      } catch (err) {
        console.warn('Virhe haettaessa ilmoituksia:', err)
        if (isMounted) {
          setListings(MOCK_LISTINGS)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [searchQuery, selectedCategory, selectedLocation])

  const toggleFavorite = (id) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedLocation('Koko Oulu')
  }

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'all' || selectedLocation !== 'Koko Oulu'

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col selection:bg-emerald-500/20 selection:text-emerald-900 antialiased transition-colors duration-200">
      {/* 1. MINIMALIST NAVIGATION */}
      <header className="sticky top-0 z-50 glass border-b border-[var(--border)] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-[var(--accent-ink)] shadow-sm shrink-0">
              <Waves className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent-ink)] stroke-[2.2]" />
            </div>
            <div className="flex items-center">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text)] font-heading">
                Vuokraaj<span className="text-[var(--accent)] font-extrabold">anne</span>
              </span>
              <span className="ml-2 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-quiet)] text-[var(--on-accent-quiet)] border border-[var(--accent)]/20">
                Oulu
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-[var(--muted)]">
            <a href="#gear" className="text-[var(--text)] hover:text-[var(--accent)] transition">Selaa varusteita</a>
            <a href="#how-it-works" className="hover:text-[var(--text)] transition">Miten se toimii</a>
            <a href="#safety" className="hover:text-[var(--text)] transition">Turvallisuus & Vakuutus</a>
          </nav>

          {/* Action CTAs & Theme Toggle */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[var(--text)] hover:bg-[var(--border)]/40 transition active:scale-95 border border-[var(--border)]"
              aria-label={theme === 'dark' ? 'Vaihda vaaleaan teemaan' : 'Vaihda tummaan teemaan'}
              title={theme === 'dark' ? 'Vaalea tila' : 'Tumma tila'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />}
            </button>

            <button className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] px-3 py-2 transition rounded-lg hover:bg-[var(--border)]/40 min-h-[44px] inline-flex items-center">
              Kirjaudu
            </button>
            <button className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90 transition shadow-sm hover:shadow active:scale-[0.98] min-h-[44px]">
              <PlusCircle className="w-4 h-4 text-[var(--accent-ink)]" />
              <span>Vuokraa oma varusteesi</span>
            </button>
          </div>

          {/* Mobile menu & Theme toggle trigger */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[var(--text)] border border-[var(--border)] transition active:scale-95"
              aria-label={theme === 'dark' ? 'Vaihda vaaleaan teemaan' : 'Vaihda tummaan teemaan'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />}
            </button>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[var(--text)] hover:bg-[var(--border)]/40 transition active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Avaa valikko"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[var(--border)] bg-[var(--surface)] px-4 py-5 space-y-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <a 
              href="#gear" 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 px-3 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--border)]/30"
            >
              Selaa varusteita
            </a>
            <a 
              href="#how-it-works" 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 px-3 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--border)]/30"
            >
              Miten se toimii
            </a>
            <a 
              href="#safety" 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 px-3 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--border)]/30"
            >
              Turvallisuus & Vakuutus
            </a>
            <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2.5">
              <button className="w-full text-center py-3 text-xs font-semibold rounded-xl bg-[var(--border)]/50 text-[var(--text)] hover:bg-[var(--border)] transition">
                Kirjaudu sisään
              </button>
              <button className="w-full inline-flex items-center justify-center gap-2 text-center py-3 text-xs font-semibold rounded-xl bg-gearspot-800 text-white shadow-sm">
                <PlusCircle className="w-4 h-4 text-emerald-300" />
                <span>Vuokraa oma varusteesi</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section data-reveal className="relative pt-10 pb-14 sm:pt-16 sm:pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[500px] md:w-[700px] h-[300px] sm:h-[400px] bg-gradient-to-tr from-emerald-500/20 via-emerald-500/10 to-transparent blur-3xl rounded-full -z-10 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Micro Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-quiet)] border border-[var(--accent)]/20 text-[var(--on-accent-quiet)] text-xs font-semibold mb-4 sm:mb-6 shadow-xs max-w-full">
            <Sparkles className="w-3.5 h-3.5 text-[var(--on-accent-quiet)] shrink-0" />
            <span className="truncate">SUP-lautojen ja ulkoiluvarusteiden vuokraus Oulussa</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[var(--text)] font-heading leading-[1.15] sm:leading-[1.12]">
            Vuokraa SUP-laudat ja varusteet. <br className="hidden sm:inline" />
            <span className="text-[var(--accent)]">Suoraan paikallisilta oululaisilta.</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-[var(--muted)] max-w-2xl mx-auto font-normal leading-relaxed">
            Kaikkea ei tarvitse ostaa omaksi varastoon. Nappaa laadukas SUP-lauta tai retkikeitin päiväksi tai viikonlopuksi naapuriltasi Oulussa.
          </p>

          {/* 3. AIRY & MOBILE RESPONSIVE SEARCH BAR COMPONENT */}
          <div className="mt-8 sm:mt-10 max-w-3xl mx-auto bg-[var(--surface)] p-2 sm:p-2.5 rounded-2xl sm:rounded-full border border-[var(--border)] shadow-lg transition-all focus-within:border-[var(--accent)] focus-within:ring-4 focus-within:ring-[var(--accent)]/10">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              
              {/* Keyword Search */}
              <div className="flex items-center gap-2.5 w-full sm:flex-1 px-3 sm:px-4 py-1.5 min-h-[44px]">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--muted)] shrink-0" />
                <input
                  type="text"
                  placeholder="Mitä varustetta etsit? (esim. Saimaa SUP, Red Paddle...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-[44px] bg-transparent text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="p-2.5 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Tyhjennä haku"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Location Selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto px-3 sm:px-4 py-1.5 border-t sm:border-t-0 sm:border-l border-[var(--border)] min-h-[44px]">
                <MapPin className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <select 
                  value={selectedLocation} 
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full sm:w-auto min-h-[44px] bg-transparent text-xs font-semibold text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg cursor-pointer pr-2"
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc} className="bg-[var(--surface)] text-[var(--text)]">{loc}</option>
                  ))}
                </select>
              </div>

              {/* Submit CTA */}
              <button 
                onClick={() => document.getElementById('gear')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-full bg-[var(--accent)] hover:opacity-90 text-[var(--accent-ink)] text-xs font-bold transition shadow-sm active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)]"
              >
                <span>Hae varusteita</span>
                <ArrowRight className="w-4 h-4 text-[var(--accent-ink)]" />
              </button>

            </div>
          </div>

          {/* Quick Category Filter Pills */}
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2.5 pb-2 sm:pb-0 px-2 sm:px-0">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const isActive = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all shrink-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    isActive 
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs' 
                      : 'bg-[var(--surface)] hover:bg-[var(--border)]/30 text-[var(--muted)] border border-[var(--border)] hover:border-[var(--accent)]/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--accent-ink)]' : 'text-[var(--muted)]'}`} />
                  <span>{cat.name}</span>
                </button>
              )
            })}
          </div>

        </div>
      </section>

      {/* 4. COMPACT PRODUCT GRID SECTION */}
      <section id="gear" data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-8 pb-4 border-b border-[var(--border)] gap-3 sm:gap-4">
          <div>
            <span className="text-[11px] sm:text-xs font-extrabold text-[var(--on-accent-quiet)] bg-[var(--accent-quiet)] px-2.5 py-1 rounded-full border border-[var(--accent)]/20 tracking-wider uppercase">Saatavilla Oulussa</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] font-heading mt-1 sm:mt-1.5">
              Suosituimmat retkivarusteet
            </h2>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <p className="text-xs text-[var(--muted)] font-medium">
              Näytetään <span className="font-bold text-[var(--text)]">{listings.length}</span> vapaata varustetta
            </p>
            {hasActiveFilters && (
              <button 
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--on-accent-quiet)] hover:underline transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Nollaa</span>
              </button>
            )}
          </div>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="bg-[var(--surface)] rounded-2xl p-4 border border-[var(--border)] animate-pulse h-84 flex flex-col justify-between">
                <div className="aspect-[4/3] bg-[var(--border)]/40 rounded-xl" />
                <div className="space-y-2 mt-4">
                  <div className="h-4 bg-[var(--border)]/60 rounded w-3/4" />
                  <div className="h-3 bg-[var(--border)]/40 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 sm:gap-6">
            {listings.map((gear) => (
              <div 
                key={gear.id}
                className="group bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/5 hover:border-[var(--accent)]/40 transition-all duration-300 flex flex-col"
              >
                {/* Image Container */}
                <div className="card-image-container aspect-[4/3] rounded-t-2xl bg-[var(--border)]/30">
                  <img 
                    src={gear.imageUrl} 
                    alt={gear.title}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={300}
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = '/img/gear/placeholder.svg'
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 aspect-[4/3]"
                  />
                  
                  {/* Category Tag */}
                  {gear.tag && (
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold scrim-pill shadow-xs">
                        {gear.tag}
                      </span>
                    </div>
                  )}

                  {/* Availability Chip */}
                  <div className="absolute top-2.5 right-14 z-10">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide shadow-xs border border-white/20 ${
                      gear.isAvailable 
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)]' 
                        : 'bg-amber-700 text-white'
                    }`}>
                      {gear.isAvailable ? 'Vapaa' : 'Varattu'}
                    </span>
                  </div>

                  {/* Favorite Toggle Button (44x44px Touch Target) */}
                  <button 
                    onClick={() => toggleFavorite(gear.id)}
                    className="absolute top-2.5 right-2.5 z-10 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full scrim-pill hover:opacity-90 flex items-center justify-center text-white transition active:scale-90 shadow-sm"
                    aria-label="Lisää suosikkeihin"
                    title={favorites.includes(gear.id) ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
                  >
                    <Heart className={`w-4.5 h-4.5 transition-colors ${favorites.includes(gear.id) ? 'fill-rose-500 text-rose-500' : 'text-white/90'}`} />
                  </button>

                  {/* Location badge (Overlay pill with max-width - NO cutoff) */}
                  <div className="card-location-pill z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold scrim-pill shadow-xs">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{gear.location}</span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Brand & Rating */}
                    <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1.5">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--on-accent-quiet)] bg-[var(--accent-quiet)] px-2 py-0.5 rounded border border-[var(--accent)]/20">
                        {gear.brand}
                      </span>
                      <div className="flex items-center gap-1 text-[var(--text)] font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{gear.rating}</span>
                        <span className="text-[var(--muted)] font-normal text-[11px]">({gear.reviewsCount || 12})</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-[var(--text)] text-base leading-snug group-hover:text-[var(--accent)] transition line-clamp-2 mt-1">
                      {gear.title}
                    </h3>

                    {/* Specs / Highlights */}
                    {gear.specs && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {gear.specs.slice(0, 3).map((spec, idx) => (
                          <span key={idx} className="text-[11px] text-[var(--muted)] bg-[var(--border)]/30 px-2 py-0.5 rounded-md border border-[var(--border)]/40">
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Owner & Price Footer */}
                  <div className="mt-4 pt-3.5 border-t border-[var(--border)] flex items-center justify-between">
                    {/* Owner snippet */}
                    <div className="flex items-center gap-2">
                      <AvatarInitials name={gear.owner.name} size={28} />
                      <div className="flex flex-col">
                        <span className="text-xs text-[var(--text)] font-medium leading-none">
                          {gear.owner.name}
                        </span>
                        {gear.owner.isSuperOwner && (
                          <span className="text-[9px] font-extrabold text-[var(--on-accent-quiet)]">Super-omistaja</span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <div className="text-base sm:text-lg font-extrabold text-[var(--text)] tabular-nums">
                        {gear.pricePerDay} € <span className="text-[11px] font-normal text-[var(--muted)]">/ vrk</span>
                      </div>
                      {gear.pricePerWeekend && (
                        <div className="text-[10px] text-[var(--muted)] font-medium tabular-nums">
                          {gear.pricePerWeekend} € / vkl
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16 bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 sm:p-8 shadow-xs">
            <Compass className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[var(--text)]">Ei hakutuloksia hakuehdoilla</h3>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
              Kokeile toista hakusanaa tai valitse toinen alue ja kategoria.
            </p>
            <button 
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[var(--accent-quiet)] text-[var(--on-accent-quiet)] text-xs font-semibold border border-[var(--accent)]/20 hover:opacity-90 transition active:scale-95 min-h-[44px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tyhjennä suodattimet</span>
            </button>
          </div>
        )}
      </section>

      {/* 5. TRUST & VALUE PROPOSITION */}
      <section id="safety" data-reveal className="bg-[var(--surface)] border-y border-[var(--border)] py-12 sm:py-16 my-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            
            <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-[var(--border)]/20 transition">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-quiet)] text-[var(--on-accent-quiet)] flex items-center justify-center shrink-0 border border-[var(--accent)]/20">
                <ShieldCheck className="w-5 h-5 text-[var(--on-accent-quiet)]" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[var(--text)]">Turvallinen vertaisvuokraus</h4>
                <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                  Vahva Suomi.fi / pankkitunnistautuminen ja integroitu turvatakuu suojaavat sekä vuokraajaa että omistajaa.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-[var(--border)]/20 transition">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-quiet)] text-[var(--on-accent-quiet)] flex items-center justify-center shrink-0 border border-[var(--accent)]/20">
                <MapPin className="w-5 h-5 text-[var(--on-accent-quiet)]" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[var(--text)]">Helppo nouto Oulusta</h4>
                <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                  Nouda varusteet suoraan omalta asuinalueeltasi: Tuirasta, Nallikarista, Linnanmaalta, Keskustasta tai Kaakkurista ilman postikuluja.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-[var(--border)]/20 transition">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-quiet)] text-[var(--on-accent-quiet)] flex items-center justify-center shrink-0 border border-[var(--accent)]/20">
                <Sparkles className="w-5 h-5 text-[var(--on-accent-quiet)]" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[var(--text)]">Järkevä & Ekologinen</h4>
                <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                  Käytä huippuvarusteita vain silloin kun tarvitset ja säästä satoja euroja hankintahinnoissa.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. MINIMALIST FOOTER */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 w-full flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--muted)] gap-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[var(--accent)] flex items-center justify-center text-[var(--accent-ink)] text-[10px] font-bold">
            V
          </div>
          <span className="font-semibold text-[var(--text)]">Vuokraajanne</span>
          <span>— Tiedottajanne Oy, Oulu</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
          <a href="#" className="min-h-[44px] py-3 px-3 inline-flex items-center hover:text-[var(--text)] transition rounded-lg hover:bg-[var(--border)]/30">Käyttöehdot</a>
          <a href="#" className="min-h-[44px] py-3 px-3 inline-flex items-center hover:text-[var(--text)] transition rounded-lg hover:bg-[var(--border)]/30">Tietosuoja</a>
          <a href="#" className="min-h-[44px] py-3 px-3 inline-flex items-center hover:text-[var(--text)] transition rounded-lg hover:bg-[var(--border)]/30">Yhteystiedot</a>
        </div>
      </footer>
    </div>
  )
}
