import 'package:flutter/foundation.dart';

import '../domain/weather_models.dart';
import 'weather_source.dart';

/// Combines the official (PAGASA) and international sources according to the
/// mode (docs/weather.md §modes). Screens use only this, never a source.
///
/// Rules it enforces:
///  - The kill switch wins: when the server says `internationalOnly` (PAGASA
///    switched off or blocked), no PAGASA request is made and a user override
///    cannot turn it back on.
///  - `pagasaOnly` makes no international request at all.
///  - Alerts come from PAGASA only. If they cannot be loaded, the result says
///    so; an international source never stands in for an official warning.
///  - Values are never blended; each keeps its source.
///  - If PAGASA has nothing usable, the international source is shown instead
///    and the mode in effect becomes `internationalOnly`.
class WeatherRepository<I> {
  WeatherRepository({
    required this.pagasa,
    required this.international,
    this.staleAfter = const Duration(minutes: 45),
  });

  final PagasaSource pagasa;
  final InternationalSource<I> international;

  /// A PAGASA forecast older than this is shown but marked stale.
  final Duration staleAfter;

  AlertsState? _lastAlerts;

  Future<WeatherSnapshot<I>> load({
    required String municipality,
    double? lat,
    double? lon,
    WeatherMode? userOverride,
    DateTime? now,
  }) async {
    final at = now ?? DateTime.now();

    // 1. Which mode? Unknown (e.g. offline) is treated as PAGASA-first so
    //    cached official data can still be shown.
    WeatherMode? serverMode;
    try {
      serverMode = (await pagasa.status()).mode;
    } catch (e) {
      debugPrint('WeatherRepository: status unavailable: $e');
    }
    final WeatherMode mode = serverMode == WeatherMode.internationalOnly
        ? WeatherMode.internationalOnly
        : (userOverride ?? serverMode ?? WeatherMode.pagasaPrimary);

    // 2. Official data.
    PagasaForecast? forecast;
    var alerts = const AlertsState();
    if (mode != WeatherMode.internationalOnly) {
      try {
        alerts = await pagasa.alerts(at);
        _lastAlerts = alerts;
      } catch (e) {
        debugPrint('WeatherRepository: alerts unavailable: $e');
        // Keep the last known list for reference, flagged unavailable.
        alerts = AlertsState(
          alerts: (_lastAlerts?.alerts ?? const []).where((a) => a.isActiveAt(at)).toList(),
          available: false,
          fetchedAt: _lastAlerts?.fetchedAt,
        );
      }
      forecast = await _official(municipality, lat, lon);
      if (forecast != null && !forecast.stale && at.difference(forecast.fetchedAt) > staleAfter) {
        forecast = forecast.asStale();
      }
    }

    // 3. International data (never in pagasaOnly).
    I? intl;
    InternationalSummary? summary;
    if (mode != WeatherMode.pagasaOnly) {
      try {
        intl = await international.fetch(municipality, lat: lat, lon: lon);
        summary = international.summarize(intl as I);
      } catch (e) {
        debugPrint('WeatherRepository: international unavailable: $e');
      }
    }

    // 4. Fallback: nothing official to show, but international is there.
    final effective = (forecast == null && intl != null) ? WeatherMode.internationalOnly : mode;

    return WeatherSnapshot<I>(
      mode: effective,
      pagasa: forecast,
      alerts: alerts,
      international: intl,
      internationalSummary: summary,
      officialSourceOff: serverMode == WeatherMode.internationalOnly,
    );
  }

  /// Barangay-level when coordinates are known, else (or on failure) the
  /// town-centre forecast.
  Future<PagasaForecast?> _official(String municipality, double? lat, double? lon) async {
    if (lat != null && lon != null) {
      try {
        final p = await pagasa.pointForecast(lat, lon);
        if (p != null) return p;
      } catch (e) {
        debugPrint('WeatherRepository: point forecast unavailable: $e');
      }
    }
    try {
      return await pagasa.municipalityForecast(municipality);
    } catch (e) {
      debugPrint('WeatherRepository: municipality forecast unavailable: $e');
      return null;
    }
  }
}
