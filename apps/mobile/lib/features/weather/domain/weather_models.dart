/// Source-neutral weather models (docs/weather.md). Every value carries the
/// source it came from; the two sources are never averaged or blended.
library;

enum WeatherSourceId { pagasa, international }

/// How the two sources are combined. Set server-side
/// (weather_pagasa/_status.mode), with an optional per-user override.
enum WeatherMode {
  /// PAGASA for everything it provides; international fills the gaps.
  pagasaPrimary,

  /// No international calls at all.
  pagasaOnly,

  /// Both readings shown next to each other.
  sideBySide,

  /// PAGASA switched off, blocked or down.
  internationalOnly;

  static WeatherMode parse(String? s) => WeatherMode.values
      .firstWhere((m) => m.name == s, orElse: () => WeatherMode.internationalOnly);
}

class WeatherPoint {
  final WeatherSourceId source;
  final DateTime? time; // null for "now"
  final String? timeLabel;
  final String? iconUrl;
  final String? desc;
  final double? tempC;
  final double? rainMm;

  /// PAGASA's own rainfall category and colour, shown as-is.
  final String? rainDesc;
  final String? rainColor;
  final double? heatIndexC;

  /// PAGASA's own heat-index category and colour, shown as-is.
  final String? heatIndexDesc;
  final String? heatIndexColor;

  const WeatherPoint({
    required this.source,
    this.time,
    this.timeLabel,
    this.iconUrl,
    this.desc,
    this.tempC,
    this.rainMm,
    this.rainDesc,
    this.rainColor,
    this.heatIndexC,
    this.heatIndexDesc,
    this.heatIndexColor,
  });
}

class DailyPoint {
  final WeatherSourceId source;
  final String? dayLabel;
  final String? dateLabel;
  final String? iconUrl;
  final String? desc;
  final double? rainMm;
  final String? rainDesc;
  final String? rainColor;
  final double? tempMaxC;
  final double? tempMinC;
  final double? heatIndexMaxC;
  final String? heatIndexMaxDesc;
  final String? heatIndexMaxColor;

  const DailyPoint({
    required this.source,
    this.dayLabel,
    this.dateLabel,
    this.iconUrl,
    this.desc,
    this.rainMm,
    this.rainDesc,
    this.rainColor,
    this.tempMaxC,
    this.tempMinC,
    this.heatIndexMaxC,
    this.heatIndexMaxDesc,
    this.heatIndexMaxColor,
  });
}

class StationReading {
  final int siteId;
  final String name;
  final int distanceKm;
  final DateTime? observedAt;
  final double? tempC;
  final double? humidityPct;
  final double? rain1hMm;
  final double? heatIndexC;
  final String? desc;

  const StationReading({
    required this.siteId,
    required this.name,
    required this.distanceKm,
    this.observedAt,
    this.tempC,
    this.humidityPct,
    this.rain1hMm,
    this.heatIndexC,
    this.desc,
  });
}

/// An official PAGASA warning or advisory. Never sourced from anywhere else.
class WeatherAlert {
  final String id;
  final String title;
  final String? type;
  final String? issuedBy;
  final DateTime? issuedAt;
  final DateTime? validUntil;
  final String message;
  final int priority;

  const WeatherAlert({
    required this.id,
    required this.title,
    required this.message,
    this.type,
    this.issuedBy,
    this.issuedAt,
    this.validUntil,
    this.priority = 0,
  });

  bool isActiveAt(DateTime now) => validUntil == null || validUntil!.isAfter(now);
}

/// PAGASA's forecast for one place.
class PagasaForecast {
  final String? barangay;
  final String? municipality;
  final WeatherPoint? current;
  final List<WeatherPoint> hourly;
  final List<DailyPoint> daily;
  final List<StationReading> stations;
  final DateTime fetchedAt;

  /// True when this is the last good data after a failed refresh.
  final bool stale;

  /// True when it is the town-centre forecast rather than the user's own spot.
  final bool municipalityLevel;
  final String? rainMapUrl;
  final String? briefingUrl;

  const PagasaForecast({
    required this.fetchedAt,
    this.barangay,
    this.municipality,
    this.current,
    this.hourly = const [],
    this.daily = const [],
    this.stations = const [],
    this.stale = false,
    this.municipalityLevel = false,
    this.rainMapUrl,
    this.briefingUrl,
  });

  PagasaForecast asStale() => PagasaForecast(
        fetchedAt: fetchedAt,
        barangay: barangay,
        municipality: municipality,
        current: current,
        hourly: hourly,
        daily: daily,
        stations: stations,
        stale: true,
        municipalityLevel: municipalityLevel,
        rainMapUrl: rainMapUrl,
        briefingUrl: briefingUrl,
      );
}

/// Official alerts and whether they could be loaded.
class AlertsState {
  final List<WeatherAlert> alerts;

  /// False when PAGASA alerts could not be refreshed: the UI then says
  /// "Official alerts unavailable" and never substitutes another source.
  final bool available;
  final DateTime? fetchedAt;

  const AlertsState({this.alerts = const [], this.available = false, this.fetchedAt});
}

/// The international source's reading, reduced to what is compared or used to
/// fill gaps. (The existing OpenWeather sections render their own model.)
class InternationalSummary {
  final double tempC;
  final String desc;
  final double? rainNextHourMm;
  final DateTime fetchedAt;

  const InternationalSummary({
    required this.tempC,
    required this.desc,
    required this.fetchedAt,
    this.rainNextHourMm,
  });
}

/// Everything the weather screen needs, with the mode actually in effect.
class WeatherSnapshot<I> {
  /// The mode in effect after the kill switch, blocks and failures.
  final WeatherMode mode;
  final PagasaForecast? pagasa;
  final AlertsState alerts;

  /// The international provider's own model (null when not fetched or failed).
  final I? international;
  final InternationalSummary? internationalSummary;

  /// True when the server has the PAGASA source switched off or paused (as
  /// opposed to it failing): the UI then shows nothing about PAGASA at all.
  final bool officialSourceOff;

  const WeatherSnapshot({
    required this.mode,
    required this.alerts,
    this.pagasa,
    this.international,
    this.internationalSummary,
    this.officialSourceOff = false,
  });

  bool get showsPagasa => pagasa != null && mode != WeatherMode.internationalOnly;

  /// Side-by-side hint: temperatures more than 3 °C apart, or one source
  /// reports rain and the other none.
  bool get sourcesDiffer {
    final p = pagasa?.current;
    final i = internationalSummary;
    if (p == null || i == null) return false;
    if (p.tempC != null && (p.tempC! - i.tempC).abs() > 3) return true;
    final pRain = (p.rainMm ?? 0) > 0;
    final iRain = (i.rainNextHourMm ?? 0) > 0;
    return p.rainMm != null && i.rainNextHourMm != null && pRain != iRain;
  }
}
