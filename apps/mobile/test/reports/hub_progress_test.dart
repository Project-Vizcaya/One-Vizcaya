import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_vizcaya/domain/models/hub_progress.dart';
import 'package:one_vizcaya/features/reports/presentation/widgets/hub_progress_view.dart';
import 'package:one_vizcaya/presentation/widgets/call_first_strip.dart';

Widget _wrap(Widget w) => MaterialApp(home: Scaffold(body: SingleChildScrollView(child: w)));

void main() {
  test('HubProgress.fromMap accepts only known stages', () {
    expect(HubProgress.fromMap({'stage': 'en_route', 'etaMin': 10, 'etaMax': 15})!.hasEta, isTrue);
    expect(HubProgress.fromMap({'stage': 'on_scene', 'etaMin': 10, 'etaMax': 15})!.hasEta, isFalse);
    expect(HubProgress.fromMap({'stage': 'teleported'}), isNull);
    expect(HubProgress.fromMap(null), isNull);
    expect(HubProgress.fromMap({'stage': 'received', 'agency': ''})!.agency, isNull);
  });

  testWidgets('on the way: rounded range, agency, privacy note; no position', (tester) async {
    await tester.pumpWidget(_wrap(const HubProgressView(
      hub: HubProgress(stage: 'en_route', etaMin: 10, etaMax: 15, agency: 'PDRRMO'),
      accent: Colors.green,
    )));
    expect(find.text('About 10 to 15 minutes'), findsOneWidget);
    expect(find.text('Responding agency: PDRRMO'), findsOneWidget);
    expect(find.textContaining('exact location is not shown'), findsOneWidget);
    expect(find.textContaining('km'), findsNothing);
  });

  testWidgets('under five minutes and no ETA once on scene', (tester) async {
    await tester.pumpWidget(_wrap(const HubProgressView(
      hub: HubProgress(stage: 'en_route', etaMin: 0, etaMax: 5), accent: Colors.green)));
    expect(find.text('Less than 5 minutes'), findsOneWidget);
    await tester.pumpWidget(_wrap(const HubProgressView(
      hub: HubProgress(stage: 'on_scene', etaMin: 0, etaMax: 5), accent: Colors.green)));
    expect(find.text('Less than 5 minutes'), findsNothing);
  });

  testWidgets('incident ID is shown', (tester) async {
    await tester.pumpWidget(_wrap(const IncidentIdLine(incidentId: 'NV-BAM-20261124-3F9A2C')));
    expect(find.text('NV-BAM-20261124-3F9A2C'), findsOneWidget);
  });

  testWidgets('call-first strip offers PDRRMO, 911 and SOS', (tester) async {
    await tester.pumpWidget(_wrap(const CallFirstStrip()));
    expect(find.text('Emergency? Call first.'), findsWidgets);
    expect(find.text('Call PDRRMO'), findsOneWidget);
    expect(find.text('Call 911'), findsOneWidget);
    expect(find.text('SOS'), findsOneWidget);
  });
}
