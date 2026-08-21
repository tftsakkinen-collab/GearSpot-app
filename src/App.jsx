import React, { useState, useEffect } from 'react'
import {
  Search,
  MapPin,
  Calendar,
  Compass,
  Tent,
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
  Package
} from 'lucide-react'
import { MOCK_LISTINGS, getListings } from './data/mockListings'

const CATEGORIES = [
  { id: 'all', name: 'Kaikki varusteet', icon: Compass },
  { id: 'tents', name: 'Teltat & Majoitus', icon: Tent },
  { id: 'backpacks', name: 'Rinkat & Reput', icon: Package },
  { id: 'cooking', name: 'Retkikeittimet & Ruokailu', icon: Flame },
]

export default function App() {
  // listings ladattu turvallisesti staattisesta datasta (ohittaa Postgres-tietokantahaun)
  const [listings, setListings] = useState(MOCK_LISTINGS)
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('Koko Oulu')
  const [favorites, setFavorites] = useState([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Haetaan ilmoitukset (tässä mock-funktio, joka ei tee verkkopyyntöjä Postgresiin)
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        // HUOM: Tietokanta- ja API-kutsut korvattu getListings() -mockilla
        const data = await getListings()
        setListings(data)
      } catch (err) {
        console.warn('Virhe ladattaessa ilmoituksia, käytetään MOCK_LISTINGS fallbackia:', err)
        setListings(MOCK_LISTINGS)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const toggleFavorite = (id) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const filteredGear = listings.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLocation = selectedLocation === 'Koko Oulu' || item.location.toLowerCase().includes(selectedLocation.toLowerCase())
    return matchesCat && matchesSearch && matchesLocation
  })

  return (
    <div className="min-h-screen bg-[#FBFDFB] text-neutral-800 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* 1. MINIMALIST NAVIGATION */}
      <header className="sticky top-0 z-50 bg-[#FBFDFB]/90 backdrop-blur-md border-b border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gearspot-800 flex items-center justify-center text-white shadow-sm ring-1 ring-gearspot-900/10">
              <Tent className="w-5 h-5 text-emerald-300 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-gearspot-900 font-heading">
                Gear<span className="text-emerald-600">Spot</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-gearspot-800 border border-emerald-200/50">
                Oulu
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
            <a href="#gear" className="text-gearspot-900 hover:text-emerald-700 transition">Selaa varusteita</a>
            <a href="#how-it-works" className="hover:text-gearspot-900 transition">Miten se toimii</a>
            <a href="#safety" className="hover:text-gearspot-900 transition">Turvallisuus & Vakuutus</a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <button className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 px-3 py-2 transition">
              Kirjaudu
            </button>
            <button className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-full bg-gearspot-800 text-white hover:bg-gearspot-900 transition shadow-sm hover:shadow active:scale-[0.98]">
              <PlusCircle className="w-4 h-4 text-emerald-300" />
              <span>Vuokraa oma varusteesi</span>
            </button>
          </div>

          {/* Mobile menu trigger */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-neutral-200 bg-white px-4 py-4 space-y-3">
            <a href="#gear" className="block py-2 text-sm font-medium text-neutral-800">Selaa varusteita</a>
            <a href="#how-it-works" className="block py-2 text-sm font-medium text-neutral-800">Miten se toimii</a>
            <a href="#safety" className="block py-2 text-sm font-medium text-neutral-800">Turvallisuus & Vakuutus</a>
            <div className="pt-3 border-t border-neutral-100 flex flex-col gap-2">
              <button className="w-full text-center py-2.5 text-xs font-semibold rounded-full bg-gearspot-800 text-white">
                Vuokraa oma varusteesi
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION - AIRY & MINIMALIST */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-emerald-100/60 via-gearspot-100/30 to-transparent blur-3xl rounded-full -z-10 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Micro Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-200/60 text-gearspot-800 text-xs font-semibold mb-6 animate-fade-in shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ulkoiluvarusteiden vertaisvuokraus Oulussa</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-900 font-heading leading-[1.12]">
            Vuokraa huippuvarusteet retkille. <br className="hidden sm:inline" />
            <span className="text-gearspot-800">Suoraan paikallisilta oululaisilta.</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Kaikkea ei tarvitse ostaa omaksi varastoon. Nappaa laadukas teltta, rinkka tai keitin viikonlopun seikkailuun naapuriltasi Oulussa.
          </p>

          {/* 3. AIRY SEARCH BAR COMPONENT */}
          <div className="mt-10 max-w-3xl mx-auto bg-white p-2.5 sm:p-3 rounded-2xl sm:rounded-full border border-neutral-200/80 shadow-lg shadow-neutral-900/5 transition-all focus-within:border-gearspot-700/60 focus-within:ring-4 focus-within:ring-emerald-500/10">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              
              {/* Keyword Search */}
              <div className="flex items-center gap-3 w-full sm:flex-1 px-4 py-2.5">
                <Search className="w-5 h-5 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Mitä varustetta etsit? (esim. Hilleberg, rinkka, keitin...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none"
                />
              </div>

              <div className="hidden sm:block h-8 w-px bg-neutral-200" />

              {/* Location Selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto px-4 py-2 text-neutral-600">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <select 
                  value={selectedLocation} 
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-neutral-700 focus:outline-none cursor-pointer pr-2"
                >
                  <option value="Koko Oulu">Koko Oulu</option>
                  <option value="Tuira">Tuira</option>
                  <option value="Keskusta">Keskusta</option>
                  <option value="Linnanmaa">Linnanmaa</option>
                  <option value="Kaakkuri">Kaakkuri</option>
                </select>
              </div>

              {/* Submit CTA */}
              <button 
                onClick={() => document.getElementById('gear')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl sm:rounded-full bg-gearspot-800 hover:bg-gearspot-900 text-white text-xs font-bold transition shadow-sm active:scale-95"
              >
                <span>Hae varusteita</span>
                <ArrowRight className="w-4 h-4 text-emerald-300" />
              </button>

            </div>
          </div>

          {/* Quick Category Filter Pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const isActive = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                    isActive 
                      ? 'bg-gearspot-800 text-white shadow-xs' 
                      : 'bg-white/80 hover:bg-white text-neutral-600 border border-neutral-200/80 hover:border-neutral-300'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-300' : 'text-neutral-400'}`} />
                  <span>{cat.name}</span>
                </button>
              )
            })}
          </div>

        </div>
      </section>

      {/* 4. COMPACT PRODUCT GRID SECTION */}
      <section id="gear" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-neutral-200/60 gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase">Saatavilla Oulussa</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-heading mt-1">
              Suosituimmat retkivarusteet
            </h2>
          </div>
          <p className="text-xs text-neutral-500 font-medium">
            Näytetään {filteredGear.length} vapaata varustetta
          </p>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white rounded-2xl p-4 border border-neutral-200 animate-pulse h-80" />
            ))}
          </div>
        ) : filteredGear.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredGear.map((gear) => (
              <div 
                key={gear.id}
                className="group bg-white rounded-2xl border border-neutral-200/70 overflow-hidden hover:shadow-xl hover:shadow-neutral-900/5 hover:border-gearspot-700/30 transition-all duration-300 flex flex-col"
              >
                {/* Image Container */}
                <div className="relative aspect-4/3 overflow-hidden bg-neutral-100">
                  <img 
                    src={gear.imageUrl} 
                    alt={gear.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Category Tag */}
                  {gear.tag && (
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 backdrop-blur-md text-white">
                        {gear.tag}
                      </span>
                    </div>
                  )}

                  {/* Favorite Button */}
                  <button 
                    onClick={() => toggleFavorite(gear.id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md hover:bg-white flex items-center justify-center text-neutral-700 transition active:scale-90 shadow-xs"
                  >
                    <Heart className={`w-4 h-4 ${favorites.includes(gear.id) ? 'fill-rose-500 text-rose-500' : 'text-neutral-600'}`} />
                  </button>

                  {/* Location badge */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[11px] font-medium text-neutral-700">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    <span>{gear.location}</span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Brand & Rating */}
                    <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                      <span className="font-semibold uppercase tracking-wider text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        {gear.brand}
                      </span>
                      <div className="flex items-center gap-1 text-neutral-700 font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{gear.rating}</span>
                        <span className="text-neutral-400 font-normal">({gear.reviewsCount || 10})</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-neutral-900 text-sm leading-snug group-hover:text-gearspot-800 transition line-clamp-2 mt-1">
                      {gear.title}
                    </h3>

                    {/* Specs / Highlights */}
                    {gear.specs && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {gear.specs.slice(0, 3).map((spec, idx) => (
                          <span key={idx} className="text-[11px] text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Owner & Price Footer */}
                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                    {/* Owner snippet */}
                    <div className="flex items-center gap-2">
                      <img 
                        src={gear.owner.avatar} 
                        alt={gear.owner.name} 
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-neutral-200"
                      />
                      <span className="text-xs text-neutral-600 font-medium">
                        {gear.owner.name}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <div className="text-base font-extrabold text-gearspot-900">
                        {gear.pricePerDay} € <span className="text-[11px] font-normal text-neutral-500">/ vrk</span>
                      </div>
                      {gear.pricePerWeekend && (
                        <div className="text-[10px] text-neutral-400">
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
          <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200/80 p-8">
            <Compass className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-neutral-800">Ei hakutuloksia</h3>
            <p className="text-xs text-neutral-500 mt-1">Kokeile toista hakusanaa tai valitse kaikki kategoriat.</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSelectedLocation('Koko Oulu'); }}
              className="mt-4 text-xs font-semibold text-emerald-700 hover:underline"
            >
              Tyhjennä suodattimet
            </button>
          </div>
        )}
      </section>

      {/* 5. TRUST & VALUE PROPOSITION */}
      <section id="safety" className="bg-white border-y border-neutral-200/60 py-16 my-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-gearspot-800 flex items-center justify-center shrink-0 border border-emerald-100">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-neutral-900">Turvallinen vertaisvuokraus</h4>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  Vahva Suomi.fi / pankkitunnistautuminen ja integroitu turvatakuu suojaavat sekä vuokraajaa että omistajaa.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-gearspot-800 flex items-center justify-center shrink-0 border border-emerald-100">
                <MapPin className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-neutral-900">Helppo nouto Oulusta</h4>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  Nouda varusteet suoraan omalta asuinalueeltasi: Tuirasta, Linnanmaalta, Keskustasta tai Kaakkurista ilman postikuluja.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-gearspot-800 flex items-center justify-center shrink-0 border border-emerald-100">
                <Sparkles className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-neutral-900">Järkevä & Ekologinen</h4>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  Käytä huippuvarusteita vain silloin kun tarvitset ja säästä satoja euroja hankintahinnoissa.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. MINIMALIST FOOTER */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gearspot-800 flex items-center justify-center text-white text-[10px] font-bold">
            G
          </div>
          <span className="font-semibold text-neutral-700">GearSpot</span>
          <span>— Tiedottajanne Oy, Oulu</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-neutral-800 transition">Käyttöehdot</a>
          <a href="#" className="hover:text-neutral-800 transition">Tietosuoja</a>
          <a href="#" className="hover:text-neutral-800 transition">Yhteystiedot</a>
        </div>
      </footer>
    </div>
  )
}
