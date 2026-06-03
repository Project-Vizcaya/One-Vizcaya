import 'dart:convert';
import 'package:http/http.dart' as http;

/// Curated, fact-checked-from-public-sources background for a municipality.
/// Shown instantly (works offline / on slow networks); the info sheet then
/// tries to enrich it with a live summary from Wikipedia.
class MunicipalityInfo {
  final String about;
  final String founded;
  final List<String> trivia;

  const MunicipalityInfo({
    required this.about,
    required this.founded,
    required this.trivia,
  });
}

class MunicipalityInfoService {
  // Compiled from public sources (incl. Wikipedia). Founding notes are kept
  // conservative; the live Wikipedia summary provides authoritative detail.
  static const Map<String, MunicipalityInfo> curated = {
    'Alfonso Castañeda': MunicipalityInfo(
      about:
          'The southernmost and most remote municipality of Nueva Vizcaya, '
          'bordering Aurora and Quirino. It is largely forested, mountainous '
          'and sparsely populated.',
      founded:
          'Created as a municipality in 1980 and named after a former '
          'provincial governor, Alfonso Castañeda.',
      trivia: [
        'Tied to the Casecnan watershed, which feeds hydroelectric power and '
            'irrigation — the basis of its "Hydroelectric Powerhouse" title.',
        'Among the least-populated towns in the province.',
        'Home to Bugkalot (Ilongot) and other Indigenous communities.',
      ],
    ),
    'Ambaguio': MunicipalityInfo(
      about:
          'A mountainous, agricultural town on the western edge of Nueva '
          'Vizcaya, known for highland vegetable farming and as a jump-off to '
          'Mount Pulag.',
      founded: 'Organized as a regular municipality in the 20th century.',
      trivia: [
        'A trail gateway to Mount Pulag, the highest peak in Luzon.',
        'Cool upland climate ideal for highland vegetables.',
        'Home to the Kalanguya and other Indigenous peoples.',
      ],
    ),
    'Aritao': MunicipalityInfo(
      about:
          'A town in southern Nueva Vizcaya along the Maharlika Highway, '
          'widely known for onion and garlic production.',
      founded:
          'One of the older settlements in the area, with roots in the '
          'Spanish mission period.',
      trivia: [
        'Noted across the region for its onions and garlic.',
        'Sits along the historic route into the Cagayan Valley.',
        'Home to Isinai, Ilocano and other communities.',
      ],
    ),
    'Bagabag': MunicipalityInfo(
      about:
          'A town north of the provincial capital known for pineapple and '
          'rice farming and home to a domestic airport.',
      founded: 'Established as a town during the Spanish colonial era.',
      trivia: [
        'Site of Bagabag Airport, a domestic airfield.',
        'Known for sweet pineapples and farm produce.',
        'A junction toward Ifugao and the Cordillera.',
      ],
    ),
    'Bambang': MunicipalityInfo(
      about:
          'A major agricultural and commercial town in southern Nueva '
          'Vizcaya, straddling the Maharlika Highway.',
      founded:
          'A long-established settlement dating to the Spanish colonial '
          'period.',
      trivia: [
        'A key agricultural trading hub in the province.',
        'Hosts schools and a busy public market.',
        'Patroned by St. Catherine of Alexandria.',
      ],
    ),
    'Bayombong': MunicipalityInfo(
      about:
          'The capital town of Nueva Vizcaya and its educational and '
          'institutional center.',
      founded:
          'Founded by Spanish missionaries and long the seat of the '
          'provincial government.',
      trivia: [
        'Home to Saint Mary\'s University and Nueva Vizcaya State University.',
        'Seat of the Provincial Capitol.',
        'Features the historic St. Dominic Cathedral.',
      ],
    ),
    'Diadi': MunicipalityInfo(
      about:
          'The northernmost town of Nueva Vizcaya, bordering Isabela, with '
          'farmlands and emerging eco-tourism.',
      founded: 'Organized as a municipality in the 20th century.',
      trivia: [
        'A gateway between Nueva Vizcaya and Isabela.',
        'Known for its farmlands and eco-tourism sites.',
        'Home to diverse settler and Indigenous communities.',
      ],
    ),
    'Dupax del Norte': MunicipalityInfo(
      about:
          'An agro-forestry town in the south of the province, with strong '
          'Isinai heritage.',
      founded:
          'Created in 1969 when the old town of Dupax was split into Dupax '
          'del Norte and Dupax del Sur.',
      trivia: [
        'Economy built on agriculture and forestry.',
        'A stronghold of the Isinai language and culture.',
        'Features old churches and heritage sites.',
      ],
    ),
    'Dupax del Sur': MunicipalityInfo(
      about:
          'A heritage town in southern Nueva Vizcaya, home to one of the '
          'region\'s most important colonial-era churches.',
      founded:
          'Traces its origins to a 17th-century Dominican mission (old '
          'Dupax); became Dupax del Sur in 1969.',
      trivia: [
        'St. Vincent Ferrer Church is a declared National Cultural Treasure.',
        'A center of Isinai culture and language.',
        'Among the oldest settlements in the province.',
      ],
    ),
    'Kasibu': MunicipalityInfo(
      about:
          'A large, mountainous town in eastern Nueva Vizcaya known for '
          'citrus farming and mineral resources.',
      founded: 'Organized as a municipality in the 20th century.',
      trivia: [
        'A citrus capital, producing oranges and ponkan.',
        'Site of the Didipio gold-copper mine.',
        'Home to many Indigenous communities, including Bugkalot, Ifugao and '
            'Kalanguya.',
      ],
    ),
    'Kayapa': MunicipalityInfo(
      about:
          'A cool, high-elevation town on the western side of the province, '
          'famous for vegetable farming.',
      founded: 'Organized as a municipality in the 20th century.',
      trivia: [
        'Called the "Summer Capital" for its cool climate.',
        'A major highland vegetable producer.',
        'A jump-off point toward Mount Pulag.',
      ],
    ),
    'Quezon': MunicipalityInfo(
      about:
          'A town in the northeast of the province with notable mineral '
          'resources alongside agriculture.',
      founded: 'Established as a municipality in the 20th century.',
      trivia: [
        'Site of the Runruno gold-molybdenum project.',
        'Economy driven by agriculture and mining.',
        'Home to diverse settler and Indigenous communities.',
      ],
    ),
    'Santa Fe': MunicipalityInfo(
      about:
          'The mountain gateway into Nueva Vizcaya from the south, crossed by '
          'the historic Dalton Pass.',
      founded: 'Organized as a municipality in the 20th century.',
      trivia: [
        'Dalton Pass, a World War II battle site, lies on its boundary.',
        'Home to the Ikalahan/Kalanguya people and Imugan Falls.',
        'Cool, forested upland terrain.',
      ],
    ),
    'Solano': MunicipalityInfo(
      about:
          'The premier commercial center of Nueva Vizcaya and one of its most '
          'populous towns.',
      founded:
          'A long-established settlement that grew into the province\'s main '
          'trade hub.',
      trivia: [
        'The province\'s busiest commercial and shopping district.',
        'A major transport junction on the Maharlika Highway.',
        'Among the most populous municipalities in the province.',
      ],
    ),
    'Villaverde': MunicipalityInfo(
      about:
          'A primarily agricultural town near the provincial capital, '
          'formerly known as Ibung.',
      founded:
          'Formerly named Ibung; later renamed Villaverde after Fr. Juan '
          'Villaverde, a Dominican missionary and road builder.',
      trivia: [
        'Named after a missionary known for opening mountain roads and trails.',
        'Economy is largely agricultural.',
        'Located close to the provincial capital, Bayombong.',
      ],
    ),
  };

