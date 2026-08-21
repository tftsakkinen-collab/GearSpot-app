/**
 * GearSpot - Staattinen testidata (Mock Data)
 * Korvaa väliaikaisesti tietokanta- ja API-kutsut (esim. /fi/listings tai Postgres),
 * jotta sovellus toimii Vercel-tuotannossa ja lokaalisti ilman 500-tietokantavirheitä.
 */

export const MOCK_LISTINGS = [
  {
    id: "gear-1",
    title: "Hilleberg Allak 2 -kupoliteltta",
    description: "Kevyt ja äärimmäisen myrskynkestävä 4-vuodenajan teltta kahdelle. Erilliset sisäänkäynnit ja absidit.",
    category: "tents",
    categoryLabel: "Teltat & Majoitus",
    brand: "Hilleberg",
    model: "Allak 2",
    location: "Tuira, Oulu",
    city: "Oulu",
    pricePerDay: 20,
    pricePerWeekend: 50,
    rating: 4.96,
    reviewsCount: 28,
    isAvailable: true,
    tag: "Klassikko",
    imageUrl: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80",
    specs: [
      "2 hengen teltta",
      "4 vuodenajan käyttöön",
      "Paino: 3.3 kg",
      "Kaksi absidia"
    ],
    owner: {
      name: "Matias K.",
      city: "Oulu",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
      isSuperOwner: true,
      verified: true
    }
  },
  {
    id: "gear-2",
    title: "Fjällräven Kajka 75L -vaellusrinkka",
    description: "Kestävä ja erittäin mukava vaellusrinkka innovatiivisella puurungolla. Täydellinen Lapin pitkille vaelluksille.",
    category: "backpacks",
    categoryLabel: "Rinkat & Reput",
    brand: "Fjällräven",
    model: "Kajka 75",
    location: "Kaakkuri, Oulu",
    city: "Oulu",
    pricePerDay: 15,
    pricePerWeekend: 38,
    rating: 4.92,
    reviewsCount: 19,
    isAvailable: true,
    tag: "Ergonominen",
    imageUrl: "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=800&q=80",
    specs: [
      "Tilavuus: 75 litraa",
      "Perfect Fit -säätöjärjestelmä",
      "Integroitu sadesuoja",
      "Paino: 3.3 kg"
    ],
    owner: {
      name: "Laura H.",
      city: "Oulu",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80",
      isSuperOwner: false,
      verified: true
    }
  },
  {
    id: "gear-3",
    title: "Primus OmniLite Ti -titaaninen retkikeitin",
    description: "Palkittu ja ultrakompakti monipolttoainekeitin vaativiin olosuhteisiin. Toimii kaasulla, bensiinillä ja petrolilla.",
    category: "cooking",
    categoryLabel: "Retkikeittimet & Ruokailu",
    brand: "Primus",
    model: "OmniLite Ti",
    location: "Keskusta, Oulu",
    city: "Oulu",
    pricePerDay: 10,
    pricePerWeekend: 25,
    rating: 5.0,
    reviewsCount: 34,
    isAvailable: true,
    tag: "Ultrakevyt",
    imageUrl: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=800&q=80",
    specs: [
      "Monipolttoainevalmius",
      "Paino: 230 g (ilman pumppua)",
      "Teho: 2600 W",
      "Sisältää polttoainepullon"
    ],
    owner: {
      name: "Antti S.",
      city: "Oulu",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
      isSuperOwner: true,
      verified: true
    }
  },
  {
    id: "gear-4",
    title: "Exped SynMat XP 7 MW -eristetty makuualusta",
    description: "Lämmin ja mukava makuualusta syksyyn ja talveen. Korkea eristyskyky (R-arvo 4.8) ja nopea täyttää pumppupussilla.",
    category: "tents",
    categoryLabel: "Teltat & Majoitus",
    brand: "Exped",
    model: "SynMat XP 7 MW",
    location: "Linnanmaa, Oulu",
    city: "Oulu",
    pricePerDay: 8,
    pricePerWeekend: 20,
    rating: 4.89,
    reviewsCount: 14,
    isAvailable: true,
    tag: "Lämmin R-4.8",
    imageUrl: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80",
    specs: [
      "Mitat: 183 x 65 x 7 cm",
      "R-arvo: 4.8 (-17 °C)",
      "Schnozzel-pumppupussi",
      "Paino: 820 g"
    ],
    owner: {
      name: "Vilma T.",
      city: "Oulu",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
      isSuperOwner: false,
      verified: true
    }
  }
]

/**
 * Palauttaa ilmoitukset staattisesta datasta.
 * Korvaa väliaikaisesti tietokantakutsun (SELECT * FROM listings).
 */
export async function getListings() {
  // HUOM: Tietokantahaku (Postgres / API) on poistettu väliaikaisesti käytöstä
  // estämään Vercel-tuotannon 500-virheet ennen kuin tietokanta on provisioitu.
  return Promise.resolve(MOCK_LISTINGS)
}
