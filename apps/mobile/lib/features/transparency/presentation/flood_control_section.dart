import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:intl/intl.dart';

import '../../../core/l10n/app_strings.dart';

/// One DPWH flood-control project (assets/data/flood_control.json, made by
/// scripts/import-dpwh-flood-control.mjs). See docs/flood-control.md.
class FloodProject {
  final String id;
  final String description;
  final String? town;
  final int year;
  final double contractCost;
  final String contractor;
  final String? startDate;
  final String? completedDate;

  const FloodProject({
    required this.id,
    required this.description,
    required this.town,
    required this.year,
    required this.contractCost,
    required this.contractor,
    this.startDate,
    this.completedDate,
  });

  static FloodProject? fromMap(Map<String, dynamic> m) {
    final id = m['id'], desc = m['description'], year = m['year'];
    final cost = m['contractCost'], contractor = m['contractor'];
    if (id is! String || desc is! String || year is! num || cost is! num || contractor is! String) {
      return null;
    }
    String? str(Object? v) => v is String && v.isNotEmpty ? v : null;
    return FloodProject(
      id: id,
      description: desc,
      town: str(m['town']),
      year: year.toInt(),
      contractCost: cost.toDouble(),
      contractor: contractor,
      startDate: str(m['startDate']),
      completedDate: str(m['completedDate']),
    );
  }
}

/// The town's projects, newest programme year first.
List<FloodProject> projectsForTown(List<FloodProject> all, String town) =>
    all.where((p) => p.town == town).toList()
      ..sort((a, b) => b.year != a.year ? b.year.compareTo(a.year) : a.id.compareTo(b.id));

Future<List<FloodProject>>? _cache;
Future<List<FloodProject>> _loadProjects() => _cache ??= rootBundle
    .loadString('assets/data/flood_control.json')
    .then((s) => ((jsonDecode(s) as Map<String, dynamic>)['projects'] as List)
        .map((e) => FloodProject.fromMap(e as Map<String, dynamic>))
        .whereType<FloodProject>()
        .toList());

/// "Flood-control projects (DPWH)" for the town info sheet. Hidden until a
/// provincial admin sets public_settings/transparency.floodControlPublic,
/// which waits for the Governor's office's approval.
class FloodControlSection extends StatelessWidget {
  final String municipality;
  final Color color;
  const FloodControlSection({super.key, required this.municipality, required this.color});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
      stream: FirebaseFirestore.instance.doc('public_settings/transparency').snapshots(),
      builder: (context, snap) {
        if (snap.data?.data()?['floodControlPublic'] != true) return const SizedBox.shrink();
        return FutureBuilder<List<FloodProject>>(
          future: _loadProjects(),
          builder: (context, data) {
            if (!data.hasData) return const SizedBox.shrink();
            return FloodControlList(
                projects: projectsForTown(data.data!, municipality), color: color);
          },
        );
      },
    );
  }
}

class FloodControlList extends StatelessWidget {
  final List<FloodProject> projects;
  final Color color;
  const FloodControlList({super.key, required this.projects, required this.color});

  @override
  Widget build(BuildContext context) {
    final peso = NumberFormat.currency(locale: 'en_PH', symbol: '₱', decimalDigits: 0);
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    final total = projects.fold<double>(0, (s, p) => s + p.contractCost);
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(Icons.water_outlined, size: 18, color: color),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '${AppStrings.get('floodControlTitle')} (${projects.length})',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: color),
              ),
            ),
          ]),
          const SizedBox(height: 8),
          if (projects.isEmpty)
            Text(AppStrings.get('floodControlNone'), style: const TextStyle(fontSize: 14))
          else ...[
            Text(peso.format(total),
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            ...projects.map((p) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(p.description, style: const TextStyle(fontSize: 14, height: 1.35)),
                      const SizedBox(height: 2),
                      Text(
                        '${p.year} · ${peso.format(p.contractCost)} · '
                        '${AppStrings.get('contractor')}: ${p.contractor}',
                        style: TextStyle(fontSize: 12, color: muted),
                      ),
                      if (p.startDate != null || p.completedDate != null)
                        Text(
                          [
                            if (p.startDate != null) '${AppStrings.get('started')} ${p.startDate}',
                            if (p.completedDate != null)
                              '${AppStrings.get('completed')} ${p.completedDate}',
                          ].join(' · '),
                          style: TextStyle(fontSize: 12, color: muted),
                        ),
                    ],
                  ),
                )),
          ],
          Text(AppStrings.get('floodControlNote'),
              style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: muted)),
        ],
      ),
    );
  }
}
