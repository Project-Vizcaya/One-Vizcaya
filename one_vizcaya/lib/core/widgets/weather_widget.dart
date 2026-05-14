import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:one_vizcaya/secrets.dart';

class WeatherWidget extends StatefulWidget {
  final String municipality;
  const WeatherWidget({super.key, required this.municipality});

  @override
  State<WeatherWidget> createState() => _WeatherWidgetState();
}

class _WeatherWidgetState extends State<WeatherWidget> {
  String _condition = 'Loading...';
  String _temp = '--';
  String _wind = '--';
  String _humidity = '--';
  String _locationName = '';
  bool _isLoading = true;
  bool _isOffline = false;
  IconData _icon = Icons.cloud;

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

  @override
  void initState() {
    super.initState();
    _fetchWeather();
  }

  IconData _getWeatherIcon(String main) {
    switch (main.toLowerCase()) {
      case 'clear':
        return Icons.wb_sunny;
      case 'clouds':
        return Icons.wb_cloudy;
      case 'rain':
        return Icons.grain;
      case 'drizzle':
        return Icons.grain;
      case 'thunderstorm':
        return Icons.thunderstorm;
      case 'snow':
        return Icons.ac_unit;
      case 'mist':
      case 'fog':
      case 'haze':
        return Icons.cloud;
      default:
        return Icons.wb_cloudy;
    }
  }

  Future<void> _fetchWeather() async {
    setState(() => _isLoading = true);
    try {
      double lat, lon;

      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (serviceEnabled &&
          (permission == LocationPermission.always ||
              permission == LocationPermission.whileInUse)) {
        final pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.low,
            timeLimit: Duration(seconds: 8),
          ),
        );
        lat = pos.latitude;
        lon = pos.longitude;
      } else {
        final coords =
            _municipalityCoords[widget.municipality] ?? [16.4833, 121.1500];
        lat = coords[0];
        lon = coords[1];
      }

      // Note: not const — openWeatherApiKey is a runtime value
      final apiKey = openWeatherApiKey;
      final url = Uri.parse(
        'https://api.openweathermap.org/data/2.5/weather'
        '?lat=$lat&lon=$lon'
        '&appid=$apiKey'
        '&units=metric',
      );

      final response = await http.get(url).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final mainWeather = data['weather'][0]['main'] as String;
        final description = data['weather'][0]['description'] as String;
        final temp = (data['main']['temp'] as num).toStringAsFixed(1);
        final windMs = data['wind']['speed'] as num;
        final windKmh = (windMs * 3.6).toStringAsFixed(0);
        final humidity = data['main']['humidity'].toString();
        final locationName = data['name'] as String? ?? widget.municipality;

        if (mounted) {
          setState(() {
            _temp = temp;
            _wind = windKmh;
            _humidity = humidity;
            _condition = _capitalize(description);
            _icon = _getWeatherIcon(mainWeather);
            _locationName = locationName;
            _isLoading = false;
            _isOffline = false;
          });
        }
      } else {
        throw Exception('API error ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('WeatherWidget error: $e');
      if (mounted) {
        setState(() {
          _temp = '28';
          _wind = '12';
          _humidity = '--';
          _condition = 'Partly Cloudy';
          _icon = Icons.wb_cloudy;
          _locationName = widget.municipality;
          _isLoading = false;
          _isOffline = true;
        });
      }
    }
  }

  String _capitalize(String s) {
    if (s.isEmpty) return s;
    return s
        .split(' ')
        .map((w) => w.isEmpty ? w : w[0].toUpperCase() + w.substring(1))
        .join(' ');
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFE3F2FD),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFBBDEFB)),
        ),
        child: _isLoading
            ? const SizedBox(
                height: 60,
                child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
              )
            : Row(
                children: [
                  Icon(_icon, size: 44, color: const Color(0xFF546E7A)),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$_locationName Weather',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: Color(0xFF37474F),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '$_condition • $_temp°C',
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF546E7A),
                          ),
                        ),
                        Text(
                          'Wind: $_wind km/h  •  Humidity: $_humidity%'
                          '${_isOffline ? '  (Offline)' : ''}',
                          style: TextStyle(
                            fontSize: 11,
                            color: _isOffline
                                ? Colors.orange.shade700
                                : const Color(0xFF78909C),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(
                      Icons.refresh,
                      color: Color(0xFF546E7A),
                      size: 20,
                    ),
                    onPressed: _fetchWeather,
                  ),
                ],
              ),
      ),
    );
  }
}
