import 'weather_service.dart';

/// Plain-language weather guidance derived from the forecast numbers the app
/// already has.
///
/// IMPORTANT — these are NOT official warnings. PDRRMO's review (§2) requires
/// that the source and verification of emergency information be clearly
/// established, so nothing here may look like a PAGASA bulletin, a tropical
/// cyclone wind signal, or an official advisory. The wording is deliberately
/// conditional ("may", "consider", "watch for") and every message is labelled
/// in the UI as app guidance derived from forecast data, not as a warning
/// issued by an authority. Official PAGASA bulletins, when that integration is
/// authorised, must be presented separately and attributed to PAGASA.
///
/// Thresholds are tuned for Nueva Vizcaya: a mountainous, landslide-prone
/// province where sustained rain matters more than a single heavy hour.
enum AdvisorySeverity { info, caution, warning }

class WeatherAdvisory {
  final AdvisorySeverity severity;
  final String headline;
  final String body;

  const WeatherAdvisory(this.severity, this.headline, this.body);
}

class WeatherAdvisor {
  /// Ranked guidance for the current conditions, most severe first.
  /// Returns at most [limit] items; never returns an empty list.
  static List<WeatherAdvisory> advise(WeatherData d, {int limit = 3}) {
    final out = <WeatherAdvisory>[];

    final main = d.conditionMain.toLowerCase();
    final rain6h = _rainNextHours(d, 6);
    final rain24h = _rainNextHours(d, 24);
    final peakPop = _peakPop(d, 12);
    final heatIndex = d.feelsLike;
    final windKph = d.windSpeed * 3.6;

    // ── Rain / flood / landslide ────────────────────────────────────────────
    if (rain24h >= 100) {
      out.add(WeatherAdvisory(
        AdvisorySeverity.warning,
        'Heavy rain expected',
        'Around ${rain24h.round()} mm of rain is forecast over the next 24 hours. '
            'Low-lying areas may flood and saturated slopes can give way. Check official '
            'PAGASA and PDRRMO advisories before travelling.',
      ));
    } else if (rain24h >= 50) {
      out.add(WeatherAdvisory(
        AdvisorySeverity.caution,
        'Sustained rain likely',
        'About ${rain24h.round()} mm expected over 24 hours. Rivers and creeks may rise, '
            'and mountain roads can be slippery. Allow extra travel time.',
      ));
    } else if (rain6h >= 15) {
      out.add(WeatherAdvisory(
        AdvisorySeverity.caution,
        'Downpours in the next few hours',
        'Roughly ${rain6h.round()} mm in the next 6 hours. Expect sudden heavy showers '
            'and poor road visibility.',
      ));
    } else if (peakPop >= 0.7) {
      out.add(WeatherAdvisory(
        AdvisorySeverity.info,
        'Rain very likely today',
        '${(peakPop * 100).round()}% chance of rain within 12 hours. Bring a raincoat '
            'or umbrella.',
      ));
    } else if (peakPop >= 0.4) {
      out.add(WeatherAdvisory(
        AdvisorySeverity.info,
        'Passing showers possible',
        'A ${(peakPop * 100).round()}% chance of showers later. Mostly a day to carry '
            'an umbrella just in case.',
      ));
    }

    // ── Thunderstorms ───────────────────────────────────────────────────────
    if (main.contains('thunder')) {
      out.add(const WeatherAdvisory(
        AdvisorySeverity.warning,
        'Thunderstorms in the area',
        'Lightning is possible. Stay indoors during the storm, avoid open fields, '
            'tall isolated trees and riverbanks, and unplug sensitive appliances.',
      ));
    }

    // ── Wind ────────────────────────────────────────────────────────────────
    if (windKph >= 60) {
      out.add(WeatherAdvisory(
        AdvisorySeverity.warning,
        'Strong winds',
        'Winds near ${windKph.round()} km/h. Secure light roofing, signage and loose '
            'items. Motorcycles and light vehicles may be unstable on exposed roads.',
      ));
    } else if (windKph >= 38) {
      out.add(WeatherAdvisory(
        AdvisorySeverity.caution,
        'Gusty conditions',
        'Winds around ${windKph.round()} km/h. Take care on ridgelines and bridges, '
            'and secure anything light outdoors.',
      ));
    }

    // ── Heat ────────────────────────────────────────────────────────────────
    if (heatIndex >= 41) {
      out.add(WeatherAdvisory(
        AdvisorySeverity.warning,
        'Dangerous heat',
        'Feels like ${heatIndex.round()}°C. Heat cramps and exhaustion are likely with '
            'prolonged exposure. Avoid outdoor work between 10 AM and 3 PM and drink '
            'water often.',
      ));
    } else if (heatIndex >= 33) {
      out.add(WeatherAdvisory(
        AdvisorySeverity.caution,
        'Hot and humid',
        'Feels like ${heatIndex.round()}°C with ${d.humidity}% humidity. Take shade '
            'breaks if you are working outdoors, and keep drinking water.',
      ));
    }

    // ── UV ──────────────────────────────────────────────────────────────────
    if (d.uvIndex >= 11) {
      out.add(WeatherAdvisory(
        AdvisorySeverity.warning,
        'Extreme UV',
        'UV index ${d.uvIndex.round()}. Unprotected skin can burn within minutes '
            'around midday. Cover up and stay in shade where you can.',
      ));
    } else if (d.uvIndex >= 8) {
      out.add(WeatherAdvisory(
        AdvisorySeverity.caution,
        'Very high UV',
        'UV index ${d.uvIndex.round()}. Use sunscreen, a hat and long sleeves if you '
            'will be outside for long.',
      ));
    }

    // ── Visibility / fog ────────────────────────────────────────────────────
    if (d.visibility > 0 && d.visibility < 2000) {
      out.add(WeatherAdvisory(
        AdvisorySeverity.caution,
        'Low visibility',
        'Visibility is down to about ${(d.visibility / 1000).toStringAsFixed(1)} km. '
            'Use headlights and slow down, especially on mountain roads.',
      ));
    } else if (main.contains('fog') || main.contains('mist')) {
      out.add(const WeatherAdvisory(
        AdvisorySeverity.info,
        'Misty conditions',
        'Patchy fog around. Drive with headlights on and keep extra distance.',
      ));
    }

    // ── Air quality ─────────────────────────────────────────────────────────
    if (d.aqi >= 5) {
      out.add(const WeatherAdvisory(
        AdvisorySeverity.caution,
        'Poor air quality',
        'Air quality is very poor. Those with asthma or heart conditions should limit '
            'time outdoors.',
      ));
    } else if (d.aqi == 4) {
      out.add(const WeatherAdvisory(
        AdvisorySeverity.info,
        'Reduced air quality',
        'Air quality is below normal. Sensitive groups may want to shorten strenuous '
            'outdoor activity.',
      ));
    }

    // ── Cool nights (upland municipalities) ─────────────────────────────────
    if (d.tempMin <= 18) {
      out.add(WeatherAdvisory(
        AdvisorySeverity.info,
        'Cool tonight',
        'Dropping to around ${d.tempMin.round()}°C. Warmer clothing for early mornings '
            'in the uplands.',
      ));
    }

    // ── Nothing notable: say so, with variety ───────────────────────────────
    if (out.isEmpty) {
      out.add(_calmAdvisory(d));
    }

    out.sort((a, b) => b.severity.index.compareTo(a.severity.index));
    return out.take(limit).toList();
  }

