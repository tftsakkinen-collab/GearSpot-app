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
  PlusCircle,
  Menu,
  X,
  Heart,
  CheckCircle2,
  RotateCcw,
  Sun,
  Moon,
  Mail,
  Send,
  Lock,
  FileText,
  HelpCircle,
  ChevronDown,
  Cookie
} from 'lucide-react'
import { fetchListings } from './services/api'
import { MOCK_LISTINGS } from './data/mockListings'
import AvatarInitials from './components/AvatarInitials'
import { sanitizeInput, validateHoneypot, isValidEmail } from './utils/security'
import { trackEvent } from './utils/analytics'

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

const FAQ_ITEMS = [
  {
    q: 'Miten nouto ja palautus toimivat Oulussa?',
    a: 'Nouto ja palautus sovitaan joustavasti suoraan varusteen omistajan kanssa. Suurin osa noudoista sijaitsee Keskeisillä alueilla kuten Tuirassa, Nallikarissa, Linnanmaalla ja Keskustassa.'
  },
  {
    q: 'Entä jos varuste rikkoutuu tai vaurioituu vuokrauksen aikana?',
    a: 'Vuokraajanne-vertaisvuokraus noudattaa selkeitä vastuuehtoja. Tavanomaisesta kulumisesta ei veloiteta, ja mahdolliset vahingot käsitellään turvatakuuehtojemme mukaisesti. Varusteen kunto tarkistetaan luovutuksen yhteydessä.'
  },
  {
    q: 'Miten voin laittaa oman SUP-laudan tai retkikeittimen vuokralle?',
    a: 'Klikkaa yläpalkin "Vuokraa oma varusteesi" -painiketta. Syötä varusteesi tiedot ja vuokraushinta. Tiedottajanne Oy hoitaa alustan ylläpidon ja näkyvyyden Oulun alueella.'
  },
  {
    q: 'Mitkä ovat peruutusehdot?',
    a: 'Vuokrauksen voi peruuttaa kuluitta 24 tuntia ennen sovitun vuokrausajankohdan alkua joko ilmoittamalla omistajalle tai asiakaspalveluumme.'
  },
  {
    q: 'Kuuluvatko mela, pumppu ja karkuremmi SUP-laudan hintaan?',
    a: 'Kyllä! Kaikkiin Vuokraajanne.com-alustalla oleviin SUP-laitoihin kuuluu aina täydellinen valmis varustesetti: säädettävä mela, pumppu, karkuremmi ja kantoreppu.'
  }
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

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(null)

  // Cookie Consent State
  const [cookieConsent, setCookieConsent] = useState(() => {
    try {
      return localStorage.getItem('cookie_consent')
    } catch (e) {
      return null
    }
  })

  // Booking Modal State
  const [bookingItem, setBookingItem] = useState(null)
  const [bookingDays, setBookingDays] = useState(2)
  const [renterName, setRenterName] = useState('')
  const [renterEmail, setRenterEmail] = useState('')
  const [renterPhone, setRenterPhone] = useState('')
  const [bookingHoneypot, setBookingHoneypot] = useState('')
  const [bookingSubmitted, setBookingSubmitted] = useState(false)
  const [bookingError, setBookingError] = useState('')

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterHoneypot, setNewsletterHoneypot] = useState('')
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false)
  const [newsletterError, setNewsletterError] = useState('')

  // Legal Modal State
  const [activeLegalModal, setActiveLegalModal] = useState(null)

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    try {
      document.documentElement.setAttribute('data-theme', nextTheme)
      localStorage.setItem('theme', nextTheme)
    } catch (e) {}
  }

  const handleCookieConsent = (type) => {
    setCookieConsent(type)
    try {
      localStorage.setItem('cookie_consent', type)
      trackEvent('cookie_consent_updated', { type })
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
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      trackEvent('toggle_favorite', { gearId: id, isFavorite: next.includes(id) })
      return next
    })
  }

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedLocation('Koko Oulu')
  }

  const handleOpenBooking = (item) => {
    setBookingItem(item)
    setBookingDays(2)
    setRenterName('')
    setRenterEmail('')
    setRenterPhone('')
    setBookingHoneypot('')
    setBookingSubmitted(false)
    setBookingError('')
    trackEvent('open_booking_modal', { gearId: item.id, title: item.title })
  }

  const handleBookingSubmit = (e) => {
    e.preventDefault()
    setBookingError('')

    if (!validateHoneypot(bookingHoneypot)) {
      setBookingError('Epäilyttävä automaatiolähetys estetysti.')
      return
    }

    const cleanName = sanitizeInput(renterName)
    const cleanEmail = sanitizeInput(renterEmail)
    const cleanPhone = sanitizeInput(renterPhone)

    if (!cleanName || cleanName.length < 2) {
      setBookingError('Syötä voimassa oleva nimi.')
      return
    }

    if (!isValidEmail(cleanEmail)) {
      setBookingError('Syötä toimiva sähköpostiosoite.')
      return
    }

    setBookingSubmitted(true)
    trackEvent('submit_booking', { gearId: bookingItem.id, days: bookingDays })
  }

  const handleNewsletterSubmit = (e) => {
    e.preventDefault()
    setNewsletterError('')

    if (!validateHoneypot(newsletterHoneypot)) {
      setNewsletterError('Epäilyttävä automaatiolähetys estetysti.')
      return
    }

    const cleanEmail = sanitizeInput(newsletterEmail)
    if (!isValidEmail(cleanEmail)) {
      setNewsletterError('Syötä toimiva sähköpostiosoite.')
      return
    }

    setNewsletterSubmitted(true)
    setNewsletterEmail('')
    trackEvent('subscribe_newsletter', { email: cleanEmail })
  }

  const toggleFaq = (index) => {
    setOpenFaqIndex(prev => (prev === index ? null : index))
  }

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'all' || selectedLocation !== 'Koko Oulu'

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col selection:bg-emerald-500/20 selection:text-emerald-900 antialiased transition-colors duration-200">
      {/* 1. MINIMALIST NAVIGATION */}
      <header className="sticky top-0 z-50 glass border-b border-[var(--border)] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <a href="/" className="flex items-center gap-2.5 sm:gap-3 text-current no-underline">
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
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-[var(--muted)]">
            <a href="#gear" className="text-[var(--text)] hover:text-[var(--accent)] transition">Selaa varusteita</a>
            <a href="#how-it-works" className="hover:text-[var(--text)] transition">Miten se toimii</a>
            <a href="#faq" className="hover:text-[var(--text)] transition">UKK</a>
            <a href="#newsletter" className="hover:text-[var(--text)] transition">Kiertokirje</a>
            <a href="#safety" className="hover:text-[var(--text)] transition">Turvallisuus &amp; Vakuutus</a>
          </nav>

          {/* Action CTAs & Theme Toggle */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[var(--text)] hover:bg-[var(--border)]/40 transition active:scale-95 border border-[var(--border)]"
              aria-label={theme === 'dark' ? 'Vaihda vaaleaan teemaan' : 'Vaihda tummaan teemaan'}
              title={theme === 'dark' ? 'Vaalea tila' : 'Tumma tila'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />}
            </button>

            <button 
              onClick={() => setActiveLegalModal('terms')}
              className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] px-3 py-2 transition rounded-lg hover:bg-[var(--border)]/40 min-h-[44px] inline-flex items-center"
            >
              Käyttöehdot
            </button>
            <button 
              onClick={() => handleOpenBooking(listings[0])}
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90 transition shadow-sm hover:shadow active:scale-[0.98] min-h-[44px]"
            >
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
              className="block py-2 px-3 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--border)]/30 min-h-[44px] flex items-center"
            >
              Selaa varusteita
            </a>
            <a 
              href="#how-it-works" 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 px-3 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--border)]/30 min-h-[44px] flex items-center"
            >
              Miten se toimii
            </a>
            <a 
              href="#faq" 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 px-3 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--border)]/30 min-h-[44px] flex items-center"
            >
              UKK / Kysymykset
            </a>
            <a 
              href="#newsletter" 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 px-3 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--border)]/30 min-h-[44px] flex items-center"
            >
              Kiertokirje
            </a>
            <a 
              href="#safety" 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 px-3 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--border)]/30 min-h-[44px] flex items-center"
            >
              Turvallisuus &amp; Vakuutus
            </a>
            <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2.5">
              <button 
                onClick={() => { setMobileMenuOpen(false); setActiveLegalModal('privacy'); }}
                className="w-full text-center py-3 text-xs font-semibold rounded-xl bg-[var(--border)]/50 text-[var(--text)] hover:bg-[var(--border)] transition min-h-[44px]"
              >
                Tietosuoja &amp; GDPR
              </button>
              <button 
                onClick={() => { setMobileMenuOpen(false); handleOpenBooking(listings[0]); }}
                className="w-full inline-flex items-center justify-center gap-2 text-center py-3 text-xs font-semibold rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm min-h-[44px]"
              >
                <PlusCircle className="w-4 h-4 text-[var(--accent-ink)]" />
                <span>Vuokraa oma varusteesi</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section data-reveal className="relative pt-10 pb-14 sm:pt-16 sm:pb-20 md:pt-24 md:pb-28 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[500px] md:w-[700px] h-[300px] sm:h-[400px] bg-gradient-to-tr from-emerald-500/20 via-emerald-500/10 to-transparent blur-3xl rounded-full -z-10 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-quiet)] border border-[var(--accent)]/20 text-[var(--on-accent-quiet)] text-xs font-semibold mb-4 sm:mb-6 shadow-xs max-w-full">
            <Sparkles className="w-3.5 h-3.5 text-[var(--on-accent-quiet)] shrink-0" />
            <span className="truncate">SUP-lautojen ja ulkoiluvarusteiden lyhytvuokraus Oulussa</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[var(--text)] font-heading leading-[1.15] sm:leading-[1.12]">
            Vuokraa SUP-laudat ja varusteet. <br className="hidden sm:inline" />
            <span className="text-[var(--accent)]">Suoraan paikallisilta oululaisilta.</span>
          </h1>

          <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-[var(--muted)] max-w-2xl mx-auto font-normal leading-relaxed">
            Kaikkea ei tarvitse ostaa omaksi varastoon. Nappaa laadukas SUP-lauta tai retkikeitin päiväksi tai viikonlopuksi naapuriltasi Oulussa.
          </p>

          {/* Search Bar */}
          <div className="mt-8 sm:mt-10 max-w-3xl mx-auto bg-[var(--surface)] p-2 sm:p-2.5 rounded-2xl sm:rounded-full border border-[var(--border)] shadow-lg transition-all focus-within:border-[var(--accent)] focus-within:ring-4 focus-within:ring-[var(--accent)]/10">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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

      {/* 3. HOW IT WORKS SECTION */}
      <section id="how-it-works" data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 my-4">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <span className="text-[11px] sm:text-xs font-extrabold text-[var(--on-accent-quiet)] bg-[var(--accent-quiet)] px-3 py-1 rounded-full border border-[var(--accent)]/20 uppercase tracking-wider">Helppo 3-vaiheinen vuokraus</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] font-heading mt-2">
            Miten Vuokraajanne.com toimii?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-quiet)] text-[var(--on-accent-quiet)] flex items-center justify-center mx-auto font-extrabold text-lg border border-[var(--accent)]/20">
              1
            </div>
            <h3 className="font-bold text-base text-[var(--text)]">Etsi &amp; Valitse varuste</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Selaa Oulun SUP-laitoja ja retkikeittimiä. Valitse haluamasi vuokrausaika päivinä tai viikonloppuna.
            </p>
          </div>

          <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-quiet)] text-[var(--on-accent-quiet)] flex items-center justify-center mx-auto font-extrabold text-lg border border-[var(--accent)]/20">
              2
            </div>
            <h3 className="font-bold text-base text-[var(--text)]">Sovi nouto Oulussa</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Lähetä ilmainen vuokrauspyyntö. Omistaja vahvistaa pyynnön ja sovitte noudon Tuirasta, Nallikarista tai keskustasta.
            </p>
          </div>

          <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-quiet)] text-[var(--on-accent-quiet)] flex items-center justify-center mx-auto font-extrabold text-lg border border-[var(--accent)]/20">
              3
            </div>
            <h3 className="font-bold text-base text-[var(--text)]">Nauti &amp; Palauta</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Nauti vesistä ja luonnosta ilman satojen eurojen laitehankintoja. Palauta varuste sovittuun aikaan siistinä.
            </p>
          </div>
        </div>
      </section>

      {/* 4. COMPACT PRODUCT GRID SECTION */}
      <section id="gear" data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full">
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
                className="group bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/5 hover:border-[var(--accent)]/40 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="card-image-container aspect-[4/3] rounded-t-2xl bg-[var(--border)]/30 relative">
                  <img 
                    src={gear.imageUrl} 
                    alt={`${gear.brand} ${gear.model} - ${gear.title}`}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={300}
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = '/img/gear/placeholder.svg?v=1'
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 aspect-[4/3]"
                  />
                  
                  {gear.tag && (
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold scrim-pill shadow-xs">
                        {gear.tag}
                      </span>
                    </div>
                  )}

                  <div className="absolute top-2.5 right-14 z-10">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide shadow-xs border border-white/20 ${
                      gear.isAvailable 
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)]' 
                        : 'bg-amber-700 text-white'
                    }`}>
                      {gear.isAvailable ? 'Vapaa' : 'Varattu'}
                    </span>
                  </div>

                  <button 
                    onClick={() => toggleFavorite(gear.id)}
                    className="absolute top-2.5 right-2.5 z-10 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full scrim-pill hover:opacity-90 flex items-center justify-center text-white transition active:scale-90 shadow-sm"
                    aria-label="Lisää suosikkeihin"
                    title={favorites.includes(gear.id) ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
                  >
                    <Heart className={`w-4.5 h-4.5 transition-colors ${favorites.includes(gear.id) ? 'fill-rose-500 text-rose-500' : 'text-white/90'}`} />
                  </button>

                  <div className="card-location-pill z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold scrim-pill shadow-xs">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{gear.location}</span>
                  </div>
                </div>

                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
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

                    <h3 className="font-bold text-[var(--text)] text-base leading-snug group-hover:text-[var(--accent)] transition line-clamp-2 mt-1">
                      {gear.title}
                    </h3>

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

                  <div className="mt-4 pt-3.5 border-t border-[var(--border)] space-y-3">
                    <div className="flex items-center justify-between">
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

                    <button 
                      onClick={() => handleOpenBooking(gear)}
                      className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90 font-bold text-xs transition shadow-sm active:scale-[0.98]"
                    >
                      <span>Vuokraa tästä</span>
                      <ArrowRight className="w-4 h-4 text-[var(--accent-ink)]" />
                    </button>
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

      {/* 5. FAQ SECTION */}
      <section id="faq" data-reveal className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 my-4 w-full">
        <div className="text-center mb-8">
          <span className="text-[11px] sm:text-xs font-extrabold text-[var(--on-accent-quiet)] bg-[var(--accent-quiet)] px-3 py-1 rounded-full border border-[var(--accent)]/20 uppercase tracking-wider">Usein kysytyt kysymykset</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] font-heading mt-2">
            UKK — Kysymyksiä &amp; Vastauksia
          </h2>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openFaqIndex === index
            return (
              <div 
                key={index} 
                className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full min-h-[52px] px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-[var(--text)] hover:text-[var(--accent)] transition"
                  aria-expanded={isOpen}
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>{item.q}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[var(--muted)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[var(--accent)]' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-[var(--muted)] leading-relaxed border-t border-[var(--border)]/50 animate-in fade-in duration-150">
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* 6. KIERTOKIRJE & NEWSLETTER SECTION */}
      <section id="newsletter" data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 my-4">
        <div className="glass rounded-3xl p-6 sm:p-10 border border-[var(--accent)]/30 relative overflow-hidden bg-gradient-to-r from-[var(--surface)] via-[var(--surface-2)] to-[var(--surface)]">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-quiet)] text-[var(--on-accent-quiet)] text-xs font-semibold border border-[var(--accent)]/20">
              <Mail className="w-3.5 h-3.5 text-[var(--on-accent-quiet)]" />
              <span>Kiertokirje &amp; Sähköpostitilaus</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] font-heading leading-tight">
              Liity Vuokraajanne Oulu -kiertokirjeen tilaajaksi
            </h3>
            <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
              Saat säännöllisesti vinkit Oulun parhaista melonta- ja retkikohteista, kauden uudet SUP-laitteet sekä <strong>-10 % alennuskoodin</strong> ensimmäiseen vuokraukseesi. Ei roskapostia, voit perua milloin vain.
            </p>

            {newsletterSubmitted ? (
              <div className="p-4 rounded-2xl bg-[var(--accent-quiet)] border border-[var(--accent)]/30 text-[var(--on-accent-quiet)] text-xs font-bold inline-flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-[var(--on-accent-quiet)]" />
                <span>Kiitos! Kiertokirjeen tilaus vahvistettu. Alennuskoodisi on lähetetty sähköpostiisi.</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="mt-4 flex flex-col sm:flex-row gap-3 items-stretch">
                <input 
                  type="text" 
                  name="website_hp" 
                  value={newsletterHoneypot} 
                  onChange={(e) => setNewsletterHoneypot(e.target.value)} 
                  className="hidden" 
                  tabIndex={-1} 
                  autoComplete="off" 
                />

                <div className="flex-1 relative">
                  <input
                    type="email"
                    placeholder="Kirjoita sähköpostiosoitteesi..."
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    required
                    className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[44px] px-6 py-3 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-xs hover:opacity-90 transition inline-flex items-center justify-center gap-2 shrink-0 active:scale-95 shadow-sm"
                >
                  <Send className="w-4 h-4 text-[var(--accent-ink)]" />
                  <span>Tilaa kiertokirje</span>
                </button>
              </form>
            )}

            {newsletterError && (
              <p className="text-xs text-rose-500 font-semibold mt-1">{newsletterError}</p>
            )}
          </div>
        </div>
      </section>

      {/* 7. TRUST & VALUE PROPOSITION */}
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
                <h4 className="font-bold text-sm text-[var(--text)]">Järkevä &amp; Ekologinen</h4>
                <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                  Käytä huippuvarusteita vain silloin kun tarvitset ja säästä satoja euroja hankintahinnoissa.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 8. MINIMALIST FOOTER */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 w-full flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--muted)] gap-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[var(--accent)] flex items-center justify-center text-[var(--accent-ink)] text-[10px] font-bold">
            V
          </div>
          <span className="font-semibold text-[var(--text)]">Vuokraajanne</span>
          <span>— Tiedottajanne Oy, Oulu</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
          <button 
            onClick={() => setActiveLegalModal('terms')} 
            className="min-h-[44px] py-3 px-3 inline-flex items-center hover:text-[var(--text)] transition rounded-lg hover:bg-[var(--border)]/30 text-xs text-[var(--muted)]"
          >
            Käyttöehdot
          </button>
          <button 
            onClick={() => setActiveLegalModal('privacy')} 
            className="min-h-[44px] py-3 px-3 inline-flex items-center hover:text-[var(--text)] transition rounded-lg hover:bg-[var(--border)]/30 text-xs text-[var(--muted)]"
          >
            Tietosuoja &amp; GDPR
          </button>
          <a 
            href="mailto:info@tiedottajanne.fi" 
            className="min-h-[44px] py-3 px-3 inline-flex items-center hover:text-[var(--text)] transition rounded-lg hover:bg-[var(--border)]/30"
          >
            Yhteystiedot
          </a>
        </div>
      </footer>

      {/* RENTAL BOOKING MODAL */}
      {bookingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[var(--border)] space-y-5 bg-[var(--surface)] shadow-2xl relative">
            <button
              onClick={() => setBookingItem(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)] transition min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Sulje"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--on-accent-quiet)] bg-[var(--accent-quiet)] px-2.5 py-0.5 rounded-full border border-[var(--accent)]/20">
                Vuokrauspyyntö
              </span>
              <h3 className="text-xl font-bold text-[var(--text)] font-heading leading-tight pt-1">
                {bookingItem.title}
              </h3>
              <p className="text-xs text-[var(--muted)]">Noutopaikka: {bookingItem.location}</p>
            </div>

            {bookingSubmitted ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[var(--accent-quiet)] text-[var(--on-accent-quiet)] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-[var(--on-accent-quiet)]" />
                </div>
                <h4 className="text-lg font-bold text-[var(--text)]">Vuokrauspyyntö lähetetty!</h4>
                <p className="text-xs text-[var(--muted)] leading-relaxed max-w-xs mx-auto">
                  Omistaja ({bookingItem.owner.name}) on saanut ilmoituksen pyynnöstäsi. Saat vahvistusviestin ja maksulinkin sähköpostiisi pikaisesti.
                </p>
                <button
                  onClick={() => setBookingItem(null)}
                  className="mt-2 min-h-[44px] px-6 py-2.5 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-xs hover:opacity-90 transition"
                >
                  Valmis
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <input 
                  type="text" 
                  name="website_hp" 
                  value={bookingHoneypot} 
                  onChange={(e) => setBookingHoneypot(e.target.value)} 
                  className="hidden" 
                  tabIndex={-1} 
                  autoComplete="off" 
                />

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text)] block">Vuokrausaika (päiviä)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" 
                      min="1" 
                      max="7" 
                      value={bookingDays} 
                      onChange={(e) => setBookingDays(Number(e.target.value))} 
                      className="w-full accent-[var(--accent)]"
                    />
                    <span className="text-xs font-bold text-[var(--text)] min-w-[60px] text-right">{bookingDays} vrk</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex justify-between items-center text-xs">
                  <span className="text-[var(--muted)]">Laskettu vuokraushinta:</span>
                  <span className="text-base font-extrabold text-[var(--text)]">
                    {bookingItem.pricePerDay * bookingDays} €
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text)] block mb-1">Nimesi</label>
                    <input
                      type="text"
                      placeholder="Matti Meikäläinen"
                      value={renterName}
                      onChange={(e) => setRenterName(e.target.value)}
                      required
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text)] block mb-1">Sähköpostiosoitteesi</label>
                    <input
                      type="email"
                      placeholder="matti@esimerkki.fi"
                      value={renterEmail}
                      onChange={(e) => setRenterEmail(e.target.value)}
                      required
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text)] block mb-1">Puhelinnumero (noutoa varten)</label>
                    <input
                      type="tel"
                      placeholder="040 123 4567"
                      value={renterPhone}
                      onChange={(e) => setRenterPhone(e.target.value)}
                      required
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    />
                  </div>
                </div>

                {bookingError && (
                  <p className="text-xs text-rose-500 font-semibold">{bookingError}</p>
                )}

                <button
                  type="submit"
                  className="w-full min-h-[48px] rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-xs hover:opacity-90 transition shadow-md inline-flex items-center justify-center gap-2 active:scale-95"
                >
                  <Send className="w-4 h-4 text-[var(--accent-ink)]" />
                  <span>Lähetä vuokrauspyyntö ({bookingItem.pricePerDay * bookingDays} €)</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* LEGAL & PRIVACY MODAL */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-[var(--border)] space-y-4 bg-[var(--surface)] shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setActiveLegalModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)] transition min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Sulje"
            >
              <X className="w-5 h-5" />
            </button>

            {activeLegalModal === 'privacy' ? (
              <div className="space-y-3 text-xs text-[var(--muted)] leading-relaxed">
                <div className="flex items-center gap-2 text-[var(--text)] font-heading font-bold text-lg">
                  <Lock className="w-5 h-5 text-[var(--accent)]" />
                  <h3>Tietosuojaseloste &amp; GDPR</h3>
                </div>
                <p>
                  Tiedottajanne Oy (Vuokraajanne.com) noudattaa EU:n yleistä tietosuoja-asetusta (GDPR). Keräämme vain vuokraustapahtuman ja noudon kannalta välttämättömät tiedot (nimi, sähköposti, puhelinnumero).
                </p>
                <h4 className="font-bold text-[var(--text)] pt-2 text-xs uppercase tracking-wider">Tietojen käyttö &amp; Suojaus</h4>
                <p>
                  Kaikki tietoliikenne on suojattu SSL/TLS-salauksella. Käyttäjätietoja ei luovuteta kolmansille osapuolille markkinointitarkoituksiin.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-[var(--muted)] leading-relaxed">
                <div className="flex items-center gap-2 text-[var(--text)] font-heading font-bold text-lg">
                  <FileText className="w-5 h-5 text-[var(--accent)]" />
                  <h3>Käyttöehdot</h3>
                </div>
                <p>
                  Vuokraajanne.com toimii vertaisvuokrausalustana. Vuokraaja vastaa varusteen huolellisesta käsittelystä vuokrausaikana ja palautuksesta sovitussa kunnossa.
                </p>
                <h4 className="font-bold text-[var(--text)] pt-2 text-xs uppercase tracking-wider">Peruutusehdot</h4>
                <p>
                  Ilmainen peruutus 24h ennen vuokrausajankohdan alkua. Peruutukset suoraan omistajalle tai asiakaspalveluumme.
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--border)] text-right">
              <button
                onClick={() => setActiveLegalModal(null)}
                className="min-h-[44px] px-5 py-2.5 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-xs hover:opacity-90 transition"
              >
                Sulje
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COOKIE CONSENT BANNER */}
      {!cookieConsent && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 glass p-5 rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface)] shadow-2xl space-y-3 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            <Cookie className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
            <div className="text-xs text-[var(--text)] space-y-1">
              <p className="font-bold text-sm">Evästesuostumus (Cookies)</p>
              <p className="text-[var(--muted)] leading-relaxed">
                Käytämme sivustolla välttämättömiä evästeitä sivuston toimivuuteen sekä anonyymiä analytiikkaa käyttökokemuksen parantamiseksi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 justify-end">
            <button
              onClick={() => handleCookieConsent('necessary')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40 transition min-h-[40px]"
            >
              Vain välttämättömät
            </button>
            <button
              onClick={() => handleCookieConsent('all')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90 transition min-h-[40px]"
            >
              Hyväksy kaikki
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
