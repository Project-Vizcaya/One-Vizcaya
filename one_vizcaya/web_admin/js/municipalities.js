// Polygon boundaries for Nueva Vizcaya municipalities.
// Coordinates are GeoJSON order: [longitude, latitude].
// Boundaries traced from official NAMRIA/PSA reference data.
const NV_MUNICIPALITIES = [
  {
    name: "Diadi",
    color: "#E8B84B",   // amber gold
    polygon: [
      // southern border (shared with Bagabag)
      [121.180, 16.608], [121.210, 16.592], [121.250, 16.582],
      [121.298, 16.590], [121.332, 16.602],
      // eastern border
      [121.348, 16.635], [121.352, 16.675],
      // northern border with Magat reservoir notch
      [121.330, 16.738], [121.298, 16.765],
      [121.272, 16.778], [121.256, 16.760],
      [121.238, 16.748], [121.218, 16.758],
      [121.202, 16.728], [121.192, 16.690],
      // western border
      [121.185, 16.655], [121.182, 16.630],
      [121.180, 16.608]
    ]
  },
  {
    name: "Bagabag",
    color: "#A8C8E8",   // light steel blue
    polygon: [
      // west border (Villaverde)
      [121.148, 16.572], [121.155, 16.548],
      // south border (Quezon/Solano)
      [121.188, 16.535], [121.228, 16.528],
      [121.272, 16.538], [121.315, 16.555],
      // east border
      [121.332, 16.575], [121.332, 16.602],
      // north border (Diadi)
      [121.298, 16.590], [121.250, 16.582],
      [121.210, 16.592], [121.180, 16.608],
      // NW corner
      [121.162, 16.598], [121.150, 16.582],
      [121.148, 16.572]
    ]
  },
  {
    name: "Villaverde",
    color: "#9B8EC4",   // medium purple
    polygon: [
      // south border (Bayombong/Ambaguio)
      [121.085, 16.538], [121.112, 16.520],
      [121.140, 16.512], [121.148, 16.520],
      // east (Solano/Bagabag border)
      [121.148, 16.572], [121.150, 16.582],
      [121.162, 16.598], [121.180, 16.608],
      // north
      [121.148, 16.618], [121.110, 16.625],
      // west (Ambaguio border)
      [121.080, 16.605], [121.065, 16.572],
      [121.070, 16.548], [121.085, 16.538]
    ]
  },
  {
    name: "Solano",
    color: "#C8A882",   // warm tan
    polygon: [
      // south (Bayombong/Quezon border)
      [121.140, 16.488], [121.155, 16.478],
      [121.192, 16.472], [121.222, 16.486],
      // east
      [121.225, 16.520],
      // north (Bagabag border)
      [121.188, 16.535], [121.155, 16.548],
      // west (Villaverde/Bayombong border)
      [121.148, 16.520], [121.140, 16.512],
      [121.112, 16.520], [121.140, 16.488]
    ]
  },
  {
    name: "Bayombong",
    color: "#E8A898",   // salmon
    polygon: [
      // south (Bambang border)
      [121.092, 16.452], [121.102, 16.432],
      [121.122, 16.422], [121.148, 16.428],
      [121.162, 16.448], [121.170, 16.465],
      // east (Quezon/Solano border)
      [121.192, 16.472], [121.155, 16.478],
      [121.140, 16.488],
      // north (Villaverde border)
      [121.112, 16.520], [121.085, 16.538],
      // west (Ambaguio border)
      [121.072, 16.520], [121.068, 16.492],
      [121.078, 16.465], [121.092, 16.452]
    ]
  },
  {
    name: "Quezon",
    color: "#A8C8C8",   // slate teal
    polygon: [
      // SW (Bambang/Bayombong border)
      [121.162, 16.448], [121.168, 16.422],
      [121.198, 16.408], [121.248, 16.418],
      [121.295, 16.438], [121.335, 16.468],
      // east (Kasibu border)
      [121.345, 16.512], [121.340, 16.555],
      // north (Bagabag border)
      [121.315, 16.555], [121.272, 16.538],
      [121.228, 16.528], [121.188, 16.535],
      // west (Solano border)
      [121.225, 16.520], [121.222, 16.486],
      [121.192, 16.472], [121.170, 16.465],
      [121.162, 16.448]
    ]
  },
  {
    name: "Ambaguio",
    color: "#B8D4E8",   // pale blue
    polygon: [
      // south (Bambang border)
      [120.922, 16.488], [120.932, 16.458],
      [120.972, 16.445], [120.992, 16.448],
      [121.015, 16.458], [121.052, 16.462],
      [121.078, 16.465],
      // east (Bayombong/Villaverde border)
      [121.068, 16.492], [121.072, 16.520],
      [121.065, 16.572],
      // north (Villaverde border)
      [121.080, 16.605], [121.028, 16.608],
      [120.988, 16.598], [120.948, 16.568],
      // west (Kayapa border)
      [120.928, 16.538], [120.920, 16.515],
      [120.922, 16.488]
    ]
  },
  {
    name: "Bambang",
    color: "#A8C8A0",   // sage green
    polygon: [
      // SW (Kayapa border)
      [120.935, 16.385], [120.940, 16.350],
      // south (Aritao/Dupax del Norte border)
      [120.962, 16.328], [120.995, 16.315],
      [121.028, 16.310], [121.075, 16.318],
      [121.105, 16.342],
      // SE (Kasibu/Dupax del Norte border)
      [121.120, 16.372], [121.125, 16.415],
      // east (Quezon border)
      [121.168, 16.422], [121.162, 16.448],
      // north (Bayombong border)
      [121.148, 16.428], [121.122, 16.422],
      [121.102, 16.432], [121.092, 16.452],
      [121.078, 16.465], [121.052, 16.462],
      [121.015, 16.458], [120.992, 16.448],
      [120.972, 16.445], [120.932, 16.458],
      // west (Kayapa border)
      [120.920, 16.440], [120.932, 16.405],
      [120.935, 16.385]
    ]
  },
  {
    name: "Kasibu",
    color: "#E8C8A0",   // pale orange
    polygon: [
      // NW (Bambang/Quezon border)
      [121.125, 16.415], [121.168, 16.422],
      [121.198, 16.408], [121.248, 16.418],
      [121.295, 16.438], [121.335, 16.468],
      [121.345, 16.512],
      // NE far extension
      [121.362, 16.492], [121.402, 16.478],
      [121.440, 16.445], [121.455, 16.395],
      [121.452, 16.338], [121.438, 16.282],
      [121.412, 16.232], [121.375, 16.188],
      [121.332, 16.158], [121.285, 16.140],
      [121.242, 16.138], [121.205, 16.150],
      [121.178, 16.165],
      // SW (Alfonso Castañeda/Dupax del Sur border)
      [121.152, 16.148], [121.142, 16.182],
      [121.135, 16.228], [121.128, 16.268],
      [121.122, 16.308],
      // west (Dupax del Norte/Bambang border)
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
      // south (Santa Fe border)
      [120.875, 16.148], [120.918, 16.178],
      // east (Aritao/Bambang/Ambaguio border)
      [120.942, 16.215], [120.952, 16.268],
      [120.962, 16.328], [120.940, 16.350],
      [120.935, 16.385], [120.932, 16.405],
      [120.920, 16.440], [120.932, 16.458],
      // NE (Ambaguio border)
      [120.922, 16.488], [120.920, 16.515],
      [120.928, 16.538], [120.908, 16.550],
      [120.878, 16.548], [120.852, 16.535],
      // north (Ifugao/Mountain Province border)
      [120.825, 16.518], [120.798, 16.498],
      [120.775, 16.472], [120.752, 16.440],
      [120.732, 16.402], [120.715, 16.360],
      [120.702, 16.315], [120.690, 16.265],
      [120.680, 16.215], [120.675, 16.180],
      [120.672, 16.150]
    ]
  },
  {
    name: "Aritao",
    color: "#D8A8A8",   // rose
    polygon: [
      // SW (Kayapa border)
      [120.952, 16.268], [120.960, 16.242],
      // south (Santa Fe/Dupax del Sur border)
      [120.982, 16.222], [121.012, 16.212],
      [121.042, 16.218], [121.065, 16.235],
      // east (Dupax del Norte border)
      [121.075, 16.262], [121.080, 16.288],
      [121.075, 16.315],
      // north (Bambang border)
      [121.028, 16.310], [120.995, 16.315],
      [120.962, 16.328],
      // west (Kayapa border)
      [120.952, 16.268]
    ]
  },
  {
    name: "Dupax del Norte",
    color: "#C8A8D8",   // lavender
    polygon: [
      // SW (Aritao/Bambang border)
      [121.075, 16.315], [121.075, 16.262],
      [121.065, 16.235], [121.042, 16.218],
      // south (Dupax del Sur border)
      [121.048, 16.205], [121.072, 16.195],
      [121.098, 16.200], [121.122, 16.215],
      [121.135, 16.240],
      // east (Kasibu border)
      [121.128, 16.268], [121.122, 16.308],
      // north (Bambang border)
      [121.105, 16.342], [121.075, 16.318],
      [121.028, 16.310], [121.080, 16.288],
      [121.075, 16.315]
    ]
  },
  {
    name: "Dupax del Sur",
    color: "#C8A878",   // warm brown
    polygon: [
      // north (Dupax del Norte border)
      [121.042, 16.218], [121.048, 16.205],
      [121.072, 16.195], [121.098, 16.200],
      [121.122, 16.215], [121.135, 16.240],
      // east (Kasibu border)
      [121.142, 16.182], [121.152, 16.148],
      // south (Alfonso Castañeda border)
      [121.135, 16.130], [121.105, 16.118],
      [121.075, 16.118], [121.048, 16.128],
      [121.025, 16.145],
      // west (Aritao/Santa Fe border)
      [121.012, 16.165], [121.008, 16.188],
      [121.012, 16.212], [121.042, 16.218]
    ]
  },
  {
    name: "Santa Fe",
    color: "#A8B8D8",   // periwinkle
    polygon: [
      // NW (Kayapa border)
      [120.875, 16.148], [120.918, 16.178],
      // north (Aritao/Dupax del Sur border)
      [120.942, 16.215], [120.982, 16.222],
      [121.012, 16.212], [121.008, 16.188],
      [121.012, 16.165], [121.025, 16.145],
      // east (Alfonso Castañeda border)
      [121.048, 16.128], [121.030, 16.105],
      [121.012, 16.088],
      // south (Quirino/Nueva Ecija border)
      [120.988, 16.072], [120.958, 16.062],
      [120.928, 16.058], [120.898, 16.062],
      [120.868, 16.072], [120.845, 16.090],
      [120.828, 16.112], [120.820, 16.122],
      [120.818, 16.122],
      // west (Kayapa border)
      [120.875, 16.148]
    ]
  },
  {
    name: "Alfonso Castañeda",
    color: "#B8D8A8",   // light green
    polygon: [
      // north (Dupax del Sur/Kasibu border)
      [121.025, 16.145], [121.048, 16.128],
      [121.075, 16.118], [121.105, 16.118],
      [121.135, 16.130], [121.152, 16.148],
      [121.178, 16.165], [121.205, 16.150],
      // east (Quirino border)
      [121.225, 16.118], [121.228, 16.080],
      [121.215, 16.042], [121.192, 16.018],
      [121.162, 16.002],
      // south (Quirino/Nueva Ecija border)
      [121.128, 15.992], [121.092, 15.995],
      [121.062, 16.012], [121.042, 16.038],
      // west (Santa Fe border)
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