  /// A one-line summary that actually varies with conditions, replacing the
  /// single `"<Condition>. Highs X and lows Y."` template that produced the
  /// same sentence almost every day.
  static String summaryLine(WeatherData d) {
    final main = d.conditionMain.toLowerCase();
    final cond = _capitalize(d.condition);
    final hi = d.daily.isNotEmpty ? d.daily.first.tempMax.round() : d.tempMax.round();
    final lo = d.daily.isNotEmpty ? d.daily.first.tempMin.round() : d.tempMin.round();
    final peakPop = _peakPop(d, 12);
    final rain6h = _rainNextHours(d, 6);
    final windKph = d.windSpeed * 3.6;

    // Lead with whatever is actually the most notable thing today.
    if (main.contains('thunder')) {
      return '$cond. Thunderstorms possible — highs $hi°C, lows $lo°C.';
    }
    if (rain6h >= 15) {
      return '$cond. Around ${rain6h.round()} mm of rain expected in the next few hours.';
    }
    if (peakPop >= 0.7) {
      return '$cond with a ${(peakPop * 100).round()}% chance of rain. Highs $hi°C.';
    }
    if (windKph >= 38) {
      return '$cond and breezy at ${windKph.round()} km/h. Highs $hi°C, lows $lo°C.';
    }
    if (d.feelsLike >= 33) {
      return '$cond and humid — feels like ${d.feelsLike.round()}°C. Highs $hi°C.';
    }
    if (d.uvIndex >= 8) {
      return '$cond with very high UV (${d.uvIndex.round()}). Highs $hi°C, lows $lo°C.';
    }
    if (lo <= 18) {
      return '$cond. Cool night ahead at $lo°C, highs $hi°C.';
    }
    return '$cond. Highs $hi°C and lows $lo°C.';
  }

  // Rotates calm-day wording by day-of-year so a quiet week does not show the
  // identical sentence every morning.
  static WeatherAdvisory _calmAdvisory(WeatherData d) {
    final options = <WeatherAdvisory>[
      WeatherAdvisory(
        AdvisorySeverity.info,
        'Settled conditions',
        'No significant weather expected. Around ${d.temp.round()}°C with '
            '${d.humidity}% humidity.',
      ),
      const WeatherAdvisory(
        AdvisorySeverity.info,
        'A good day to get things done',
        'Nothing severe in the forecast. Still worth checking again later if you '
            'have travel planned.',
      ),
      WeatherAdvisory(
        AdvisorySeverity.info,
        'Quiet weather',
        'Calm conditions across ${d.locationName}. Winds are light at '
            '${(d.windSpeed * 3.6).round()} km/h.',
      ),
      const WeatherAdvisory(
        AdvisorySeverity.info,
        'No advisories right now',
        'Conditions look normal. Official warnings, when issued, always come from '
            'PAGASA and PDRRMO.',
      ),
    ];
    final doy = DateTime.now().difference(DateTime(DateTime.now().year)).inDays;
    return options[doy % options.length];
  }

  /// Total forecast rainfall (mm) across the next [hours] hours.
  static double _rainNextHours(WeatherData d, int hours) {
    final cutoff = DateTime.now().add(Duration(hours: hours));
    return d.hourly
        .where((h) => h.time.isAfter(DateTime.now()) && h.time.isBefore(cutoff))
        .fold<double>(0, (sum, h) => sum + h.rainMm);
  }

  /// Highest probability of precipitation (0–1) within the next [hours] hours.
  static double _peakPop(WeatherData d, int hours) {
    final cutoff = DateTime.now().add(Duration(hours: hours));
    final slice = d.hourly
        .where((h) => h.time.isAfter(DateTime.now()) && h.time.isBefore(cutoff));
    if (slice.isEmpty) return 0;
    return slice.map((h) => h.pop).reduce((a, b) => a > b ? a : b);
  }

  static String _capitalize(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}
