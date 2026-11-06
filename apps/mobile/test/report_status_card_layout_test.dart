import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_vizcaya/domain/enums/report_category.dart';
import 'package:one_vizcaya/domain/enums/report_priority.dart';
import 'package:one_vizcaya/domain/enums/report_status.dart';
import 'package:one_vizcaya/domain/models/problem_report.dart';
import 'package:one_vizcaya/presentation/widgets/report_status_card.dart';

// Layout guard for the citizen "My Reports" card after the readability changes
// (minimum on-screen text raised to 11–12 px). Renders every status at a small
// phone width with enlarged system text — the worst realistic case for an
// elderly reader — and fails on any overflow. ("solved" is excluded: it
// queries Firestore for feedback state.)

ProblemReport _report(ReportStatus status) => ProblemReport(
      id: 'r1',
      category: ReportCategory.values.first,
      description: 'Flooded section of the provincial road near the bridge, '
          'passable only to large vehicles since this morning.',
      location: 'Purok 3, near the barangay hall',
      municipality: 'Alfonso Castañeda',
      barangay: 'Poblacion',
      status: status,
      priority: ReportPriority.high,
      reportedAt: DateTime(2026, 11, 3, 8, 30),
      disposition: status == ReportStatus.closed ? 'unverifiable' : null,
    );

Widget _host(ProblemReport r, {double textScale = 1.0, bool reduceMotion = false}) =>
    MediaQuery(
      data: MediaQueryData(
        size: const Size(320, 640),
        textScaler: TextScaler.linear(textScale),
        disableAnimations: reduceMotion,
      ),
      child: MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: SizedBox(width: 320, child: ReportStatusCard(report: r, lguColor: Colors.green)),
          ),
        ),
      ),
    );

void main() {
  const statuses = [
    ReportStatus.reported,
    ReportStatus.acknowledged,
    ReportStatus.underReview,
    ReportStatus.ongoing,
    ReportStatus.closed,
  ];

  for (final scale in [1.0, 1.3]) {
    for (final s in statuses) {
      testWidgets('no overflow: ${s.name} at 320 dp, text x$scale', (t) async {
        t.view.physicalSize = const Size(320, 640);
        t.view.devicePixelRatio = 1.0;
        addTearDown(t.view.reset);
        await t.pumpWidget(_host(_report(s), textScale: scale));
        await t.pump(const Duration(milliseconds: 300));
        expect(t.takeException(), isNull);
      });
    }
  }

  testWidgets('with reduce-motion on, the card settles instead of pulsing forever', (t) async {
    await t.pumpWidget(_host(_report(ReportStatus.underReview), reduceMotion: true));
    // pumpAndSettle times out if any animation is still repeating.
    await t.pumpAndSettle(const Duration(milliseconds: 100), EnginePhase.sendSemanticsUpdate,
        const Duration(seconds: 3));
    expect(t.takeException(), isNull);
  });

  testWidgets('a closed report shows its notice, not the "Resolved" stepper', (t) async {
    await t.pumpWidget(_host(_report(ReportStatus.closed)));
    await t.pump();
    expect(find.textContaining('Closed without action'), findsOneWidget);
  });
}
