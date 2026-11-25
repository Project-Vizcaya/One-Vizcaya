import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_vizcaya/presentation/widgets/service_tile.dart';

Widget _host(Widget child, {bool still = false}) => MaterialApp(
  home: Builder(
    builder: (ctx) => MediaQuery(
      data: MediaQuery.of(ctx).copyWith(disableAnimations: still),
      child: Scaffold(body: Center(child: child)),
    ),
  ),
);

ServiceTile _tile(VoidCallback onTap) => ServiceTile(
  icon: Icons.campaign_rounded,
  label: 'Announcements',
  tone: ServiceTileTone.neutral,
  accent: const Color(0xFF800000),
  onTap: onTap,
);

double _scaleOf(WidgetTester t) => t
    .widget<Transform>(
      find
          .descendant(
            of: find.byType(ServiceTile),
            matching: find.byType(Transform),
          )
          .first,
    )
    .transform
    .storage[0];

void main() {
  testWidgets('a tap fires once and the press springs back to rest', (
    tester,
  ) async {
    var taps = 0;
    await tester.pumpWidget(_host(_tile(() => taps++)));
    final g = await tester.startGesture(
      tester.getCenter(find.byType(ServiceTile)),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 120));
    expect(_scaleOf(tester), closeTo(0.92, 0.01)); // pressed in
    await g.up();
    await tester.pumpAndSettle();
    expect(taps, 1);
    expect(_scaleOf(tester), closeTo(1.0, 0.001)); // back at rest
  });

  testWidgets('a quick tap still fires and settles', (tester) async {
    var taps = 0;
    await tester.pumpWidget(_host(_tile(() => taps++)));
    await tester.tap(find.byType(ServiceTile));
    await tester.pumpAndSettle();
    expect(taps, 1);
  });

  testWidgets('a cancelled press (scroll) does not fire and returns to rest', (
    tester,
  ) async {
    var taps = 0;
    await tester.pumpWidget(_host(_tile(() => taps++)));
    final g = await tester.startGesture(
      tester.getCenter(find.byType(ServiceTile)),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 60));
    await g.moveBy(const Offset(0, 80));
    await g.up();
    await tester.pumpAndSettle();
    expect(taps, 0);
    expect(_scaleOf(tester), closeTo(1.0, 0.001));
  });

  testWidgets('with animations off the tile never scales', (tester) async {
    await tester.pumpWidget(_host(_tile(() {}), still: true));
    final g = await tester.startGesture(
      tester.getCenter(find.byType(ServiceTile)),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 120));
    expect(_scaleOf(tester), 1.0);
    await g.up();
    await tester.pumpAndSettle();
  });
}
