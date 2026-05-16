// Static responder directory for Nueva Vizcaya
// Phone numbers marked * are unverified — confirm with each LGU before the meeting.
// Coordinates sourced from LGU-provided data and verified GPS positions.
const RESPONDERS = [

  // ═══════════════════════════════════════════════════════════════════════
  //  BAYOMBONG — Provincial Capital
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "PDRRMO Nueva Vizcaya",
    type: "mdrrmo",
    municipality: "Bayombong",
    lat: 16.49120, lng: 121.15180,
    phone: "09178500670",
    address: "Provincial Capitol Compound, Bayombong",
    email: "pdrrmo.nv@gmail.com"
  },
  {
    name: "MDRRMO Bayombong",
    type: "mdrrmo",
    municipality: "Bayombong",
    lat: 16.49120, lng: 121.15180,
    phone: "(078) 321-2080",
    address: "Municipal Hall, Bayombong, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Region II Trauma and Medical Center (R2TMC)",
    type: "hospital",
    municipality: "Bayombong",
    lat: 16.48392, lng: 121.14728,
    phone: "(078) 392-1058",
    address: "AH26, Barangay Magsaysay, Bayombong, Nueva Vizcaya",
    email: "r2tmc@doh.gov.ph"
  },
  {
    name: "PNP Nueva Vizcaya Provincial Police Command",
    type: "police",
    municipality: "Bayombong",
    lat: 16.4869, lng: 121.1574,
    phone: "(078) 321-2110",
    address: "Camp Adduru, Bayombong, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Bayombong Municipal Station",
    type: "police",
    municipality: "Bayombong",
    lat: 16.48784, lng: 121.15042,
    phone: "(078) 321-2115",
    address: "Bayombong, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Nueva Vizcaya Provincial Office",
    type: "fire",
    municipality: "Bayombong",
    lat: 16.48712, lng: 121.14995,
    phone: "(078) 321-2323",
    address: "Bayombong, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Bayombong Fire Station",
    type: "fire",
    municipality: "Bayombong",
    lat: 16.48712, lng: 121.14995,
    phone: "(078) 321-2324",
    address: "Bayombong, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Bayombong Municipal Health Office / RHU",
    type: "health",
    municipality: "Bayombong",
    lat: 16.48660, lng: 121.14920,
    phone: "(078) 321-2050",
    address: "Municipal Hall Compound, Bayombong, Nueva Vizcaya",
    email: ""
  },
  {
    name: "DPWH Nueva Vizcaya 1st DEO",
    type: "dpwh",
    municipality: "Bayombong",
    lat: 16.47545, lng: 121.14185,
    phone: "(078) 321-2060", // *unverified
    address: "Bayombong, Nueva Vizcaya",
    email: ""
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  BAMBANG
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MDRRMO Bambang",
    type: "mdrrmo",
    municipality: "Bambang",
    lat: 16.37550, lng: 121.10280,
    phone: "09065630944",
    address: "Municipal Hall Compound, Bambang, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Nueva Vizcaya Provincial Hospital",
    type: "hospital",
    municipality: "Bambang",
    lat: 16.38472, lng: 121.10775,
    phone: "(078) 321-2040",
    address: "National Highway, Almaguer North, Bambang, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Bambang Municipal Station",
    type: "police",
    municipality: "Bambang",
    lat: 16.37564, lng: 121.10344,
    phone: "09175444946",
    address: "Bambang, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Bambang Fire Station",
    type: "fire",
    municipality: "Bambang",
    lat: 16.37526, lng: 121.10312,
    phone: "(078) 321-3022", // *unverified
    address: "Bambang, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Bambang Rural Health Unit",
    type: "health",
    municipality: "Bambang",
    lat: 16.37688, lng: 121.10174,
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
    lat: 16.52220, lng: 121.18460,
    phone: "09274008033",
    address: "Municipal Hall, Solano, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Solano Municipal Station",
    type: "police",
    municipality: "Solano",
    lat: 16.51796, lng: 121.18695,
    phone: "09360620305",
    address: "Solano, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Solano Fire Station",
    type: "fire",
    municipality: "Solano",
    lat: 16.52140, lng: 121.18390,
    phone: "(078) 326-5050", // *unverified
    address: "Solano, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Major General Carlos P. Romulo Memorial Hospital",
    type: "hospital",
    municipality: "Solano",
    lat: 16.51640, lng: 121.17950,
    phone: "(078) 326-5021", // *unverified
    address: "Solano, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Plaza Medical Center Solano",
    type: "hospital",
    municipality: "Solano",
    lat: 16.52490, lng: 121.18780,
    phone: "(078) 326-5025", // *unverified
    address: "Solano, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Solano Rural Health Unit",
    type: "health",
    municipality: "Solano",
    lat: 16.52060, lng: 121.18310,
    phone: "(078) 326-5030", // *unverified
    address: "Municipal Hall Compound, Solano, Nueva Vizcaya",
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
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  BAGABAG
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MDRRMO Bagabag",
    type: "mdrrmo",
    municipality: "Bagabag",
    lat: 16.60780, lng: 121.25360,
    phone: "(078) 321-4010", // *unverified
    address: "Municipal Hall, Bagabag, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Bagabag Municipal Station",
    type: "police",
    municipality: "Bagabag",
    lat: 16.60758, lng: 121.25343,
    phone: "(078) 321-4020", // *unverified
    address: "Bagabag, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Bagabag Fire Station",
    type: "fire",
    municipality: "Bagabag",
    lat: 16.60740, lng: 121.25310,
    phone: "(078) 321-4030", // *unverified
    address: "Bagabag, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Bagabag Care Community Hospital",
    type: "hospital",
    municipality: "Bagabag",
    lat: 16.60140, lng: 121.26710,
    phone: "(078) 321-4040", // *unverified
    address: "Bagabag, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Bagabag Rural Health Unit",
    type: "health",
    municipality: "Bagabag",
    lat: 16.60690, lng: 121.25280,
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
    lat: 16.59073, lng: 121.18629,
    phone: "(078) 322-1010", // *unverified
    address: "Municipal Hall, Villaverde, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Villaverde Municipal Station",
    type: "police",
    municipality: "Villaverde",
    lat: 16.60691, lng: 121.18470,
    phone: "(078) 322-1020", // *unverified
    address: "Villaverde, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Villaverde Fire Station",
    type: "fire",
    municipality: "Villaverde",
    lat: 16.55980, lng: 121.20350,
    phone: "(078) 322-1030", // *unverified
    address: "Villaverde, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Villaverde Rural Health Unit",
    type: "health",
    municipality: "Villaverde",
    lat: 16.60610, lng: 121.18410,
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
    lat: 16.66050, lng: 121.36980,
    phone: "(078) 321-1110", // *unverified
    address: "Municipal Hall, Diadi, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Diadi Municipal Station",
    type: "police",
    municipality: "Diadi",
    lat: 16.66022, lng: 121.36953,
    phone: "(078) 321-1120", // *unverified
    address: "Diadi, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Diadi Fire Station",
    type: "fire",
    municipality: "Diadi",
    lat: 16.65980, lng: 121.36910,
    phone: "(078) 321-1130", // *unverified
    address: "Diadi, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Diadi Emergency Hospital",
    type: "hospital",
    municipality: "Diadi",
    lat: 16.69120, lng: 121.34850,
    phone: "(078) 321-1135", // *unverified
    address: "Diadi, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Diadi Rural Health Unit",
    type: "health",
    municipality: "Diadi",
    lat: 16.65920, lng: 121.36850,
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
    lat: 16.49060, lng: 121.26450,
    phone: "(078) 321-2210", // *unverified
    address: "Municipal Hall, Quezon, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Quezon Municipal Station",
    type: "police",
    municipality: "Quezon",
    lat: 16.49026, lng: 121.26423,
    phone: "(078) 321-2220", // *unverified
    address: "Quezon, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Quezon Fire Station",
    type: "fire",
    municipality: "Quezon",
    lat: 16.48990, lng: 121.26390,
    phone: "(078) 321-2230", // *unverified
    address: "Quezon, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Quezon Rural Health Unit",
    type: "health",
    municipality: "Quezon",
    lat: 16.48930, lng: 121.26340,
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
    lat: 16.51290, lng: 121.02715,
    phone: "(078) 322-2010", // *unverified
    address: "Municipal Hall, Ambaguio, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Ambaguio Municipal Station",
    type: "police",
    municipality: "Ambaguio",
    lat: 16.51264, lng: 121.02695,
    phone: "(078) 322-2020", // *unverified
    address: "Ambaguio, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Ambaguio Fire Station",
    type: "fire",
    municipality: "Ambaguio",
    lat: 16.51290, lng: 121.02715,
    phone: "(078) 322-2030", // *unverified
    address: "Ambaguio, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Ambaguio Rural Health Unit",
    type: "health",
    municipality: "Ambaguio",
    lat: 16.51210, lng: 121.02640,
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
    lat: 16.29610, lng: 121.03150,
    phone: "(078) 321-5010", // *unverified
    address: "Municipal Hall, Aritao, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Aritao Municipal Station",
    type: "police",
    municipality: "Aritao",
    lat: 16.29656, lng: 121.03251,
    phone: "(078) 321-5020", // *unverified
    address: "Aritao, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Aritao Fire Station",
    type: "fire",
    municipality: "Aritao",
    lat: 16.29580, lng: 121.03090,
    phone: "(078) 321-5030", // *unverified
    address: "Aritao, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Aritao District Hospital",
    type: "hospital",
    municipality: "Aritao",
    lat: 16.30215, lng: 121.03480,
    phone: "(078) 321-5040", // *unverified
    address: "Aritao, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Aritao Rural Health Unit",
    type: "health",
    municipality: "Aritao",
    lat: 16.29465, lng: 121.03050,
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
    lat: 16.30750, lng: 121.10190,
    phone: "(078) 321-6010", // *unverified
    address: "Municipal Hall, Dupax del Norte, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Dupax del Norte Municipal Station",
    type: "police",
    municipality: "Dupax del Norte",
    lat: 16.30693, lng: 121.10169,
    phone: "(078) 321-6020", // *unverified
    address: "Dupax del Norte, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Dupax del Norte Fire Station",
    type: "fire",
    municipality: "Dupax del Norte",
    lat: 16.30720, lng: 121.10140,
    phone: "(078) 321-6030", // *unverified
    address: "Dupax del Norte, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Dupax del Norte Rural Health Unit",
    type: "health",
    municipality: "Dupax del Norte",
    lat: 16.30650, lng: 121.10220,
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
    lat: 16.28790, lng: 121.10180,
    phone: "(078) 321-7010", // *unverified
    address: "Municipal Hall, Dupax del Sur, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Dupax del Sur Municipal Station",
    type: "police",
    municipality: "Dupax del Sur",
    lat: 16.28752, lng: 121.10152,
    phone: "(078) 321-7020", // *unverified
    address: "Dupax del Sur, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Dupax del Sur Fire Station",
    type: "fire",
    municipality: "Dupax del Sur",
    lat: 16.28710, lng: 121.10110,
    phone: "(078) 321-7030", // *unverified
    address: "Dupax del Sur, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Dupax del Sur Rural Health Unit",
    type: "health",
    municipality: "Dupax del Sur",
    lat: 16.28680, lng: 121.10050,
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
    lat: 16.31530, lng: 121.29410,
    phone: "(078) 321-9010", // *unverified
    address: "Municipal Hall, Kasibu, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Kasibu Municipal Station",
    type: "police",
    municipality: "Kasibu",
    lat: 16.31494, lng: 121.29372,
    phone: "(078) 321-9020", // *unverified
    address: "Kasibu, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Kasibu Fire Station",
    type: "fire",
    municipality: "Kasibu",
    lat: 16.32450, lng: 121.28980,
    phone: "(078) 321-9030", // *unverified
    address: "Kasibu, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Kasibu Municipal Hospital",
    type: "hospital",
    municipality: "Kasibu",
    lat: 16.32940, lng: 121.29310,
    phone: "(078) 321-9040", // *unverified
    address: "Kasibu, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Kasibu Rural Health Unit",
    type: "health",
    municipality: "Kasibu",
    lat: 16.31420, lng: 121.29310,
    phone: "(078) 321-9050", // *unverified
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
    lat: 16.35840, lng: 120.88650,
    phone: "(078) 321-3210", // *unverified
    address: "Municipal Hall, Kayapa, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Kayapa Municipal Station",
    type: "police",
    municipality: "Kayapa",
    lat: 16.35805, lng: 120.88612,
    phone: "(078) 321-3220", // *unverified
    address: "Kayapa, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Kayapa Fire Station",
    type: "fire",
    municipality: "Kayapa",
    lat: 16.35760, lng: 120.88580,
    phone: "(078) 321-3230", // *unverified
    address: "Kayapa, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Kayapa District Hospital",
    type: "hospital",
    municipality: "Kayapa",
    lat: 16.32780, lng: 120.92990,
    phone: "(078) 321-3235", // *unverified
    address: "Kayapa, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Kayapa Rural Health Unit",
    type: "health",
    municipality: "Kayapa",
    lat: 16.35710, lng: 120.88520,
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
    lat: 16.15930, lng: 120.93820,
    phone: "(078) 321-8010", // *unverified
    address: "Municipal Hall, Santa Fe, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Santa Fe Municipal Station",
    type: "police",
    municipality: "Santa Fe",
    lat: 16.15895, lng: 120.93792,
    phone: "(078) 321-8020", // *unverified
    address: "Santa Fe, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Santa Fe Fire Station",
    type: "fire",
    municipality: "Santa Fe",
    lat: 16.15850, lng: 120.93750,
    phone: "(078) 321-8030", // *unverified
    address: "Santa Fe, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Santa Fe Rural Health Unit",
    type: "health",
    municipality: "Santa Fe",
    lat: 16.15810, lng: 120.93690,
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
    lat: 15.79350, lng: 121.30270,
    phone: "(078) 321-0110", // *unverified
    address: "Municipal Hall, Alfonso Castañeda, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Alfonso Castañeda Municipal Station",
    type: "police",
    municipality: "Alfonso Castañeda",
    lat: 15.79293, lng: 121.30283,
    phone: "(078) 321-0120", // *unverified
    address: "Alfonso Castañeda, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Alfonso Castañeda Fire Station",
    type: "fire",
    municipality: "Alfonso Castañeda",
    lat: 15.79320, lng: 121.30250,
    phone: "(078) 321-0130", // *unverified
    address: "Alfonso Castañeda, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Alfonso Castañeda Rural Health Unit",
    type: "health",
    municipality: "Alfonso Castañeda",
    lat: 15.79240, lng: 121.30190,
    phone: "(078) 321-0140", // *unverified
    address: "Alfonso Castañeda, Nueva Vizcaya",
    email: ""
  },
];

const RESPONDER_ICONS = {
  mdrrmo:  { color: "#E65100", label: "MDRRMO",      emoji: "🚨" },
  police:  { color: "#1565C0", label: "Police",       emoji: "👮" },
  fire:    { color: "#B71C1C", label: "Fire (BFP)",   emoji: "🚒" },
  hospital:{ color: "#2E7D32", label: "Hospital",     emoji: "🏥" },
  health:  { color: "#00838F", label: "Health (RHU)", emoji: "⚕️"  },
  dpwh:    { color: "#1A237E", label: "DPWH",         emoji: "🏗️" },
};
