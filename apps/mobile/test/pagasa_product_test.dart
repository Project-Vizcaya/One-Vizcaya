import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:one_vizcaya/data/models/pagasa_product.dart';

// The fixture is the Cloud Function parser's REAL output for PAGASA's
// Northern Luzon PRSD page captured 2026-11-03, generated from
// apps/functions/pagasa-public/fixtures/nlprsd-2026-11-03.html. Testing the
// Dart model against it catches any drift between what the function writes and
// what the app reads.

Map<String, dynamic> _doc() => jsonDecode(
      File('test/fixtures/pagasa_nueva_vizcaya.json').readAsStringSync(),
    ) as Map<String, dynamic>;

void main() {
  group('PagasaProduct.fromMap on the real document', () {
    final p = PagasaProduct.fromMap(_doc());

    test('reads the Nueva Vizcaya provincial forecast with its coverage', () {
      expect(p.hasForecast, isTrue);
      expect(p.forecastCoverage!.level, 'province');
      expect(p.forecastCoverage!.name, 'Nueva Vizcaya');
      expect(p.forecastCoverage!.psgc, '0205000000');
      expect(p.day!.high, 32);
      expect(p.day!.low, 24);
      expect(p.night!.low, 23);
      expect(p.forecastIssuedAt, DateTime.utc(2026, 11, 3, 1));
    });

    test('reads the 5-day outlook in order with Philippine dates', () {
      expect(p.outlook.map((d) => d.label), [
        'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
      ]);
      expect(p.outlook.first.date, '2026-11-03');
      expect(p.outlook[2].period.description, contains('thunderstorm'));
    });

    test('regional products keep their regional coverage', () {
      expect(p.synopsisCoverage!.level, 'region');
      expect(p.rainfallCoverage!.level, 'region');
      expect(p.thunderstormCoverage!.level, 'region');
      expect(p.synopsisMentionsTropicalCyclone, isTrue);
      expect(p.rainfallNoneIssued, isTrue);
    });

    test('thunderstorm validity comes only from the stated window', () {
      expect(p.thunderstorms.map((t) => t.kind), ['information', 'watch']);
      final info = p.thunderstorms.first;
      expect(info.validUntil, DateTime.utc(2026, 11, 3, 13, 37));
      expect(info.isExpired(DateTime.utc(2026, 11, 3, 13, 36)), isFalse);
      expect(info.isExpired(DateTime.utc(2026, 11, 3, 13, 38)), isTrue);
      expect(info.mentionsNuevaVizcaya, isFalse);
    });

    test('an item with no stated window is never called expired', () {
      const t = PagasaThunderstorm('watch', 'x', null, null, 'text', false);
      expect(t.isExpired(DateTime.utc(2099)), isFalse);
    });
  });

  group('pagasaFreshness', () {
    PagasaProduct at(DateTime success, {DateTime? error}) {
      final m = _doc()
        ..['lastSuccessAt'] = success.toIso8601String()
        ..['lastErrorAt'] = error?.toIso8601String();
      return PagasaProduct.fromMap(m);
    }

    final t0 = DateTime.utc(2026, 11, 3, 3);

    test('missing document or no forecast -> unavailable', () {
      expect(pagasaFreshness(null, t0), PagasaFreshness.unavailable);
      expect(pagasaFreshness(PagasaProduct.fromMap({'lastError': 'x'}), t0),
          PagasaFreshness.unavailable);
    });

    test('recent success -> updated', () {
      expect(pagasaFreshness(at(t0), t0.add(const Duration(minutes: 30))),
          PagasaFreshness.updated);
    });

    test('a failed attempt since the last success -> cached', () {
      final p = at(t0, error: t0.add(const Duration(minutes: 60)));
      expect(pagasaFreshness(p, t0.add(const Duration(minutes: 70))),
          PagasaFreshness.cached);
    });

    test('older than 2 h -> cached; older than 6 h -> stale', () {
      expect(pagasaFreshness(at(t0), t0.add(const Duration(hours: 3))),
          PagasaFreshness.cached);
      expect(pagasaFreshness(at(t0), t0.add(const Duration(hours: 7))),
          PagasaFreshness.stale);
    });
  });
}
