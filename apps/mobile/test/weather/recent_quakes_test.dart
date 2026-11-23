import 'package:flutter_test/flutter_test.dart';
import 'package:one_vizcaya/features/weather/presentation/recent_quakes.dart';

void main() {
  final now = DateTime(2026, 11, 23, 16);
  QuakeItem q(String id, String level, {int hoursAgo = 1, bool superseded = false, String source = 'phivolcs'}) =>
      QuakeItem(id: id, source: source, magnitude: 4.5, distanceKm: 40, time: now.subtract(Duration(hours: hoursAgo)),
          level: level, superseded: superseded);

  test('residents see recent watch-level quakes and above, newest first', () {
    final shown = residentQuakes([
      q('old', 'critical', hoursAgo: 60),
      q('minor', 'info'),
      q('dup', 'warning', superseded: true, source: 'usgs'),
      q('watch', 'watch', hoursAgo: 5),
      q('crit', 'critical', hoursAgo: 2),
    ], now);
    expect(shown.map((e) => e.id), ['crit', 'watch']);
  });

  test('records missing a field are skipped, not shown half-empty', () {
    expect(QuakeItem.fromMap('x', {'magnitude': 4.0, 'source': 'usgs', 'distanceKm': 10}), isNull);
    expect(QuakeItem.fromMap('x', {'magnitude': 4.0, 'source': 'other', 'distanceKm': 10, 'timeMs': 1}), isNull);
    final ok = QuakeItem.fromMap('x', {'magnitude': 4.7, 'source': 'phivolcs', 'distanceKm': 14.4, 'timeMs': 1795420800000,
        'level': 'warning', 'place': 'Solano', 'supersededBy': null})!;
    expect(ok.distanceKm, 14);
    expect(ok.superseded, isFalse);
  });
}
