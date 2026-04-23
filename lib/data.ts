export type StayType = "SHORT" | "LONG";

export type Room = {
  id: string;
  name: string;
  priceMonthly: number;
  sizeSqm: number | null;
  description: string;
  interior: string;
  forCouples: boolean;
  image: string;
  images?: string[];
};

export type MatterportTour = {
  label?: string; // optional tab label when multiple tours exist
  url: string;    // full my.matterport.com/show/?m=... URL
};

export type Location = {
  slug: string;
  city: "hamburg" | "berlin" | "vallendar";
  name: string;
  address: string;
  coords: [number, number]; // [lng, lat] — precise building location (Mapbox-geocoded)
  stayType: StayType;
  priceFrom: number;
  tagline: string;
  description: string;
  neighborhoodDescription: string;
  communitySpaceDescription: string;
  neighborhood: string;
  roomiesPerApartment: string;
  images: string[];
  rooms: Room[];
  nearbyLocationSlugs: string[];
  communityManager: { name: string; email: string; image: string };
  matterportTours?: MatterportTour[];
  youtubeVideoId?: string; // fallback/alternative to matterport — embed via youtube-nocookie
};

export type Feature = {
  icon: string;
  title: string;
  desc: string;
  image: string;
};

// ─── HELPER: image path builder ───────────────────────────
const loc = (location: string, folder: string, file: string) =>
  `/images/locations/${location}/${folder}/${file}`;

// ─── LOCATIONS ─────────────────────────────────────────────

