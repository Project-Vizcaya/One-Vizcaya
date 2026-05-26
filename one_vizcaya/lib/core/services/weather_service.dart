import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;
import 'package:one_vizcaya/secrets.dart';

class HourlyForecast {
  final DateTime time;
  final double temp;
  final double pop;
  final double rainMm;
  final String iconCode;

  const HourlyForecast({
    required this.time,
    required this.temp,
    required this.pop,
    required this.rainMm,
    required this.iconCode,
  });
}

class DailyForecast {
  final DateTime date;
  final double tempMin;
  final double tempMax;
  final double pop;
  final String iconCode;
  final String description;

  const DailyForecast({
    required this.date,
    required this.tempMin,
    required this.tempMax,
    required this.pop,
    required this.iconCode,
    required this.description,
  });
}

class WeatherData {
  final String locationName;
  final double lat;
  final double lon;
  final double temp;
  final double feelsLike;
  final double tempMin;
  final double tempMax;
  final String condition;
  final String conditionMain;
  final String iconCode;
  final int humidity;
  final int pressure;
  final int windDeg;
  final double uvIndex;
  final double windSpeed;
  final double dewPoint;
  final int visibility;
  final DateTime sunrise;
  final DateTime sunset;
  final int aqi;
  final List<HourlyForecast> hourly;
  final List<DailyForecast> daily;
  final bool isOffline;

  const WeatherData({
    required this.locationName,
    required this.lat,
    required this.lon,
    required this.temp,
    required this.feelsLike,
    required this.tempMin,
    required this.tempMax,
    required this.condition,
    required this.conditionMain,
    required this.iconCode,
    required this.humidity,
    required this.pressure,
    required this.windDeg,
    required this.uvIndex,
    required this.windSpeed,
    required this.dewPoint,
    required this.visibility,
    required this.sunrise,
    required this.sunset,
    required this.aqi,
    required this.hourly,
    required this.daily,
    required this.isOffline,
  });
}

class WeatherService {
  static const Map<String, List<double>> _municipalityCoords = {
    'Bambang': [16.3833, 121.0667],
    'Bayombong': [16.4833, 121.1500],
    'Solano': [16.5167, 121.1833],
    'Aritao': [16.3000, 121.0333],
    'Bagabag': [16.5833, 121.2333],
    'Villaverde': [16.6500, 121.2667],
    'Diadi': [16.6000, 121.3000],
    'Quezon': [16.2333, 121.0167],
    'Santa Fe': [16.1667, 120.9833],
    'Ambaguio': [16.2167, 121.1167],
    'Kasibu': [16.3167, 121.2667],
    'Dupax del Norte': [16.5000, 121.1000],
    'Dupax del Sur': [16.4667, 121.0833],
    'Alfonso Castañeda': [16.1833, 121.2167],
    'Kayapa': [16.3500, 120.9167],
  };

  static double _calcDewPoint(double temp, int humidity) {
    const a = 17.625, b = 243.04;
    final alpha = (a * temp) / (b + temp) + log(humidity / 100.0);
    return (b * alpha) / (a - alpha);
  }

