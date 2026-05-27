import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class AppConstants {
  /// Update this whenever you bump the version in pubspec.yaml.
  static const String appVersion = '1.1.4';
  static const int buildNumber = 8;
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

  static const Map<String, dynamic> municipalityThemes = {
    'Bambang': {
      'appBarColor': Color(0xFFE2725B), // Terracotta
      'secondaryColor': Color(0xFF8B4513), // Saddle Brown
      'welcomeMsg':
          'Welcome to Bambang, The Agricultural Hub of Nueva Vizcaya!',
    },
    'Solano': {
      'appBarColor': Color(0xFFFF4500), // Bright Red-Orange
      'secondaryColor': Color(0xFFFFD700), // Golden Yellow
      'welcomeMsg':
          'Welcome to Solano, The Commercial Center of Nueva Vizcaya!',
    },
    'Bayombong': {
      'appBarColor': Color(0xFF228B22), // Forest Green
      'secondaryColor': Color(0xFFF9A825), // Amber Gold
      'welcomeMsg':
          'Welcome to Bayombong, The Institutional Capital of Nueva Vizcaya!',
    },
    'Bagabag': {
      'appBarColor': Color(0xFFFFD12A), // Pineapple Gold
      'secondaryColor': Color(0xFF007FFF), // Azure Blue
      'welcomeMsg':
          'Welcome to Bagabag, The Gateway to the World-Famous Rice Terraces!',
    },
    'Diadi': {
      'appBarColor': Color(0xFF004B49), // Deep Teal
      'secondaryColor': Color(0xFFE6E6FA), // Mist White
      'welcomeMsg': 'Welcome to Diadi, The Last Frontier of the North!',
    },
    'Villaverde': {
      'appBarColor': Color(0xFFDFFF00), // Light Lime
      'secondaryColor': Color(0xFF928E85), // Stone
      'welcomeMsg': 'Welcome to Villaverde, The Land of Bountiful Harvests!',
    },
    'Quezon': {
      'appBarColor': Color(0xFFC0C0C0), // Silver
      'secondaryColor': Color(0xFF50C878), // Emerald
      'welcomeMsg': 'Welcome to Quezon, The Land of Hidden Natural Wealth!',
    },
    'Aritao': {
      'appBarColor': Color(0xFFFF6E4A), // Sunrise Orange
      'secondaryColor': Color(0xFFB66A50), // Clay
      'welcomeMsg': 'Welcome to Aritao, The Gateway to the Cagayan Valley!',
    },
    'Santa Fe': {
      'appBarColor': Color(0xFF01796F), // Pine Green
      'secondaryColor': Color(0xFF8C92AC), // Cool Gray
      'welcomeMsg': 'Welcome to Santa Fe, The Mountain Gateway of Vizcaya!',
    },
    'Alfonso Castañeda': {
      'appBarColor': Color(0xFF4A5D23), // Dark Moss
      'secondaryColor': Color(0xFF0B3B60), // Deep River Blue
      'welcomeMsg':
          'Welcome to Alfonso Castañeda, The Last Frontier of Nueva Vizcaya!',
    },
    'Kayapa': {
      'appBarColor': Color(0xFFF28500), // Tangerine
      'secondaryColor': Color(0xFF708090), // Fog Gray
      'welcomeMsg': 'Welcome to Kayapa, The Vegetable Bowl of the Province!',
    },
    'Dupax del Norte': {
      'appBarColor': Color(0xFFCC5500), // Burnt Orange
      'secondaryColor': Color(0xFFFFFDD0), // Cream
      'welcomeMsg': 'Welcome to Dupax del Norte, The Home of Cultural Harmony!',
    },
    'Dupax del Sur': {
      'appBarColor': Color(0xFF800000), // Maroon
      'secondaryColor': Color(0xFFFAEBD7), // Antique White
      'welcomeMsg': 'Welcome to Dupax del Sur, The Heart of Nueva Vizcaya!',
    },
    'Kasibu': {
      'appBarColor': Color(0xFFFFD700), // Citrus Yellow
      'secondaryColor': Color(0xFF9966CC), // Mountain Purple
      'welcomeMsg': 'Welcome to Kasibu, The Citrus Capital of the Philippines!',
    },
    'Ambaguio': {
      'appBarColor': Color(0xFF87CEEB), // Sky Blue
      'secondaryColor': Color(0xFF454D32), // Pine Needle
      'welcomeMsg': 'Welcome to Ambaguio, The Summer Capital of Vizcaya!',
    },
    'Generic': {
      'appBarColor': Color(0xFF616161),
      'welcomeMsg': 'Welcome to your Municipality Connect!',
    },
  };
}
