import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../domain/models/problem_report.dart';
import '../../domain/enums/report_priority.dart';
import '../../domain/repositories/report_repository.dart';
import '../../data/repositories_impl/firebase_report_repository.dart';
import '../state/municipality_state.dart';
import '../widgets/report_status_card.dart';

class ReportStatusScreen extends StatefulWidget {
  const ReportStatusScreen({super.key});

  @override
  _ReportStatusScreenState createState() => _ReportStatusScreenState();
}

class _ReportStatusScreenState extends State<ReportStatusScreen> {
  ReportPriority? _filterPriority;

  @override
  Widget build(BuildContext context) {
    final activeLguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final activeMunicipalityName = oneVizcayaState.selectedMunicipality.value;
    final user = FirebaseAuth.instance.currentUser;

    if (user == null) {
      return const Scaffold(
        body: Center(child: Text('Please log in to view reports.')),
      );
    }

    final ReportRepository reportRepository = FirebaseReportRepository();

    return Scaffold(
      appBar: AppBar(
        backgroundColor: activeLguColor,
        title: Text('My Reports to $activeMunicipalityName'),
      ),
      body: SafeArea(
        top: false,
        child: Column(
        children: [
          // Priority filter chips
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            color: Colors.grey.shade100,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  const Text('Filter: ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(width: 4),
                  FilterChip(
                    label: const Text('All'),
                    selected: _filterPriority == null,
                    selectedColor: activeLguColor.withAlpha((255 * 0.2).round()),
                    onSelected: (_) => setState(() => _filterPriority = null),
                  ),
                  const SizedBox(width: 6),
                  ...ReportPriority.values.reversed.map((priority) {
                    return Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: FilterChip(
                        avatar: Icon(priority.icon, size: 14, color: priority.color),
                        label: Text(priority.displayName),
                        selected: _filterPriority == priority,
                        selectedColor: priority.color.withAlpha((255 * 0.2).round()),
                        onSelected: (_) => setState(() => _filterPriority = priority),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
          // Reports list
          Expanded(
            child: StreamBuilder<List<ProblemReport>>(
              stream: reportRepository.getUserReports(user.uid, activeMunicipalityName),
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(child: Text('Error: ${snapshot.error}'));
                }

                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (!snapshot.hasData || snapshot.data!.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.history, size: 64, color: activeLguColor.withAlpha((255 * 0.3).round())),
                        const SizedBox(height: 16),
                        Text('No reports submitted to $activeMunicipalityName yet.'),
                      ],
                    ),
                  );
                }

                // Apply priority filter, then sort by priority score (highest first)
                var reports = snapshot.data!;
                if (_filterPriority != null) {
                  reports = reports.where((r) => r.priority == _filterPriority).toList();
                }
                reports.sort((a, b) => b.priorityScore.compareTo(a.priorityScore));

                if (reports.isEmpty) {
                  return Center(
                    child: Text('No ${_filterPriority?.displayName ?? ""} priority reports found.'),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(8.0),
                  itemCount: reports.length,
                  itemBuilder: (context, index) {
                    final report = reports[index];
                    return ReportStatusCard(report: report, lguColor: activeLguColor);
                  },
                );
              },
            ),
          ),
        ],
        ),
      ),
    );
  }
}