export const locations: Location[] = [
  {
    slug: "muehlenkamp",
    city: "hamburg",
    name: "Mühlenkamp",
    address: "Dorotheenstraße 3-5, 22301 Hamburg",
    coords: [10.0091, 53.5815],
    stayType: "LONG",
    priceFrom: 795,
    tagline: "The Cradle of Coliving",
    description:
      "Since 2019, STACEY welcomes tenants from all over the world at Hamburg's #1 address for coliving, directly next to the beautiful lake Alster. Our oldest and largest coliving property features private suites ranging from 8 to 25 square meters within shared apartments, surrounded by restaurants, bars and cafés — and wrapped around a quiet inner courtyard.",
    neighborhoodDescription:
      "Winterhude offers a unique blend of serene central living and vibrant social opportunities. Our coliving is tucked away on a quiet street between the well-known Mühlenkamp and the green heart of Hamburg — the Alster. A bus station within 100 meters connects you to downtown in 10 minutes, and the Alster is just around the corner for running or paddleboarding.",
    communitySpaceDescription:
      "A former electrician's office converted into over 150 m² of community space. Lounge seating with Netflix TV, two fully equipped kitchens, a coworking zone and WeWash laundry facilities — the main hub for community dinners and STACEY events throughout the city.",
    neighborhood: "Winterhude",
    roomiesPerApartment: "1 - 3",
    images: [
      loc("muehlenkamp", "community", "01-muehlenkamp.webp"),
      loc("muehlenkamp", "community", "02-muehlenkamp.webp"),
      loc("muehlenkamp", "community", "03-muehlenkamp.webp"),
      loc("muehlenkamp", "community", "04-muehlenkamp.webp"),
      loc("muehlenkamp", "community", "05-muehlenkamp.webp"),
      loc("muehlenkamp", "community", "06-muehlenkamp.webp"),
      loc("muehlenkamp", "community", "07-muehlenkamp.webp"),
      loc("muehlenkamp", "community", "08-muehlenkamp.webp"),
      loc("muehlenkamp", "community", "09-muehlenkamp.webp"),
      loc("muehlenkamp", "community", "10-muehlenkamp.webp"),
      loc("muehlenkamp", "community", "11-muehlenkamp.webp"),
      loc("muehlenkamp", "community", "12-muehlenkamp.webp"),
      loc("muehlenkamp", "community", "13-muehlenkamp.webp"),
      loc("muehlenkamp", "community", "14-muehlenkamp.webp"),
    ],
    rooms: [
      {
        id: "muehlenkamp-basic-plus",
        name: "Basic+",
        priceMonthly: 795,
        sizeSqm: null,
        forCouples: false,
        description:
          "Looking for just the essentials to be happy? Welcome to your new Basic+ suite.",
        interior:
          "Single bed, Wardrobe, Coat hooks, Artwork & Bedding",
        image: loc("muehlenkamp", "basic-plus", "01-basic-plus-mk.webp"),
        images: [
          loc("muehlenkamp", "basic-plus", "01-basic-plus-mk.webp"),
          loc("muehlenkamp", "basic-plus", "02-basic-plus-mk.webp"),
        ],
      },
      {
        id: "muehlenkamp-mighty",
        name: "Mighty",
        priceMonthly: 895,
        sizeSqm: 8,
        forCouples: false,
        description:
          "Mighty people need a mighty room with extra space for thoughts and creativity.",
        interior:
          "Double bed, Nightstand, Armchair, Wardrobe, Coat hooks, Artwork & Bedding",
        image: loc("muehlenkamp", "mighty", "001-mighty-mk.webp"),
        images: [
          loc("muehlenkamp", "mighty", "001-mighty-mk.webp"),
          loc("muehlenkamp", "mighty", "002-mighty-mk.webp"),
          loc("muehlenkamp", "mighty", "003-mighty-mk.webp"),
          loc("muehlenkamp", "mighty", "004-mighty-mk.webp"),
          loc("muehlenkamp", "mighty", "005-mighty-mk.webp"),
          loc("muehlenkamp", "mighty", "006-mighty-mk.webp"),
          loc("muehlenkamp", "mighty", "007-mighty-mk.webp"),
        ],
      },
      {
        id: "muehlenkamp-premium",
        name: "Premium",
        priceMonthly: 995,
        sizeSqm: 12,
        forCouples: false,
        description:
          "Minimalist style in a space slightly larger than our Mighty room.",
        interior:
          "Double bed, Nightstand, Desk, Chair, Armchair, Wardrobe, Mirror, Bedding",
        image: loc("muehlenkamp", "premium", "001-premium-mk.webp"),
        images: [
          loc("muehlenkamp", "premium", "001-premium-mk.webp"),
          loc("muehlenkamp", "premium", "002-premium-mk.webp"),
          loc("muehlenkamp", "premium", "003-premium-mk.webp"),
        ],
      },
      {
        id: "muehlenkamp-premium-plus",
        name: "Premium+",
        priceMonthly: 1095,
        sizeSqm: 14,
        forCouples: false,
        description:
          "Extra space for spirit and mind in our slightly bigger Premium+ suites.",
        interior:
          "Elevated double bed, Desk, Chair, Armchair, Floor lamp, Wardrobe, Mirror, Bedding",
        image: loc("muehlenkamp", "premium-plus", "001-premium-plus-mk.webp"),
        images: [
          loc("muehlenkamp", "premium-plus", "001-premium-plus-mk.webp"),
          loc("muehlenkamp", "premium-plus", "002-premium-plus-mk.webp"),
          loc("muehlenkamp", "premium-plus", "003-premium-plus-mk.webp"),
          loc("muehlenkamp", "premium-plus", "004-premium-plus-mk.webp"),
        ],
      },
      {
        id: "muehlenkamp-jumbo",
        name: "Jumbo",
        priceMonthly: 1295,
        sizeSqm: 25,
        forCouples: true,
        description:
          "Wake up in a world all your own. Screw the minimalism.",
        interior:
          "Queen-size bed, Sofa, Walk-in closet, Nightstand, Desk, Chair, Armchair, Floor lamp, Bedding",
        image: loc("muehlenkamp", "jumbo", "001-jumbo-mk.webp"),
        images: [
          loc("muehlenkamp", "jumbo", "001-jumbo-mk.webp"),
          loc("muehlenkamp", "jumbo", "002-jumbo-mk.webp"),
          loc("muehlenkamp", "jumbo", "003-jumbo-mk.webp"),
          loc("muehlenkamp", "jumbo", "004-jumbo-mk.webp"),
          loc("muehlenkamp", "jumbo", "005-jumbo-mk.webp"),
          loc("muehlenkamp", "jumbo", "006-jumbo-mk.webp"),
          loc("muehlenkamp", "jumbo", "007-jumbo-mk.webp"),
          loc("muehlenkamp", "jumbo", "008-jumbo-mk.webp"),
          loc("muehlenkamp", "jumbo", "009-jumbo-mk.webp"),
          loc("muehlenkamp", "jumbo", "010-jumbo-mk.webp"),
        ],
      },
    ],
    nearbyLocationSlugs: ["eppendorf", "eimsbuettel", "st-pauli"],
    matterportTours: [
      { url: "https://my.matterport.com/show/?m=XegesAR7kDJ" },
    ],
    communityManager: {
      name: "Bruno",
      email: "booking@stacey.de",
      image: "/images/community-manager.webp",
    },
  },
  {
    slug: "eppendorf",
    city: "hamburg",
    name: "Eppendorf",
    address: "Eppendorfer Weg 270, 20251 Hamburg",
    coords: [9.9792, 53.5841],
    stayType: "LONG",
    priceFrom: 895,
    tagline: "Coliving for Locals",
    description:
      "Centrally located in Hamburg Eppendorf, our coliving offers suites ranging from 10 to 20 m² — some with optional balconies. A maximum of 4 suites per apartment strikes the balance between privacy and community living.",
    neighborhoodDescription:
      "Eppendorf is the neighborhood every local wants to live in — green parks, boutique shops and some of Hamburg's most acclaimed brunch spots. The U-Bahn connects you to Sternschanze and the city center within 10 minutes.",
    communitySpaceDescription:
      "A spacious community space on the ground floor, converted from a former restaurant. Shared kitchen, living areas and a coworking zone with ceiling heights up to 4 meters.",
    neighborhood: "Eppendorf",
    roomiesPerApartment: "2 - 3",
    images: [
      loc("eppendorf", "community", "001-community-ew.webp"),
      loc("eppendorf", "community", "002-community-ew.webp"),
      loc("eppendorf", "community", "003-community-ew.webp"),
      loc("eppendorf", "community", "004-community-ew.webp"),
      loc("eppendorf", "community", "005-community-ew.webp"),
      loc("eppendorf", "community", "006-community-ew.webp"),
      loc("eppendorf", "community", "007-community-ew.webp"),
      loc("eppendorf", "community", "008-community-ew.webp"),
      loc("eppendorf", "community", "009-community-ew.webp"),
      loc("eppendorf", "community", "010-community-ew.webp"),
    ],
    rooms: [
      {
        id: "eppendorf-mighty",
        name: "Mighty",
        priceMonthly: 895,
        sizeSqm: 10,
        forCouples: false,
        description: "A cozy room with everything you need for a great stay.",
        interior: "Bed, Nightstand, Floor lamp, Wardrobe, Hangers, Artwork, Bedding",
        image: loc("eppendorf", "mighty", "001-mighty-ew.webp"),
        images: [
          loc("eppendorf", "mighty", "001-mighty-ew.webp"),
          loc("eppendorf", "mighty", "002-mighty-ew.webp"),
          loc("eppendorf", "mighty", "003-mighty-ew.webp"),
          loc("eppendorf", "mighty", "004-mighty-ew.webp"),
        ],
      },
      {
        id: "eppendorf-premium",
        name: "Premium",
        priceMonthly: 995,
        sizeSqm: 12,
        forCouples: false,
        description: "More space, more style — our Premium suite in Eppendorf.",
        interior: "Double bed, Nightstand, Desk, Chair, Armchair, Floor lamp, Wardrobe, Bedding",
        image: loc("eppendorf", "premium-balcony", "001-premium-ew.webp"),
        images: [
          loc("eppendorf", "premium-balcony", "001-premium-ew.webp"),
          loc("eppendorf", "premium-balcony", "002-premium-ew.webp"),
          loc("eppendorf", "premium-balcony", "003-premium-ew.webp"),
          loc("eppendorf", "premium-balcony", "004-premium-ew.webp"),
        ],
      },
      {
        id: "eppendorf-premium-balcony",
        name: "Premium Balcony",
        priceMonthly: 1045,
        sizeSqm: 12,
        forCouples: false,
        description: "Your own Premium suite with a private balcony in Eppendorf.",
        interior: "Double bed, Nightstand, Desk, Chair, Armchair, Floor lamp, Wardrobe, Bedding",
        image: loc("eppendorf", "premium-balcony", "001-premium-ew.webp"),
        images: [
          loc("eppendorf", "premium-balcony", "001-premium-ew.webp"),
          loc("eppendorf", "premium-balcony", "002-premium-ew.webp"),
          loc("eppendorf", "premium-balcony", "003-premium-ew.webp"),
          loc("eppendorf", "premium-balcony", "004-premium-ew.webp"),
        ],
      },
      {
        id: "eppendorf-premium-plus",
        name: "Premium+",
        priceMonthly: 1095,
        sizeSqm: 14,
        forCouples: false,
        description: "Extra space in one of Hamburg's most beautiful neighborhoods.",
        interior: "Double bed, Nightstand, Desk, Chair, Armchair, Floor lamp, Wardrobe, Bedding",
        image: loc("eppendorf", "premium-plus-balcony", "001-premium-plus-ew.webp"),
        images: [
          loc("eppendorf", "premium-plus-balcony", "001-premium-plus-ew.webp"),
          loc("eppendorf", "premium-plus-balcony", "002-premium-plus-ew.webp"),
          loc("eppendorf", "premium-plus-balcony", "003-premium-plus-ew.webp"),
          loc("eppendorf", "premium-plus-balcony", "004-premium-plus-ew.webp"),
        ],
      },
      {
        id: "eppendorf-premium-plus-balcony",
        name: "Premium+ Balcony",
        priceMonthly: 1145,
        sizeSqm: 14,
        forCouples: false,
        description: "Our Premium+ with a private balcony — the best of Eppendorf.",
        interior: "Double bed, Nightstand, Desk, Chair, Armchair, Floor lamp, Wardrobe, Bedding",
        image: loc("eppendorf", "premium-plus-balcony", "001-premium-plus-ew.webp"),
        images: [
          loc("eppendorf", "premium-plus-balcony", "001-premium-plus-ew.webp"),
          loc("eppendorf", "premium-plus-balcony", "002-premium-plus-ew.webp"),
          loc("eppendorf", "premium-plus-balcony", "003-premium-plus-ew.webp"),
          loc("eppendorf", "premium-plus-balcony", "004-premium-plus-ew.webp"),
        ],
      },
      {
        id: "eppendorf-jumbo",
        name: "Jumbo",
        priceMonthly: 1295,
        sizeSqm: 17,
        forCouples: true,
        description: "Our largest suite in Eppendorf — perfect for singles and couples.",
        interior: "Queen-size bed, Nightstand, Desk, Chair, Armchair, Floor lamp, Walk-in closet, Bedding",
        image: loc("eppendorf", "jumbo", "001-jumbo-ew.webp"),
        images: [
          loc("eppendorf", "jumbo", "001-jumbo-ew.webp"),
          loc("eppendorf", "jumbo", "002-jumbo-ew.webp"),
          loc("eppendorf", "jumbo", "003-jumbo-ew.webp"),
          loc("eppendorf", "jumbo", "004-jumbo-ew.webp"),
          loc("eppendorf", "jumbo", "005-jumbo-ew.webp"),
        ],
      },
      {
        id: "eppendorf-jumbo-balcony",
        name: "Jumbo Balcony",
        priceMonthly: 1345,
        sizeSqm: 17,
        forCouples: true,
        description: "The biggest suite with a balcony — the ultimate Eppendorf experience.",
        interior: "Queen-size bed, Nightstand, Desk, Chair, Armchair, Floor lamp, Walk-in closet, Bedding",
        image: loc("eppendorf", "jumbo-balcony", "001-jumbo-balcony-ew.webp"),
        images: [
          loc("eppendorf", "jumbo-balcony", "001-jumbo-balcony-ew.webp"),
          loc("eppendorf", "jumbo-balcony", "002-jumbo-balcony-ew.webp"),
          loc("eppendorf", "jumbo-balcony", "003-jumbo-balcony-ew.webp"),
          loc("eppendorf", "jumbo-balcony", "004-jumbo-balcony-ew.webp"),
          loc("eppendorf", "jumbo-balcony", "005-jumbo-balcony-ew.webp"),
        ],
      },
    ],
    nearbyLocationSlugs: ["muehlenkamp", "eimsbuettel"],
    matterportTours: [
      { url: "https://my.matterport.com/show/?m=wb6bCryfUBT" },
    ],
    communityManager: {
      name: "Bruno",
      email: "booking@stacey.de",
      image: "/images/community-manager.webp",
    },
  },
  {
    slug: "downtown",
    city: "hamburg",
    name: "Downtown",
    address: "Brandstwiete 36, 20457 Hamburg",
    coords: [9.9967, 53.5471],
    stayType: "SHORT",
    priceFrom: 45,
    // Mighty=995, Premium=1095, PremiumBalcony=1145, Premium+=1195, Jumbo=1395
    tagline: "The Heart of Hamburg",
    description:
      "Directly between the city center and the UNESCO World Heritage Speicherstadt. Suites from 10 to 20 m² with 5-meter-high ceilings, set in a historic building voted Hamburg's most beautiful facade.",
    neighborhoodDescription:
      "Sightseeing right on your doorstep. Restaurants, cafés and every major public transport line are just steps away — perfect for both leisure and business stays in Hamburg's liveable downtown.",
    communitySpaceDescription:
      "The community space sits directly within the shared apartment — fully equipped kitchen, washing machine, and a Netflix TV & lounge area in the hallway.",
    neighborhood: "Altstadt",
    roomiesPerApartment: "6",
    images: [
      loc("downtown", "community", "000-community-dt.webp"),
      loc("downtown", "community", "001-community-dt.webp"),
      loc("downtown", "community", "002-community-dt.webp"),
      loc("downtown", "community", "003-community-dt.webp"),
      loc("downtown", "community", "004-community-dt.webp"),
      loc("downtown", "community", "005-community-dt.webp"),
      loc("downtown", "community", "006-community-dt.webp"),
      loc("downtown", "community", "007-community-dt.webp"),
      loc("downtown", "community", "008-community-dt.webp"),
      loc("downtown", "community", "010-community-dt.webp"),
      loc("downtown", "community", "011-community-dt.webp"),
    ],
    rooms: [
      {
        id: "downtown-mighty",
        name: "Mighty",
        priceMonthly: 995,
        sizeSqm: 10,
        forCouples: false,
        description: "Compact and clever — everything you need in the heart of the city.",
        interior:
          "Double bed, Nightstand, Desk, Chair, Wardrobe, Bedding",
        image: loc("downtown", "mighty", "001-mighty-dt.webp"),
        images: [
          loc("downtown", "mighty", "001-mighty-dt.webp"),
          loc("downtown", "mighty", "002-mighty-dt.webp"),
          loc("downtown", "mighty", "003-mighty-dt.webp"),
        ],
      },
      {
        id: "downtown-premium",
        name: "Premium",
        priceMonthly: 1095,
        sizeSqm: 13,
        forCouples: false,
        description: "A stylish suite in the heart of Hamburg's city center.",
        interior:
          "Double bed, Nightstand, Desk, Chair, Wardrobe, Bedding",
        image: loc("downtown", "premium", "001-premium-dt.webp"),
        images: [
          loc("downtown", "premium", "001-premium-dt.webp"),
          loc("downtown", "premium", "002-premium-dt.webp"),
          loc("downtown", "premium", "003-premium-dt.webp"),
          loc("downtown", "premium", "004-premium-dt.webp"),
        ],
      },
      {
        id: "downtown-premium-balcony",
        name: "Premium Balcony",
        priceMonthly: 1145,
        sizeSqm: 13,
        forCouples: false,
        description: "Your own Premium suite with a private balcony downtown.",
        interior:
          "Double bed, Nightstand, Desk, Chair, Wardrobe, Bedding",
        image: loc("downtown", "premium", "001-premium-dt.webp"),
        images: [
          loc("downtown", "premium", "001-premium-dt.webp"),
          loc("downtown", "premium", "002-premium-dt.webp"),
          loc("downtown", "premium", "003-premium-dt.webp"),
          loc("downtown", "premium", "004-premium-dt.webp"),
        ],
      },
      {
        id: "downtown-premium-plus",
        name: "Premium+",
        priceMonthly: 1195,
        sizeSqm: 15,
        forCouples: false,
        description: "Extra space downtown for those who love room to breathe.",
        interior:
          "Double bed, Nightstand, Desk, Chair, Armchair, Wardrobe, Mirror, Bedding",
        image: loc("downtown", "premium-plus", "001-premium-plus-dt.webp"),
        images: [
          loc("downtown", "premium-plus", "001-premium-plus-dt.webp"),
          loc("downtown", "premium-plus", "002-premium-plus-dt.webp"),
          loc("downtown", "premium-plus", "003-premium-plus-dt.webp"),
          loc("downtown", "premium-plus", "004-premium-plus-dt.webp"),
        ],
      },
      {
        id: "downtown-jumbo",
        name: "Jumbo",
        priceMonthly: 1395,
        sizeSqm: 20,
        forCouples: true,
        description: "Our largest downtown suite — perfect for singles and couples who want it all.",
        interior:
          "Double bed, Nightstand, Desk, Chair, Armchair, Wardrobe, Mirror, Bedding",
        image: loc("downtown", "jumbo", "001-jumbo-dt.webp"),
        images: [
          loc("downtown", "jumbo", "001-jumbo-dt.webp"),
          loc("downtown", "jumbo", "002-jumbo-dt.webp"),
          loc("downtown", "jumbo", "003-jumbo-dt.webp"),
          loc("downtown", "jumbo", "004-jumbo-dt.webp"),
          loc("downtown", "jumbo", "005-jumbo-dt.webp"),
          loc("downtown", "jumbo", "006-jumbo-dt.webp"),
        ],
      },
    ],
    nearbyLocationSlugs: ["alster", "st-pauli"],
    matterportTours: [
      { url: "https://my.matterport.com/show/?m=kD5Bg43Heyf" },
    ],
    communityManager: {
      name: "Bruno",
      email: "booking@stacey.de",
      image: "/images/community-manager.webp",
    },
  },
  {
    slug: "alster",
    city: "hamburg",
    name: "Alster",
    address: "Gurlittstraße 28, 20099 Hamburg",
    coords: [10.0096, 53.5581],
    stayType: "SHORT",
    priceFrom: 48,
    tagline: "Coliving next door to Udo",
    description:
      "Centrally located in Hamburg St. Georg. Our suites are spread over 4 floors, ranging from 14 to 18 m², some with optional balcony. A converted former office building dedicated exclusively to short-term coliving — with a community kitchen on the top floor and laundry facilities in the basement.",
    neighborhoodDescription:
      "We sit on Gurlittstraße between the Alster lake and the lively Lange Reihe restaurant street — roughly ten minutes on foot from central Hamburg's attractions. St. Georg is colorful, diverse and one of the city's most characterful neighborhoods.",
    communitySpaceDescription:
      "The common space is the heart of every STACEY location. Stainless steel coworking counters, lounge seating and a fully equipped kitchen where residents gather for dinners and community events.",
    neighborhood: "St. Georg",
    roomiesPerApartment: "2",
    images: [
      loc("alster", "community", "01-community-al.webp"),
      loc("alster", "community", "02-community-al.webp"),
      loc("alster", "community", "03-community-al.webp"),
      loc("alster", "community", "04-community-al.webp"),
      loc("alster", "community", "05-community-al.webp"),
      loc("alster", "community", "06-community-al.webp"),
      loc("alster", "community", "07-community-al.webp"),
      loc("alster", "community", "08-community-al.webp"),
      loc("alster", "community", "09-community-al.webp"),
      loc("alster", "community", "010-community-al.webp"),
      loc("alster", "community", "011-community-al.webp"),
      loc("alster", "community", "012-community-al.webp"),
      loc("alster", "community", "013-community-al.webp"),
      loc("alster", "community", "014-community-al.webp"),
    ],
    rooms: [
      {
        id: "alster-premium",
        name: "Premium",
        priceMonthly: 995,
        sizeSqm: 15,
        forCouples: false,
        description: "A beautiful suite with Alster vibes.",
        interior:
          "Double bed, Nightstand, Desk, Chair, Wardrobe, Bedding",
        image: loc("alster", "premium", "01-premium-al.webp"),
        images: [
          loc("alster", "premium", "01-premium-al.webp"),
          loc("alster", "premium", "02-premium-al.webp"),
          loc("alster", "premium", "03-premium-al.webp"),
          loc("alster", "premium", "04-premium-al.webp"),
        ],
      },
      {
        id: "alster-premium-balcony",
        name: "Premium Balcony",
        priceMonthly: 1045,
        sizeSqm: 15,
        forCouples: false,
        description: "Your own Premium suite with a private balcony by the Alster.",
        interior:
          "Double bed, Nightstand, Desk, Chair, Wardrobe, Bedding",
        image: loc("alster", "premium-balcony", "01-premium-balcony-al.webp"),
        images: [
          loc("alster", "premium-balcony", "01-premium-balcony-al.webp"),
          loc("alster", "premium-balcony", "02-premium-balcony-al.webp"),
          loc("alster", "premium-balcony", "03-premium-balcony-al.webp"),
        ],
      },
      {
        id: "alster-premium-plus",
        name: "Premium+",
        priceMonthly: 1095,
        sizeSqm: 17,
        forCouples: false,
        description: "Extra space with a view — the Premium+ at our Alster location.",
        interior:
          "Double bed, Nightstand, Desk, Chair, Armchair, Wardrobe, Mirror, Bedding",
        image: loc("alster", "premium-plus", "01-premium-plus-al.webp"),
        images: [
          loc("alster", "premium-plus", "01-premium-plus-al.webp"),
          loc("alster", "premium-plus", "02-premium-plus-al.webp"),
          loc("alster", "premium-plus", "03-premium-plus-al.webp"),
          loc("alster", "premium-plus", "04-premium-plus-al.webp"),
          loc("alster", "premium-plus", "05-premium-plus-al.webp"),
        ],
      },
      {
        id: "alster-premium-plus-balcony",
        name: "Premium+ Balcony",
        priceMonthly: 1145,
        sizeSqm: 17,
        forCouples: true,
        description: "Our largest balcony suite at the Alster — room for two with a view.",
        interior:
          "Double bed, Nightstand, Desk, Chair, Armchair, Wardrobe, Mirror, Bedding",
        image: loc("alster", "premium-plus-balcony", "01-premium-plus-balcony-al.webp"),
        images: [
          loc("alster", "premium-plus-balcony", "01-premium-plus-balcony-al.webp"),
          loc("alster", "premium-plus-balcony", "02-premium-plus-balcony-al.webp"),
          loc("alster", "premium-plus-balcony", "03-premium-plus-balcony-al.webp"),
          loc("alster", "premium-plus-balcony", "04-premium-plus-balcony-al.webp"),
        ],
      },
      {
        id: "alster-jumbo",
        name: "Jumbo",
        priceMonthly: 1295,
        sizeSqm: 19,
        forCouples: true,
        description: "The biggest suite at our Alster location — ideal for singles and couples.",
        interior:
          "Double bed, Nightstand, Desk, Chair, Armchair, Wardrobe, Mirror, Bedding",
        image: loc("alster", "premium-plus", "01-premium-plus-al.webp"),
        images: [
          loc("alster", "premium-plus", "01-premium-plus-al.webp"),
          loc("alster", "premium-plus", "02-premium-plus-al.webp"),
          loc("alster", "premium-plus", "03-premium-plus-al.webp"),
          loc("alster", "premium-plus", "04-premium-plus-al.webp"),
          loc("alster", "premium-plus", "05-premium-plus-al.webp"),
        ],
      },
    ],
    nearbyLocationSlugs: ["downtown", "muehlenkamp"],
    matterportTours: [
      { url: "https://my.matterport.com/show/?m=J8T1ognFHCN" },
    ],
    communityManager: {
      name: "Bruno",
      email: "booking@stacey.de",
      image: "/images/community-manager.webp",
    },
  },
  {
    slug: "st-pauli",
    city: "hamburg",
    name: "St. Pauli",
    address: "Detlev-Bremer-Straße 2, 20359 Hamburg",
    coords: [9.9655, 53.5530],
    stayType: "LONG",
    priceFrom: 895,
    tagline: "Central, Colorful, Diverse",
    description:
      "Cozy shared living next to the Millerntor stadium. Our 7-bedroom duplex coliving apartment has everything you need within its doors — living room, common kitchen and the old-building charm that (let's be honest) is unmatched by new developments.",
    neighborhoodDescription:
      "St. Pauli sits between Hamburg's nightlife area and Sternschanze — the best of both worlds. You can reach every major Hamburg hotspot within 15 minutes via public transport, and the Elbe river and city center are just around the corner.",
    communitySpaceDescription:
      "Spacious community spaces designed to fit your needs — the #1 reason members join STACEY. The duplex features a lounge and dining area, a fully equipped kitchen, a communal garden for summer afternoons, and laundry facilities in the basement.",
    neighborhood: "St. Pauli",
    roomiesPerApartment: "6",
    images: [
      loc("st-pauli", "community", "001-community-sp.webp"),
      loc("st-pauli", "community", "002-community-sp.webp"),
      loc("st-pauli", "community", "003-community-sp.webp"),
      loc("st-pauli", "community", "004-community-sp.webp"),
      loc("st-pauli", "community", "005-community-sp.webp"),
      loc("st-pauli", "community", "006-community-sp.webp"),
      loc("st-pauli", "community", "007-community-sp.webp"),
    ],
    rooms: [
      {
        id: "st-pauli-mighty",
        name: "Mighty",
        priceMonthly: 895,
        sizeSqm: 8,
        forCouples: false,
        description: "Your room in Hamburg's most vibrant neighborhood.",
        interior: "Double bed, Nightstand, Armchair, Wardrobe, Bedding",
        image: loc("st-pauli", "mighty", "001-mighty-sp.webp"),
        images: [
          loc("st-pauli", "mighty", "001-mighty-sp.webp"),
          loc("st-pauli", "mighty", "002-mighty-sp.webp"),
          loc("st-pauli", "mighty", "003-mighty-sp.webp"),
          loc("st-pauli", "mighty", "004-mighty-sp.webp"),
          loc("st-pauli", "mighty", "005-mighty-sp.webp"),
        ],
      },
      {
        id: "st-pauli-premium",
        name: "Premium",
        priceMonthly: 995,
        sizeSqm: 9,
        forCouples: false,
        description: "More space in the heart of St. Pauli.",
        interior: "Double bed, Nightstand, Desk, Chair, Wardrobe, Mirror, Bedding",
        image: loc("st-pauli", "premium", "001-premium-sp.webp"),
        images: [
          loc("st-pauli", "premium", "001-premium-sp.webp"),
          loc("st-pauli", "premium", "002-premium-sp.webp"),
          loc("st-pauli", "premium", "003-premium-sp.webp"),
          loc("st-pauli", "premium", "004-premium-sp.webp"),
          loc("st-pauli", "premium", "005-premium-sp.webp"),
          loc("st-pauli", "premium", "006-premium-sp.webp"),
        ],
      },
      {
        id: "st-pauli-premium-plus",
        name: "Premium+",
        priceMonthly: 1095,
        sizeSqm: 14,
        forCouples: false,
        description: "Extra space in St. Pauli for those who want room to breathe.",
        interior: "Double bed, Nightstand, Desk, Chair, Armchair, Wardrobe, Mirror, Bedding",
        image: loc("st-pauli", "premium-plus", "001-premium-plus-sp.webp"),
        images: [
          loc("st-pauli", "premium-plus", "001-premium-plus-sp.webp"),
          loc("st-pauli", "premium-plus", "002-premium-plus-sp.webp"),
          loc("st-pauli", "premium-plus", "003-premium-plus-sp.webp"),
          loc("st-pauli", "premium-plus", "004-premium-plus-sp.webp"),
        ],
      },
      {
        id: "st-pauli-jumbo",
        name: "Jumbo",
        priceMonthly: 1295,
        sizeSqm: 20,
        forCouples: true,
        description: "The biggest suite at St. Pauli — for singles and couples who want it all.",
        interior: "Double bed, Nightstand, Desk, Chair, Armchair, Wardrobe, Mirror, Bedding",
        image: loc("st-pauli", "jumbo", "001-jumbo-sp.webp"),
        images: [
          loc("st-pauli", "jumbo", "001-jumbo-sp.webp"),
          loc("st-pauli", "jumbo", "002-jumbo-sp.webp"),
          loc("st-pauli", "jumbo", "003-jumbo-sp.webp"),
          loc("st-pauli", "jumbo", "004-jumbo-sp.webp"),
          loc("st-pauli", "jumbo", "005-jumbo-sp.webp"),
        ],
      },
    ],
    nearbyLocationSlugs: ["downtown", "eimsbuettel"],
    youtubeVideoId: "Sj3TH2Y56f0",
    communityManager: {
      name: "Bruno",
      email: "booking@stacey.de",
      image: "/images/community-manager.webp",
    },
  },
  {
    slug: "eimsbuettel",
    city: "hamburg",
    name: "Eimsbüttel",
    address: "Bei der Apostelkirche 13, 20257 Hamburg",
    coords: [9.9433, 53.5758],
    stayType: "LONG",
    priceFrom: 795,
    tagline: "Beautiful, Peaceful & Quiet",
    description:
      "Our smallest coliving location is in Hamburg-Eimsbüttel, a neighborhood of locals. The shared apartment offers a kitchen and a small inner yard. You can choose between private suites from 6 m² up to 15 m².",
    neighborhoodDescription:
      "Eimsbüttel gives you an authentic Hamburg experience — a diverse community of families, students and long-time residents. Sternschanze and Osterstraße (the neighborhood's shopping and dining hub) are right next door, and downtown is about 20 minutes away.",
    communitySpaceDescription:
      "Spacious community spaces designed to fit your needs — the #1 reason members join STACEY. Common areas within the shared apartment, a fully equipped kitchen, a private inner yard/balcony and a WeWash self-service laundry facility.",
    neighborhood: "Eimsbüttel",
    roomiesPerApartment: "3",
    images: [
      loc("eimsbuettel", "community", "001-community-ei.webp"),
      loc("eimsbuettel", "community", "002-community-ei.webp"),
      loc("eimsbuettel", "community", "003-community-ei.webp"),
      loc("eimsbuettel", "community", "004-community-ei.webp"),
      loc("eimsbuettel", "community", "005-community-ei.webp"),
      loc("eimsbuettel", "community", "006-community-ei.webp"),
      loc("eimsbuettel", "community", "007-community-ei.webp"),
      loc("eimsbuettel", "community", "008-community-ei.webp"),
    ],
    rooms: [
      {
        id: "eimsbuettel-basic-plus",
        name: "Basic+",
        priceMonthly: 795,
        sizeSqm: 8,
        forCouples: false,
        description: "A smart, compact room in Hamburg's trendiest neighborhood.",
        interior: "Bed, Nightstand, Wardrobe, Hangers, Bedding",
        image: loc("eimsbuettel", "basic-plus", "202406-stacey-eimsbuttel-38.webp"),
        images: [
          loc("eimsbuettel", "basic-plus", "202406-stacey-eimsbuttel-38.webp"),
          loc("eimsbuettel", "basic-plus", "202406-stacey-eimsbuttel-40.webp"),
        ],
      },
      {
        id: "eimsbuettel-premium",
        name: "Premium",
        priceMonthly: 995,
        sizeSqm: 12,
        forCouples: false,
        description: "Spacious living in Eimsbüttel's best location.",
        interior: "Double bed, Nightstand, Desk, Chair, Armchair, Wardrobe, Mirror, Bedding",
        image: loc("eimsbuettel", "premium", "001-premium-ei.webp"),
        images: [
          loc("eimsbuettel", "premium", "001-premium-ei.webp"),
          loc("eimsbuettel", "premium", "002-premium-ei.webp"),
          loc("eimsbuettel", "premium", "003-premium-ei.webp"),
          loc("eimsbuettel", "premium", "004-premium-ei.webp"),
        ],
      },
      {
        id: "eimsbuettel-premium-balcony",
        name: "Premium Balcony",
        priceMonthly: 1045,
        sizeSqm: 12,
        forCouples: false,
        description: "Your own Premium suite with a private balcony in Eimsbüttel.",
        interior: "Double bed, Nightstand, Desk, Chair, Armchair, Wardrobe, Mirror, Bedding",
        image: loc("eimsbuettel", "premium-balcony", "001-premium-balcony-ei.webp"),
        images: [
          loc("eimsbuettel", "premium-balcony", "001-premium-balcony-ei.webp"),
          loc("eimsbuettel", "premium-balcony", "002-premium-balcony-ei.webp"),
          loc("eimsbuettel", "premium-balcony", "003-premium-balcony-ei.webp"),
          loc("eimsbuettel", "premium-balcony", "004-premium-balcony-ei.webp"),
        ],
      },
      {
        id: "eimsbuettel-premium-plus",
        name: "Premium+",
        priceMonthly: 1095,
        sizeSqm: 14,
        forCouples: false,
        description: "Extra space in the heart of Eimsbüttel.",
        interior: "Double bed, Nightstand, Desk, Chair, Armchair, Wardrobe, Mirror, Bedding",
        image: loc("eimsbuettel", "premium-plus", "001-premium-plus-ei.webp"),
        images: [
          loc("eimsbuettel", "premium-plus", "001-premium-plus-ei.webp"),
          loc("eimsbuettel", "premium-plus", "002-premium-plus-ei.webp"),
          loc("eimsbuettel", "premium-plus", "003-premium-plus-ei.webp"),
          loc("eimsbuettel", "premium-plus", "004-premium-plus-ei.webp"),
          loc("eimsbuettel", "premium-plus", "005-premium-plus-ei.webp"),
          loc("eimsbuettel", "premium-plus", "006-premium-plus-ei.webp"),
        ],
      },
    ],
    nearbyLocationSlugs: ["eppendorf", "st-pauli", "muehlenkamp"],
    matterportTours: [
      { url: "https://my.matterport.com/show/?m=5jtAswD96Sg" },
    ],
    communityManager: {
      name: "Bruno",
      email: "booking@stacey.de",
      image: "/images/community-manager.webp",
    },
  },
  {
    slug: "mitte",
    city: "berlin",
    name: "Mitte",
    address: "Fischerinsel 13-15, 10179 Berlin",
    coords: [13.4065, 52.5135],
    stayType: "LONG",
    priceFrom: 795,
    tagline: "Most Central Coliving in Berlin",
    description:
      "Fischerinsel 13-15, 10179 Berlin — directly in the mix. 5 minutes to the Berliner Dom, Gendarmenmarkt or Alexanderplatz. Suite sizes span roughly 8 to 36 m² across shared apartments and private studios, with most shared units featuring just one roommate.",
    neighborhoodDescription:
      "On the Fischerinsel, next to the Museumsinsel — a central, Berlin-style living experience between historic landmarks like Alexanderplatz and the Berliner Dom, while still only minutes away from the cool Kreuzberg area. The U-Bahn station Märkisches Museum is directly outside.",
    communitySpaceDescription:
      "This is where coliving truly comes to life. A cozy lounge area with sofa and a large TV, casual seating for group hangouts, plus a home office area with workstations and WiFi throughout.",
    neighborhood: "Mitte",
    roomiesPerApartment: "1",
    images: [
      loc("berlin-mitte", "community", "13-berlin.webp"),
      loc("berlin-mitte", "community", "14-berlin.webp"),
      loc("berlin-mitte", "community", "15-berlin.webp"),
      loc("berlin-mitte", "community", "16-berlin.webp"),
      loc("berlin-mitte", "community", "17-berlin.webp"),
      loc("berlin-mitte", "community", "18-berlin.webp"),
      loc("berlin-mitte", "community", "19-berlin.webp"),
      loc("berlin-mitte", "community", "20-berlin.webp"),
      loc("berlin-mitte", "community", "21-berlin.webp"),
      loc("berlin-mitte", "community", "22-berlin.webp"),
      loc("berlin-mitte", "community", "23-berlin.webp"),
    ],
    rooms: [
      {
        id: "mitte-basic-plus",
        name: "Basic+",
        priceMonthly: 795,
        sizeSqm: 8,
        forCouples: false,
        description: "A compact, clever suite in the heart of Berlin.",
        interior: "Bed, Nightstand, Wardrobe, Hangers, Bedding",
        image: loc("berlin-mitte", "mighty", "001-mighty-fi.webp"),
        images: [
          loc("berlin-mitte", "mighty", "001-mighty-fi.webp"),
          loc("berlin-mitte", "mighty", "002-mighty-fi.webp"),
          loc("berlin-mitte", "mighty", "003-mighty-fi.webp"),
        ],
      },
      {
        id: "mitte-mighty",
        name: "Mighty",
        priceMonthly: 895,
        sizeSqm: 8,
        forCouples: false,
        description: "Your room in the heart of Berlin.",
        interior: "Double bed, Nightstand, Armchair, Wardrobe, Bedding",
        image: loc("berlin-mitte", "mighty", "001-mighty-fi.webp"),
        images: [
          loc("berlin-mitte", "mighty", "001-mighty-fi.webp"),
          loc("berlin-mitte", "mighty", "002-mighty-fi.webp"),
          loc("berlin-mitte", "mighty", "003-mighty-fi.webp"),
        ],
      },
      {
        id: "mitte-premium",
        name: "Premium",
        priceMonthly: 995,
        sizeSqm: 12,
        forCouples: false,
        description: "Spacious living in Berlin Mitte with Spree views.",
        interior: "Double bed, Nightstand, Desk, Chair, Wardrobe, Mirror, Bedding",
        image: loc("berlin-mitte", "premium", "001-premium-fi.webp"),
        images: [
          loc("berlin-mitte", "premium", "001-premium-fi.webp"),
          loc("berlin-mitte", "premium", "002-premium-fi.webp"),
          loc("berlin-mitte", "premium", "003-premium-fi.webp"),
          loc("berlin-mitte", "premium", "004-premium-fi.webp"),
          loc("berlin-mitte", "premium", "005-premium-fi.webp"),
          loc("berlin-mitte", "premium", "006-premium-fi.webp"),
        ],
      },
      {
        id: "mitte-premium-balcony",
        name: "Premium Balcony",
        priceMonthly: 1045,
        sizeSqm: 14,
        forCouples: false,
        description: "Your Premium suite with a balcony and Spree views.",
        interior: "Double bed, Nightstand, Desk, Chair, Wardrobe, Mirror, Bedding",
        image: loc("berlin-mitte", "premium", "001-premium-fi.webp"),
        images: [
          loc("berlin-mitte", "premium", "001-premium-fi.webp"),
          loc("berlin-mitte", "premium", "002-premium-fi.webp"),
          loc("berlin-mitte", "premium", "003-premium-fi.webp"),
          loc("berlin-mitte", "premium", "004-premium-fi.webp"),
          loc("berlin-mitte", "premium", "005-premium-fi.webp"),
          loc("berlin-mitte", "premium", "006-premium-fi.webp"),
        ],
      },
      {
        id: "mitte-premium-plus-balcony",
        name: "Premium+ Balcony",
        priceMonthly: 1145,
        sizeSqm: 16,
        forCouples: false,
        description: "Extra space with a balcony in Berlin Mitte.",
        interior: "Double bed, Nightstand, Desk, Chair, Armchair, Wardrobe, Mirror, Bedding",
        image: loc("berlin-mitte", "premium-plus-balcony", "003-premium-plus-balcony.webp"),
        images: [
          loc("berlin-mitte", "premium-plus-balcony", "003-premium-plus-balcony.webp"),
          loc("berlin-mitte", "premium-plus-balcony", "01-premium-plus-balcony.webp"),
          loc("berlin-mitte", "premium-plus-balcony", "02-premium-plus-balcony.webp"),
        ],
      },
      {
        id: "mitte-jumbo",
        name: "Jumbo",
        priceMonthly: 1195,
        sizeSqm: 24,
        forCouples: true,
        description: "The biggest suite in Berlin — for those who want it all.",
        interior: "Queen-size bed, Sofa, Nightstand, Desk, Chair, Armchair, Floor lamp, Wardrobe, Bedding",
        image: loc("berlin-mitte", "jumbo", "001-jumbo-fi.webp"),
        images: [
          loc("berlin-mitte", "jumbo", "001-jumbo-fi.webp"),
          loc("berlin-mitte", "jumbo", "002-jumbo-fi.webp"),
          loc("berlin-mitte", "jumbo", "003-jumbo-fi.webp"),
          loc("berlin-mitte", "jumbo", "004-jumbo-fi.webp"),
          loc("berlin-mitte", "jumbo", "005-jumbo-fi.webp"),
          loc("berlin-mitte", "jumbo", "006-jumbo-fi.webp"),
        ],
      },
      {
        id: "mitte-jumbo-balcony",
        name: "Jumbo Balcony",
        priceMonthly: 1195,
        sizeSqm: 26,
        forCouples: true,
        description: "Our largest Berlin suite with a private balcony.",
        interior: "Queen-size bed, Sofa, Nightstand, Desk, Chair, Armchair, Floor lamp, Wardrobe, Bedding",
        image: loc("berlin-mitte", "jumbo-balcony", "001-jumbo-balcony-fi.webp"),
        images: [
          loc("berlin-mitte", "jumbo-balcony", "001-jumbo-balcony-fi.webp"),
          loc("berlin-mitte", "jumbo-balcony", "002-jumbo-balcony-fi.webp"),
          loc("berlin-mitte", "jumbo-balcony", "003-jumbo-balcony-fi.webp"),
          loc("berlin-mitte", "jumbo-balcony", "004-jumbo-balcony-fi.webp"),
        ],
      },
      {
        id: "mitte-studio",
        name: "Studio",
        priceMonthly: 1695,
        sizeSqm: 36,
        forCouples: true,
        description: "Your own private studio — with private bathroom and kitchen.",
        interior: "Double bed, Sofa, Desk, Chair, Kitchen, Private bathroom, Wardrobe, Bedding",
        image: loc("berlin-mitte", "studio", "001-studio-mitte.webp"),
        images: [
          loc("berlin-mitte", "studio", "001-studio-mitte.webp"),
          loc("berlin-mitte", "studio", "002-studio-mitte.webp"),
          loc("berlin-mitte", "studio", "003-studio-mitte.webp"),
          loc("berlin-mitte", "studio", "004-studio-mitte.webp"),
          loc("berlin-mitte", "studio", "005-studio-mitte.webp"),
          loc("berlin-mitte", "studio", "006-studio-mitte.webp"),
          loc("berlin-mitte", "studio", "007-studio-mitte.webp"),
          loc("berlin-mitte", "studio", "008-studio-mitte.webp"),
          loc("berlin-mitte", "studio", "009-studio-mitte.webp"),
          loc("berlin-mitte", "studio", "010-studio-mitte.webp"),
          loc("berlin-mitte", "studio", "011-studio-mitte.webp"),
        ],
      },
    ],
    nearbyLocationSlugs: [],
    matterportTours: [
      { label: "Coworking", url: "https://my.matterport.com/show/?m=sNM4sxRtSye" },
      { label: "Lounge", url: "https://my.matterport.com/show/?m=sipx4CvFb6X" },
    ],
    communityManager: {
      name: "Bruno",
      email: "booking@stacey.de",
      image: "/images/community-manager.webp",
    },
  },
  {
    slug: "vallendar",
    city: "vallendar",
    name: "Vallendar",
    coords: [7.6167, 50.4002],
    address: "Löhrstraße 54, 56179 Vallendar",
    stayType: "LONG",
    priceFrom: 595,
    tagline: "The Cradle of the Spirit",
    description:
      "Centrally located in Vallendar, less than 4 minutes on foot from all WHU university buildings. The property features spacious terraces and modern community spaces designed for studying and socializing in equal measure.",
    neighborhoodDescription:
      "We sit on Löhrstraße, right in the heart of Vallendar. There's no need for a bike or car — everything you need is within walking distance. Restaurants on Hellenstraße, the WHU campus next door, and Koblenz just a few minutes away by train.",
    communitySpaceDescription:
      "The heart of every STACEY location. Cosy working stations, lounge areas with dining, a fully equipped kitchen, an inner yard and a WeWash laundry service — where residents gather for community dinners and STACEY events.",
    neighborhood: "Vallendar",
    roomiesPerApartment: "2 - 4",
    images: [
      loc("vallendar", "community", "001-community-va.webp"),
      loc("vallendar", "community", "002-community-va.webp"),
      loc("vallendar", "community", "003-community-va.webp"),
      loc("vallendar", "community", "004-community-va.webp"),
      loc("vallendar", "community", "005-community-va.webp"),
      loc("vallendar", "community", "006-community-va.webp"),
      loc("vallendar", "community", "007-community-va.webp"),
      loc("vallendar", "community", "008-community-va.webp"),
      loc("vallendar", "community", "009-community-va.webp"),
      loc("vallendar", "community", "010-community-va.webp"),
      loc("vallendar", "community", "011-community-va.webp"),
      loc("vallendar", "community", "012-community-va.webp"),
      loc("vallendar", "community", "013-community-va.webp"),
      loc("vallendar", "community", "014-community-va.webp"),
      loc("vallendar", "community", "015-community-va.webp"),
      loc("vallendar", "community", "016-community-va.webp"),
      loc("vallendar", "community", "017-community-va.webp"),
      loc("vallendar", "community", "018-community-va.webp"),
    ],
    rooms: [
      {
        id: "vallendar-mighty",
        name: "Mighty",
        priceMonthly: 595,
        sizeSqm: 10,
        forCouples: false,
        description: "A cozy room near the WHU campus.",
        interior: "Double bed, Desk, Chair, Wardrobe, Mirror, Hangers, Artwork, Bedding",
        image: loc("vallendar", "mighty", "001-mighty-va.webp"),
        images: [
          loc("vallendar", "mighty", "001-mighty-va.webp"),
          loc("vallendar", "mighty", "002-mighty-va.webp"),
          loc("vallendar", "mighty", "003-mighty-va.webp"),
        ],
      },
      {
        id: "vallendar-premium",
        name: "Premium",
        priceMonthly: 695,
        sizeSqm: 12,
        forCouples: false,
        description: "Extra space for studying and living — our Premium in Vallendar.",
        interior: "Double bed, Desk, Chair, Armchair, Wall lamp, Wardrobe, Mirror, Bedding",
        image: loc("vallendar", "premium", "001-premium-va.webp"),
        images: [
          loc("vallendar", "premium", "001-premium-va.webp"),
          loc("vallendar", "premium", "002-premium-va.webp"),
          loc("vallendar", "premium", "003-premium-va.webp"),
          loc("vallendar", "premium", "004-premium-va.webp"),
        ],
      },
      {
        id: "vallendar-premium-plus",
        name: "Premium+",
        priceMonthly: 795,
        sizeSqm: 14,
        forCouples: false,
        description: "Our largest standard suite in Vallendar — room to study and relax.",
        interior: "Double bed, Desk, Chair, Armchair, Wall lamp, Wardrobe, Mirror, Bedding",
        image: loc("vallendar", "premium-plus", "001-premium-plus-va.webp"),
        images: [
          loc("vallendar", "premium-plus", "001-premium-plus-va.webp"),
          loc("vallendar", "premium-plus", "002-premium-plus-va.webp"),
          loc("vallendar", "premium-plus", "003-premium-plus-va.webp"),
          loc("vallendar", "premium-plus", "004-premium-plus-va.webp"),
          loc("vallendar", "premium-plus", "005-premium-plus-va.webp"),
          loc("vallendar", "premium-plus", "006-premium-plus-va.webp"),
          loc("vallendar", "premium-plus", "007-premium-plus-va.webp"),
        ],
      },
      {
        id: "vallendar-duplex",
        name: "Duplex",
        priceMonthly: 895,
        sizeSqm: 18,
        forCouples: true,
        description: "A two-level suite with sleeping loft — the premium Vallendar experience.",
        interior: "Double bed (loft), Desk, Chair, Armchair, Wardrobe, Mirror, Bedding",
        image: loc("vallendar", "premium-plus", "001-jumbo-va.webp"),
        images: [
          loc("vallendar", "premium-plus", "001-jumbo-va.webp"),
          loc("vallendar", "premium-plus", "002-jumbo-va.webp"),
          loc("vallendar", "premium-plus", "003-jumbo-va.webp"),
          loc("vallendar", "premium-plus", "004-jumbo-va.webp"),
        ],
      },
    ],
    nearbyLocationSlugs: [],
    matterportTours: [
      { url: "https://my.matterport.com/show/?m=j9aPCG2DxxG" },
    ],
    communityManager: {
      name: "Bruno",
      email: "booking@stacey.de",
      image: "/images/community-manager.webp",
    },
  },
];

