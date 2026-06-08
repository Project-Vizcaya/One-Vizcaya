import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:one_vizcaya/core/services/weather_service.dart';
import 'package:one_vizcaya/presentation/screens/weather_detail_screen.dart';

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
  double? _fetchedLat;
  double? _fetchedLon;

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
      double? lat;
      double? lon;

      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      LocationPermission permission = await Geolocator.checkPermission();

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
      }

      final data = await WeatherService.fetch(
        widget.municipality,
        lat: lat,
        lon: lon,
      );

      if (mounted) {
        setState(() {
          _temp = data.temp.toStringAsFixed(1);
          _wind = (data.windSpeed * 3.6).toStringAsFixed(0);
          _humidity = data.humidity.toString();
          _condition = _capitalize(data.condition);
          _icon = _getWeatherIcon(data.conditionMain);
          _locationName = data.locationName;
          _fetchedLat = data.lat;
          _fetchedLon = data.lon;
          _isLoading = false;
          _isOffline = false;
        });
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
          _fetchedLat = null;
          _fetchedLon = null;
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

  void _openDetail() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => WeatherDetailScreen(
          municipality: widget.municipality,
          lat: _fetchedLat,
          lon: _fetchedLon,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1B2A33) : const Color(0xFFE3F2FD);
    final cardBorder = isDark ? const Color(0xFF2E4450) : const Color(0xFFBBDEFB);
    final titleColor = isDark ? const Color(0xFFE3F2FD) : const Color(0xFF37474F);
    final subColor = isDark ? const Color(0xFF9FB3BF) : const Color(0xFF546E7A);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: InkWell(
        onTap: _isLoading ? null : _openDetail,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: cardBorder),
          ),
          child: _isLoading
              ? const SizedBox(
                  height: 60,
                  child: Center(
                      child: CircularProgressIndicator(strokeWidth: 2)),
                )
              : Row(
                  children: [
                    Icon(_icon, size: 44, color: subColor),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$_locationName Weather',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: titleColor,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$_condition • $_temp°C',
                            style: TextStyle(
                              fontSize: 13,
                              color: subColor,
                            ),
                          ),
                          Text(
                            'Wind: $_wind km/h  •  Humidity: $_humidity%'
                            '${_isOffline ? '  (Offline)' : ''}',
                            style: TextStyle(
                              fontSize: 11,
                              color: _isOffline
                                  ? Colors.orange.shade700
                                  : subColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(
                        Icons.refresh,
                        color: subColor,
                        size: 20,
                      ),
                      onPressed: _fetchWeather,
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
