import '../domain/weather_models.dart';

/// What the server says about the PAGASA source right now.
class PagasaStatus {
  /// The mode apps should use; `internationalOnly` when PAGASA is switched
  /// off or blocked.
  final WeatherMode mode;
  const PagasaStatus(this.mode);
}

/// The official source. Implementations never contact PAGASA directly: they
/// read One Vizcaya's server copy (see docs/weather.md).
abstract class PagasaSource {
  Future<PagasaStatus> status();

  /// Barangay-level forecast for the coordinates; null when unavailable.
  Future<PagasaForecast?> pointForecast(double lat, double lon);

  /// Town-centre forecast for a municipality; null when unavailable.
  Future<PagasaForecast?> municipalityForecast(String municipality);

  /// Active Nueva Vizcaya alerts and when they were fetched. Throws when
  /// they cannot be loaded.
  Future<AlertsState> alerts(DateTime now);
}

/// The international provider, behind one call. [I] is its own model.
abstract class InternationalSource<I> {
  Future<I> fetch(String municipality, {double? lat, double? lon});
  InternationalSummary summarize(I data);
}