// ─── HELPER FUNCTIONS ──────────────────────────────────────

export function getLocationBySlug(slug: string): Location | undefined {
  return locations.find((l) => l.slug === slug);
}

export function getLocationsByCity(city: string): Location[] {
  return locations.filter((l) => l.city === city);
}

export function getNearbyLocations(location: Location): Location[] {
  return location.nearbyLocationSlugs
    .map((slug) => getLocationBySlug(slug))
    .filter((l): l is Location => l !== undefined);
}

export function getRoomById(roomId: string): Room | undefined {
  for (const loc of locations) {
    const room = loc.rooms.find((r) => r.id === roomId);
    if (room) return room;
  }
  return undefined;
}

export function getLocationByRoomId(roomId: string): Location | undefined {
  return locations.find((loc) => loc.rooms.some((r) => r.id === roomId));
}

/**
 * Format a YYYY-MM-DD date string for move-in dropdown labels.
 * Returns "Today" for today, "Mon, Apr 20" for current year,
 * "Mon, Feb 15, 2027" for future years (to disambiguate).
 */
export function formatMoveInLabel(dateStr: string): string {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (dateStr === todayStr) return "Today";
  const d = new Date(dateStr + "T12:00:00");
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

// ─── Room name → DB category enum mapping ─────────────────

export const ROOM_NAME_TO_CATEGORY: Record<string, string> = {
  "Basic+": "BASIC_PLUS",
  "Mighty": "MIGHTY",
  "Premium": "PREMIUM",
  "Premium+": "PREMIUM_PLUS",
  "Premium Balcony": "PREMIUM_BALCONY",
  "Premium+ Balcony": "PREMIUM_PLUS_BALCONY",
  "Jumbo": "JUMBO",
  "Jumbo Balcony": "JUMBO_BALCONY",
  "Studio": "STUDIO",
  "Duplex": "DUPLEX",
};

// ─── FEATURES ──────────────────────────────────────────────

export const features: Feature[] = [
  {
    icon: "sofa",
    title: "Private Suite",
    desc: "Every member gets their own fully furnished private room with bedding.",
    image: loc("alster", "premium", "01-premium-al.webp"),
  },
  {
    icon: "users",
    title: "Common Spaces",
    desc: "Spacious shared areas with living rooms, workspaces & more.",
    image: loc("muehlenkamp", "community", "03-muehlenkamp.webp"),
  },
  {
    icon: "calendar",
    title: "Built-in Community",
    desc: "Our community manager organizes regular events and activities.",
    image: loc("st-pauli", "community", "001-community-sp.webp"),
  },
  {
    icon: "package",
    title: "Move-in Ready",
    desc: "Pots, pans, dishes, towels — everything is already there.",
    image: loc("eimsbuettel", "community", "004-community-ei.webp"),
  },
  {
    icon: "sparkles",
    title: "Weekly Cleaning",
    desc: "Professional weekly cleaning of all shared spaces & bathrooms.",
    image: loc("downtown", "community", "003-community-dt.webp"),
  },
  {
    icon: "wifi",
    title: "Included Internet",
    desc: "WiFi included at every location.",
    image: loc("berlin-mitte", "premium", "001-premium-fi.webp"),
  },
  {
    icon: "arrowLeftRight",
    title: "Transfers Possible",
    desc: "Move between locations with priority access for STACEY members.",
    image: loc("eppendorf", "community", "005-community-ew.webp"),
  },
  {
    icon: "washingMachine",
    title: "On-site Laundry",
    desc: "No trips to the laundromat — washing machines at every location.",
    image: loc("vallendar", "community", "010-community-va.webp"),
  },
  {
    icon: "wrench",
    title: "Repair Services",
    desc: "Our team takes care of all maintenance requests.",
    image: loc("muehlenkamp", "community", "08-muehlenkamp.webp"),
  },
];

// ─── FAQ ───────────────────────────────────────────────────

export type FAQItem = {
  question: string;
  answer: string;
};

export const faqItems: FAQItem[] = [
  {
    question: "What is coliving and who can apply?",
    answer:
      "Coliving is the new way of shared living, sitting at the intersection of shared apartments and studio apartments. Every member gets their own private suite plus access to generous common spaces. Our members are typically working professionals between the ages of 20 and 40.",
  },
  {
    question: "What about the community? Who are your members?",
    answer:
      "STACEY operates locations in Hamburg, Berlin and Vallendar, with over 300 members from all around the world. Most are young professionals, founders and students looking for more than just four walls.",
  },
  {
    question: "Are there member events?",
    answer:
      "Yes — we organize events for our members on a monthly basis. It might be the opening party of a new location, an in-house concert exclusively for our members, or a community dinner at your location's common space.",
  },
  {
    question: "What services are included?",
    answer:
      "Almost everything you need for daily life — furniture and bedding, weekly cleaning of common areas, heating, electricity, water, WiFi, smart-locks, repair and maintenance, plus access to our community events. One bill covers the rental essentials. The few things members handle themselves are laundry (via our on-site WeWash service), the German broadcasting fee (GEZ / Rundfunkbeitrag, required by law for all residents in Germany) and personal expenses such as groceries or toiletries.",
  },
  {
    question: "How can I apply?",
    answer:
      "The entire process runs online. Pick your location, move-in date and preferred suite on our website, enter your details, sign the lease digitally (eIDAS-compliant via Yousign) and pay the €195 booking fee by credit card or SEPA. Once the deposit is paid within 24 hours, your move-in is confirmed. No paperwork, no waiting on us.",
  },
  {
    question: "How does the pricing work?",
    answer:
      "Prices vary according to the duration of your stay and the suite you choose. On top of your rent we ask for a reimbursable security deposit, which is returned after check-out if there are no damages.",
  },
  {
    question: "Can I register my residency at STACEY?",
    answer:
      "Yes, at our long-stay locations. We provide the \"Wohnungsgeberbestätigung\" (landlord confirmation) before your move-in so you can register your address with the authorities.",
  },
  {
    question: "What's included in my membership?",
    answer:
      "A fully-furnished room, access to common spaces, smart-locks, WiFi, all utilities, weekly cleaning and monthly member events — no extras to worry about.",
  },
  {
    question: "How does check-in and check-out work?",
    answer:
      "Please inform your Community Manager in advance of your check-in and check-out. Any damages discovered at move-out will be deducted from the security deposit.",
  },
  {
    question: "Who is the Community Manager?",
    answer:
      "Every location has its own Community Manager who maintains the spaces and is your point of contact for all issues — from broken appliances to lost keys to questions about the neighborhood.",
  },
  {
    question: "Is there a minimum or maximum rental period?",
    answer:
      "Long-stay requires a minimum of 3 months with no maximum. Short-stay is flexible and can be booked up to a maximum of 6 months.",
  },
  {
    question: "Can I switch between different locations?",
    answer:
      "Yes, as long as there's availability at the other location. Existing members get priority when transferring between STACEY locations — whether from Hamburg to Berlin or just across town.",
  },
  {
    question: "Can I change the furniture in my room?",
    answer:
      "Yes, as long as you don't damage walls or ceilings and everything is returned to its original condition when you move out.",
  },
  {
    question: "How do I terminate my lease?",
    answer:
      "Long-stay contracts require 3 months' notice. Short-stay end-dates are fixed and agreed during the booking process.",
  },
  {
    question: "Can I invite a friend to stay with me?",
    answer:
      "Yes — but keep your cohabitants in mind. For overnight guests, please coordinate with your Community Manager to make sure everyone in the apartment is comfortable.",
  },
  {
    question: "What if something goes wrong during my stay?",
    answer:
      "Please contact your Community Manager. They're your first point of contact for anything from maintenance to conflicts with roommates — we'll sort it out together.",
  },
  {
    question: "Can we rent a suite as a couple?",
    answer:
      "Yes — couples are welcome in our Jumbo, Jumbo Balcony, Studio and select Premium+ Balcony suites, which are designed with enough space for two.",
  },
  {
    question: "Are pets allowed?",
    answer:
      "Unfortunately not — out of consideration for our community, we cannot accept pets at any STACEY location.",
  },
  {
    question: "Do you offer private parking?",
    answer:
      "We don't have private parking at any of our houses. All our locations are well-connected by public transport, so a car is rarely needed.",
  },
  {
    question: "Is there a curfew?",
    answer:
      "STACEY does not impose any curfew — but we do expect our members to respect the neighborhood and their fellow residents, especially at night.",
  },
];
