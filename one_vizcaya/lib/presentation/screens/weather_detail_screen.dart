import 'dart:math';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:one_vizcaya/core/services/weather_service.dart';

class WeatherDetailScreen extends StatefulWidget {
  final String municipality;
  final double? lat;
  final double? lon;

  const WeatherDetailScreen({
    super.key,
    required this.municipality,
    this.lat,
    this.lon,
  });

  @override
  State<WeatherDetailScreen> createState() => _WeatherDetailScreenState();
}

class _WeatherDetailScreenState extends State<WeatherDetailScreen> {
  WeatherData? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await WeatherService.fetch(
        widget.municipality,
        lat: widget.lat,
        lon: widget.lon,
      );
      if (mounted) {
        setState(() {
          _data = data;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  LinearGradient _backgroundGradient(WeatherData d) {
    final now = DateTime.now();
    final isNight = now.isBefore(d.sunrise) || now.isAfter(d.sunset);
    final isRainy = d.conditionMain == 'Rain' ||
        d.conditionMain == 'Drizzle' ||
        d.conditionMain == 'Thunderstorm';

    if (isNight) {
      return const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [Color(0xFF0D1B3E), Color(0xFF1A237E), Color(0xFF283593)],
      );
    } else if (isRainy) {
      return const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [Color(0xFF455A64), Color(0xFF546E7A), Color(0xFF607D8B)],
      );
    } else {
      return const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [Color(0xFF1565C0), Color(0xFF1976D2), Color(0xFFE3A818)],
      );
    }
  }

  IconData _iconForCode(String code) {
    final base = code.replaceAll('d', '').replaceAll('n', '');
    switch (base) {
      case '01':
        return Icons.wb_sunny;
      case '02':
        return Icons.wb_cloudy;
      case '03':
        return Icons.cloud;
      case '04':
        return Icons.cloud_queue;
      case '09':
        return Icons.grain;
      case '10':
        return Icons.umbrella;
      case '11':
        return Icons.thunderstorm;
      case '13':
        return Icons.ac_unit;
      case '50':
        return Icons.foggy;
      default:
        return Icons.wb_cloudy;
    }
  }

  Color _iconColorForCode(String code) {
    final base = code.replaceAll('d', '').replaceAll('n', '');
    switch (base) {
      case '01':
        return Colors.amber;
      case '02':
      case '03':
      case '04':
        return Colors.white70;
      case '09':
      case '10':
        return Colors.lightBlueAccent;
      case '11':
        return Colors.purpleAccent;
      case '13':
        return Colors.cyanAccent;
      default:
        return Colors.white70;
    }
  }

  String _capitalize(String s) {
    if (s.isEmpty) return s;
    return s
        .split(' ')
        .map((w) => w.isEmpty ? w : w[0].toUpperCase() + w.substring(1))
        .join(' ');
  }

