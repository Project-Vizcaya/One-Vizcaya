import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../../../core/l10n/app_strings.dart';

/// One earthquake from hazard_signals (written by the hazardWatch function).
class QuakeItem {
  final String id;
  final String source; // phivolcs | usgs
  final double magnitude;
  final int distanceKm;
  final String? place;
  final DateTime time;
  final String level; // critical | warning | watch | info
  final bool superseded;

  const QuakeItem({
    required this.id,
    required this.source,
    required this.magnitude,
    required this.distanceKm,
    required this.time,
    required this.level,
    this.place,
    this.superseded = false,
  });

  static QuakeItem? fromMap(String id, Map<String, dynamic> m) {
    final mag = m['magnitude'], t = m['timeMs'], km = m['distanceKm'];
    final src = m['source'];
    if (mag is! num || t is! num || km is! num || (src != 'phivolcs' && src != 'usgs')) return null;
    return QuakeItem(
      id: id,
      source: src as String,
      magnitude: mag.toDouble(),
      distanceKm: km.round(),
      place: m['place'] is String ? m['place'] as String : null,
      time: DateTime.fromMillisecondsSinceEpoch(t.toInt()),
      level: m['level'] is String ? m['level'] as String : 'info',
      superseded: m['supersededBy'] is String && (m['supersededBy'] as String).isNotEmpty,
    );
  }
}

/// What residents see: the last 48 hours, level "watch" or higher (about
/// M3.5+ within 150 km), PHIVOLCS's report when both sources have the quake.
/// Minor quakes are left out so residents are not alarmed by every tremor.
List<QuakeItem> residentQuakes(List<QuakeItem> all, DateTime now) {
  const shown = {'critical', 'warning', 'watch'};
  return all
      .where((q) => !q.superseded && shown.contains(q.level) && now.difference(q.time) <= const Duration(hours: 48))
      .toList()
    ..sort((a, b) => b.time.compareTo(a.time));
}

/// Recent earthquakes near Nueva Vizcaya, for the Emergency Contacts screen.
/// Shows nothing when there are none.
class RecentQuakes extends StatelessWidget {
  const RecentQuakes({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: FirebaseFirestore.instance
          .collection('hazard_signals')
          .orderBy('timeMs', descending: true)
          .limit(30)
          .snapshots(),
      builder: (context, snap) {
        final items = residentQuakes(
          (snap.data?.docs ?? const [])
              .map((d) => QuakeItem.fromMap(d.id, d.data()))
              .whereType<QuakeItem>()
              .toList(),
          DateTime.now(),
        );
        if (items.isEmpty) return const SizedBox.shrink();
        final muted = Theme.of(context).colorScheme.onSurfaceVariant;
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(AppStrings.get('recentQuakes'),
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              for (final q in items.take(5))
                Semantics(
                  label: 'Magnitude ${q.magnitude.toStringAsFixed(1)}, ${q.distanceKm} '
                      '${AppStrings.get('kmFromProvince')}, ${q.source == 'phivolcs' ? 'PHIVOLCS' : 'USGS'}',
                  excludeSemantics: true,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 5),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: q.level == 'critical'
                                ? const Color(0xFFB91C1C)
                                : q.level == 'warning'
                                    ? const Color(0xFFC2410C)
                                    : const Color(0xFFB45309),
                          ),
                          child: Text(q.magnitude.toStringAsFixed(1),
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(q.place ?? '${q.distanceKm} ${AppStrings.get('kmFromProvince')}',
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                              Text(
                                '${q.distanceKm} ${AppStrings.get('kmFromProvince')} · '
                                '${_ago(q.time)} · ${q.source == 'phivolcs' ? 'PHIVOLCS' : 'USGS'}',
                                style: TextStyle(fontSize: 12, color: muted),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              Text(AppStrings.get('quakeSourceNote'), style: TextStyle(fontSize: 12, color: muted)),
            ],
          ),
        );
      },
    );
  }

  static String _ago(DateTime t) {
    final d = DateTime.now().difference(t);
    if (d.inMinutes < 60) return '${d.inMinutes.clamp(1, 59)} min';
    if (d.inHours < 24) return '${d.inHours} h';
    return '${d.inDays} d';
  }
}
