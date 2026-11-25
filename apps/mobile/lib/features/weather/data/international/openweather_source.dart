import '../../../../core/services/weather_service.dart';
import '../../domain/weather_models.dart';
import '../weather_source.dart';

/// The existing OpenWeather integration (through the getWeather Cloud
/// Function) behind the source interface. Its data is always labelled
/// third-party in the UI and is never called PAGASA.
class OpenWeatherSource implements InternationalSource<WeatherData> {
  const OpenWeatherSource();

  @override
  Future<WeatherData> fetch(String municipality, {double? lat, double? lon}) =>
      WeatherService.fetch(municipality, lat: lat, lon: lon);

  @override
  InternationalSummary summarize(WeatherData d) => InternationalSummary(
        tempC: d.temp,
        desc: d.condition,
        rainNextHourMm: d.hourly.isEmpty ? null : d.hourly.first.rainMm,
        fetchedAt: DateTime.now(),
      );
}
