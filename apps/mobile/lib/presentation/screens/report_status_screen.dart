import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../core/constants/app_constants.dart';
import '../../core/l10n/app_strings.dart';
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
  String? _highlightedReportId;
  final ScrollController _scrollController = ScrollController();
  final ReportRepository _reportRepository = FirebaseReportRepository();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map && args.containsKey('reportId')) {
      _highlightedReportId = args['reportId'] as String?;
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToHighlighted(List<ProblemReport> reports) {
    if (_highlightedReportId == null) return;
    final index = reports.indexWhere((r) => r.id == _highlightedReportId);
    if (index == -1) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        // Approximate item height to scroll to the right position
        const itemHeight = 120.0;
        _scrollController.animateTo(
          index * itemHeight,
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final activeLguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final activeMunicipalityName = oneVizcayaState.selectedMunicipality.value;
    final user = FirebaseAuth.instance.currentUser;

    if (user == null) {
      return Scaffold(
        body: Center(child: Text(AppStrings.get('loginToView'))),
      );
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: activeLguColor,
        title: Text('${AppStrings.get('myReportsTitle')} ${AppStrings.get('prepositionTo')} $activeMunicipalityName'),
      ),
      body: SafeArea(
        top: false,
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: AppConstants.kContentMaxWidth),
            child: Column(
        children: [
          // Priority filter chips
          Container(
            width: double.infinity,
            color: Colors.grey.shade100,
            child: Stack(
              children: [
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Row(
                    children: [
                      Text(AppStrings.get('filterLabel'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(width: 4),
                      FilterChip(
                        label: Text(AppStrings.get('filterAll')),
                        selected: _filterPriority == null,
                        selectedColor: activeLguColor.withAlpha((255 * 0.2).round()),
                        onSelected: (_) => setState(() => _filterPriority = null),
                      ),
                      const SizedBox(width: 6),
                      ...ReportPriority.values.reversed.map((priority) {
                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: FilterChip(
                            avatar: Icon(priority.icon, size: 14, color: priority.color, semanticLabel: priority.displayName),
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
                // Fade hint indicating more chips to the right
                Positioned(
                  right: 0, top: 0, bottom: 0,
                  child: IgnorePointer(
                    child: Container(
                      width: 32,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.centerLeft,
                          end: Alignment.centerRight,
                          colors: [
                            Colors.grey.shade100.withValues(alpha: 0),
                            Colors.grey.shade100,
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Reports list
          Expanded(
            child: StreamBuilder<List<ProblemReport>>(
              stream: _reportRepository.getUserReports(user.uid, activeMunicipalityName),
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
                        Icon(Icons.history, size: 64, color: activeLguColor.withAlpha((255 * 0.3).round()), semanticLabel: 'No reports'),
                        const SizedBox(height: 16),
                        Text('${AppStrings.get('noReportsYet')} ($activeMunicipalityName)'),
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
                    child: Text(AppStrings.get('noReportsFilter')),
                  );
                }

                // Trigger scroll to highlighted item after build
                _scrollToHighlighted(reports);

                // FEATURE 5: Pull-to-refresh wraps the ListView
                return RefreshIndicator(
                  color: activeLguColor,
                  onRefresh: () async {
                    setState(() {});
                  },
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(8.0),
                    itemCount: reports.length,
                    itemBuilder: (context, index) {
                      final report = reports[index];
                      final isHighlighted = _highlightedReportId != null &&
                          report.id == _highlightedReportId;
                      if (isHighlighted) {
                        return Container(
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: Colors.amber.shade600,
                              width: 2.5,
                            ),
                            borderRadius: BorderRadius.circular(16.0),
                          ),
                          margin: const EdgeInsets.symmetric(vertical: 2),
                          child: ReportStatusCard(report: report, lguColor: activeLguColor),
                        );
                      }
                      return ReportStatusCard(report: report, lguColor: activeLguColor);
                    },
                  ),
                );
              },
            ),
          ),
        ],
        ),
          ),
        ),
      ),
    );
  }
}
