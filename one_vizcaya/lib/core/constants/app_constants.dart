import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class AppConstants {
  /// Update this whenever you bump the version in pubspec.yaml.
  static const String appVersion = '1.1.12';
  static const int buildNumber = 11;
  static const String appVersionDisplay = '$appVersion (Build $buildNumber)';

  /// Content is centered and capped at this width on tablets / wide screens.
  static const double kTabletBreakpoint = 600.0;
  static const double kContentMaxWidth = 700.0;

  static const List<String> municipalities = [
    'Alfonso Castañeda',
    'Ambaguio',
    'Aritao',
    'Bagabag',
    'Bambang',
    'Bayombong',
    'Diadi',
    'Dupax del Norte',
    'Dupax del Sur',
    'Kasibu',
    'Kayapa',
    'Quezon',
    'Santa Fe',
    'Solano',
    'Villaverde',
  ];

  // Municipal seal image assets, keyed by municipality. Single source of truth
  // shared by the home header and the municipality info sheet.
  static const Map<String, String> municipalitySeals = {
    'Alfonso Castañeda': 'assets/images/seals/alfonso-castaneda.png',
    'Ambaguio': 'assets/images/seals/ambaguio.png',
    'Aritao': 'assets/images/seals/aritao.png',
    'Bagabag': 'assets/images/seals/bagabag.png',
    'Bambang': 'assets/images/seals/bambang.png',
    'Bayombong': 'assets/images/seals/bayombong.png',
    'Diadi': 'assets/images/seals/diadi.png',
    'Dupax del Norte': 'assets/images/seals/dupax-del-norte.png',
    'Dupax del Sur': 'assets/images/seals/dupax-del-sur.png',
    'Kasibu': 'assets/images/seals/kasibu.png',
    'Kayapa': 'assets/images/seals/kayapa.png',
    'Quezon': 'assets/images/seals/quezon.png',
    'Santa Fe': 'assets/images/seals/santa-fe.png',
    'Solano': 'assets/images/seals/solano.png',
    'Villaverde': 'assets/images/seals/villaverde.png',
  };

  static const Map<String, List<String>> municipalityBarangays = {
    'Alfonso Castañeda': [
      'Abuyo',
      'Cawayan',
      'Galintuja',
      'Lipuga',
      'Lublub',
      'Pelaway',
    ],
    'Ambaguio': [
      'Ammoweg',
      'Camandag',
      'Dulli',
      'Labang',
      'Napo',
      'Poblacion',
      'Salingsingan',
      'Tiblac',
    ],
    'Aritao': [
      'Anayo',
      'Baan',
      'Balite',
      'Banganan',
      'Beti',
      'Bone North',
      'Bone South',
      'Calitlitan',
      'Canabuan',
      'Canarem',
      'Comon',
      'Cutar',
      'Darapidap',
      'Kirang',
      'Latar-Nocnoc-San Francisco',
      'Nagcuartelan',
      'Ocao-Capiniaan',
      'Poblacion',
      'Sta. Clara',
      'Tabueng',
      'Tucanon',
      'Yaway',
    ],
    'Bagabag': [
      'Bakir',
      'Baretbet',
      'Careb',
      'Lantap',
      'Murong',
      'Nangalisan',
      'Paniki',
      'Pogonsino',
      'Quirino',
      'San Geronimo',
      'San Pedro',
      'Sta. Cruz',
      'Sta. Lucia',
      'Tuao North',
      'Tuao South',
      'Villa Coloma',
      'Villaros',
    ],
    'Bambang': [
      'Abian',
      'Abinganan',
      'Aliaga',
      'Almaguer North',
      'Almaguer South',
      'Banggot',
      'Barat',
      'Buag',
      'Calaocan',
      'Dullao',
      'Homestead',
      'Indiana',
      'Mabuslo',
      'Macate',
      'Magsaysay Hills',
      'Manamtam',
      'Mauan',
      'Pallas',
      'Salinas',
      'San Antonio North',
      'San Antonio South',
      'San Fernando',
      'San Leonardo',
      'Santo Domingo',
      'Santo Domingo West',
    ],
    'Bayombong': [
      'Bansing',
      'Bonfal East',
      'Bonfal Proper',
      'Bonfal West',
      'Buenavista',
      'Busilac',
      'Cabuaan',
      'Casat',
      'District III Pob.',
      'District IV',
      'Don Domingo Maddela Pob.',
      'Don Mariano Marcos',
      'Don Tomas Maddela Pob.',
      'Ipil-Cuneg',
      'La Torre North',
      'La Torre South',
      'Luyang',
      'Magapuy',
      'Magsaysay',
      'Masoc',
      'Paitan',
      'Salvacion',
      'San Nicolas North',
      'Santa Rosa',
      'Vista Alegre',
    ],
    'Diadi': [
      'Ampakleng',
      'Arwas',
      'Balete',
      'Bugnay',
      'Butao',
      'Decabacan',
      'Duruarog',
      'Escoting',
      'Langka',
      'Lurad',
      'Nagsabaran',
      'Namamparan',
      'Pinya',
      'Poblacion',
      'Rosario',
      'San Luis',
      'San Pablo',
      'Villa Aurora',
      'Villa Florentino',
    ],
    'Dupax del Norte': [
      'Belance',
      'Binuangan',
      'Bitnong',
      'Bulala',
      'Inaban',
      'Ineangan',
      'Lamo',
      'Mabasa',
      'Macabenga',
      'Malasin',
      'Munguia',
      'New Gumiad',
      'Oyao',
      'Parai',
      'Yabbi',
    ],
    'Dupax del Sur': [
      'Abaca',
      'Bagumbayan',
      'Balsain',
      'Banila',
      'Biruk',
      'Canabay',
      'Carolotan',
      'Domang',
      'Dopaj',
      'Gabut',
      'Ganao',
      'Kimbutan',
      'Kinabuan',
      'Lukidnon',
      'Mangayang',
      'Palabotan',
      'Sanguit',
      'Santa Maria',
      'Talbek',
    ],
    'Kasibu': [
      'Alimit',
      'Alloy',
      'Antutot',
      'Belet',
      'Binogawan',
      'Biyoy',
      'Bua',
      'Camamasi',
      'Capisaan',
      'Catarawan',
      'Cordon',
      'Didipio',
      'Dine',
      'Kakiduguen',
      'Kongkong',
      'Lupa',
      'Macalong',
      'Malabing',
      'Muta',
      'Nantawakan',
      'Pao',
      'Papaya',
      'Paquet',
      'Poblacion',
      'Pudi',
      'Siguem',
      'Tadji',
      'Tukod',
      'Wangal',
      'Watwat',
    ],
    'Kayapa': [
      'Acacia',
      'Alang Salacsac',
      'Amelong Labeng',
      'Ansipsip',
      'Baan',
      'Babadi',
      'Balangabang',
      'Balete',
      'Banao',
      'Besong',
      'Binalian',
      'Buyasyas',
      'Cabalatan Alang',
      'Cabanglasan',
      'Cabayo',
      'Castillo Village',
      'Kayapa Proper East',
      'Kayapa Proper West',
      'Latbang',
      'Lawigan',
      'Mapayao',
      'Nansiakan',
      'Pampang',
      'Pangawan',
      'Pinayag',
      'Pingkian',
      'San Fabian',
      'Talicabcab',
      'Tidang Village',
      'Tubungan',
    ],
    'Quezon': [
      'Aurora',
      'Baresbes',
      'Bonifacio',
      'Buliwao',
      'Calaocan',
      'Caliat',
      'Dagupan',
      'Darubba',
      'Maasin',
      'Maddiangat',
      'Nalubbunan',
      'Runruno',
    ],
    'Santa Fe': [
      'Atbu',
      'Bacneng',
      'Balete',
      'Baliling',
      'Bantinan',
      'Baracbac',
      'Buyasyas',
      'Canabuan',
      'Imugan',
      'Malico',
      'Poblacion',
      'Santa Rosa',
      'Sinapaoan',
      'Tactac',
      'Unib',
      'Villa Flores',
    ],
    'Solano': [
      'Aggub',
      'Bagahabag',
      'Bangaan',
      'Bangar',
      'Bascaran',
      'Communal',
      'Concepcion',
      'Curifang',
      'Dadap',
      'Lactawan',
      'Osmeña',
      'Pilar D. Galima',
      'Poblacion North',
      'Poblacion South',
      'Quezon',
      'Quirino',
      'Roxas',
      'San Juan',
      'San Luis',
      'Tucal',
      'Uddiawan',
      'Wacal',
    ],
    'Villaverde': [
      'Bintawan Norte',
      'Bintawan Sur',
      'Cabuluan',
      'Ibung',
      'Nagbitin',
      'Ocapon',
      'Pieza',
      'Poblacion',
      'Sawmill',
    ],
  };

  // SMS hotlines per municipality. Update these without touching screen code.
  static const Map<String, String> municipalityHotlines = {
    'Bambang': '+639123456789',
    'Solano': '+639123456789',
    'Bayombong': '+639123456789',
    // All unlisted municipalities fall back to the default below
  };
  static const String defaultHotline = '+639123456789';

  // FIX 10: Log when the default fallback hotline is used so missing entries are visible
  static String hotlineFor(String municipality) {
    final hotline = municipalityHotlines[municipality];
    if (hotline == null) {
      debugPrint(
        'AppConstants.hotlineFor: no hotline for "$municipality", using default',
      );
    }
    return hotline ?? defaultHotline;
  }

  // ── Data Privacy (RA 10173) contacts ──────────────────────────────────────
  // Surfaced in the in-app Data Privacy Request screen. Update the DPO email
  // with the official LGU address before production launch.
  static const String dpoName = 'Data Protection Officer';
  static const String dpoOffice = 'Provincial Government of Nueva Vizcaya';
  static const String dpoAddress = 'Capitol Compound, Bayombong, 3700 Nueva Vizcaya';
  static const String dpoEmail = 'dpo@nueva-vizcaya.gov.ph';
  static const String npcName = 'National Privacy Commission';
  static const String npcAddress =
      '5th Floor Delegation Building, PICC Complex, Pasay City';
  static const String npcWebsite = 'https://privacy.gov.ph';
  static const String npcHotline = '1-866-NPC-9993';

  static const Map<String, dynamic> municipalityThemes = {
    'Alfonso Castañeda': {
      'title': 'The Hydroelectric Powerhouse',
      'appBarColor': Color(0xFF8B0000), // Deep Red
      'secondaryColor': Color(0xFFFFD700), // Gold
      'tertiaryColor': Color(0xFFF8EBEB), // Soft Red Tint
      'welcomeMsg':
          'Welcome to Alfonso Castañeda, The Hydroelectric Powerhouse!',
    },
    'Ambaguio': {
      'title': 'The Gateway to Mount Pulag',
      'appBarColor': Color(0xFF008080), // Teal
      'secondaryColor': Color(0xFFFFA500), // Orange Accent
      'tertiaryColor': Color(0xFFE5F2F2), // Soft Teal Tint
      'welcomeMsg': 'Welcome to Ambaguio, The Gateway to Mount Pulag!',
    },
    'Aritao': {
      'title': 'The Onion Capital',
      'appBarColor': Color(0xFFE27D60), // Onion Coral
      'secondaryColor': Color(0xFF85DCBA), // Leaf Green
      'tertiaryColor': Color(0xFFFCEEEA), // Soft Coral Tint
      'welcomeMsg': 'Welcome to Aritao, The Onion Capital!',
    },
    'Bagabag': {
      'title': 'The Pineapple Haven',
      'appBarColor': Color(0xFFF4A460), // Goldenrod
      'secondaryColor': Color(0xFF228B22), // Pineapple Green
      'tertiaryColor': Color(0xFFFDF6E3), // Warm Yellow Tint
      'welcomeMsg': 'Welcome to Bagabag, The Pineapple Haven!',
    },
    'Bambang': {
      'title': 'The Agricultural Hub',
      'appBarColor': Color(0xFF800000), // Maroon
      'secondaryColor': Color(0xFFFFFFFF), // White
      'tertiaryColor': Color(0xFFFDF5F5), // Soft Maroon Tint
      'welcomeMsg': 'Welcome to Bambang, The Agricultural Hub!',
    },
    'Bayombong': {
      'title': 'The Educational and Institutional Capital',
      'appBarColor': Color(0xFF006400), // Dark Green
      'secondaryColor': Color(0xFFFFD700), // Gold
      'tertiaryColor': Color(0xFFE6EFE6), // Soft Green Tint
      'welcomeMsg':
          'Welcome to Bayombong, The Educational and Institutional Capital!',
    },
    'Diadi': {
      'title': 'The Eco-Tourism Sanctuary',
      'appBarColor': Color(0xFF2E8B57), // Sea Green
      'secondaryColor': Color(0xFFD2691E), // Earth Brown
      'tertiaryColor': Color(0xFFEAF3EE), // Light Sea Green
      'welcomeMsg': 'Welcome to Diadi, The Eco-Tourism Sanctuary!',
    },
    'Dupax del Norte': {
      'title': 'The Agro-Forestry Frontier',
      'appBarColor': Color(0xFF8B4513), // Saddle Brown
      'secondaryColor': Color(0xFF556B2F), // Olive Green
      'tertiaryColor': Color(0xFFF3EBE6), // Light Earth Tint
      'welcomeMsg': 'Welcome to Dupax del Norte, The Agro-Forestry Frontier!',
    },
    'Dupax del Sur': {
      'title': 'The Heritage Capital',
      'appBarColor': Color(0xFFA52A2A), // Burgundy
      'secondaryColor': Color(0xFFDAA520), // Antique Gold
      'tertiaryColor': Color(0xFFF6EAEA), // Soft Burgundy Tint
      'welcomeMsg': 'Welcome to Dupax del Sur, The Heritage Capital!',
    },
    'Kasibu': {
      'title': 'The Citrus Capital of the Philippines',
      'appBarColor': Color(0xFFFF8C00), // Citrus Orange
      'secondaryColor': Color(0xFF32CD32), // Lime Green
      'tertiaryColor': Color(0xFFFFF4E6), // Light Orange Tint
      'welcomeMsg': 'Welcome to Kasibu, The Citrus Capital of the Philippines!',
    },
    'Kayapa': {
      'title': 'The Summer Capital of Nueva Vizcaya',
      'appBarColor': Color(0xFF4682B4), // Steel Blue
      'secondaryColor': Color(0xFF228B22), // Forest Green
      'tertiaryColor': Color(0xFFEDF2F6), // Soft Blue Tint
      'welcomeMsg': 'Welcome to Kayapa, The Summer Capital of Nueva Vizcaya!',
    },
    'Quezon': {
      'title': 'The Mineral Outpost',
      'appBarColor': Color(0xFF4169E1), // Royal Blue
      'secondaryColor': Color(0xFFFFD700), // Gold
      'tertiaryColor': Color(0xFFEAEFFC), // Light Blue Tint
      'welcomeMsg': 'Welcome to Quezon, The Mineral Outpost!',
    },
    'Santa Fe': {
      'title': 'The Gateway to Cagayan Valley',
      'appBarColor': Color(0xFF556B2F), // Dark Olive
      'secondaryColor': Color(0xFF8B0000), // Brick Red
      'tertiaryColor': Color(0xFFEEF0EA), // Light Olive Tint
      'welcomeMsg': 'Welcome to Santa Fe, The Gateway to Cagayan Valley!',
    },
    'Solano': {
      'title': 'The Premier Commercial Core',
      'appBarColor': Color(0xFF0A369D), // Deep Blue
      'secondaryColor': Color(0xFFFFC107), // Amber
      'tertiaryColor': Color(0xFFE6EBF5), // Soft Blue Tint
      'welcomeMsg': 'Welcome to Solano, The Premier Commercial Core!',
    },
    'Villaverde': {
      'title': "The Trailblazer's Sanctuary",
      'appBarColor': Color(0xFF32CD32), // Lime Green
      'secondaryColor': Color(0xFFFFA500), // Sun Orange
      'tertiaryColor': Color(0xFFEAFCEA), // Light Lime Tint
      'welcomeMsg': "Welcome to Villaverde, The Trailblazer's Sanctuary!",
    },
    'Generic': {
      'title': 'Nueva Vizcaya',
      'appBarColor': Color(0xFF616161),
      'secondaryColor': Color(0xFF9E9E9E),
      'tertiaryColor': Color(0xFFF2F2F2),
      'welcomeMsg': 'Welcome to your Municipality Connect!',
    },
  };
}
