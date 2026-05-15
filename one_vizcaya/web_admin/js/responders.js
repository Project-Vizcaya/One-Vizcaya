// Static responder directory for Nueva Vizcaya
// Update phone numbers before deployment — marked with * if unverified
const RESPONDERS = [
  // ── BAYOMBONG (Provincial Capital) ──────────────────────────────────────
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
    name: "Nueva Vizcaya Provincial Hospital",
    type: "hospital",
    municipality: "Bayombong",
    lat: 16.4852, lng: 121.1510,
    phone: "(078) 321-2040",
    address: "Bayombong, Nueva Vizcaya",
    email: ""
  },
  {
    name: "PNP Nueva Vizcaya Provincial Office",
    type: "police",
    municipality: "Bayombong",
    lat: 16.4838, lng: 121.1500,
    phone: "(078) 321-2110",
    address: "Camp Adduru, Bayombong",
    email: ""
  },
  {
    name: "BFP Nueva Vizcaya Provincial Office",
    type: "fire",
    municipality: "Bayombong",
    lat: 16.4830, lng: 121.1480,
    phone: "(078) 321-2323",
    address: "Bayombong, Nueva Vizcaya",
    email: ""
  },
  {
    name: "Bayombong Municipal Health Office",
    type: "health",
    municipality: "Bayombong",
    lat: 16.4845, lng: 121.1495,
    phone: "(078) 321-2050",
    address: "Municipal Hall, Bayombong",
    email: ""
  },

  // ── BAMBANG ──────────────────────────────────────────────────────────────
  {
    name: "MDRRMO Bambang",
    type: "mdrrmo",
    municipality: "Bambang",
    lat: 16.3852, lng: 121.1058,
    phone: "09065630944",
    address: "Municipal Hall Compound, Bambang",
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
    name: "Bambang Rural Health Unit",
    type: "health",
    municipality: "Bambang",
    lat: 16.3860, lng: 121.1048,
    phone: "(078) 321-3010", // *unverified
    address: "Bambang, Nueva Vizcaya",
    email: ""
  },
  {
    name: "BFP Bambang Fire Station",
    type: "fire",
    municipality: "Bambang",
    lat: 16.3835, lng: 121.1075,
    phone: "(078) 321-3020", // *unverified
    address: "Bambang, Nueva Vizcaya",
    email: ""
  },

  // ── SOLANO ───────────────────────────────────────────────────────────────
  {
    name: "MDRRMO Solano",
    type: "mdrrmo",
    municipality: "Solano",
    lat: 16.5209, lng: 121.1806,
    phone: "09274008033",
    address: "Municipal Hall, Solano",
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
    name: "Solano District Hospital",
    type: "hospital",
    municipality: "Solano",
    lat: 16.5200, lng: 121.1798,
    phone: "(078) 326-5021", // *unverified
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

  // ── BAGABAG ──────────────────────────────────────────────────────────────
  {
    name: "MDRRMO Bagabag",
    type: "mdrrmo",
    municipality: "Bagabag",
    lat: 16.6040, lng: 121.2500,
    phone: "(078) 321-4010", // *unverified
    address: "Municipal Hall, Bagabag",
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

  // ── ARITAO ───────────────────────────────────────────────────────────────
  {
    name: "MDRRMO Aritao",
    type: "mdrrmo",
    municipality: "Aritao",
    lat: 16.2978, lng: 121.0300,
    phone: "(078) 321-5010", // *unverified
    address: "Municipal Hall, Aritao",
    email: ""
  },
  {
    name: "PNP Aritao Municipal Station",
    type: "police",
    municipality: "Aritao",
    lat: 16.2982, lng: 121.0308,
    phone: "(078) 321-5020", // *unverified
    address: "Aritao, Nueva Vizcaya",
    email: ""
  },

  // ── DUPAX DEL NORTE ──────────────────────────────────────────────────────
  {
    name: "MDRRMO Dupax del Norte",
    type: "mdrrmo",
    municipality: "Dupax del Norte",
    lat: 16.2900, lng: 121.0950,
    phone: "(078) 321-6010", // *unverified
    address: "Municipal Hall, Dupax del Norte",
    email: ""
  },
  {
    name: "PNP Dupax del Norte Station",
    type: "police",
    municipality: "Dupax del Norte",
    lat: 16.2905, lng: 121.0958,
    phone: "(078) 321-6020", // *unverified
    address: "Dupax del Norte, Nueva Vizcaya",
    email: ""
  },

  // ── DUPAX DEL SUR ────────────────────────────────────────────────────────
  {
    name: "MDRRMO Dupax del Sur",
    type: "mdrrmo",
    municipality: "Dupax del Sur",
    lat: 16.2600, lng: 121.1000,
    phone: "(078) 321-7010", // *unverified
    address: "Municipal Hall, Dupax del Sur",
    email: ""
  },

  // ── SANTA FE ─────────────────────────────────────────────────────────────
  {
    name: "MDRRMO Santa Fe",
    type: "mdrrmo",
    municipality: "Santa Fe",
    lat: 16.1730, lng: 120.9980,
    phone: "(078) 321-8010", // *unverified
    address: "Municipal Hall, Santa Fe",
    email: ""
  },
  {
    name: "PNP Santa Fe Municipal Station",
    type: "police",
    municipality: "Santa Fe",
    lat: 16.1735, lng: 120.9988,
    phone: "(078) 321-8020", // *unverified
    address: "Santa Fe, Nueva Vizcaya",
    email: ""
  },

  // ── KASIBU ───────────────────────────────────────────────────────────────
  {
    name: "MDRRMO Kasibu",
    type: "mdrrmo",
    municipality: "Kasibu",
    lat: 16.3000, lng: 121.2200,
    phone: "(078) 321-9010", // *unverified
    address: "Municipal Hall, Kasibu",
    email: ""
  },

  // ── R2TMC ────────────────────────────────────────────────────────────────────
  {
    name: "R2TMC – Region 2 Traffic Management",
    type: "traffic",
    municipality: "Bayombong",
    lat: 16.4840, lng: 121.1492,
    phone: "(078) 321-2100", // *unverified
    address: "Maharlika Highway, Bayombong",
    email: ""
  },

  // ── DPWH ─────────────────────────────────────────────────────────────────────
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
  },

  // ── VILLAVERDE ───────────────────────────────────────────────────────────
  {
    name: "MDRRMO Villaverde",
    type: "mdrrmo",
    municipality: "Villaverde",
    lat: 16.5480, lng: 121.2300,
    phone: "(078) 322-1010", // *unverified
    address: "Municipal Hall, Villaverde",
    email: ""
  },
];

const RESPONDER_ICONS = {
  mdrrmo:  { color: "#E65100", label: "MDRRMO",        emoji: "🚨" },
  police:  { color: "#1565C0", label: "Police",         emoji: "👮" },
  fire:    { color: "#B71C1C", label: "Fire (BFP)",     emoji: "🚒" },
  hospital:{ color: "#2E7D32", label: "Hospital",       emoji: "🏥" },
  health:  { color: "#00838F", label: "Health",         emoji: "⚕️"  },
  dpwh:    { color: "#1A237E", label: "DPWH",           emoji: "🏗️" },
  traffic: { color: "#6A1B9A", label: "Traffic (R2TMC)", emoji: "🚦" },
};
