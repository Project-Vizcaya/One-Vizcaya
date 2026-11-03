import 'package:cloud_firestore/cloud_firestore.dart';

/// Official PAGASA products for Nueva Vizcaya, as written to
/// `pagasa_products/nueva_vizcaya` by the `pagasaRegionalWatch` Cloud Function
/// (source: PAGASA Northern Luzon PRSD regional forecast page).
///
/// Coverage matters: the provincial forecast and outlook cover the PROVINCE of
/// Nueva Vizcaya; the synopsis, rainfall and thunderstorm products cover the
/// Northern Luzon REGION. Nothing here is a municipal station observation.
/// Missing values stay null and must be shown as absent, never filled in.

DateTime? _time(dynamic v) {
  if (v is Timestamp) return v.toDate();
  if (v is String) return DateTime.tryParse(v);
  return null;
}

Map<String, dynamic>? _map(dynamic v) =>
    v is Map ? Map<String, dynamic>.from(v) : null;

class PagasaCoverage {
  final String level; // "province" | "region"
  final String name;
  final String? psgc;
  const PagasaCoverage(this.level, this.name, this.psgc);

  static PagasaCoverage? from(dynamic v) {
    final m = _map(v);
    if (m == null) return null;
    return PagasaCoverage(
      m['level'] as String? ?? '',
      m['name'] as String? ?? '',
      m['psgc'] as String?,
    );
  }
}

class PagasaPeriod {
  final String? description;
  final num? high;
  final num? low;
  final String? windSpeed;
  final String? windDirection;
  const PagasaPeriod(
      this.description, this.high, this.low, this.windSpeed, this.windDirection);

  static PagasaPeriod? from(dynamic v) {
    final m = _map(v);
    if (m == null) return null;
    return PagasaPeriod(
      m['description'] as String?,
      m['high'] as num?,
      m['low'] as num?,
      m['windSpeed'] as String?,
      m['windDirection'] as String?,
    );
  }
}

class PagasaOutlookDay {
  final String? label; // weekday as published, e.g. "Tuesday"
  final String? date; // yyyy-mm-dd, Philippine calendar date
  final PagasaPeriod period;
  const PagasaOutlookDay(this.label, this.date, this.period);
}

class PagasaThunderstorm {
  /// From PAGASA's own title wording: advisory | watch | information | other.
  final String kind;
  final String? title;
  final DateTime? issuedAt;

  /// Only when the item itself states a window ("within 12 hours").
  final DateTime? validUntil;
  final String text; // verbatim
  final bool mentionsNuevaVizcaya;
  const PagasaThunderstorm(this.kind, this.title, this.issuedAt,
      this.validUntil, this.text, this.mentionsNuevaVizcaya);

  /// Expired only when PAGASA's stated window has passed. With no stated
  /// window it is never called expired — the UI says validity is not stated.
  bool isExpired(DateTime now) => validUntil != null && now.isAfter(validUntil!);
}

class PagasaProduct {
  final String sourceUrl;
  final String office;
  final DateTime? retrievedAt;
  final DateTime? lastSuccessAt;
  final DateTime? lastErrorAt;

  final PagasaCoverage? forecastCoverage;
  final DateTime? forecastIssuedAt;
  final DateTime? forecastValidUntil;
  final PagasaPeriod? day;
  final PagasaPeriod? night;

  final DateTime? outlookIssuedAt;
  final List<PagasaOutlookDay> outlook;

  final PagasaCoverage? synopsisCoverage;
  final DateTime? synopsisIssuedAt;
  final DateTime? synopsisValidUntil;
  final String? synopsisText;
  final bool synopsisMentionsTropicalCyclone;

  final PagasaCoverage? rainfallCoverage;
  final String? rainfallText;
  final bool? rainfallNoneIssued;

  final PagasaCoverage? thunderstormCoverage;
  final List<PagasaThunderstorm> thunderstorms;

