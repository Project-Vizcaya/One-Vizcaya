import 'package:flutter/material.dart';
import '../../domain/models/problem_report.dart';
import '../../domain/enums/report_priority.dart';
import '../../domain/enums/report_status.dart';
import '../../domain/repositories/report_repository.dart';
import '../../data/repositories_impl/firebase_report_repository.dart';
import '../../core/utils/toast_utils.dart';
import '../state/municipality_state.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  _AdminDashboardScreenState createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final ReportRepository _reportRepository = FirebaseReportRepository();
  ReportPriority? _filterPriority;
  ReportStatus? _filterStatus;

  @override
  Widget build(BuildContext context) {
    final activeLguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final activeMunicipalityName = oneVizcayaState.selectedMunicipality.value;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: activeLguColor,
        title: Text('$activeMunicipalityName Admin'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: () => setState(() {}),
          ),
        ],
      ),
      body: Column(
        children: [
          // Summary stats bar
          _buildSummaryBar(activeLguColor, activeMunicipalityName),
          // Filter bar
          _buildFilterBar(activeLguColor),
          // Reports list
          Expanded(
            child: StreamBuilder<List<ProblemReport>>(
              stream: _reportRepository.getAllMunicipalityReports(activeMunicipalityName),
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 64, color: Colors.red),
                        const SizedBox(height: 16),
                        Text('Error: ${snapshot.error}'),
                        const SizedBox(height: 8),
                        const Text(
                          'Note: This feature requires a Firestore\ncollection group index on "reports".',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ],
                    ),
                  );
                }

                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (!snapshot.hasData || snapshot.data!.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.inbox, size: 64, color: activeLguColor.withAlpha((255 * 0.3).round())),
                        const SizedBox(height: 16),
                        Text('No reports submitted to $activeMunicipalityName yet.'),
                      ],
                    ),
                  );
                }

                var reports = snapshot.data!;

                // Apply filters
                if (_filterPriority != null) {
                  reports = reports.where((r) => r.priority == _filterPriority).toList();
                }
                if (_filterStatus != null) {
                  reports = reports.where((r) => r.status == _filterStatus).toList();
                }

                // Sort: unsolved first, then by priority score descending
                reports.sort((a, b) {
                  // Solved reports go to the bottom
                  if (a.status == ReportStatus.solved && b.status != ReportStatus.solved) return 1;
                  if (b.status == ReportStatus.solved && a.status != ReportStatus.solved) return -1;
                  // Then sort by priority score
                  return b.priorityScore.compareTo(a.priorityScore);
                });

                if (reports.isEmpty) {
                  return const Center(child: Text('No reports match the selected filters.'));
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(8.0),
                  itemCount: reports.length,
                  itemBuilder: (context, index) {
                    return _AdminReportCard(
                      report: reports[index],
                      lguColor: activeLguColor,
                      onStatusUpdate: (reportId, userId, newStatus) {
                        _reportRepository.updateReportStatus(userId, reportId, newStatus);
                      },
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryBar(Color lguColor, String municipality) {
    return StreamBuilder<List<ProblemReport>>(
      stream: _reportRepository.getAllMunicipalityReports(municipality),
      builder: (context, snapshot) {
        final reports = snapshot.data ?? [];
        final total = reports.length;
        final critical = reports.where((r) => r.priority == ReportPriority.critical && r.status != ReportStatus.solved).length;
        final pending = reports.where((r) => r.status == ReportStatus.reported).length;
        final ongoing = reports.where((r) => r.status == ReportStatus.ongoing).length;
        final solved = reports.where((r) => r.status == ReportStatus.solved).length;

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [lguColor, lguColor.withAlpha((255 * 0.7).round())],
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _StatBadge(label: 'Total', count: total, color: Colors.white),
              _StatBadge(label: 'Critical', count: critical, color: ReportPriority.critical.color),
              _StatBadge(label: 'Pending', count: pending, color: Colors.blue.shade200),
              _StatBadge(label: 'Ongoing', count: ongoing, color: Colors.orange.shade200),
              _StatBadge(label: 'Solved', count: solved, color: Colors.green.shade200),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFilterBar(Color lguColor) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      color: Colors.grey.shade100,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            const Text('Priority: ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            FilterChip(
              label: const Text('All', style: TextStyle(fontSize: 12)),
              selected: _filterPriority == null,
              selectedColor: lguColor.withAlpha((255 * 0.2).round()),
              onSelected: (_) => setState(() => _filterPriority = null),
              visualDensity: VisualDensity.compact,
            ),
            const SizedBox(width: 4),
            ...ReportPriority.values.reversed.map((p) => Padding(
              padding: const EdgeInsets.only(right: 4),
              child: FilterChip(
                avatar: Icon(p.icon, size: 12, color: p.color),
                label: Text(p.displayName, style: const TextStyle(fontSize: 12)),
                selected: _filterPriority == p,
                selectedColor: p.color.withAlpha((255 * 0.2).round()),
                onSelected: (_) => setState(() => _filterPriority = p),
                visualDensity: VisualDensity.compact,
              ),
            )),
            const SizedBox(width: 12),
            const Text('Status: ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            FilterChip(
              label: const Text('All', style: TextStyle(fontSize: 12)),
              selected: _filterStatus == null,
              selectedColor: lguColor.withAlpha((255 * 0.2).round()),
              onSelected: (_) => setState(() => _filterStatus = null),
              visualDensity: VisualDensity.compact,
            ),
            const SizedBox(width: 4),
            ...[ReportStatus.reported, ReportStatus.ongoing, ReportStatus.solved].map((s) {
              final label = s == ReportStatus.reported ? 'Pending' : s == ReportStatus.ongoing ? 'Ongoing' : 'Solved';
              final color = s == ReportStatus.reported ? Colors.blue : s == ReportStatus.ongoing ? Colors.orange : Colors.green;
              return Padding(
                padding: const EdgeInsets.only(right: 4),
                child: FilterChip(
                  label: Text(label, style: const TextStyle(fontSize: 12)),
                  selected: _filterStatus == s,
                  selectedColor: color.withAlpha((255 * 0.2).round()),
                  onSelected: (_) => setState(() => _filterStatus = s),
                  visualDensity: VisualDensity.compact,
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

// --- Summary stat badge widget ---
class _StatBadge extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _StatBadge({required this.label, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          '$count',
          style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.bold),
        ),
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 11),
        ),
      ],
    );
  }
}

// --- Admin report card with status update actions ---
class _AdminReportCard extends StatelessWidget {
  final ProblemReport report;
  final Color lguColor;
  final void Function(String reportId, String userId, String newStatus) onStatusUpdate;

  const _AdminReportCard({
    required this.report,
    required this.lguColor,
    required this.onStatusUpdate,
  });

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }

  Color _getStatusColor(ReportStatus status) {
    switch (status) {
      case ReportStatus.reported: return Colors.blue.shade700;
      case ReportStatus.ongoing: return Colors.orange.shade700;
      case ReportStatus.solved: return Colors.green.shade700;
    }
  }

  String _getStatusText(ReportStatus status) {
    switch (status) {
      case ReportStatus.reported: return 'Pending';
      case ReportStatus.ongoing: return 'Ongoing';
      case ReportStatus.solved: return 'Solved';
    }
  }

  IconData _getStatusIcon(ReportStatus status) {
    switch (status) {
      case ReportStatus.reported: return Icons.flag;
      case ReportStatus.ongoing: return Icons.construction;
      case ReportStatus.solved: return Icons.check_circle;
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor(report.status);
    final priorityColor = report.priority.color;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6.0, horizontal: 4.0),
      child: Column(
        children: [
          // Priority banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: priorityColor.withAlpha((255 * 0.15).round()),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                Icon(report.priority.icon, size: 14, color: priorityColor),
                const SizedBox(width: 6),
                Text(
                  '${report.priority.displayName} Priority',
                  style: TextStyle(color: priorityColor, fontWeight: FontWeight.bold, fontSize: 12),
                ),
                const Spacer(),
                Text('Score: ${report.priorityScore}', style: TextStyle(color: priorityColor, fontSize: 11)),
                if (report.duplicateCount > 0) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: priorityColor.withAlpha((255 * 0.2).round()),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.people, size: 10, color: Colors.black54),
                        const SizedBox(width: 3),
                        Text(
                          '${report.duplicateCount} similar',
                          style: TextStyle(color: priorityColor, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          // Report content
          Padding(
            padding: const EdgeInsets.all(14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Category + Status
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Flexible(
                      child: Text(
                        report.category.displayName,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: lguColor,
                            ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withAlpha((255 * 0.1).round()),
                        borderRadius: BorderRadius.circular(20.0),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(_getStatusIcon(report.status), color: statusColor, size: 14),
                          const SizedBox(width: 4),
                          Text(
                            _getStatusText(report.status),
                            style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Description
                Text(report.description, style: Theme.of(context).textTheme.bodyMedium),
                const Divider(height: 20),
                // Location
                Row(
                  children: [
                    const Icon(Icons.location_on, size: 14, color: Colors.grey),
                    const SizedBox(width: 6),
                    Expanded(child: Text(report.location, style: const TextStyle(fontSize: 13))),
                  ],
                ),
                const SizedBox(height: 4),
                // Date
                Row(
                  children: [
                    const Icon(Icons.calendar_today, size: 14, color: Colors.grey),
                    const SizedBox(width: 6),
                    Text(_formatDate(report.reportedAt), style: const TextStyle(fontSize: 13)),
                  ],
                ),
                if (report.userPhone != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.phone, size: 14, color: Colors.grey),
                      const SizedBox(width: 6),
                      Text(report.userPhone!, style: const TextStyle(fontSize: 13)),
                    ],
                  ),
                ],
                if (report.latitude != null && report.longitude != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.map, size: 14, color: Colors.grey),
                      const SizedBox(width: 6),
                      Text(
                        '${report.latitude!.toStringAsFixed(4)}, ${report.longitude!.toStringAsFixed(4)}',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                // Admin action buttons
                Row(
                  children: [
                    const Text('Update Status: ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    const Spacer(),
                    if (report.status != ReportStatus.ongoing)
                      _StatusButton(
                        label: 'Ongoing',
                        color: Colors.orange,
                        onTap: () {
                          if (report.userId != null) {
                            onStatusUpdate(report.id, report.userId!, 'ongoing');
                          } else {
                            ToastUtils.showError('Cannot update: missing user info');
                          }
                        },
                      ),
                    const SizedBox(width: 8),
                    if (report.status != ReportStatus.solved)
                      _StatusButton(
                        label: 'Solved',
                        color: Colors.green,
                        onTap: () {
                          if (report.userId != null) {
                            onStatusUpdate(report.id, report.userId!, 'solved');
                          } else {
                            ToastUtils.showError('Cannot update: missing user info');
                          }
                        },
                      ),
                    if (report.status == ReportStatus.solved)
                      _StatusButton(
                        label: 'Reopen',
                        color: Colors.blue,
                        onTap: () {
                          if (report.userId != null) {
                            onStatusUpdate(report.id, report.userId!, 'reported');
                          } else {
                            ToastUtils.showError('Cannot update: missing user info');
                          }
                        },
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusButton extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _StatusButton({required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 30,
      child: ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
        ),
        child: Text(label),
      ),
    );
  }
}
