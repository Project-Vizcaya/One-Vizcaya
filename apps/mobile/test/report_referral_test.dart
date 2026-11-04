import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_vizcaya/domain/models/problem_report.dart';

void main() {
  test('parses a referral written by the web console or this app', () {
    final r = ReportReferral.fromMap({
      'officeType': 'BFP',
      'officeName': 'BFP Solano',
      'contact': '',
      'note': 'Check the culvert',
      'by': 'admin123456',
      'at': Timestamp.fromDate(DateTime(2026, 11, 4, 9)),
    })!;
    expect(r.officeType, 'BFP');
    expect(r.officeName, 'BFP Solano');
    expect(r.contact, isNull, reason: 'empty optional fields read as absent');
    expect(r.note, 'Check the culvert');
    expect(r.at, DateTime(2026, 11, 4, 9));
  });

  test('no referral, or a malformed one, reads as null', () {
    expect(ReportReferral.fromMap(null), isNull);
    expect(ReportReferral.fromMap('MDRRMO'), isNull);
  });

  test('office types match firestore.rules referralOfficeTypes()', () {
    expect(ReportReferral.officeTypes.keys.toList(), [
      'MDRRMO', 'BDRRMC', 'PDRRMO', 'BFP', 'PNP', 'MHO', 'MSWDO', 'MEO', 'DPWH', 'Other',
    ]);
  });
}
