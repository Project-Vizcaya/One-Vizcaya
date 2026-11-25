import '../../domain/weather_models.dart';

/// Maps the normalized documents written by the server (apps/functions/
/// pagasa-mobile/parse.js) to domain models. The server already parsed
/// PAGASA's display strings; this stays defensive anyway: any field may be
/// missing or of the wrong type, and one bad field never drops a record.

double? _num(Object? v) => v is num ? v.toDouble() : null;
String? _str(Object? v) => v is String && v.trim().isNotEmpty ? v : null;
DateTime? _ms(Object? v) => v is num && v > 0 ? DateTime.fromMillisecondsSinceEpoch(v.toInt()) : null;
Map<String, dynamic> _map(Object? v) => v is Map ? Map<String, dynamic>.from(v) : const {};
List<Map<String, dynamic>> _list(Object? v) =>
    v is List ? v.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList() : const [];

WeatherPoint? _point(Object? v) {
  if (v is! Map) return null;
  final m = _map(v);
  return WeatherPoint(
    source: WeatherSourceId.pagasa,
    time: _ms(m['timeMs']),
    timeLabel: _str(m['timeLabel']),
    iconUrl: _str(m['icon']),
    desc: _str(m['desc']),
    tempC: _num(m['tempC']),
    rainMm: _num(m['rainMm']),
    rainDesc: _str(m['rainDesc']),
    rainColor: _str(m['rainColor']),
    heatIndexC: _num(m['heatIndexC']),
    heatIndexDesc: _str(m['heatIndexDesc']),
    heatIndexColor: _str(m['heatIndexColor']),
  );
}

DailyPoint _day(Map<String, dynamic> m) => DailyPoint(
      source: WeatherSourceId.pagasa,
      dayLabel: _str(m['dayLabel']),
      dateLabel: _str(m['dateLabel']),
      iconUrl: _str(m['icon']),
      desc: _str(m['desc']),
      rainMm: _num(m['rainMm']),
      rainDesc: _str(m['rainDesc']),
      rainColor: _str(m['rainColor']),
      tempMaxC: _num(m['tempMaxC']),
      tempMinC: _num(m['tempMinC']),
      heatIndexMaxC: _num(m['heatIndexMaxC']),
      heatIndexMaxDesc: _str(m['heatIndexMaxDesc']),
      heatIndexMaxColor: _str(m['heatIndexMaxColor']),
    );

List<StationReading> _stations(Object? v) => _list(v)
    .map((s) {
      final r = _map(s['reading']);
      final id = _num(s['siteId']);
      if (id == null) return null;
      return StationReading(
        siteId: id.toInt(),
        name: _str(s['name']) ?? _str(r['name']) ?? 'PAGASA station',
        distanceKm: (_num(s['distanceKm']) ?? 0).round(),
        observedAt: _ms(r['observedAtMs']),
        tempC: _num(r['tempC']),
        humidityPct: _num(r['humidityPct']),
        rain1hMm: _num(r['rain1hMm']),
        heatIndexC: _num(r['heatIndexC']),
        desc: _str(r['desc']),
      );
    })
    .whereType<StationReading>()
    .toList();

/// [data] has `forecast`, `stations`, `fetchedAtMs` and optionally `stale`:
/// the getPagasaForecast result, or a weather_pagasa/muni_* document.
/// Returns null when there is nothing usable.
PagasaForecast? pagasaForecastFromMap(Map<String, dynamic> data, {bool municipalityLevel = false}) {
  final f = _map(data['forecast']);
  final fetched = _ms(data['fetchedAtMs']);
  if (f.isEmpty || fetched == null) return null;
  final current = _point(f['current']);
  final hourly = _list(f['hourly']).map(_point).whereType<WeatherPoint>().toList();
  final daily = _list(f['daily']).map(_day).toList();
  if (current == null && hourly.isEmpty && daily.isEmpty) return null;
  final place = _map(f['place']);
  final links = _map(f['links']);
  return PagasaForecast(
    fetchedAt: fetched,
    barangay: _str(place['barangay']),
    municipality: _str(place['municipality']) ?? _str(data['municipality']),
    current: current,
    hourly: hourly,
    daily: daily,
    stations: _stations(data['stations']),
    stale: data['stale'] == true,
    municipalityLevel: municipalityLevel,
    rainMapUrl: _str(links['rainMap']),
    briefingUrl: _str(links['briefing']),
  );
}

/// weather_pagasa/alerts -> the active Nueva Vizcaya alerts. The server has
/// already filtered and sorted them; expiry is re-checked against [now]
/// because the document can be a few minutes old.
List<WeatherAlert> pagasaAlertsFromMap(Map<String, dynamic> data, DateTime now) => _list(data['active'])
    .map((a) => WeatherAlert(
          id: _str(a['id']) ?? '${a['title']}',
          title: _str(a['title']) ?? 'Weather advisory',
          message: _str(a['message']) ?? '',
          type: _str(a['type']),
          issuedBy: _str(a['issuedBy']),
          issuedAt: _ms(a['issuedAtMs']),
          validUntil: _ms(a['validUntilMs']),
          priority: (_num(a['priority']) ?? 0).toInt(),
        ))
    .where((a) => a.isActiveAt(now))
    .toList();