  static Future<WeatherData> fetch(
    String municipality, {
    double? lat,
    double? lon,
  }) async {
    final coords = _municipalityCoords[municipality] ?? [16.4833, 121.1500];
    final double useLat = lat ?? coords[0];
    final double useLon = lon ?? coords[1];
    final apiKey = openWeatherApiKey;

    final currentUrl = Uri.parse(
      'https://api.openweathermap.org/data/2.5/weather'
      '?lat=$useLat&lon=$useLon&appid=$apiKey&units=metric',
    );
    final forecastUrl = Uri.parse(
      'https://api.openweathermap.org/data/2.5/forecast'
      '?lat=$useLat&lon=$useLon&appid=$apiKey&units=metric',
    );
    final aqiUrl = Uri.parse(
      'https://api.openweathermap.org/data/2.5/air_pollution'
      '?lat=$useLat&lon=$useLon&appid=$apiKey',
    );
    final uviUrl = Uri.parse(
      'https://api.openweathermap.org/data/2.5/uvi'
      '?lat=$useLat&lon=$useLon&appid=$apiKey',
    );

    final results = await Future.wait([
      http.get(currentUrl).timeout(const Duration(seconds: 12)),
      http.get(forecastUrl).timeout(const Duration(seconds: 12)),
      http.get(aqiUrl).timeout(const Duration(seconds: 12)),
      http.get(uviUrl).timeout(const Duration(seconds: 12)),
    ]);

    final currentResp = results[0];
    final forecastResp = results[1];
    final aqiResp = results[2];
    final uviResp = results[3];

    if (currentResp.statusCode != 200) {
      throw Exception('Current weather API error ${currentResp.statusCode}');
    }
    if (forecastResp.statusCode != 200) {
      throw Exception('Forecast API error ${forecastResp.statusCode}');
    }

    final currentData = json.decode(currentResp.body) as Map<String, dynamic>;
    final forecastData = json.decode(forecastResp.body) as Map<String, dynamic>;

    double uviValue = 0.0;
    if (uviResp.statusCode == 200) {
      final uviData = json.decode(uviResp.body) as Map<String, dynamic>;
      uviValue = (uviData['value'] as num?)?.toDouble() ?? 0.0;
    }

    int aqiValue = 1;
    if (aqiResp.statusCode == 200) {
      final aqiData = json.decode(aqiResp.body) as Map<String, dynamic>;
      final list = aqiData['list'] as List<dynamic>?;
      if (list != null && list.isNotEmpty) {
        final mainAqi = list[0]['main'] as Map<String, dynamic>?;
        aqiValue = (mainAqi?['aqi'] as num?)?.toInt() ?? 1;
      }
    }

    final weather = currentData['weather'][0] as Map<String, dynamic>;
    final mainData = currentData['main'] as Map<String, dynamic>;
    final windData = currentData['wind'] as Map<String, dynamic>;
    final sysData = currentData['sys'] as Map<String, dynamic>;

    final temp = (mainData['temp'] as num).toDouble();
    final feelsLike = (mainData['feels_like'] as num).toDouble();
    final tempMin = (mainData['temp_min'] as num).toDouble();
    final tempMax = (mainData['temp_max'] as num).toDouble();
    final humidity = (mainData['humidity'] as num).toInt();
    final pressure = (mainData['pressure'] as num).toInt();
    final windSpeed = (windData['speed'] as num).toDouble();
    final windDeg = (windData['deg'] as num?)?.toInt() ?? 0;
    final visibility = (currentData['visibility'] as num?)?.toInt() ?? 10000;
    final locationName = currentData['name'] as String? ?? municipality;
    final condition = weather['description'] as String;
    final conditionMain = weather['main'] as String;
    final iconCode = weather['icon'] as String;
    final sunriseTs = (sysData['sunrise'] as num).toInt();
    final sunsetTs = (sysData['sunset'] as num).toInt();
    final sunrise = DateTime.fromMillisecondsSinceEpoch(sunriseTs * 1000);
    final sunset = DateTime.fromMillisecondsSinceEpoch(sunsetTs * 1000);
    final dewPoint = _calcDewPoint(temp, humidity);

    final forecastList = forecastData['list'] as List<dynamic>;

    final List<HourlyForecast> hourly = forecastList.take(40).map((slot) {
      final slotMap = slot as Map<String, dynamic>;
      final dt = (slotMap['dt'] as num).toInt();
      final slotMain = slotMap['main'] as Map<String, dynamic>;
      final slotWeather =
          (slotMap['weather'] as List<dynamic>)[0] as Map<String, dynamic>;
      final slotPop = (slotMap['pop'] as num?)?.toDouble() ?? 0.0;
      final rain = slotMap['rain'] as Map<String, dynamic>?;
      final rainMm = (rain?['3h'] as num?)?.toDouble() ?? 0.0;
      return HourlyForecast(
        time: DateTime.fromMillisecondsSinceEpoch(dt * 1000),
        temp: (slotMain['temp'] as num).toDouble(),
        pop: slotPop,
        rainMm: rainMm,
        iconCode: slotWeather['icon'] as String,
      );
    }).toList();

    // Group by calendar date for daily forecast
    final Map<String, List<HourlyForecast>> byDate = {};
    final Map<String, String> dateIcons = {};
    final Map<String, String> dateDescriptions = {};

    for (final h in hourly) {
      final key =
          '${h.time.year}-${h.time.month.toString().padLeft(2, '0')}-${h.time.day.toString().padLeft(2, '0')}';
      byDate.putIfAbsent(key, () => []).add(h);
      if (!dateIcons.containsKey(key)) {
        dateIcons[key] = h.iconCode;
      }
      if (!dateDescriptions.containsKey(key)) {
        // Get description for first slot of each day from forecast
        final idx = forecastList.indexWhere((slot) {
          final dt = (slot['dt'] as num).toInt();
          final slotTime = DateTime.fromMillisecondsSinceEpoch(dt * 1000);
          return slotTime.year == h.time.year &&
              slotTime.month == h.time.month &&
              slotTime.day == h.time.day;
        });
        if (idx >= 0) {
          final slotWeather = (forecastList[idx]['weather'] as List<dynamic>)[0]
              as Map<String, dynamic>;
          dateDescriptions[key] = slotWeather['description'] as String? ?? '';
        }
      }
    }

    final sortedKeys = byDate.keys.toList()..sort();
    final List<DailyForecast> daily = sortedKeys.map((key) {
      final slots = byDate[key]!;
      final minTemp = slots.map((s) => s.temp).reduce(min);
      final maxTemp = slots.map((s) => s.temp).reduce(max);
      final maxPop = slots.map((s) => s.pop).reduce(max);
      final parts = key.split('-');
      final date = DateTime(
        int.parse(parts[0]),
        int.parse(parts[1]),
        int.parse(parts[2]),
      );
      return DailyForecast(
        date: date,
        tempMin: minTemp,
        tempMax: maxTemp,
        pop: maxPop,
        iconCode: dateIcons[key] ?? iconCode,
        description: dateDescriptions[key] ?? condition,
      );
    }).toList();

    return WeatherData(
      locationName: locationName,
      lat: useLat,
      lon: useLon,
      temp: temp,
      feelsLike: feelsLike,
      tempMin: tempMin,
      tempMax: tempMax,
      condition: condition,
      conditionMain: conditionMain,
      iconCode: iconCode,
      humidity: humidity,
      pressure: pressure,
      windDeg: windDeg,
      uvIndex: uviValue,
      windSpeed: windSpeed,
      dewPoint: dewPoint,
      visibility: visibility,
      sunrise: sunrise,
      sunset: sunset,
      aqi: aqiValue,
      hourly: hourly,
      daily: daily,
      isOffline: false,
    );
  }

