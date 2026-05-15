// Polygon boundaries for Nueva Vizcaya municipalities.
// Coordinates are GeoJSON order: [longitude, latitude].
// Key correction: Diadi western border aligns with Ifugao province boundary (~121.00°E).
const NV_MUNICIPALITIES = [
  {
    name: "Diadi",
    color: "#E8B84B",   // amber gold
    polygon: [
      // S — shared border with Villaverde then Bagabag
      [121.005, 16.600], [121.048, 16.590], [121.098, 16.588],
      [121.148, 16.592], [121.188, 16.610],
      // SE — Isabela province border
      [121.228, 16.628], [121.232, 16.668],
      // NE — toward Magat Reservoir (notch at top)
      [121.225, 16.728], [121.198, 16.762],
      [121.168, 16.775], [121.130, 16.778],
      // N / NW
      [121.092, 16.770], [121.050, 16.748],
      [121.018, 16.718],
      // W — Ifugao province border
      [121.000, 16.678], [121.000, 16.638],
      [121.002, 16.615], [121.005, 16.600]
    ]
  },
  {
    name: "Bagabag",
    color: "#A8C8E8",   // light steel blue
    polygon: [
      // SW — Villaverde/Solano border
      [121.148, 16.572], [121.155, 16.548],
      // S border — Quezon/Solano
      [121.188, 16.535], [121.228, 16.528],
      [121.272, 16.538], [121.318, 16.555],
      // E border — Isabela province
      [121.335, 16.578], [121.338, 16.615],
      // N border — shared with Diadi south
      [121.228, 16.628], [121.188, 16.610],
      [121.148, 16.592], [121.098, 16.588],
      // NW (Villaverde/Diadi corner)
      [121.160, 16.600], [121.150, 16.582],
      [121.148, 16.572]
    ]
  },
  {
    name: "Villaverde",
    color: "#9B8EC4",   // medium purple
    polygon: [
      // S — Bayombong/Solano border
      [121.085, 16.538], [121.112, 16.520],
      [121.140, 16.512], [121.148, 16.520],
      // E — Solano/Bagabag border
      [121.148, 16.572], [121.150, 16.582],
      [121.160, 16.600],
      // N — shared with Diadi south (west portion)
      [121.098, 16.588], [121.048, 16.590],
      [121.005, 16.600], [121.002, 16.615],
      // W — Ambaguio border
      [121.000, 16.600], [121.068, 16.572],
      [121.070, 16.548], [121.085, 16.538]
    ]
  },
  {
    name: "Solano",
    color: "#C8A882",   // warm tan
    polygon: [
      // S — Bayombong/Quezon border
      [121.140, 16.488], [121.155, 16.478],
      [121.192, 16.472], [121.222, 16.486],
      // E
      [121.225, 16.520],
      // N — Bagabag border
      [121.188, 16.535], [121.155, 16.548],
      // W — Villaverde/Bayombong border
      [121.148, 16.520], [121.140, 16.512],
      [121.112, 16.520], [121.140, 16.488]
    ]
  },
  {
    name: "Bayombong",
    color: "#E8A898",   // salmon
    polygon: [
      // S — Bambang border
      [121.092, 16.452], [121.102, 16.432],
      [121.122, 16.422], [121.148, 16.428],
      [121.162, 16.448], [121.170, 16.465],
      // E — Quezon/Solano border
      [121.192, 16.472], [121.155, 16.478],
      [121.140, 16.488],
      // N — Villaverde border
      [121.112, 16.520], [121.085, 16.538],
      // W — Ambaguio border
      [121.072, 16.520], [121.068, 16.492],
      [121.078, 16.465], [121.092, 16.452]
    ]
  },
  {
    name: "Quezon",
    color: "#A8C8C8",   // slate teal
    polygon: [
      // SW — Bambang/Bayombong border
      [121.162, 16.448], [121.168, 16.422],
      [121.198, 16.408], [121.248, 16.418],
      [121.295, 16.438], [121.335, 16.468],
      // E — Kasibu border
      [121.345, 16.512], [121.340, 16.555],
      // N — Bagabag border
      [121.318, 16.555], [121.272, 16.538],
      [121.228, 16.528], [121.188, 16.535],
      // W — Solano border
      [121.225, 16.520], [121.222, 16.486],
      [121.192, 16.472], [121.170, 16.465],
      [121.162, 16.448]
    ]
  },
  {
    name: "Ambaguio",
    color: "#B8D4E8",   // pale blue
    polygon: [
      // S — Bambang border
      [120.922, 16.488], [120.932, 16.458],
      [120.972, 16.445], [120.992, 16.448],
      [121.015, 16.458], [121.052, 16.462],
      [121.078, 16.465],
      // E — Bayombong/Villaverde border
      [121.068, 16.492], [121.072, 16.520],
      [121.000, 16.600], [121.002, 16.615],
      // N — Diadi/Villaverde border (west)
      [121.000, 16.638],
      // W — Kayapa border
      [120.928, 16.538], [120.920, 16.515],
      [120.922, 16.488]
    ]
  },
  {
    name: "Bambang",
    color: "#A8C8A0",   // sage green
    polygon: [
      // SW — Kayapa border
      [120.935, 16.385], [120.940, 16.350],
      // S — Aritao/Dupax del Norte border
      [120.962, 16.328], [120.995, 16.315],
      [121.028, 16.310], [121.075, 16.318],
      [121.105, 16.342],
      // SE — Kasibu/Dupax del Norte border
      [121.120, 16.372], [121.125, 16.415],
      // E — Quezon border
      [121.168, 16.422], [121.162, 16.448],
      // N — Bayombong border
      [121.148, 16.428], [121.122, 16.422],
      [121.102, 16.432], [121.092, 16.452],
      [121.078, 16.465], [121.052, 16.462],
      [121.015, 16.458], [120.992, 16.448],
      [120.972, 16.445], [120.932, 16.458],
      // W — Kayapa border
      [120.920, 16.440], [120.932, 16.405],
      [120.935, 16.385]
    ]
  },
  {
    name: "Kasibu",
    color: "#E8C8A0",   // pale orange
    polygon: [
      // NW — Bambang/Quezon border
      [121.125, 16.415], [121.168, 16.422],
      [121.198, 16.408], [121.248, 16.418],
      [121.295, 16.438], [121.335, 16.468],
      [121.345, 16.512],
      // NE — far eastern extension
      [121.362, 16.492], [121.402, 16.478],
      [121.440, 16.445], [121.455, 16.395],
      [121.452, 16.338], [121.438, 16.282],
      [121.412, 16.232], [121.375, 16.188],
      [121.332, 16.158], [121.285, 16.140],
      [121.242, 16.138], [121.205, 16.150],
      [121.178, 16.165],
      // SW — Alfonso Castañeda/Dupax del Sur border
      [121.152, 16.148], [121.142, 16.182],
      [121.135, 16.228], [121.128, 16.268],
      [121.122, 16.308],
      // W — Dupax del Norte/Bambang border
      [121.105, 16.342], [121.120, 16.372],
      [121.125, 16.415]
    ]
  },
  {
    name: "Kayapa",
    color: "#EEE8A0",   // pale yellow
    polygon: [
      // SW corner
      [120.672, 16.150], [120.712, 16.128],
      [120.762, 16.118], [120.818, 16.122],
      // S — Santa Fe border
      [120.875, 16.148], [120.918, 16.178],
      // E — Aritao/Bambang/Ambaguio border
      [120.942, 16.215], [120.952, 16.268],
      [120.962, 16.328], [120.940, 16.350],
      [120.935, 16.385], [120.932, 16.405],
      [120.920, 16.440], [120.932, 16.458],
      // NE — Ambaguio border
      [120.922, 16.488], [120.920, 16.515],
      [120.928, 16.538],
      // N — Ifugao/Mountain Province border
      [120.905, 16.550], [120.878, 16.548],
      [120.852, 16.535], [120.825, 16.518],
      [120.798, 16.498], [120.775, 16.472],
      [120.752, 16.440], [120.732, 16.402],
      [120.715, 16.360], [120.702, 16.315],
      [120.690, 16.265], [120.680, 16.215],
      [120.675, 16.180], [120.672, 16.150]
    ]
  },
  {
    name: "Aritao",
    color: "#D8A8A8",   // rose
    polygon: [
      // SW — Kayapa border
      [120.952, 16.268], [120.960, 16.242],
      // S — Santa Fe/Dupax del Sur border
      [120.982, 16.222], [121.012, 16.212],
      [121.042, 16.218], [121.065, 16.235],
      // E — Dupax del Norte border
      [121.075, 16.262], [121.080, 16.288],
      [121.075, 16.315],
      // N — Bambang border
      [121.028, 16.310], [120.995, 16.315],
      [120.962, 16.328],
      // W — Kayapa border
      [120.952, 16.268]
    ]
  },
  {
    name: "Dupax del Norte",
    color: "#C8A8D8",   // lavender
    polygon: [
      // SW — Aritao/Bambang border
      [121.075, 16.315], [121.075, 16.262],
      [121.065, 16.235], [121.042, 16.218],
      // S — Dupax del Sur border
      [121.048, 16.205], [121.072, 16.195],
      [121.098, 16.200], [121.122, 16.215],
      [121.135, 16.240],
      // E — Kasibu border
      [121.128, 16.268], [121.122, 16.308],
      // N — Bambang border
      [121.105, 16.342], [121.075, 16.318],
      [121.028, 16.310], [121.080, 16.288],
      [121.075, 16.315]
    ]
  },
  {
    name: "Dupax del Sur",
    color: "#C8A878",   // warm brown
    polygon: [
      // N — Dupax del Norte border
      [121.042, 16.218], [121.048, 16.205],
      [121.072, 16.195], [121.098, 16.200],
      [121.122, 16.215], [121.135, 16.240],
      // E — Kasibu border
      [121.142, 16.182], [121.152, 16.148],
      // S — Alfonso Castañeda border
      [121.135, 16.130], [121.105, 16.118],
      [121.075, 16.118], [121.048, 16.128],
      [121.025, 16.145],
      // W — Aritao/Santa Fe border
      [121.012, 16.165], [121.008, 16.188],
      [121.012, 16.212], [121.042, 16.218]
    ]
  },
  {
    name: "Santa Fe",
    color: "#A8B8D8",   // periwinkle
    polygon: [
      // NW — Kayapa border
      [120.875, 16.148], [120.918, 16.178],
      // N — Aritao/Dupax del Sur border
      [120.942, 16.215], [120.982, 16.222],
      [121.012, 16.212], [121.008, 16.188],
      [121.012, 16.165], [121.025, 16.145],
      // E — Alfonso Castañeda border
      [121.048, 16.128], [121.030, 16.105],
      [121.012, 16.088],
      // S — Quirino/Nueva Ecija border
      [120.988, 16.072], [120.958, 16.062],
      [120.928, 16.058], [120.898, 16.062],
      [120.868, 16.072], [120.845, 16.090],
      [120.828, 16.112], [120.820, 16.122],
      // W — Kayapa border
      [120.818, 16.122], [120.875, 16.148]
    ]
  },
  {
    name: "Alfonso Castañeda",
    color: "#B8D8A8",   // light green
    polygon: [
      // N — Dupax del Sur/Kasibu border
      [121.025, 16.145], [121.048, 16.128],
      [121.075, 16.118], [121.105, 16.118],
      [121.135, 16.130], [121.152, 16.148],
      [121.178, 16.165], [121.205, 16.150],
      // E — Quirino border
      [121.225, 16.118], [121.228, 16.080],
      [121.215, 16.042], [121.192, 16.018],
      [121.162, 16.002],
      // S — Quirino/Nueva Ecija border
      [121.128, 15.992], [121.092, 15.995],
      [121.062, 16.012], [121.042, 16.038],
      // W — Santa Fe border
      [121.030, 16.068], [121.012, 16.088],
      [121.030, 16.105], [121.048, 16.128],
      [121.025, 16.145]
    ]
  }
];

function getMuniBounds(muniName) {
  const muni = NV_MUNICIPALITIES.find(m => m.name === muniName);
  if (!muni) return null;
  const bounds = new google.maps.LatLngBounds();
  muni.polygon.forEach(([lng, lat]) => bounds.extend({ lat, lng }));
  return bounds;
}

function getProvinceBounds() {
  const bounds = new google.maps.LatLngBounds();
  NV_MUNICIPALITIES.forEach(m =>
    m.polygon.forEach(([lng, lat]) => bounds.extend({ lat, lng }))
  );
  return bounds;
}
