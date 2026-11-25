import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_vizcaya/core/constants/app_constants.dart';
import 'package:one_vizcaya/core/utils/color_utils.dart';
import 'package:one_vizcaya/features/announcements/presentation/widgets/announcements_carousel.dart';

final _now = DateTime(2026, 11, 25, 9);

Map<String, dynamic> _ann({
  required Duration age,
  String municipality = 'Bambang',
  bool urgent = false,
  String source = 'https://example.org/post',
}) => {
  'title':
      'PGNV, LGU Bambang sign MOA during the provincial farmers '
      'congress at the capitol grounds',
  'body':
      'The Provincial Government of Nueva Vizcaya and the Local '
      'Government Unit of Bambang signed a memorandum of agreement on '
      'farm-to-market roads and irrigation.',
  'postedBy': 'Office of the Governor',
  'municipality': municipality,
  'isUrgent': urgent,
  'sourceUrl': source,
  'timestamp': Timestamp.fromDate(_now.subtract(age)),
};

Widget _host(Widget child, {double scale = 1, bool dark = false}) =>
    MaterialApp(
      theme: ThemeData(brightness: dark ? Brightness.dark : Brightness.light),
      home: Builder(
        builder: (ctx) => MediaQuery(
          data: MediaQuery.of(ctx).copyWith(
            textScaler: TextScaler.linear(scale),
            disableAnimations: true,
          ),
          child: Scaffold(body: Center(child: child)),
        ),
      ),
    );

void main() {
  group('isNewAnnouncement', () {
    test('new within 48 hours, old after, unknown time is not new', () {
      expect(
        isNewAnnouncement(_now.subtract(const Duration(hours: 1)), _now),
        isTrue,
      );
      expect(
        isNewAnnouncement(_now.subtract(const Duration(hours: 47)), _now),
        isTrue,
      );
      expect(
        isNewAnnouncement(_now.subtract(const Duration(hours: 48)), _now),
        isFalse,
      );
      expect(isNewAnnouncement(null, _now), isFalse);
    });
  });

  group('textSafeAccent', () {
    test('every town colour reaches 4.5:1 as text on white and on dark', () {
      const darkSurface = Color(0xFF1E1E1E);
      AppConstants.municipalityThemes.forEach((town, t) {
        final c = t['appBarColor'] as Color;
        for (final bg in [Colors.white, darkSurface]) {
          final safe = ColorUtils.textSafeAccent(c, bg);
          expect(
            ColorUtils.contrast(safe, bg),
            greaterThanOrEqualTo(4.5),
            reason: '$town on $bg',
          );
        }
      });
    });

    test('dark enough town colours are left unchanged', () {
      const maroon = Color(0xFF800000);
      expect(ColorUtils.textSafeAccent(maroon, Colors.white), maroon);
    });
  });

  group('AnnouncementPager', () {
    for (final scale in [1.0, 1.3, 1.6, 2.0]) {
      for (final width in [320.0, 412.0]) {
        testWidgets('no overflow at text x$scale, ${width}px', (tester) async {
          tester.view.physicalSize = Size(width, 900);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.reset);
          await tester.pumpWidget(
            _host(
              AnnouncementPager(
                items: [
                  _ann(age: const Duration(hours: 2)),
                  _ann(age: const Duration(days: 4), municipality: 'All'),
                ],
                accent: const Color(0xFF32CD32),
                now: _now,
              ),
              scale: scale,
            ),
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
        });
      }
    }

    testWidgets('new post shows NEW and the official label; old does not', (
      tester,
    ) async {
      await tester.pumpWidget(
        _host(
          AnnouncementCard(
            data: _ann(age: const Duration(hours: 3)),
            accent: const Color(0xFF800000),
            now: _now,
          ),
        ),
      );
      expect(find.text('NEW'), findsOneWidget);
      expect(find.text('OFFICIAL ANNOUNCEMENT'), findsOneWidget);

      await tester.pumpWidget(
        _host(
          AnnouncementCard(
            data: _ann(age: const Duration(days: 3), municipality: 'All'),
            accent: const Color(0xFF800000),
            now: _now,
          ),
        ),
      );
      expect(find.text('NEW'), findsNothing);
      expect(find.text('PROVINCIAL ANNOUNCEMENT'), findsOneWidget);
    });

    testWidgets('urgent post is labelled URGENT', (tester) async {
      await tester.pumpWidget(
        _host(
          AnnouncementCard(
            data: _ann(age: const Duration(days: 5), urgent: true),
            accent: const Color(0xFF006400),
            now: _now,
          ),
        ),
      );
      expect(find.text('URGENT'), findsOneWidget);
    });

    testWidgets('NEW dot pulse settles when animations are on', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AnnouncementCard(
              data: _ann(age: const Duration(hours: 1)),
              accent: const Color(0xFF0A369D),
              now: _now,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });
}