  static double moonPhase(DateTime date) {
    final knownNewMoon = DateTime(2000, 1, 6);
    final daysSince = date.difference(knownNewMoon).inDays.toDouble();
    const lunarCycle = 29.53;
    return (daysSince % lunarCycle) / lunarCycle;
  }

  static String moonPhaseName(double phase) {
    if (phase < 0.0625) return 'New Moon';
    if (phase < 0.1875) return 'Waxing Crescent';
    if (phase < 0.3125) return 'First Quarter';
    if (phase < 0.4375) return 'Waxing Gibbous';
    if (phase < 0.5625) return 'Full Moon';
    if (phase < 0.6875) return 'Waning Gibbous';
    if (phase < 0.8125) return 'Last Quarter';
    if (phase < 0.9375) return 'Waning Crescent';
    return 'New Moon';
  }

  static String aqiLabel(int aqi) {
    switch (aqi) {
      case 1:
        return 'Good';
      case 2:
        return 'Fair';
      case 3:
        return 'Moderate';
      case 4:
        return 'Poor';
      case 5:
        return 'Very Poor';
      default:
        return 'Unknown';
    }
  }

  static String uvLabel(double uvi) {
    if (uvi <= 2) return 'Low';
    if (uvi <= 5) return 'Moderate';
    if (uvi <= 7) return 'High';
    if (uvi <= 10) return 'Very High';
    return 'Extreme. Take precaution';
  }

  static String windDirection(int deg) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    final index = ((deg + 22.5) / 45).floor() % 8;
    return directions[index];
  }

  static String visibilityLabel(int meters) {
    if (meters >= 10000) return 'Unlimited';
    if (meters >= 1000) {
      final km = meters / 1000.0;
      return '${km.toStringAsFixed(1)} km';
    }
    return '$meters m';
  }

  static String runningCondition(WeatherData d) {
    final highPop = d.hourly.isNotEmpty && d.hourly[0].pop > 0.6;
    final moderatePop = d.hourly.isNotEmpty && d.hourly[0].pop > 0.3;
    if (highPop || d.temp > 38 || d.uvIndex > 10) return 'Poor';
    if (moderatePop || d.temp > 34 || d.uvIndex > 7) return 'Fair';
    return 'Good';
  }

  static String runningDetail(WeatherData d) {
    final cond = runningCondition(d);
    if (cond == 'Poor') {
      return 'Poor weather for running right now';
    } else if (cond == 'Fair') {
      return 'Acceptable conditions — stay hydrated';
    }
    return 'Great conditions for a run!';
  }
}
