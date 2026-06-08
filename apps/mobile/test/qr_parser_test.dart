// Pure-Dart unit tests for the report QR payload parser. No Firebase needed.
import 'package:flutter_test/flutter_test.dart';
import 'package:one_vizcaya/presentation/screens/qr_scanner_screen.dart';

void main() {
  group('parseReportQr', () {
    test('parses a valid One Vizcaya report deep link', () {
      final result = parseReportQr(
          'onevizcaya://status?reportId=abc123&owner=uid9&category=Flood&status=solved');
      expect(result, isNotNull);
      expect(result!['reportId'], 'abc123');
      expect(result['owner'], 'uid9');
      expect(result['status'], 'solved');
    });

    test('trims surrounding whitespace', () {
      final result = parseReportQr('  onevizcaya://status?reportId=xyz  ');
      expect(result?['reportId'], 'xyz');
    });

    test('rejects a non-One-Vizcaya URL', () {
      expect(parseReportQr('https://example.com?reportId=abc'), isNull);
    });

    test('rejects the right scheme but wrong host', () {
      expect(parseReportQr('onevizcaya://profile?reportId=abc'), isNull);
    });

    test('rejects a payload with no reportId', () {
      expect(parseReportQr('onevizcaya://status?owner=uid9'), isNull);
    });

    test('rejects an empty reportId', () {
      expect(parseReportQr('onevizcaya://status?reportId='), isNull);
    });

    test('rejects arbitrary garbage', () {
      expect(parseReportQr('hello world'), isNull);
    });
  });
}