  Widget _frostedCard({required Widget child, EdgeInsets? margin}) {
    return Container(
      margin: margin ?? const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
      ),
      child: child,
    );
  }

  Widget _sectionTitle(String title, {IconData? icon}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          if (icon != null) ...[
            Icon(icon, color: Colors.white70, size: 16),
            const SizedBox(width: 6),
          ],
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 1.0,
            ),
          ),
        ],
      ),
    );
  }

  // ─── Section 1: Hourly Forecast ─────────────────────────────────────────
  Widget _buildHourly(WeatherData d) {
    final slots = d.hourly.take(16).toList();
    return _frostedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle('Hourly Forecast', icon: Icons.access_time),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: List.generate(slots.length, (i) {
                final h = slots[i];
                final isNow = i == 0;
                final timeLabel = isNow
                    ? 'Now'
                    : DateFormat('h a').format(h.time);
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        timeLabel,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Icon(
                        _iconForCode(h.iconCode),
                        color: _iconColorForCode(h.iconCode),
                        size: 22,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${h.temp.round()}°',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      if (h.pop > 0)
                        Text(
                          '${(h.pop * 100).round()}%',
                          style: const TextStyle(
                            color: Color(0xFF82B1FF),
                            fontSize: 11,
                          ),
                        )
                      else
                        const SizedBox(height: 14),
                    ],
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Section 2: Rain Bar Chart ───────────────────────────────────────────
  Widget _buildRainChart(WeatherData d) {
    final slots = d.hourly.take(16).toList();
    final hasRain = slots.any((h) => h.rainMm > 0);
    final maxMm = slots.isEmpty
        ? 1.0
        : slots.map((h) => h.rainMm).reduce(max).clamp(1.0, double.infinity);

    return _frostedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _sectionTitle('Rain', icon: Icons.water_drop),
              if (hasRain)
                Text(
                  '${slots.map((h) => h.rainMm).reduce((a, b) => a + b).toStringAsFixed(1)} mm total',
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
            ],
          ),
          if (!hasRain)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text(
                  'No rain expected',
                  style: TextStyle(color: Colors.white70, fontSize: 14),
                ),
              ),
            )
          else
            SizedBox(
              height: 200,
              child: CustomPaint(
                painter: _RainChartPainter(slots: slots, maxMm: maxMm),
                size: const Size(double.infinity, 200),
              ),
            ),
        ],
      ),
    );
  }

  // ─── Section 3: Rain Alert ───────────────────────────────────────────────
  Widget? _buildRainAlert(WeatherData d) {
    final slots = d.hourly.take(16).toList();
    final rainSlot = slots.firstWhere(
      (h) => h.rainMm > 0.5 || h.pop > 0.5,
      orElse: () => slots.isEmpty
          ? HourlyForecast(
              time: DateTime.now(),
              temp: 0,
              pop: 0,
              rainMm: 0,
              iconCode: '01d',
            )
          : slots.first,
    );

    final hasSignificantRain = slots.any((h) => h.rainMm > 0.5 || h.pop > 0.5);
    if (!hasSignificantRain) return null;

    final totalMm = slots
        .map((h) => h.rainMm)
        .fold<double>(0.0, (a, b) => a + b);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1B5E20).withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(16),
        border:
            Border.all(color: const Color(0xFF43A047).withValues(alpha: 0.6)),
      ),
      child: Row(
        children: [
          const Icon(Icons.umbrella, color: Colors.white, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Grab an Umbrella!',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Rain possible around ${DateFormat('h:00 a').format(rainSlot.time)}',
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
                Text(
                  '${totalMm.toStringAsFixed(1)} mm expected',
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Section 4: 7-Day Forecast ───────────────────────────────────────────
  Widget _buildDaily(WeatherData d) {
    final today = DateTime.now();
    final yesterday = today.subtract(const Duration(days: 1));

    return _frostedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle('7-Day Forecast', icon: Icons.calendar_today),
          // Yesterday row (approximate with first daily entry)
          if (d.daily.isNotEmpty)
            _dailyRow(
              label: 'Yesterday',
              minTemp: d.daily[0].tempMin - 1,
              maxTemp: d.daily[0].tempMax - 1,
              pop: 0,
              iconCode: d.daily[0].iconCode,
              date: yesterday,
              isYesterday: true,
            ),
          ...d.daily.take(7).toList().asMap().entries.map((entry) {
            final i = entry.key;
            final day = entry.value;
            final label = i == 0 ? 'Today' : DateFormat('EEE').format(day.date);
            return _dailyRow(
              label: label,
              minTemp: day.tempMin,
              maxTemp: day.tempMax,
              pop: day.pop,
              iconCode: day.iconCode,
              date: day.date,
            );
          }),
        ],
      ),
    );
  }

  Widget _dailyRow({
    required String label,
    required double minTemp,
    required double maxTemp,
    required double pop,
    required String iconCode,
    required DateTime date,
    bool isYesterday = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: TextStyle(
                color: isYesterday ? Colors.white38 : Colors.white,
                fontSize: 14,
                fontWeight:
                    label == 'Today' ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ),
          if (pop > 0)
            Row(
              children: [
                const Icon(Icons.water_drop, color: Color(0xFF82B1FF), size: 13),
                const SizedBox(width: 2),
                Text(
                  '${(pop * 100).round()}%',
                  style: const TextStyle(
                    color: Color(0xFF82B1FF),
                    fontSize: 12,
                  ),
                ),
              ],
            )
          else
            const SizedBox(width: 36),
          const Spacer(),
          Icon(
            _iconForCode(iconCode),
            color: isYesterday
                ? Colors.white38
                : _iconColorForCode(iconCode),
            size: 20,
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 40,
            child: Text(
              '${minTemp.round()}°',
              textAlign: TextAlign.right,
              style: TextStyle(
                color: isYesterday ? Colors.white38 : Colors.white60,
                fontSize: 14,
              ),
            ),
          ),
          const SizedBox(width: 6),
          SizedBox(
            width: 40,
            child: Text(
              '${maxTemp.round()}°',
              textAlign: TextAlign.right,
              style: TextStyle(
                color: isYesterday ? Colors.white38 : Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Section 5: Activity (Running) ──────────────────────────────────────
  Widget _buildActivity(WeatherData d) {
    final cond = WeatherService.runningCondition(d);
    final detail = WeatherService.runningDetail(d);
    final condColor = cond == 'Good'
        ? const Color(0xFF4CAF50)
        : cond == 'Fair'
            ? const Color(0xFFFF9800)
            : const Color(0xFFF44336);

    final nextSlots = d.hourly.take(3).toList();

    return _frostedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle('Running Conditions', icon: Icons.directions_run),
          Row(
            children: [
              Icon(Icons.directions_run, color: condColor, size: 36),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      cond,
                      style: TextStyle(
                        color: condColor,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      detail,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (nextSlots.isNotEmpty) ...[
            const SizedBox(height: 12),
            Row(
              children: nextSlots.map((h) {
                final slotCond = h.pop > 0.6 || d.temp > 38 || d.uvIndex > 10
                    ? 'Poor'
                    : h.pop > 0.3 || d.temp > 34 || d.uvIndex > 7
                        ? 'Fair'
                        : 'Good';
                final dotColor = slotCond == 'Good'
                    ? const Color(0xFF4CAF50)
                    : slotCond == 'Fair'
                        ? const Color(0xFFFF9800)
                        : const Color(0xFFF44336);
                return Padding(
                  padding: const EdgeInsets.only(right: 16),
                  child: Column(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: dotColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        DateFormat('h a').format(h.time),
                        style: const TextStyle(
                          color: Colors.white60,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  // ─── Section 6: Radar Card ───────────────────────────────────────────────
  Widget _buildRadar(WeatherData d) {
    HourlyForecast? rainSlot;
    for (final h in d.hourly.take(16)) {
      if (h.rainMm > 0.5 || h.pop > 0.5) {
        rainSlot = h;
        break;
      }
    }

    return _frostedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle('Radar and Maps', icon: Icons.radar),
          GestureDetector(
            onTap: () async {
              final url = Uri.parse(
                  'https://www.windy.com/?${d.lat},${d.lon},9');
              if (await canLaunchUrl(url)) {
                await launchUrl(url, mode: LaunchMode.externalApplication);
              }
            },
            child: Container(
              height: 140,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Stack(
                children: [
                  Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.map,
                          color: Colors.white.withValues(alpha: 0.4),
                          size: 48,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Tap to open Windy radar',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.6),
                            fontSize: 13,
                          ),
                        ),
                        if (rainSlot != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Rain possible around ${DateFormat('h:00 a').format(rainSlot.time)}',
                            style: const TextStyle(
                              color: Color(0xFF82B1FF),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Icon(
                      Icons.open_in_new,
                      color: Colors.white.withValues(alpha: 0.5),
                      size: 16,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Section 7: AQI Card ─────────────────────────────────────────────────
  Widget _buildAqi(WeatherData d) {
    final aqiColors = [
      Colors.green,
      Colors.lightGreen,
      Colors.orange,
      Colors.red,
      Colors.purple,
    ];
    final aqiIdx = (d.aqi - 1).clamp(0, 4);
    final aqiColor = aqiColors[aqiIdx];

    final uvColor = d.uvIndex <= 2
        ? Colors.green
        : d.uvIndex <= 5
            ? Colors.yellow
            : d.uvIndex <= 7
                ? Colors.orange
                : d.uvIndex <= 10
                    ? Colors.red
                    : Colors.purple;

    return _frostedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle('Air Quality', icon: Icons.air),
          Row(
            children: [
              Text(
                WeatherService.aqiLabel(d.aqi),
                style: TextStyle(
                  color: aqiColor,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '(${d.aqi})',
                style: TextStyle(color: aqiColor, fontSize: 18),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // AQI color bar
          LayoutBuilder(
            builder: (context, constraints) {
              final barWidth = constraints.maxWidth;
              final indicatorLeft =
                  ((d.aqi - 1) / 4.0) * barWidth - 2;
              return ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: SizedBox(
                  height: 8,
                  child: Stack(
                    children: [
                      Container(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.green,
                              Colors.lightGreen,
                              Colors.orange,
                              Colors.red,
                              Colors.purple,
                            ],
                          ),
                        ),
                      ),
                      Positioned(
                        left: indicatorLeft.clamp(0.0, barWidth - 4),
                        top: 0,
                        bottom: 0,
                        child: Container(width: 4, color: Colors.white),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'UV Index',
                        style:
                            TextStyle(color: Colors.white60, fontSize: 12),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        d.uvIndex.toStringAsFixed(1),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        WeatherService.uvLabel(d.uvIndex),
                        style: TextStyle(color: uvColor, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Humidity',
                        style:
                            TextStyle(color: Colors.white60, fontSize: 12),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${d.humidity}%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        d.humidity >= 70
                            ? 'High humidity'
                            : d.humidity >= 40
                                ? 'Comfortable'
                                : 'Low humidity',
                        style:
                            const TextStyle(color: Colors.white60, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── Section 8: Details Grid ─────────────────────────────────────────────
  Widget _buildDetailsGrid(WeatherData d) {
    return _frostedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle('Details'),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.1,
            children: [
              _uvIndexTile(d),
              _humidityTile(d),
              _windTile(d),
              _dewPointTile(d),
              _pressureTile(d),
              _visibilityTile(d),
            ],
          ),
        ],
      ),
    );
  }

  Widget _detailTileContainer({required Widget child, String? title}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null) ...[
            Text(
              title.toUpperCase(),
              style: const TextStyle(
                  color: Colors.white60,
                  fontSize: 11,
                  letterSpacing: 0.5),
            ),
            const SizedBox(height: 4),
          ],
          Expanded(child: child),
        ],
      ),
    );
  }

  Widget _uvIndexTile(WeatherData d) {
    final uvColor = d.uvIndex <= 2
        ? Colors.green
        : d.uvIndex <= 5
            ? Colors.yellow
            : d.uvIndex <= 7
                ? Colors.orange
                : d.uvIndex <= 10
                    ? Colors.red
                    : Colors.purple;
    return _detailTileContainer(
      title: 'UV Index',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            d.uvIndex.toStringAsFixed(1),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            WeatherService.uvLabel(d.uvIndex),
            style: TextStyle(color: uvColor, fontSize: 12),
          ),
          const Spacer(),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: SizedBox(
              height: 6,
              child: LinearProgressIndicator(
                value: (d.uvIndex / 12.0).clamp(0.0, 1.0),
                backgroundColor: Colors.white24,
                valueColor: AlwaysStoppedAnimation<Color>(uvColor),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _humidityTile(WeatherData d) {
    return _detailTileContainer(
      title: 'Humidity',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${d.humidity}%',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Spacer(),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: SizedBox(
              height: 6,
              child: LinearProgressIndicator(
                value: d.humidity / 100.0,
                backgroundColor: Colors.white24,
                valueColor: const AlwaysStoppedAnimation<Color>(
                    Color(0xFF82B1FF)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _windTile(WeatherData d) {
    final windKmh = (d.windSpeed * 3.6);
    final windLabel = windKmh < 10
        ? 'Calm'
        : windKmh < 30
            ? 'Breezy'
            : 'Strong';
    return _detailTileContainer(
      title: 'Wind',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: double.infinity,
            height: 80,
            child: CustomPaint(
              painter: _WindCompassPainter(
                  deg: d.windDeg, speedKmh: windKmh),
            ),
          ),
          Text(
            windLabel,
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _dewPointTile(WeatherData d) {
    final isHumid = d.dewPoint > 22;
    return _detailTileContainer(
      title: 'Dew Point',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${d.dewPoint.toStringAsFixed(1)}°',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Spacer(),
          Text(
            isHumid ? 'It is very humid' : 'Comfortable',
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _pressureTile(WeatherData d) {
    return _detailTileContainer(
      title: 'Pressure',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: double.infinity,
            height: 70,
            child: CustomPaint(
              painter: _PressureGaugePainter(pressure: d.pressure),
            ),
          ),
          Text(
            '${d.pressure} hPa',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            d.pressure > 1013 ? 'Above normal' : d.pressure < 1000 ? 'Below normal' : 'Normal',
            style: const TextStyle(color: Colors.white60, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _visibilityTile(WeatherData d) {
    return _detailTileContainer(
      title: 'Visibility',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            WeatherService.visibilityLabel(d.visibility),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Spacer(),
          Text(
            d.visibility >= 10000
                ? 'Unlimited visibility'
                : 'Reduced visibility',
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
        ],
      ),
    );
  }

  // ─── Section 9: Sunrise/Sunset Arc ──────────────────────────────────────
  Widget _buildSunriseSunset(WeatherData d) {
    return _frostedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle('Sunrise & Sunset', icon: Icons.wb_twilight),
          SizedBox(
            height: 160,
            width: double.infinity,
            child: CustomPaint(
              painter: _SunriseSunsetPainter(
                sunrise: d.sunrise,
                sunset: d.sunset,
                now: DateTime.now(),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  children: [
                    const Icon(Icons.wb_sunny_outlined,
                        color: Colors.orange, size: 18),
                    Text(
                      DateFormat('h:mm a').format(d.sunrise),
                      style: const TextStyle(
                          color: Colors.white, fontSize: 13),
                    ),
                    const Text(
                      'Sunrise',
                      style:
                          TextStyle(color: Colors.white60, fontSize: 11),
                    ),
                  ],
                ),
                Column(
                  children: [
                    const Icon(Icons.nights_stay_outlined,
                        color: Colors.orange, size: 18),
                    Text(
                      DateFormat('h:mm a').format(d.sunset),
                      style: const TextStyle(
                          color: Colors.white, fontSize: 13),
                    ),
                    const Text(
                      'Sunset',
                      style:
                          TextStyle(color: Colors.white60, fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Section 10: Moon Phase ──────────────────────────────────────────────
  Widget _buildMoonPhase() {
    final phase = WeatherService.moonPhase(DateTime.now());
    final phaseName = WeatherService.moonPhaseName(phase);

    return _frostedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle('Moon Phase', icon: Icons.nights_stay),
          Row(
            children: [
              SizedBox(
                width: 80,
                height: 80,
                child: CustomPaint(
                  painter: _MoonPhasePainter(phase: phase),
                ),
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    phaseName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${(phase * 100).toStringAsFixed(0)}% of cycle',
                    style: const TextStyle(
                        color: Colors.white60, fontSize: 13),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Moonrise / Moonset: —',
                    style:
                        TextStyle(color: Colors.white38, fontSize: 12),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        backgroundColor: const Color(0xFF1565C0),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(color: Colors.white),
              const SizedBox(height: 16),
              Text(
                widget.municipality,
                style: const TextStyle(color: Colors.white70, fontSize: 16),
              ),
            ],
          ),
        ),
      );
    }

    if (_error != null && _data == null) {
      return Scaffold(
        backgroundColor: const Color(0xFF1565C0),
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          foregroundColor: Colors.white,
          title: Text(widget.municipality),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off, color: Colors.white60, size: 64),
                const SizedBox(height: 16),
                const Text(
                  'Unable to load weather',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white60, fontSize: 13),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: _fetch,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white24,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final d = _data!;
    final gradient = _backgroundGradient(d);

    final collapsedTitle =
        '${d.locationName} • ${d.temp.round()}°';

    final hiLo = d.daily.isNotEmpty
        ? 'H:${d.daily.map((x) => x.tempMax).reduce(max).round()}° '
            'L:${d.daily.map((x) => x.tempMin).reduce(min).round()}°'
        : 'H:${d.tempMax.round()}° L:${d.tempMin.round()}°';

    final summaryHi = d.daily.isNotEmpty
        ? '${d.daily.map((x) => x.tempMax).reduce(min).round()} to '
            '${d.daily.map((x) => x.tempMax).reduce(max).round()}'
        : '${d.tempMax.round()}';
    final summaryLo = d.daily.isNotEmpty
        ? '${d.daily.map((x) => x.tempMin).reduce(min).round()} to '
            '${d.daily.map((x) => x.tempMin).reduce(max).round()}'
        : '${d.tempMin.round()}';

    final summaryLine =
        '${_capitalize(d.condition)}. Highs $summaryHi°C and lows $summaryLo°C.';

    final rainAlert = _buildRainAlert(d);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: gradient),
        child: CustomScrollView(
          slivers: [
            // ─── SliverAppBar ────────────────────────────────────────────
            SliverAppBar(
              expandedHeight: 300,
              pinned: true,
              floating: false,
              backgroundColor: gradient.colors.first,
              foregroundColor: Colors.white,
              elevation: 0,
              title: Text(
                collapsedTitle,
                style: const TextStyle(color: Colors.white, fontSize: 16),
              ),
              flexibleSpace: FlexibleSpaceBar(
                collapseMode: CollapseMode.pin,
                background: Container(
                  decoration: BoxDecoration(gradient: gradient),
                  child: SafeArea(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const SizedBox(height: 40),
                          Text(
                            d.locationName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${d.temp.round()}°',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 72,
                              fontWeight: FontWeight.bold,
                              height: 1.0,
                            ),
                          ),
                          Text(
                            _capitalize(d.condition),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Feels like ${d.feelsLike.round()}°  •  $hiLo',
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Padding(
                            padding:
                                const EdgeInsets.symmetric(horizontal: 32),
                            child: Text(
                              summaryLine,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.white
                                    .withValues(alpha: 0.7),
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),

            // ─── Body sections ───────────────────────────────────────────
            SliverToBoxAdapter(
              child: Container(
                decoration: BoxDecoration(gradient: gradient),
                child: Column(
                  children: [
                    const SizedBox(height: 8),
                    _buildHourly(d),
                    _buildRainChart(d),
                    if (rainAlert != null) rainAlert,
                    _buildDaily(d),
                    _buildActivity(d),
                    _buildRadar(d),
                    _buildAqi(d),
                    _buildDetailsGrid(d),
                    _buildSunriseSunset(d),
                    _buildMoonPhase(),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── CustomPainters ───────────────────────────────────────────────────────────

class _RainChartPainter extends CustomPainter {
  final List<HourlyForecast> slots;
  final double maxMm;

  const _RainChartPainter({required this.slots, required this.maxMm});

  @override
  void paint(Canvas canvas, Size size) {
    if (slots.isEmpty) return;

    final barPaint = Paint()..style = PaintingStyle.fill;
    final axisPaint = Paint()
      ..color = Colors.white24
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;
    final textStyle = const TextStyle(color: Colors.white54, fontSize: 10);

    final double chartBottom = size.height - 24;
    final double chartTop = 8;
    final double chartHeight = chartBottom - chartTop;
    final double barWidth = (size.width / slots.length) * 0.6;
    final double spacing = size.width / slots.length;

    // Draw x-axis line
    canvas.drawLine(
      Offset(0, chartBottom),
      Offset(size.width, chartBottom),
      axisPaint,
    );

    for (int i = 0; i < slots.length; i++) {
      final h = slots[i];
      final x = spacing * i + spacing * 0.2;
      final barHeightRatio = maxMm > 0 ? (h.rainMm / maxMm) : 0.0;
      final barH = chartHeight * barHeightRatio;

      if (barH > 0) {
        final rect = RRect.fromRectAndCorners(
          Rect.fromLTWH(x, chartBottom - barH, barWidth, barH),
          topLeft: const Radius.circular(3),
          topRight: const Radius.circular(3),
        );
        barPaint.shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            const Color(0xFF64B5F6),
            const Color(0xFF1565C0).withValues(alpha: 0.7),
          ],
        ).createShader(rect.outerRect);
        canvas.drawRRect(rect, barPaint);
      }

      // Draw time label every 6 hours (every 2 slots since each slot = 3h)
      if (i % 2 == 0) {
        final tp = TextPainter(
          text: TextSpan(
            text: DateFormat('h a').format(h.time),
            style: textStyle,
          ),
          textDirection: TextDirection.ltr,
        )..layout();
        tp.paint(
          canvas,
          Offset(x - tp.width / 2 + barWidth / 2, chartBottom + 4),
        );
      }
    }

    // Draw y-axis max label
    final maxTp = TextPainter(
      text: TextSpan(
        text: '${maxMm.toStringAsFixed(1)}mm',
        style: textStyle,
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    maxTp.paint(canvas, Offset(2, chartTop));
  }

  @override
  bool shouldRepaint(_RainChartPainter old) =>
      old.slots != slots || old.maxMm != maxMm;
}

class _WindCompassPainter extends CustomPainter {
  final int deg;
  final double speedKmh;

  const _WindCompassPainter({required this.deg, required this.speedKmh});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final radius = size.width < size.height
        ? size.width / 2 - 4
        : size.height / 2 - 4;

    final circlePaint = Paint()
      ..color = Colors.white24
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    canvas.drawCircle(Offset(cx, cy), radius, circlePaint);

    // Cardinal labels
    final labels = ['N', 'E', 'S', 'W'];
    final offsets = [
      Offset(cx, cy - radius + 12),
      Offset(cx + radius - 12, cy + 4),
      Offset(cx, cy + radius - 4),
      Offset(cx - radius + 6, cy + 4),
    ];
    const labelStyle = TextStyle(color: Colors.white38, fontSize: 9);
    for (int i = 0; i < labels.length; i++) {
      final tp = TextPainter(
        text: TextSpan(text: labels[i], style: labelStyle),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, offsets[i] - Offset(tp.width / 2, tp.height / 2));
    }

    // Arrow
    final angleRad = (deg - 90) * pi / 180;
    final arrowEnd = Offset(
      cx + cos(angleRad) * (radius - 14),
      cy + sin(angleRad) * (radius - 14),
    );
    final arrowPaint = Paint()
      ..color = const Color(0xFF82B1FF)
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(cx, cy), arrowEnd, arrowPaint);

    // Speed text
    final speedTp = TextPainter(
      text: TextSpan(
        text: '${speedKmh.round()}',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 13,
          fontWeight: FontWeight.bold,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    speedTp.paint(
        canvas, Offset(cx - speedTp.width / 2, cy - speedTp.height / 2));
  }

  @override
  bool shouldRepaint(_WindCompassPainter old) =>
      old.deg != deg || old.speedKmh != speedKmh;
}

class _PressureGaugePainter extends CustomPainter {
  final int pressure;

  const _PressureGaugePainter({required this.pressure});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height - 8;
    final radius = (size.width / 2) - 6;

    final trackPaint = Paint()
      ..color = Colors.white24
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    final valuePaint = Paint()
      ..color = const Color(0xFF82B1FF)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    const startAngle = pi;
    const sweepAngle = pi;

    canvas.drawArc(
      Rect.fromCircle(center: Offset(cx, cy), radius: radius),
      startAngle,
      sweepAngle,
      false,
      trackPaint,
    );

    const minP = 950.0;
    const maxP = 1050.0;
    final fraction = ((pressure - minP) / (maxP - minP)).clamp(0.0, 1.0);
    canvas.drawArc(
      Rect.fromCircle(center: Offset(cx, cy), radius: radius),
      startAngle,
      sweepAngle * fraction,
      false,
      valuePaint,
    );

    // Needle
    final needleAngle = pi + pi * fraction;
    final needleEnd = Offset(
      cx + cos(needleAngle) * (radius - 8),
      cy + sin(needleAngle) * (radius - 8),
    );
    final needlePaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(cx, cy), needleEnd, needlePaint);

    // Center dot
    canvas.drawCircle(
        Offset(cx, cy), 3, Paint()..color = Colors.white);
  }

  @override
  bool shouldRepaint(_PressureGaugePainter old) =>
      old.pressure != pressure;
}

class _SunriseSunsetPainter extends CustomPainter {
  final DateTime sunrise;
  final DateTime sunset;
  final DateTime now;

  const _SunriseSunsetPainter({
    required this.sunrise,
    required this.sunset,
    required this.now,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height - 20;
    final radius = size.width / 2 - 16;

    final arcPaint = Paint()
      ..color = Colors.white30
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    // Draw the arc (semicircle)
    canvas.drawArc(
      Rect.fromCircle(center: Offset(cx, cy), radius: radius),
      pi,
      pi,
      false,
      arcPaint,
    );

    // Current sun position on arc
    final totalSeconds = sunset.difference(sunrise).inSeconds.toDouble();
    final elapsedSeconds = now.difference(sunrise).inSeconds.toDouble();
    final fraction = (elapsedSeconds / totalSeconds).clamp(0.0, 1.0);

    final sunAngle = pi + pi * fraction;
    final sunX = cx + cos(sunAngle) * radius;
    final sunY = cy + sin(sunAngle) * radius;

    // Sun dot
    final sunPaint = Paint()..color = Colors.amber;
    canvas.drawCircle(Offset(sunX, sunY), 8, sunPaint);
    canvas.drawCircle(
      Offset(sunX, sunY),
      12,
      Paint()
        ..color = Colors.amber.withValues(alpha: 0.3)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );

    // Horizon line
    canvas.drawLine(
      Offset(cx - radius, cy),
      Offset(cx + radius, cy),
      Paint()
        ..color = Colors.white24
        ..strokeWidth = 1,
    );
  }

  @override
  bool shouldRepaint(_SunriseSunsetPainter old) =>
      old.sunrise != sunrise ||
      old.sunset != sunset ||
      old.now != now;
}

class _MoonPhasePainter extends CustomPainter {
  final double phase;

  const _MoonPhasePainter({required this.phase});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final radius = size.width / 2 - 4;

    // Draw the lit portion as a circle
    final moonPaint = Paint()
      ..color = const Color(0xFFE0E0E0)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(cx, cy), radius, moonPaint);

    // Draw the shadow
    final shadowPaint = Paint()
      ..color = const Color(0xFF1A237E).withValues(alpha: 0.85)
      ..style = PaintingStyle.fill;

    // Simple shadow: cover the dark side
    if (phase < 0.5) {
      // Waxing: dark on left
      final shadowFraction = 1.0 - phase * 2;
      final ellipseW = radius * shadowFraction.abs();
      final rect = Rect.fromCenter(
        center: Offset(cx, cy),
        width: ellipseW * 2,
        height: radius * 2,
      );
      if (phase < 0.25) {
        // New to First Quarter: mostly dark left
        canvas.drawCircle(Offset(cx, cy), radius, shadowPaint);
        canvas.drawOval(
          rect,
          Paint()
            ..color = const Color(0xFFE0E0E0)
            ..style = PaintingStyle.fill,
        );
      } else {
        // First Quarter to Full: mostly lit, small shadow left
        canvas.drawOval(rect, shadowPaint);
      }
    } else {
      // Waning: dark on right
      final shadowFraction = (phase - 0.5) * 2;
      final ellipseW = radius * shadowFraction;
      final rect = Rect.fromCenter(
        center: Offset(cx, cy),
        width: ellipseW * 2,
        height: radius * 2,
      );
      if (phase < 0.75) {
        // Full to Last Quarter
        canvas.drawOval(rect, shadowPaint);
      } else {
        // Last Quarter to New
        canvas.drawCircle(Offset(cx, cy), radius, shadowPaint);
        canvas.drawOval(
          rect,
          Paint()
            ..color = const Color(0xFFE0E0E0)
            ..style = PaintingStyle.fill,
        );
      }
    }

    // Outer circle border
    canvas.drawCircle(
      Offset(cx, cy),
      radius,
      Paint()
        ..color = Colors.white38
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );
  }

  @override
  bool shouldRepaint(_MoonPhasePainter old) => old.phase != phase;
}
