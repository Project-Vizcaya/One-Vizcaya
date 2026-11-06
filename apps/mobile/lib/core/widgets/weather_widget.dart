import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:one_vizcaya/core/services/weather_service.dart';
import 'package:one_vizcaya/presentation/screens/weather_detail_screen.dart';

/// Home weather card, laid out like the DOST PANaHON "Locations" card:
/// a large current temperature + condition icon, the current-location label,
/// and a divided stat row showing 24-hour rainfall and the max heat index.
class WeatherWidget extends StatefulWidget {
  final String municipality;
  const WeatherWidget({super.key, required this.municipality});

  @override
  State<WeatherWidget> createState() => _WeatherWidgetState();
}

class _WeatherWidgetState extends State<WeatherWidget> {
  String _condition = 'Loading…';
  String _temp = '--';
  String _locationName = '';
  double _rain24h = 0;
  double _heatIndex = 0;
  bool _isLoading = true;
  bool _isOffline = false;
  bool _usingGps = false;
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
      bool usingGps = false;

      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      final permission = await Geolocator.checkPermission();

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
        usingGps = true;
      }

      final data =
          await WeatherService.fetch(widget.municipality, lat: lat, lon: lon);

      // 24-hour rainfall = sum of the next eight 3-hour forecast slots.
      final rain = data.hourly
          .take(8)
          .fold<double>(0, (sum, h) => sum + h.rainMm);

      if (mounted) {
        setState(() {
          _temp = data.temp.toStringAsFixed(0);
          _condition = _capitalize(data.condition);
          _icon = _getWeatherIcon(data.conditionMain);
          _locationName = data.locationName;
          _rain24h = rain;
          _heatIndex = data.feelsLike;
          _fetchedLat = data.lat;
          _fetchedLon = data.lon;
          _usingGps = usingGps;
          _isLoading = false;
          _isOffline = false;
        });
      }
    } catch (e) {
      debugPrint('WeatherWidget error: $e');
      if (mounted) {
        setState(() {
          _temp = '28';
          _condition = 'Partly Cloudy';
          _icon = Icons.wb_cloudy;
          _locationName = widget.municipality;
          _rain24h = 0;
          _heatIndex = 0;
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

  // PAGASA-style rainfall label.
  String _rainLabel(double mm) {
    if (mm <= 0) return 'No rain';
    if (mm < 2.5) return 'Very light rain';
    if (mm < 7.5) return 'Light rain';
    if (mm < 15) return 'Moderate rain';
    if (mm < 30) return 'Heavy rain';
    return 'Intense rain';
  }

  // PAGASA heat-index caution bands.
  String _heatLabel(double hi) {
    if (hi < 27) return 'Not hazardous';
    if (hi < 33) return 'Caution';
    if (hi < 42) return 'Extreme caution';
    if (hi < 52) return 'Danger';
    return 'Extreme danger';
  }

  Color _heatColor(double hi) {
    if (hi < 27) return const Color(0xFF2E7D32);
    if (hi < 33) return const Color(0xFFF9A825);
    if (hi < 42) return const Color(0xFFEF6C00);
    return const Color(0xFFD32F2F);
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
    final cardBg = isDark ? const Color(0xFF1B2A33) : const Color(0xFFE9F1F7);
    final cardBorder = isDark ? const Color(0xFF2E4450) : const Color(0xFFCFE0EC);
    final titleColor = isDark ? const Color(0xFFECF3F8) : const Color(0xFF1B2A33);
    final subColor = isDark ? const Color(0xFF9FB3BF) : const Color(0xFF546E7A);
    final iconColor = isDark ? const Color(0xFF7FB2D6) : const Color(0xFF4A7BA6);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: InkWell(
        onTap: _isLoading ? null : _openDetail,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: cardBorder),
          ),
          child: _isLoading
              ? const SizedBox(
                  height: 96,
                  child: Center(
                      child: CircularProgressIndicator(strokeWidth: 2)),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '$_temp °C',
                                style: TextStyle(
                                  fontSize: 40,
                                  fontWeight: FontWeight.bold,
                                  height: 1.0,
                                  color: titleColor,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _usingGps
                                    ? 'CURRENT LOCATION'
                                    : 'MUNICIPALITY',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.8,
                                  color: subColor,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _locationName.isEmpty
                                    ? widget.municipality
                                    : _locationName,
                                style: TextStyle(
                                  fontSize: 19,
                                  fontWeight: FontWeight.bold,
                                  color: titleColor,
                                ),
                              ),
                              Text(
                                'Nueva Vizcaya',
                                style: TextStyle(fontSize: 12, color: subColor),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _isOffline
                                    ? '$_condition  (Offline)'
                                    : _condition,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: _isOffline
                                      ? Colors.orange.shade700
                                      : titleColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          children: [
                            Icon(_icon, size: 56, color: iconColor),
                            IconButton(
                              visualDensity: VisualDensity.compact,
                              icon: Icon(Icons.refresh, size: 18, color: subColor),
                              tooltip: 'Refresh',
                              onPressed: _fetchWeather,
                            ),
                          ],
                        ),
                      ],
                    ),
                    if (!_isOffline) ...[
                      const SizedBox(height: 12),
                      Divider(height: 1, color: cardBorder),
                      const SizedBox(height: 12),
                      IntrinsicHeight(
                        child: Row(
                          children: [
                            Expanded(
                              child: _StatBlock(
                                icon: Icons.water_drop_outlined,
                                iconColor: const Color(0xFF3B82C4),
                                label:
                                    '24-HR RAIN: ${_rain24h.toStringAsFixed(2)} mm',
                                value: _rainLabel(_rain24h),
                                titleColor: titleColor,
                                subColor: subColor,
                              ),
                            ),
                            VerticalDivider(width: 24, color: cardBorder),
                            Expanded(
                              child: _StatBlock(
                                icon: Icons.thermostat,
                                iconColor: _heatColor(_heatIndex),
                                label:
                                    'MAX HEAT INDEX: ${_heatIndex.toStringAsFixed(0)} °C',
                                value: _heatLabel(_heatIndex),
                                titleColor: titleColor,
                                subColor: subColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
        ),
      ),
    );
  }
}

class _StatBlock extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final Color titleColor;
  final Color subColor;

  const _StatBlock({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
    required this.titleColor,
    required this.subColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: iconColor),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: titleColor,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value.toUpperCase(),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.3,
                  color: subColor,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
