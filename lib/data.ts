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

export type Location = {
  slug: string;
  city: "hamburg" | "berlin" | "vallendar";
  name: string;
  address: string;
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
    stayType: "LONG",
    priceFrom: 795,
    tagline: "Hamburg's #1 coliving address right by the Alster",
    description:
      "Since 2019, STACEY has been welcoming tenants from all over the world to Hamburg's #1 coliving address — right next to the beautiful Alster. Our oldest and largest location offers private suites from 8 m² to 25 m² in shared apartments with 1 to 3 other STACEY members.",
    neighborhoodDescription:
      "Imagine having a wide range of restaurants, cafés and speakeasies right on your doorstep! Our coliving is tucked away on a quiet street between the well-known Mühlenkamp and the green heart of Hamburg — the Alster.",
    communitySpaceDescription:
      "A former electrician's office converted into over 150 m² of community space. Lounge with dining table and Netflix TV. Two fully equipped kitchens. Coworking area and WeWash laundry service.",
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
    stayType: "LONG",
    priceFrom: 895,
    tagline: "Living in the heart of Hamburg's most popular residential area",
    description:
      "Our Eppendorf location sits in the heart of one of Hamburg's most beloved residential neighborhoods. Surrounded by charming boutiques, cozy cafés and beautiful period buildings, this location offers the perfect coliving experience.",
    neighborhoodDescription:
      "Eppendorf is known for its elegant period architecture, tree-lined streets and a vibrant café culture. The Eppendorfer Baum boulevard has everything you need for daily life.",
    communitySpaceDescription:
      "Cozy community area with lounge, kitchen and workspaces for productive days.",
    neighborhood: "Eppendorf",
    roomiesPerApartment: "1 - 3",
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
    stayType: "SHORT",
    priceFrom: 45,
    // Mighty=995, Premium=1095, PremiumBalcony=1145, Premium+=1195, Jumbo=1395
    tagline: "Right in the heart of Hamburg's city center",
    description:
      "Our Downtown location puts you right in the middle of the action — just steps from the Speicherstadt, City Hall and the city's best restaurants. Perfect for shorter stays.",
    neighborhoodDescription:
      "Hamburg's old town blends historic architecture with modern city life. The Speicherstadt and HafenCity are within walking distance.",
    communitySpaceDescription:
      "Modern community area with lounge and kitchen in the heart of the city.",
    neighborhood: "Altstadt",
    roomiesPerApartment: "2 - 3",
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
    stayType: "SHORT",
    priceFrom: 48,
    tagline: "Right on the Outer Alster — the most beautiful view in the city",
    description:
      "Wake up to views of the Alster! Our location in St. Georg sits right on the Outer Alster and offers short stays in one of Hamburg's most beautiful corners.",
    neighborhoodDescription:
      "St. Georg is Hamburg's most diverse neighborhood — colorful, lively and right next to the main train station. The Outer Alster is just a stone's throw away.",
    communitySpaceDescription:
      "Bright community room with Alster views, kitchen and lounge area.",
    neighborhood: "St. Georg",
    roomiesPerApartment: "2 - 3",
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
    stayType: "LONG",
    priceFrom: 895,
    tagline: "Live in the vibrant heart of St. Pauli",
    description:
      "St. Pauli is Hamburg's liveliest neighborhood — and our location is right in the thick of it. Here you'll meet creatives, night owls and a community that sticks together.",
    neighborhoodDescription:
      "St. Pauli stands for diversity, culture and nightlife. From the Schanzenviertel to the Reeperbahn — there's always something going on.",
    communitySpaceDescription:
      "Spacious community area with lounge, kitchen and rooftop terrace.",
    neighborhood: "St. Pauli",
    roomiesPerApartment: "2 - 4",
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
    stayType: "LONG",
    priceFrom: 795,
    tagline: "Coliving in Hamburg's trendiest neighborhood",
    description:
      "Eimsbüttel is Hamburg's trend district — and we're right in the middle of it. Nestled between Schanze and Eppendorf, this location offers the best of both worlds.",
    neighborhoodDescription:
      "Eimsbüttel charms with its mix of period building character, independent shops and a lively food scene. Eimsbütteler Park is just around the corner.",
    communitySpaceDescription:
      "Modern community area with open kitchen, lounge and workspace.",
    neighborhood: "Eimsbüttel",
    roomiesPerApartment: "1 - 3",
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
    stayType: "LONG",
    priceFrom: 795,
    tagline: "Coliving in the center of Germany's capital",
    description:
      "Berlin Mitte — the heart of the capital. Our location on Fischerinsel offers coliving with views of the Spree, surrounded by museums, galleries and Europe's best nightlife.",
    neighborhoodDescription:
      "Berlin Mitte is the city's cultural center. Museum Island, Alexanderplatz and countless galleries are all within walking distance.",
    communitySpaceDescription:
      "Spacious community area with Spree views, kitchen, lounge and coworking desks.",
    neighborhood: "Mitte",
    roomiesPerApartment: "2 - 3",
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
    address: "Löhrstraße 54, 56179 Vallendar",
    stayType: "LONG",
    priceFrom: 595,
    tagline: "The perfect home for WHU students and professionals",
    description:
      "Our Vallendar location is the ideal home for WHU students and young professionals. Right near campus, we offer furnished suites with a built-in community.",
    neighborhoodDescription:
      "Vallendar is a charming small town on the Rhine, known for WHU — Otto Beisheim School of Management. Koblenz is just a few minutes away.",
    communitySpaceDescription:
      "Community area with study lounge, kitchen and garden — perfect for studying and unwinding.",
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
    desc: "High-speed internet included at every location.",
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
    question: "What is the minimum stay?",
    answer:
      "At our LONG-stay locations, the minimum stay is 3 months. At SHORT-stay locations there's no minimum — you can book from a single night up to a maximum of 180 nights.",
  },
  {
    question: "What's included in the rent?",
    answer:
      "Everything! Your rent covers the furnished room, all utilities (electricity, water, heating), high-speed internet, weekly cleaning of shared spaces, access to community spaces and events. All you need is your suitcase.",
  },
  {
    question: "Can I switch rooms?",
    answer:
      "Yes! As a STACEY member you get priority when transferring between our locations. Whether you want to move from Hamburg to Berlin or simply switch rooms at the same location — we make it happen.",
  },
  {
    question: "How does cancellation work?",
    answer:
      "At LONG-stay locations, there's a one-month notice period to the end of the month after the minimum contract term. For SHORT-stay bookings, the cancellation terms agreed at the time of booking apply.",
  },
  {
    question: "Can I move in with my partner?",
    answer:
      "Couples are very welcome in our Jumbo suites and select Premium+ suites. These rooms are specifically designed for two people and offer enough space for comfortable shared living.",
  },
  {
    question: "Is there a community team?",
    answer:
      "Yes! Every location has its own community manager who organizes regular events, helps with questions and makes sure you settle in quickly. There's also a Slack channel for all members.",
  },
  {
    question: "How do I apply?",
    answer:
      "It's simple: choose your preferred location and suite on our website, fill out the application form and our team will get back to you within 48 hours. The entire process is digital and hassle-free.",
  },
  {
    question: "What does all-inclusive mean?",
    answer:
      "All-inclusive means one price, no hidden costs. Your monthly rent includes furniture, bedding, internet, electricity, water, heating, weekly cleaning, access to community spaces and events. You pay one amount — done.",
  },
];