  static MunicipalityInfo? infoFor(String municipality) =>
      curated[municipality];

  /// Live, fact-checked summary from Wikipedia's REST API. Returns null on any
  /// failure (offline, timeout, disambiguation, missing page) so callers can
  /// fall back to the curated text.
  static Future<String?> fetchWikipediaSummary(String municipality) async {
    final title = Uri.encodeComponent('$municipality, Nueva Vizcaya');
    final url = Uri.parse(
        'https://en.wikipedia.org/api/rest_v1/page/summary/$title');
    try {
      final res = await http.get(
        url,
        headers: const {
          'accept': 'application/json',
          'user-agent': 'OneVizcaya/1.0 (civic app)',
        },
      ).timeout(const Duration(seconds: 8));
      // The summary endpoint returns small JSON; guard against an unexpectedly
      // large body before decoding.
      if (res.statusCode == 200 && res.bodyBytes.length <= 512 * 1024) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        if (data['type'] == 'disambiguation') return null;
        final extract = data['extract'] as String?;
        if (extract != null && extract.trim().isNotEmpty) {
          return extract.trim();
        }
      }
    } catch (_) {
      // Swallow — curated text is shown instead.
    }
    return null;
  }

  static String wikipediaUrl(String municipality) =>
      'https://en.wikipedia.org/wiki/${Uri.encodeComponent('${municipality.replaceAll(' ', '_')},_Nueva_Vizcaya')}';
}
