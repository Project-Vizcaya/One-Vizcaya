import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_vizcaya/data/services/offline_queue_service.dart';
import 'package:one_vizcaya/data/services/report_submitter.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Offline report queue (P1, PDRRMO §1/§12). The original bug: items were
// written in a loop but the queue was cleared only after the whole loop
// succeeded, so a mid-loop failure re-submitted earlier items next launch.

Map<String, dynamic> _item(String reportId, {String desc = 'x'}) => {
      'reportId': reportId,
      'userId': 'u1',
      'category': 'Flooding',
      'description': desc,
    };

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late OfflineQueueService q;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    q = OfflineQueueService();
  });

  test('enqueue assigns a queueId and updates the live count', () async {
    await q.enqueue(_item('r1'));
    final list = await q.getQueue();
    expect(list.single['queueId'], isNotNull);
    expect(list.single['attempts'], 0);
    expect(OfflineQueueService.count.value, 1);
  });

  test('items are removed one at a time, leaving the rest queued', () async {
    await q.enqueue(_item('r1'));
    await q.enqueue(_item('r2'));
    await q.enqueue(_item('r3'));
    final first = (await q.getQueue()).first['queueId'] as String;
    // Simulates: r1 delivered, then the connection drops before r2.
    await q.remove(first);
    final left = await q.getQueue();
    expect(left.map((x) => x['reportId']), ['r2', 'r3']);
    expect(OfflineQueueService.count.value, 2);
  });

  test('the same report queued twice is kept once', () async {
    await q.enqueue(_item('r1', desc: 'first'));
    await q.enqueue(_item('r1', desc: 'retry'));
    final list = await q.getQueue();
    expect(list.length, 1);
    expect(list.single['description'], 'retry');
  });

  test('items from older app versions get stable ids', () async {
    SharedPreferences.setMockInitialValues({
      'offline_report_queue': jsonEncode([
        {'userId': 'u1', 'category': 'Flooding', 'description': 'legacy'},
      ]),
    });
    final a = await OfflineQueueService().getQueue();
    final b = await OfflineQueueService().getQueue();
    expect(a.single['queueId'], isNotNull);
    expect(a.single['reportId'], isNotNull);
    expect(b.single['queueId'], a.single['queueId'], reason: 'ids persist across reads');
    expect(b.single['reportId'], a.single['reportId']);
  });

  test('failed attempts are counted so a permanent refusal stops retrying', () async {
    await q.enqueue(_item('r1'));
    final id = (await q.getQueue()).single['queueId'] as String;
    for (var i = 0; i < OfflineQueueService.maxAttempts; i++) {
      await q.recordFailedAttempt(id, 'permission-denied');
    }
    final item = (await q.getQueue()).single;
    expect(item['attempts'], OfflineQueueService.maxAttempts);
    expect(item['lastError'], 'permission-denied');
  });

  test('malformed stored data does not crash the queue', () async {
    SharedPreferences.setMockInitialValues({'offline_report_queue': 'not json'});
    expect(await OfflineQueueService().getQueue(), isEmpty);
  });

  group('ReportSubmitter.isNetworkError', () {
    test('connectivity failures are retried later', () {
      expect(ReportSubmitter.isNetworkError(TimeoutException('t')), isTrue);
      expect(ReportSubmitter.isNetworkError(const SocketException('x')), isTrue);
      expect(
          ReportSubmitter.isNetworkError(
              FirebaseException(plugin: 'cloud_firestore', code: 'unavailable')),
          isTrue);
    });

    test('permanent refusals are not mistaken for a lost connection', () {
      expect(
          ReportSubmitter.isNetworkError(
              FirebaseException(plugin: 'cloud_firestore', code: 'permission-denied')),
          isFalse);
      expect(ReportSubmitter.isNetworkError(StateError('signed out')), isFalse);
    });
  });
}
