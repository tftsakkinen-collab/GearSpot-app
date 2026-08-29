/**
 * Vuokraajanne - Varustedata ja tietokantarajapinta
 * Tukee sekä dynaamista API/tietokantahakua että lokaalia varustedataa.
 * Kaikki tuotekuvat ovat lokaaleja SVG/WebP -resursseja (0 ulkoista kuvariippuvuutta).
 */

export const MOCK_LISTINGS = [
  {
    id: "gear-1",
    title: "Saimaa SUP Sun 10.6 -ilmatäytteinen SUP-lauta",
    description: "Vakaa ja laadukas suomalaisen Saimaa SUP -merkin yleislauta Oulujokivarren ja Nallikarin pienten aaltojen retkille. Sopii erinomaisesti aloittelijoille ja nautiskelijoille.",
    category: "sup_boards",
    categoryLabel: "SUP-laudat",
    brand: "Saimaa SUP",
    model: "Sun 10.6",
    location: "Nallikari, Oulu",
    city: "Oulu",
    pricePerDay: 25,
    pricePerWeekend: 60,
    rating: 4.98,
    reviewsCount: 32,
    isAvailable: true,
    tag: "Suosikki",
    imageUrl: "/img/gear/sup-saimaa-sun.svg",
    specs: [
      "Kantavuus: 140 kg",
      "Varusteet: Alumiinimela, pumppu & karkuremmi",
      "Koko: 320 x 81 x 15 cm",
      "Kanto-reppu mukana"
    ],
    owner: {
      name: "Matias K.",
      city: "Oulu",
      avatar: null,
      isSuperOwner: true,
      verified: true
    }
  },
  {
    id: "gear-2",
    title: "Red Paddle Co Ride 10'6\" MSL -premium SUP-setti",
    description: "Markkinoiden johtava premium-SUP-lauta erinomaisella jäykkyydellä ja liu'ulla. Täydellinen pidemmille päiväretkille Oulun edustan saaristoon.",
    category: "sup_boards",
    categoryLabel: "SUP-laudat",
    brand: "Red Paddle Co",
    model: "Ride 10'6",
    location: "Tuira, Oulu",
    city: "Oulu",
    pricePerDay: 30,
    pricePerWeekend: 75,
    rating: 5.0,
    reviewsCount: 19,
    isAvailable: true,
    tag: "Premium",
    imageUrl: "/img/gear/sup-red-paddle.svg",
    specs: [
      "Kantavuus: 120 kg",
      "Varusteet: Hiilikuitumela, Titan 2 -pumppu & karkuremmi",
      "Korkea 20 PSI paine",
      "Pyörällinen kuljetuskassi"
    ],
    owner: {
      name: "Laura H.",
      city: "Oulu",
      avatar: null,
      isSuperOwner: false,
      verified: true
    }
  },
  {
    id: "gear-3",
    title: "Aqua Marina Beast 10'6\" -perhelauta",
    description: "Erittäin vakaa ja helppokäyttöinen SUP-lauta kaikenikäisille. Mainio valinta rentoon melontaan Hupisaarten puistokanavissa.",
    category: "sup_boards",
    categoryLabel: "SUP-laudat",
    brand: "Aqua Marina",
    model: "Beast 10'6",
    location: "Linnanmaa, Oulu",
    city: "Oulu",
    pricePerDay: 22,
    pricePerWeekend: 55,
    rating: 4.89,
    reviewsCount: 24,
    isAvailable: true,
    tag: "Helppo & Vakaa",
    imageUrl: "/img/gear/sup-aqua-marina.svg",
    specs: [
      "Kantavuus: 140 kg",
      "Varusteet: Säädettävä mela, kaksitoimipumppu & karkuremmi",
      "Koko: 320 x 81 x 15 cm",
      "Pitävä kansipehmuste"
    ],
    owner: {
      name: "Vilma T.",
      city: "Oulu",
      avatar: null,
      isSuperOwner: false,
      verified: true
    }
  },
  {
    id: "gear-4",
    title: "Saimaa SUP Tourer 11.6 -retkiSUP",
    description: "Nopea ja suuntavakaa retki-SUP pidemmille lenkeille Oulujokea pitkin. Kaksinkertaiset tavaraverkot varusteille ja retkieväille.",
    category: "sup_boards",
    categoryLabel: "SUP-laudat",
    brand: "Saimaa SUP",
    model: "Tourer 11.6",
    location: "Keskusta, Oulu",
    city: "Oulu",
    pricePerDay: 28,
    pricePerWeekend: 70,
    rating: 4.95,
    reviewsCount: 18,
    isAvailable: true,
    tag: "Retkimalli",
    imageUrl: "/img/gear/sup-saimaa-tourer.svg",
    specs: [
      "Kantavuus: 160 kg",
      "Varusteet: Lasikuitumela, korkeapainepumppu & karkuremmi",
      "Koko: 350 x 81 x 15 cm",
      "Tuplatavaraverkot"
    ],
    owner: {
      name: "Juho M.",
      city: "Oulu",
      avatar: null,
      isSuperOwner: true,
      verified: true
    }
  },
  {
    id: "gear-5",
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
    imageUrl: "/img/gear/retkikeitin-primus.svg",
    specs: [
      "Monipolttoainevalmius",
      "Paino: 230 g (ilman pumppua)",
      "Teho: 2600 W",
      "Sisältää polttoainepullon"
    ],
    owner: {
      name: "Antti S.",
      city: "Oulu",
      avatar: null,
      isSuperOwner: true,
      verified: true
    }
  },
  {
    id: "gear-6",
    title: "Jetboil Flash -kaasukeitinsetti",
    description: "Keittää puoli litraa vettä vain 100 sekunnissa. Erittäin nopea ja polttoainetehokas retkikeitin.",
    category: "cooking",
    categoryLabel: "Retkikeittimet & Ruokailu",
    brand: "Jetboil",
    model: "Flash",
    location: "Linnanmaa, Oulu",
    city: "Oulu",
    pricePerDay: 9,
    pricePerWeekend: 22,
    rating: 4.91,
    reviewsCount: 17,
    isAvailable: true,
    tag: "Supernopea",
    imageUrl: "/img/gear/retkikeitin-jetboil.svg",
    specs: [
      "1.0L FluxRing-kattila",
      "Keittoaika: 100s / 0.5L",
      "Piezo-sytytys",
      "Paino: 371 g"
    ],
    owner: {
      name: "Sanna P.",
      city: "Oulu",
      avatar: null,
      isSuperOwner: false,
      verified: true
    }
  }
]

export async function getListings() {
  return Promise.resolve(MOCK_LISTINGS)
}