  const PagasaProduct({
    required this.sourceUrl,
    required this.office,
    this.retrievedAt,
    this.lastSuccessAt,
    this.lastErrorAt,
    this.forecastCoverage,
    this.forecastIssuedAt,
    this.forecastValidUntil,
    this.day,
    this.night,
    this.outlookIssuedAt,
    this.outlook = const [],
    this.synopsisCoverage,
    this.synopsisIssuedAt,
    this.synopsisValidUntil,
    this.synopsisText,
    this.synopsisMentionsTropicalCyclone = false,
    this.rainfallCoverage,
    this.rainfallText,
    this.rainfallNoneIssued,
    this.thunderstormCoverage,
    this.thunderstorms = const [],
  });

  /// True only when a real provincial forecast has been retrieved at least once.
  bool get hasForecast => day != null || night != null;

  factory PagasaProduct.fromMap(Map<String, dynamic> m) {
    final f = _map(m['provincialForecast']);
    final o = _map(m['extendedOutlook']);
    final s = _map(m['synopsis']);
    final r = _map(m['rainfallWarning']);
    final t = _map(m['thunderstorms']);

    final days = <PagasaOutlookDay>[];
    for (final d in (o?['days'] as List? ?? const [])) {
      final dm = _map(d);
      final p = PagasaPeriod.from(dm);
      if (dm != null && p != null) {
        days.add(PagasaOutlookDay(dm['label'] as String?, dm['date'] as String?, p));
      }
    }

    final items = <PagasaThunderstorm>[];
    for (final i in (t?['items'] as List? ?? const [])) {
      final im = _map(i);
      final text = im?['text'] as String?;
      if (im == null || text == null || text.isEmpty) continue;
      items.add(PagasaThunderstorm(
        im['kind'] as String? ?? 'other',
        im['title'] as String?,
        _time(im['issuedAt']),
        _time(im['validUntil']),
        text,
        im['mentionsNuevaVizcaya'] == true,
      ));
    }

    return PagasaProduct(
      sourceUrl: m['sourceUrl'] as String? ??
          'https://www.pagasa.dost.gov.ph/regional-forecast/nlprsd',
      office: m['office'] as String? ?? 'PAGASA',
      retrievedAt: _time(m['retrievedAt']),
      lastSuccessAt: _time(m['lastSuccessAt']),
      lastErrorAt: _time(m['lastErrorAt']),
      forecastCoverage: PagasaCoverage.from(f?['coverage']),
      forecastIssuedAt: _time(f?['issuedAt']),
      forecastValidUntil: _time(f?['validUntil']),
      day: PagasaPeriod.from(f?['day']),
      night: PagasaPeriod.from(f?['night']),
      outlookIssuedAt: _time(o?['issuedAt']),
      outlook: days,
      synopsisCoverage: PagasaCoverage.from(s?['coverage']),
      synopsisIssuedAt: _time(s?['issuedAt']),
      synopsisValidUntil: _time(s?['validUntil']),
      synopsisText: s?['text'] as String?,
      synopsisMentionsTropicalCyclone: s?['mentionsTropicalCyclone'] == true,
      rainfallCoverage: PagasaCoverage.from(r?['coverage']),
      rainfallText: r?['text'] as String?,
      rainfallNoneIssued: r?['noneIssued'] as bool?,
      thunderstormCoverage: PagasaCoverage.from(t?['coverage']),
      thunderstorms: items,
    );
  }
}

/// Overall freshness of the stored document, from real retrieval times.
enum PagasaFreshness { updated, cached, stale, unavailable }

/// The Cloud Function runs hourly. Two missed runs still counts as current;
/// beyond six hours the data is called stale. These are One Vizcaya's own
/// display thresholds, not PAGASA's — PAGASA's validity periods are shown
/// separately, per product.
PagasaFreshness pagasaFreshness(PagasaProduct? p, DateTime now) {
  if (p == null || !p.hasForecast) return PagasaFreshness.unavailable;
  final last = p.lastSuccessAt ?? p.retrievedAt;
  if (last == null) return PagasaFreshness.unavailable;
  final age = now.difference(last);
  if (age > const Duration(hours: 6)) return PagasaFreshness.stale;
  final failedSince = p.lastErrorAt != null && p.lastErrorAt!.isAfter(last);
  if (failedSince || age > const Duration(hours: 2)) return PagasaFreshness.cached;
  return PagasaFreshness.updated;
}
