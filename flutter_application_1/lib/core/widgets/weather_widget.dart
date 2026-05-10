import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

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
  String _location = '';
  bool _isLoading = true;
  bool _isOffline = false;
  IconData _icon = Icons.cloud;

  // Fallback coords per municipality in Nueva Vizcaya
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

  // OpenWeatherMap uses specific icon codes. We map them to Material Icons here.
  IconData _getWeatherIcon(String iconCode) {
    if (iconCode.startsWith('01')) return Icons.wb_sunny; // clear sky
    if (iconCode.startsWith('02') ||
        iconCode.startsWith('03') ||
        iconCode.startsWith('04'))
      return Icons.wb_cloudy; // clouds
    if (iconCode.startsWith('09') || iconCode.startsWith('10'))
      return Icons.water_drop; // rain
    if (iconCode.startsWith('11')) return Icons.thunderstorm; // thunderstorm
    if (iconCode.startsWith('13')) return Icons.ac_unit; // snow
    if (iconCode.startsWith('50')) return Icons.foggy; // mist
    return Icons.cloud;
  }

  // Capitalizes the first letter of each word (e.g., "broken clouds" -> "Broken Clouds")
  String _capitalize(String text) {
    if (text.isEmpty) return text;
    return text
        .split(' ')
        .map((word) => word[0].toUpperCase() + word.substring(1))
        .join(' ');
  }

  Future<void> _fetchWeather() async {
    try {
      double lat, lon;
      String locationName = widget.municipality;

      // 1. Check Location Services and Permissions
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      LocationPermission permission = await Geolocator.checkPermission();

      // 2. Request permission if it hasn't been decided yet
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      // 3. Logic to either use GPS or use the Fallback Coords
      if (serviceEnabled &&
          (permission == LocationPermission.always ||
              permission == LocationPermission.whileInUse)) {
        final pos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.low,
          timeLimit: const Duration(seconds: 5),
        );
        lat = pos.latitude;
        lon = pos.longitude;
      } else {
        // Fallback to municipality center coords
        final coords =
            _municipalityCoords[widget.municipality] ?? [16.4833, 121.1500];
        lat = coords[0];
        lon = coords[1];
      }

      // 4. Call OpenWeatherMap API
      const apiKey = '03b9debc72c7790bdb52debc878ff38c';
      final url = Uri.parse(
        'https://api.openweathermap.org/data/2.5/weather?'
        'lat=$lat&lon=$lon&units=metric&appid=$apiKey',
      );

      final response = await http.get(url).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        final temp = (data['main']['temp'] as num).toStringAsFixed(0);
        // OWM returns wind in meters/sec. Multiply by 3.6 to get km/h.
        final wind = ((data['wind']['speed'] as num) * 3.6).toStringAsFixed(0);

        final weatherArray = data['weather'][0];
        final description = _capitalize(weatherArray['description'].toString());
        final iconCode = weatherArray['icon'].toString();

        if (mounted) {
          setState(() {
            _temp = temp;
            _wind = wind;
            _condition = description;
            _icon = _getWeatherIcon(iconCode);
            _location = locationName;
            _isLoading = false;
            _isOffline = false;
          });
        }
      } else {
        throw Exception('API error: ${response.statusCode}');
      }
    } catch (e) {
      // Fallback data if internet fails or GPS is too slow
      if (mounted) {
        setState(() {
          _temp = '28';
          _wind = '12';
          _condition = 'Partly Cloudy';
          _icon = Icons.wb_cloudy;
          _location = widget.municipality;
          _isLoading = false;
          _isOffline = true;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFE3F2FD),
        borderRadius: BorderRadius.circular(16),
      ),
      child: _isLoading
          ? const SizedBox(
              height: 60,
              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
            )
          : Row(
              children: [
                Icon(_icon, size: 40, color: const Color(0xFF546E7A)),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$_location Weather',
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
                        'Wind: $_wind km/h${_isOffline ? ' (Offline Fallback)' : ''}',
                        style: TextStyle(
                          fontSize: 11,
                          color: _isOffline
                              ? Colors.orange
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
                  onPressed: () {
                    setState(() => _isLoading = true);
                    _fetchWeather();
                  },
                ),
              ],
            ),
    );
  }
}
