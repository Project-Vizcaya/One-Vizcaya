import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_vizcaya/core/services/municipality_info_service.dart';
import 'package:one_vizcaya/features/transparency/presentation/flood_control_section.dart';

void main() {
  final all = ((jsonDecode(File('assets/data/flood_control.json').readAsStringSync())
          as Map<String, dynamic>)['projects'] as List)
      .map((e) => FloodProject.fromMap(e as Map<String, dynamic>))
      .whereType<FloodProject>()
      .toList();

  test('bundled DPWH data parses and every project has a known town', () {
    expect(all.length, 85);
    for (final p in all) {
      expect(MunicipalityInfoService.zipCodes.containsKey(p.town), isTrue, reason: p.id);
    }
  });

  test('projectsForTown keeps one town, newest year first', () {
    final bambang = projectsForTown(all, 'Bambang');
    expect(bambang.length, 31);
    expect(bambang.every((p) => p.town == 'Bambang'), isTrue);
    for (var i = 1; i < bambang.length; i++) {
      expect(bambang[i - 1].year >= bambang[i].year, isTrue);
    }
    expect(projectsForTown(all, 'Ambaguio'), isEmpty);
  });

  testWidgets('list shows contractor and cost; empty town says so', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: FloodControlList(projects: projectsForTown(all, 'Santa Fe'), color: Colors.green),
        ),
      ),
    ));
    expect(find.textContaining('BRG CONSTRUCTION'), findsWidgets);
    expect(find.textContaining('₱'), findsWidgets);

    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: FloodControlList(projects: [], color: Colors.green)),
    ));
    expect(find.textContaining('No DPWH flood-control projects'), findsOneWidget);
  });

  test('ZIP codes cover all 15 towns', () {
    expect(MunicipalityInfoService.zipCodes.length, 15);
    expect(MunicipalityInfoService.zipCodes['Bayombong'], '3700');
  });
}
