// Static responder directory for Nueva Vizcaya
// Phone numbers marked * are unverified — confirm with each LGU before the meeting.
// Coordinates are approximate town-center (poblacion) positions.
const RESPONDERS = [

  // ═══════════════════════════════════════════════════════════════════════
  //  BAYOMBONG — Provincial Capital
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "PDRRMO Nueva Vizcaya",
    type: "mdrrmo",
    municipality: "Bayombong",
    lat: 16.4820, lng: 121.1490,
    phone: "09178500670",
    address: "Provincial Capitol Compound, Bayombong",
    email: "pdrrmo.nv@gmail.com"
  },
  {
    name: "MDRRMO Bayombong",
    type: "mdrrmo",
    municipality: "Bayombong",
    lat: 16.4835, lng: 121.1505,
    phone: "(078) 321-2080",
    address: "Municipal Hall, Bayombong, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Nueva Vizcaya Provincial Hospital",
    type: "hospital",
    municipality: "Bayombong",
    lat: 16.4852, lng: 121.1510,
    phone: "(078) 321-2040",
    address: "Bayombong, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Region II Trauma and Medical Center (R2TMC)",
    type: "hospital",
    municipality: "Bayombong",
    lat: 16.4870, lng: 121.1525,
    phone: "(078) 392-1058",
    address: "AH26, Barangay Magsaysay, Bayombong, Nueva Vizcaya",
    email: "r2tmc@doh.gov.ph"
  },
  {
    name: "PNP Nueva Vizcaya Provincial Police Command",
    type: "police",
    municipality: "Bayombong",
    lat: 16.4838, lng: 121.1500,
    phone: "(078) 321-2110",
    address: "Camp Adduru, Bayombong, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Bayombong Municipal Station",
    type: "police",
    municipality: "Bayombong",
    lat: 16.4830, lng: 121.1492,
    phone: "(078) 321-2115",
    address: "Bayombong, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Nueva Vizcaya Provincial Office",
    type: "fire",
    municipality: "Bayombong",
    lat: 16.4828, lng: 121.1478,
    phone: "(078) 321-2323",
    address: "Bayombong, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Bayombong Fire Station",
    type: "fire",
    municipality: "Bayombong",
    lat: 16.4824, lng: 121.1472,
    phone: "(078) 321-2324",
    address: "Bayombong, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Bayombong Municipal Health Office / RHU",
    type: "health",
    municipality: "Bayombong",
    lat: 16.4845, lng: 121.1495,
    phone: "(078) 321-2050",
    address: "Municipal Hall Compound, Bayombong, Nueva Vizcaya",
    email: ""
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  BAMBANG
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MDRRMO Bambang",
    type: "mdrrmo",
    municipality: "Bambang",
    lat: 16.3852, lng: 121.1058,
    phone: "09065630944",
    address: "Municipal Hall Compound, Bambang, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Bambang Municipal Station",
    type: "police",
    municipality: "Bambang",
    lat: 16.3844, lng: 121.1068,
    phone: "09175444946",
    address: "Bambang, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Bambang Fire Station",
    type: "fire",
    municipality: "Bambang",
    lat: 16.3835, lng: 121.1075,
    phone: "(078) 321-3022", // *unverified
    address: "Bambang, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Bambang Community Hospital",
    type: "hospital",
    municipality: "Bambang",
    lat: 16.3868, lng: 121.1042,
    phone: "(078) 321-3040", // *unverified
    address: "Bambang, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Bambang Rural Health Unit",
    type: "health",
    municipality: "Bambang",
    lat: 16.3860, lng: 121.1048,
    phone: "(078) 321-3010", // *unverified
    address: "Bambang, Nueva Vizcaya",
    email: ""
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  SOLANO
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MDRRMO Solano",
    type: "mdrrmo",
    municipality: "Solano",
    lat: 16.5209, lng: 121.1806,
    phone: "09274008033",
    address: "Municipal Hall, Solano, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Solano Municipal Station",
    type: "police",
    municipality: "Solano",
    lat: 16.5215, lng: 121.1812,
    phone: "09360620305",
    address: "Solano, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Solano Fire Station",
    type: "fire",
    municipality: "Solano",
    lat: 16.5220, lng: 121.1820,
    phone: "(078) 326-5050", // *unverified
    address: "Solano, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Solano District Hospital",
    type: "hospital",
    municipality: "Solano",
    lat: 16.5200, lng: 121.1798,
    phone: "(078) 326-5021", // *unverified
    address: "Solano, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Solano Rural Health Unit",
    type: "health",
    municipality: "Solano",
    lat: 16.5205, lng: 121.1802,
    phone: "(078) 326-5030", // *unverified
    address: "Municipal Hall Compound, Solano, Nueva Vizcaya",
    email: ""
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  BAGABAG
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MDRRMO Bagabag",
    type: "mdrrmo",
    municipality: "Bagabag",
    lat: 16.6040, lng: 121.2500,
    phone: "(078) 321-4010", // *unverified
    address: "Municipal Hall, Bagabag, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Bagabag Municipal Station",
    type: "police",
    municipality: "Bagabag",
    lat: 16.6045, lng: 121.2508,
    phone: "(078) 321-4020", // *unverified
    address: "Bagabag, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Bagabag Fire Station",
    type: "fire",
    municipality: "Bagabag",
    lat: 16.6050, lng: 121.2515,
    phone: "(078) 321-4030", // *unverified
    address: "Bagabag, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Bagabag Community Hospital",
    type: "hospital",
    municipality: "Bagabag",
    lat: 16.6035, lng: 121.2490,
    phone: "(078) 321-4040", // *unverified
    address: "Bagabag, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Bagabag Rural Health Unit",
    type: "health",
    municipality: "Bagabag",
    lat: 16.6038, lng: 121.2495,
    phone: "(078) 321-4050", // *unverified
    address: "Bagabag, Nueva Vizcaya",
    email: ""
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  VILLAVERDE
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MDRRMO Villaverde",
    type: "mdrrmo",
    municipality: "Villaverde",
    lat: 16.5919, lng: 121.1842,
    phone: "(078) 322-1010", // *unverified
    address: "Municipal Hall, Villaverde, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Villaverde Municipal Station",
    type: "police",
    municipality: "Villaverde",
    lat: 16.5925, lng: 121.1850,
    phone: "(078) 322-1020", // *unverified
    address: "Villaverde, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Villaverde Fire Station",
    type: "fire",
    municipality: "Villaverde",
    lat: 16.5930, lng: 121.1858,
    phone: "(078) 322-1030", // *unverified
    address: "Villaverde, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Villaverde Rural Health Unit",
    type: "health",
    municipality: "Villaverde",
    lat: 16.5912, lng: 121.1835,
    phone: "(078) 322-1040", // *unverified
    address: "Villaverde, Nueva Vizcaya",
    email: ""
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  DIADI
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MDRRMO Diadi",
    type: "mdrrmo",
    municipality: "Diadi",
    lat: 16.6698, lng: 121.3697,
    phone: "(078) 321-1110", // *unverified
    address: "Municipal Hall, Diadi, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Diadi Municipal Station",
    type: "police",
    municipality: "Diadi",
    lat: 16.6705, lng: 121.3705,
    phone: "(078) 321-1120", // *unverified
    address: "Diadi, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Diadi Fire Station",
    type: "fire",
    municipality: "Diadi",
    lat: 16.6710, lng: 121.3712,
    phone: "(078) 321-1130", // *unverified
    address: "Diadi, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Diadi Rural Health Unit",
    type: "health",
    municipality: "Diadi",
    lat: 16.6692, lng: 121.3688,
    phone: "(078) 321-1140", // *unverified
    address: "Diadi, Nueva Vizcaya",
    email: ""
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  QUEZON
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MDRRMO Quezon",
    type: "mdrrmo",
    municipality: "Quezon",
    lat: 16.4719, lng: 121.3142,
    phone: "(078) 321-2210", // *unverified
    address: "Municipal Hall, Quezon, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Quezon Municipal Station",
    type: "police",
    municipality: "Quezon",
    lat: 16.4725, lng: 121.3150,
    phone: "(078) 321-2220", // *unverified
    address: "Quezon, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Quezon Fire Station",
    type: "fire",
    municipality: "Quezon",
    lat: 16.4730, lng: 121.3158,
    phone: "(078) 321-2230", // *unverified
    address: "Quezon, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Quezon Rural Health Unit",
    type: "health",
    municipality: "Quezon",
    lat: 16.4712, lng: 121.3135,
    phone: "(078) 321-2240", // *unverified
    address: "Quezon, Nueva Vizcaya",
    email: ""
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  AMBAGUIO
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MDRRMO Ambaguio",
    type: "mdrrmo",
    municipality: "Ambaguio",
    lat: 16.5186, lng: 121.0378,
    phone: "(078) 322-2010", // *unverified
    address: "Municipal Hall, Ambaguio, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Ambaguio Municipal Station",
    type: "police",
    municipality: "Ambaguio",
    lat: 16.5192, lng: 121.0385,
    phone: "(078) 322-2020", // *unverified
    address: "Ambaguio, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Ambaguio Fire Station",
    type: "fire",
    municipality: "Ambaguio",
    lat: 16.5198, lng: 121.0392,
    phone: "(078) 322-2030", // *unverified
    address: "Ambaguio, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Ambaguio Rural Health Unit",
    type: "health",
    municipality: "Ambaguio",
    lat: 16.5180, lng: 121.0370,
    phone: "(078) 322-2040", // *unverified
    address: "Ambaguio, Nueva Vizcaya",
    email: ""
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  ARITAO
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MDRRMO Aritao",
    type: "mdrrmo",
    municipality: "Aritao",
    lat: 16.2995, lng: 121.0351,
    phone: "(078) 321-5010", // *unverified
    address: "Municipal Hall, Aritao, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Aritao Municipal Station",
    type: "police",
    municipality: "Aritao",
    lat: 16.3002, lng: 121.0360,
    phone: "(078) 321-5020", // *unverified
    address: "Aritao, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Aritao Fire Station",
    type: "fire",
    municipality: "Aritao",
    lat: 16.3008, lng: 121.0368,
    phone: "(078) 321-5030", // *unverified
    address: "Aritao, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Aritao Community Hospital",
    type: "hospital",
    municipality: "Aritao",
    lat: 16.2988, lng: 121.0342,
    phone: "(078) 321-5040", // *unverified
    address: "Aritao, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Aritao Rural Health Unit",
    type: "health",
    municipality: "Aritao",
    lat: 16.2982, lng: 121.0335,
    phone: "(078) 321-5050", // *unverified
    address: "Aritao, Nueva Vizcaya",
    email: ""
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  DUPAX DEL NORTE
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MDRRMO Dupax del Norte",
    type: "mdrrmo",
    municipality: "Dupax del Norte",
    lat: 16.2950, lng: 121.0950,
    phone: "(078) 321-6010", // *unverified
    address: "Municipal Hall, Dupax del Norte, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Dupax del Norte Municipal Station",
    type: "police",
    municipality: "Dupax del Norte",
    lat: 16.2958, lng: 121.0960,
    phone: "(078) 321-6020", // *unverified
    address: "Dupax del Norte, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Dupax del Norte Fire Station",
    type: "fire",
    municipality: "Dupax del Norte",
    lat: 16.2965, lng: 121.0970,
    phone: "(078) 321-6030", // *unverified
    address: "Dupax del Norte, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Dupax del Norte Rural Health Unit",
    type: "health",
    municipality: "Dupax del Norte",
    lat: 16.2942, lng: 121.0940,
    phone: "(078) 321-6040", // *unverified
    address: "Dupax del Norte, Nueva Vizcaya",
    email: ""
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  DUPAX DEL SUR
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MDRRMO Dupax del Sur",
    type: "mdrrmo",
    municipality: "Dupax del Sur",
    lat: 16.1432, lng: 121.1397,
    phone: "(078) 321-7010", // *unverified
    address: "Municipal Hall, Dupax del Sur, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Dupax del Sur Municipal Station",
    type: "police",
    municipality: "Dupax del Sur",
    lat: 16.1440, lng: 121.1405,
    phone: "(078) 321-7020", // *unverified
    address: "Dupax del Sur, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Dupax del Sur Fire Station",
    type: "fire",
    municipality: "Dupax del Sur",
    lat: 16.1448, lng: 121.1413,
    phone: "(078) 321-7030", // *unverified
    address: "Dupax del Sur, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Dupax del Sur Rural Health Unit",
    type: "health",
    municipality: "Dupax del Sur",
    lat: 16.1424, lng: 121.1388,
    phone: "(078) 321-7040", // *unverified
    address: "Dupax del Sur, Nueva Vizcaya",
    email: ""
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  KASIBU
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MDRRMO Kasibu",
    type: "mdrrmo",
    municipality: "Kasibu",
    lat: 16.3150, lng: 121.2892,
    phone: "(078) 321-9010", // *unverified
    address: "Municipal Hall, Kasibu, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Kasibu Municipal Station",
    type: "police",
    municipality: "Kasibu",
    lat: 16.3158, lng: 121.2900,
    phone: "(078) 321-9020", // *unverified
    address: "Kasibu, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Kasibu Fire Station",
    type: "fire",
    municipality: "Kasibu",
    lat: 16.3165, lng: 121.2908,
    phone: "(078) 321-9030", // *unverified
    address: "Kasibu, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Kasibu Rural Health Unit",
    type: "health",
    municipality: "Kasibu",
    lat: 16.3142, lng: 121.2882,
    phone: "(078) 321-9040", // *unverified
    address: "Kasibu, Nueva Vizcaya",
    email: ""
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  KAYAPA
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MDRRMO Kayapa",
    type: "mdrrmo",
    municipality: "Kayapa",
    lat: 16.3536, lng: 120.9169,
    phone: "(078) 321-3210", // *unverified
    address: "Municipal Hall, Kayapa, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Kayapa Municipal Station",
    type: "police",
    municipality: "Kayapa",
    lat: 16.3543, lng: 120.9178,
    phone: "(078) 321-3220", // *unverified
    address: "Kayapa, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Kayapa Fire Station",
    type: "fire",
    municipality: "Kayapa",
    lat: 16.3550, lng: 120.9186,
    phone: "(078) 321-3230", // *unverified
    address: "Kayapa, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Kayapa Rural Health Unit",
    type: "health",
    municipality: "Kayapa",
    lat: 16.3528, lng: 120.9160,
    phone: "(078) 321-3240", // *unverified
    address: "Kayapa, Nueva Vizcaya",
    email: ""
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  SANTA FE
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MDRRMO Santa Fe",
    type: "mdrrmo",
    municipality: "Santa Fe",
    lat: 16.1627, lng: 120.9333,
    phone: "(078) 321-8010", // *unverified
    address: "Municipal Hall, Santa Fe, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Santa Fe Municipal Station",
    type: "police",
    municipality: "Santa Fe",
    lat: 16.1635, lng: 120.9342,
    phone: "(078) 321-8020", // *unverified
    address: "Santa Fe, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Santa Fe Fire Station",
    type: "fire",
    municipality: "Santa Fe",
    lat: 16.1642, lng: 120.9350,
    phone: "(078) 321-8030", // *unverified
    address: "Santa Fe, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Santa Fe Rural Health Unit",
    type: "health",
    municipality: "Santa Fe",
    lat: 16.1619, lng: 120.9325,
    phone: "(078) 321-8040", // *unverified
    address: "Santa Fe, Nueva Vizcaya",
    email: ""
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  ALFONSO CASTAÑEDA
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MDRRMO Alfonso Castañeda",
    type: "mdrrmo",
    municipality: "Alfonso Castañeda",
    lat: 15.9628, lng: 121.2200,
    phone: "(078) 321-0110", // *unverified
    address: "Municipal Hall, Alfonso Castañeda, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Alfonso Castañeda Municipal Station",
    type: "police",
    municipality: "Alfonso Castañeda",
    lat: 15.9635, lng: 121.2208,
    phone: "(078) 321-0120", // *unverified
    address: "Alfonso Castañeda, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Alfonso Castañeda Fire Station",
    type: "fire",
    municipality: "Alfonso Castañeda",
    lat: 15.9642, lng: 121.2215,
    phone: "(078) 321-0130", // *unverified
    address: "Alfonso Castañeda, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Alfonso Castañeda Rural Health Unit",
    type: "health",
    municipality: "Alfonso Castañeda",
    lat: 15.9620, lng: 121.2192,
    phone: "(078) 321-0140", // *unverified
    address: "Alfonso Castañeda, Nueva Vizcaya",
    email: ""
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  DPWH (Provincial)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "DPWH Nueva Vizcaya 1st DEO",
    type: "dpwh",
    municipality: "Bayombong",
    lat: 16.4828, lng: 121.1508,
    phone: "(078) 321-2060", // *unverified
    address: "Bayombong, Nueva Vizcaya",
    email: ""
  },
  {
    name: "DPWH Nueva Vizcaya 2nd DEO",
    type: "dpwh",
    municipality: "Solano",
    lat: 16.5198, lng: 121.1795,
    phone: "(078) 326-5040", // *unverified
    address: "Solano, Nueva Vizcaya",
    email: ""
  }
];

const RESPONDER_ICONS = {
  mdrrmo:  { color: "#E65100", label: "MDRRMO",      emoji: "🚨" },
  police:  { color: "#1565C0", label: "Police",       emoji: "👮" },
  fire:    { color: "#B71C1C", label: "Fire (BFP)",   emoji: "🚒" },
  hospital:{ color: "#2E7D32", label: "Hospital",     emoji: "🏥" },
  health:  { color: "#00838F", label: "Health (RHU)", emoji: "⚕️"  },
  dpwh:    { color: "#1A237E", label: "DPWH",         emoji: "🏗️" },
};
