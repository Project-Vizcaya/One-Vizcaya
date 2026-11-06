import 'package:flutter_test/flutter_test.dart';
import 'package:one_vizcaya/domain/enums/report_category.dart';
import 'package:one_vizcaya/domain/enums/report_priority.dart';
import 'package:one_vizcaya/domain/enums/report_status.dart';
import 'package:one_vizcaya/domain/models/problem_report.dart';

ProblemReport _r({Map<String, String>? onBehalfOf}) => ProblemReport(
      id: 'r1',
      category: ReportCategory.values.first,
      description: 'Fallen tree blocking the barangay road.',
      location: 'Purok 2',
      municipality: 'Bambang',
      status: ReportStatus.reported,
      priority: ReportPriority.medium,
      reportedAt: DateTime(2026, 11, 4),
      onBehalfOf: onBehalfOf,
    );

void main() {
  test('a proxy report carries who it was filed for', () {
    final m = _r(onBehalfOf: {'name': 'Lola Maria', 'contact': '', 'relationship': 'Grandmother'}).toMap();
    expect(m['onBehalfOf'], {'name': 'Lola Maria', 'contact': '', 'relationship': 'Grandmother'});
  });

  test('an ordinary report has no onBehalfOf field at all', () {
    // firestore.rules treat an absent field as "filed for yourself".
    expect(_r().toMap().containsKey('onBehalfOf'), isFalse);
  });
}
