import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../domain/models/problem_report.dart';
import '../../domain/enums/report_priority.dart';
import '../../domain/enums/report_status.dart';
import '../../domain/repositories/report_repository.dart';
import '../../data/repositories_impl/firebase_report_repository.dart';
import '../../core/utils/toast_utils.dart';
import '../../core/constants/app_constants.dart';
import '../state/municipality_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  _AdminDashboardScreenState createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen>
    with SingleTickerProviderStateMixin {
  final ReportRepository _reportRepository = FirebaseReportRepository();

  // Filters & view state
  ReportPriority? _filterPriority;
  ReportStatus? _filterStatus;
  bool _isProvincialView = false;
  bool _sortNewestFirst = true;

  // Connectivity tracking (true when last stream update had error)
  bool _isOffline = false;

  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  String get _activeMunicipalityName =>
      oneVizcayaState.selectedMunicipality.value;

  Color get _activeLguColor =>
      oneVizcayaState.activeTheme['appBarColor'] as Color;

  Stream<List<ProblemReport>> get _reportsStream => _isProvincialView
      ? _reportRepository.getAllProvincialReports()
      : _reportRepository.getAllMunicipalityReports(_activeMunicipalityName);

  void _showAddAnnouncementSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useSafeArea: true,
      builder: (_) => _AddAnnouncementSheet(
        lguColor: _activeLguColor,
        municipality: _activeMunicipalityName,
      ),
    );
  }

  void _showReportDetail(ProblemReport report) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useSafeArea: true,
      builder: (_) => _ReportDetailSheet(
        report: report,
        lguColor: _activeLguColor,
        isProvincialView: _isProvincialView,
        onStatusUpdate: (reportId, userId, newStatus) =>
            _reportRepository.updateReportStatus(userId, reportId, newStatus),
        onEscalate: (reportId, userId) =>
            _reportRepository.escalateToProvince(userId, reportId),
      ),
    );
  }

  List<ProblemReport> _applyFiltersAndSort(List<ProblemReport> reports) {
    var filtered = reports;

    if (_filterPriority != null) {
      filtered =
          filtered.where((r) => r.priority == _filterPriority).toList();
    }
    if (_filterStatus != null) {
      filtered = filtered.where((r) => r.status == _filterStatus).toList();
    }

    if (_sortNewestFirst) {
      filtered.sort((a, b) {
        // Solved reports always sink to the bottom
        if (a.status == ReportStatus.solved &&
            b.status != ReportStatus.solved) return 1;
        if (b.status == ReportStatus.solved &&
            a.status != ReportStatus.solved) return -1;
        return b.reportedAt.compareTo(a.reportedAt);
      });
    } else {
      filtered.sort((a, b) {
        if (a.status == ReportStatus.solved &&
            b.status != ReportStatus.solved) return 1;
        if (b.status == ReportStatus.solved &&
            a.status != ReportStatus.solved) return -1;
        return a.reportedAt.compareTo(b.reportedAt);
      });
    }

    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    final lguColor = _activeLguColor;
    final muniName = _activeMunicipalityName;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: lguColor,
        foregroundColor: Colors.white,
        title: Text(
          _isProvincialView
              ? 'Provincial Dashboard — All Municipalities'
              : '$muniName Admin Dashboard',
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
        ),
        actions: [
          // Provincial / Municipal toggle
          Tooltip(
            message: _isProvincialView
                ? 'Switch to Municipal View'
                : 'Switch to Provincial View',
            child: IconButton(
              icon: Icon(
                _isProvincialView
                    ? Icons.location_city
                    : Icons.map_outlined,
              ),
              onPressed: () => setState(() {
                _isProvincialView = !_isProvincialView;
                _filterPriority = null;
                _filterStatus = null;
              }),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: () => setState(() {}),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(icon: Icon(Icons.report_problem), text: 'Reports'),
            Tab(icon: Icon(Icons.campaign), text: 'Announcements'),
          ],
        ),
      ),

      floatingActionButton: ListenableBuilder(
        listenable: _tabController,
        builder: (context, _) {
          if (_tabController.index != 1) return const SizedBox.shrink();
          return FloatingActionButton.extended(
            onPressed: _showAddAnnouncementSheet,
            backgroundColor: lguColor,
            foregroundColor: Colors.white,
            icon: const Icon(Icons.add),
            label: const Text('Post Announcement'),
          );
        },
      ),

      body: TabBarView(
        controller: _tabController,
        children: [
          // ── Tab 1: Reports ──────────────────────────────────────────
          Column(
            children: [
              if (_isOffline)
                _OfflineBanner(lguColor: lguColor),
              if (_isProvincialView)
                _ProvincialBanner(lguColor: lguColor),
              _buildSummaryBar(lguColor),
              _buildFilterBar(lguColor),
              _buildSortRow(lguColor),
              Expanded(
                child: StreamBuilder<List<ProblemReport>>(
                  stream: _reportsStream,
                  builder: (context, snapshot) {
                    if (snapshot.hasError) {
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        if (mounted) setState(() => _isOffline = true);
                      });
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.cloud_off,
                                size: 64, color: Colors.red),
                            const SizedBox(height: 16),
                            const Text(
                              'Failed to load reports',
                              style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '${snapshot.error}',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey.shade500),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Check Firestore rules and index on "reports".',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  fontSize: 12, color: Colors.grey),
                            ),
                          ],
                        ),
                      );
                    }

                    if (snapshot.connectionState ==
                        ConnectionState.waiting) {
                      return Center(
                          child: CircularProgressIndicator(
                              color: lguColor));
                    }

                    // Connected — clear offline indicator
                    if (_isOffline) {
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        if (mounted) setState(() => _isOffline = false);
                      });
                    }

                    final reports =
                        _applyFiltersAndSort(snapshot.data ?? []);

                    if (snapshot.data!.isEmpty) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.inbox,
                                size: 64,
                                color: lguColor.withValues(alpha: 0.3)),
                            const SizedBox(height: 16),
                            Text(
                              _isProvincialView
                                  ? 'No reports submitted across the province yet.'
                                  : 'No reports submitted to $muniName yet.',
                            ),
                          ],
                        ),
                      );
                    }

                    if (reports.isEmpty) {
                      return const Center(
                        child: Text(
                            'No reports match the selected filters.'),
                      );
                    }

                    return ListView.builder(
                      padding: const EdgeInsets.all(8),
                      itemCount: reports.length,
                      itemBuilder: (context, index) {
                        final report = reports[index];
                        return GestureDetector(
                          onTap: () => _showReportDetail(report),
                          child: _AdminReportCard(
                            report: report,
                            lguColor: lguColor,
                            showMunicipality: _isProvincialView,
                            onStatusUpdate:
                                (reportId, userId, newStatus) =>
                                    _reportRepository.updateReportStatus(
                                        userId, reportId, newStatus),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),

          // ── Tab 2: Announcements ────────────────────────────────────
          _AnnouncementsTab(
            lguColor: lguColor,
            municipality: muniName,
          ),
        ],
      ),
    );
  }

  // ── Summary bar (clickable badges) ──────────────────────────────────────
  Widget _buildSummaryBar(Color lguColor) {
    return StreamBuilder<List<ProblemReport>>(
      stream: _reportsStream,
      builder: (context, snapshot) {
        final reports = snapshot.data ?? [];
        final total = reports.length;
        final critical = reports
            .where((r) =>
                r.priority == ReportPriority.critical &&
                r.status != ReportStatus.solved)
            .length;
        final pending =
            reports.where((r) => r.status == ReportStatus.reported).length;
        final ongoing =
            reports.where((r) => r.status == ReportStatus.ongoing).length;
        final solved =
            reports.where((r) => r.status == ReportStatus.solved).length;

        return Container(
          width: double.infinity,
          padding:
              const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [lguColor, lguColor.withValues(alpha: 0.75)],
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _ClickableStatBadge(
                label: 'Total',
                count: total,
                color: Colors.white,
                isSelected: _filterPriority == null &&
                    _filterStatus == null,
                onTap: () => setState(() {
                  _filterPriority = null;
                  _filterStatus = null;
                }),
              ),
              _ClickableStatBadge(
                label: 'Critical',
                count: critical,
                color: ReportPriority.critical.color,
                isSelected: _filterPriority == ReportPriority.critical,
                onTap: () => setState(() {
                  _filterPriority = _filterPriority == ReportPriority.critical
                      ? null
                      : ReportPriority.critical;
                  _filterStatus = null;
                }),
              ),
              _ClickableStatBadge(
                label: 'Pending',
                count: pending,
                color: Colors.blue.shade200,
                isSelected: _filterStatus == ReportStatus.reported,
                onTap: () => setState(() {
                  _filterStatus = _filterStatus == ReportStatus.reported
                      ? null
                      : ReportStatus.reported;
                  _filterPriority = null;
                }),
              ),
              _ClickableStatBadge(
                label: 'Ongoing',
                count: ongoing,
                color: Colors.orange.shade200,
                isSelected: _filterStatus == ReportStatus.ongoing,
                onTap: () => setState(() {
                  _filterStatus = _filterStatus == ReportStatus.ongoing
                      ? null
                      : ReportStatus.ongoing;
                  _filterPriority = null;
                }),
              ),
              _ClickableStatBadge(
                label: 'Solved',
                count: solved,
                color: Colors.green.shade200,
                isSelected: _filterStatus == ReportStatus.solved,
                onTap: () => setState(() {
                  _filterStatus = _filterStatus == ReportStatus.solved
                      ? null
                      : ReportStatus.solved;
                  _filterPriority = null;
                }),
              ),
            ],
          ),
        );
      },
    );
  }

  // ── Filter chips row ─────────────────────────────────────────────────────
  Widget _buildFilterBar(Color lguColor) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      color: Colors.grey.shade100,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            const Text('Priority: ',
                style: TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 12)),
            FilterChip(
              label: const Text('All', style: TextStyle(fontSize: 12)),
              selected: _filterPriority == null,
              selectedColor: lguColor.withValues(alpha: 0.2),
              onSelected: (_) =>
                  setState(() => _filterPriority = null),
              visualDensity: VisualDensity.compact,
            ),
            const SizedBox(width: 4),
            ...ReportPriority.values.reversed.map(
              (p) => Padding(
                padding: const EdgeInsets.only(right: 4),
                child: FilterChip(
                  avatar: Icon(p.icon, size: 12, color: p.color),
                  label: Text(p.displayName,
                      style: const TextStyle(fontSize: 12)),
                  selected: _filterPriority == p,
                  selectedColor: p.color.withValues(alpha: 0.2),
                  onSelected: (_) =>
                      setState(() => _filterPriority = p),
                  visualDensity: VisualDensity.compact,
                ),
              ),
            ),
            const SizedBox(width: 12),
            const Text('Status: ',
                style: TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 12)),
            FilterChip(
              label: const Text('All', style: TextStyle(fontSize: 12)),
              selected: _filterStatus == null,
              selectedColor: lguColor.withValues(alpha: 0.2),
              onSelected: (_) => setState(() => _filterStatus = null),
              visualDensity: VisualDensity.compact,
            ),
            const SizedBox(width: 4),
            ...[
              ReportStatus.reported,
              ReportStatus.ongoing,
              ReportStatus.solved,
            ].map((s) {
              final label = s == ReportStatus.reported
                  ? 'Pending'
                  : s == ReportStatus.ongoing
                      ? 'Ongoing'
                      : 'Solved';
              final color = s == ReportStatus.reported
                  ? Colors.blue
                  : s == ReportStatus.ongoing
                      ? Colors.orange
                      : Colors.green;
              return Padding(
                padding: const EdgeInsets.only(right: 4),
                child: FilterChip(
                  label: Text(label,
                      style: const TextStyle(fontSize: 12)),
                  selected: _filterStatus == s,
                  selectedColor: color.withValues(alpha: 0.2),
                  onSelected: (_) =>
                      setState(() => _filterStatus = s),
                  visualDensity: VisualDensity.compact,
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  // ── Sort row ─────────────────────────────────────────────────────────────
  Widget _buildSortRow(Color lguColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      color: Colors.grey.shade50,
      child: Row(
        children: [
          Icon(Icons.sort, size: 14, color: Colors.grey.shade600),
          const SizedBox(width: 4),
          Text('Sort:',
              style: TextStyle(
                  fontSize: 12, color: Colors.grey.shade600)),
          TextButton.icon(
            onPressed: () =>
                setState(() => _sortNewestFirst = !_sortNewestFirst),
            icon: Icon(
              _sortNewestFirst
                  ? Icons.arrow_downward
                  : Icons.arrow_upward,
              size: 14,
            ),
            label: Text(
              _sortNewestFirst ? 'Newest First' : 'Oldest First',
              style: const TextStyle(fontSize: 12),
            ),
            style: TextButton.styleFrom(
              foregroundColor: lguColor,
              padding: const EdgeInsets.symmetric(horizontal: 8),
            ),
          ),
          const Spacer(),
          if (_filterPriority != null || _filterStatus != null)
            TextButton(
              onPressed: () => setState(() {
                _filterPriority = null;
                _filterStatus = null;
              }),
              style: TextButton.styleFrom(
                foregroundColor: Colors.grey.shade600,
                padding: const EdgeInsets.symmetric(horizontal: 8),
              ),
              child: const Text('Clear filters',
                  style: TextStyle(fontSize: 11)),
            ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BANNERS
// ─────────────────────────────────────────────────────────────────────────────

class _OfflineBanner extends StatelessWidget {
  final Color lguColor;
  const _OfflineBanner({required this.lguColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: Colors.orange.shade700,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: const Row(
        children: [
          Icon(Icons.wifi_off, color: Colors.white, size: 16),
          SizedBox(width: 8),
          Text(
            'Offline — Showing cached data',
            style: TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _ProvincialBanner extends StatelessWidget {
  final Color lguColor;
  const _ProvincialBanner({required this.lguColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: const Color(0xFF4A148C),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: const Row(
        children: [
          Icon(Icons.map_outlined, color: Colors.white, size: 16),
          SizedBox(width: 8),
          Text(
            'Provincial View — All 15 Municipalities',
            style: TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLICKABLE STAT BADGE
// ─────────────────────────────────────────────────────────────────────────────

class _ClickableStatBadge extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  const _ClickableStatBadge({
    required this.label,
    required this.count,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected
              ? Colors.white.withValues(alpha: 0.25)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: isSelected
              ? Border.all(color: Colors.white54, width: 1)
              : null,
        ),
        child: Column(
          children: [
            Text(
              '$count',
              style: TextStyle(
                color: color,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              label,
              style: const TextStyle(
                  color: Colors.white70, fontSize: 10),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT DETAIL BOTTOM SHEET
// ─────────────────────────────────────────────────────────────────────────────

class _ReportDetailSheet extends StatelessWidget {
  final ProblemReport report;
  final Color lguColor;
  final bool isProvincialView;
  final void Function(String reportId, String userId, String newStatus)
      onStatusUpdate;
  final Future<void> Function(String reportId, String userId) onEscalate;

  const _ReportDetailSheet({
    required this.report,
    required this.lguColor,
    required this.isProvincialView,
    required this.onStatusUpdate,
    required this.onEscalate,
  });

  String _formatFullTimestamp(DateTime dt) {
    final hour = dt.hour > 12
        ? dt.hour - 12
        : dt.hour == 0
            ? 12
            : dt.hour;
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    final minute = dt.minute.toString().padLeft(2, '0');
    return '${dt.month}/${dt.day}/${dt.year}  $hour:$minute $period';
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(report.status);
    final priorityColor = report.priority.color;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      minChildSize: 0.4,
      builder: (_, controller) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            // ── Drag handle ──
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // ── Header chips ──
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  // Priority chip
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: priorityColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(report.priority.icon,
                            size: 12, color: priorityColor),
                        const SizedBox(width: 4),
                        Text(
                          '${report.priority.displayName} Priority',
                          style: TextStyle(
                              color: priorityColor,
                              fontWeight: FontWeight.bold,
                              fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Status chip
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      _statusLabel(report.status),
                      style: TextStyle(
                          color: statusColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 11),
                    ),
                  ),
                  if (report.escalatedToProvince) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF4A148C)
                            .withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: const Color(0xFF4A148C)
                                .withValues(alpha: 0.4)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.arrow_upward,
                              size: 10,
                              color: Color(0xFF4A148C)),
                          SizedBox(width: 3),
                          Text(
                            'ESCALATED',
                            style: TextStyle(
                                color: Color(0xFF4A148C),
                                fontSize: 10,
                                fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    iconSize: 20,
                  ),
                ],
              ),
            ),

            const Divider(height: 16),

            // ── Scrollable body ──
            Expanded(
              child: ListView(
                controller: controller,
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                children: [
                  // Category title
                  Text(
                    report.category.displayName,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: lguColor,
                    ),
                  ),
                  if (isProvincialView) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.location_city,
                            size: 14, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(
                          report.municipality,
                          style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                              fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ],

                  const SizedBox(height: 12),

                  // Description
                  _DetailSection(
                    icon: Icons.description,
                    label: 'Description',
                    content: report.description,
                    lguColor: lguColor,
                  ),
                  const SizedBox(height: 12),

                  // Location
                  _DetailSection(
                    icon: Icons.location_on,
                    label: 'Location',
                    content: report.location,
                    lguColor: lguColor,
                  ),

                  if (report.latitude != null) ...[
                    const SizedBox(height: 6),
                    _DetailRow(
                      icon: Icons.map,
                      content:
                          'GPS: ${report.latitude!.toStringAsFixed(5)}, '
                          '${report.longitude!.toStringAsFixed(5)}',
                      color: Colors.grey.shade600,
                    ),
                  ],

                  const SizedBox(height: 12),

                  // Submission timestamp (precise)
                  _DetailSection(
                    icon: Icons.schedule,
                    label: 'Submitted',
                    content: _formatFullTimestamp(report.reportedAt),
                    lguColor: lguColor,
                  ),

                  if (report.userPhone != null) ...[
                    const SizedBox(height: 12),
                    _DetailSection(
                      icon: Icons.phone,
                      label: 'Reporter Phone',
                      content: report.userPhone!,
                      lguColor: lguColor,
                    ),
                  ],

                  // ── Photo evidence ──
                  if (report.imageUrl != null &&
                      report.imageUrl!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text(
                      'Photo Evidence',
                      style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: lguColor),
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        report.imageUrl!,
                        fit: BoxFit.cover,
                        loadingBuilder: (_, child, progress) =>
                            progress == null
                                ? child
                                : const SizedBox(
                                    height: 120,
                                    child: Center(
                                        child:
                                            CircularProgressIndicator())),
                        errorBuilder: (_, __, ___) => Container(
                          height: 80,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Center(
                              child: Text('Image unavailable')),
                        ),
                      ),
                    ),
                  ],

                  // ── Verified evidence metadata ──
                  if (report.photoTimestamp != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(10),
                        border:
                            Border.all(color: Colors.green.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.verified,
                                  size: 14,
                                  color: Colors.green.shade700),
                              const SizedBox(width: 6),
                              Text(
                                'Verified Evidence Metadata',
                                style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.green.shade800),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Captured: ${_formatFullTimestamp(report.photoTimestamp!)}',
                            style: TextStyle(
                                fontSize: 12,
                                color: Colors.green.shade700),
                          ),
                          if (report.photoLatitude != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              'Location: ${report.photoLatitude!.toStringAsFixed(5)}, '
                              '${report.photoLongitude!.toStringAsFixed(5)}',
                              style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.green.shade700),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],

                  if (report.escalatedToProvince &&
                      report.escalatedAt != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF4A148C)
                            .withValues(alpha: 0.07),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                            color: const Color(0xFF4A148C)
                                .withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.arrow_upward,
                              size: 16, color: Color(0xFF4A148C)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Escalated to Provincial Office on '
                              '${_formatFullTimestamp(report.escalatedAt!)}',
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF4A148C)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),
                  const Divider(),
                  const SizedBox(height: 12),

                  // ── Action buttons ──
                  Text(
                    'Update Status',
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: lguColor,
                        fontSize: 13),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (report.status != ReportStatus.ongoing)
                        _ActionButton(
                          label: 'Mark Ongoing',
                          color: Colors.orange,
                          icon: Icons.construction,
                          onTap: () {
                            if (report.userId != null) {
                              onStatusUpdate(
                                  report.id, report.userId!, 'ongoing');
                              Navigator.pop(context);
                            }
                          },
                        ),
                      if (report.status != ReportStatus.solved)
                        _ActionButton(
                          label: 'Mark Solved',
                          color: Colors.green,
                          icon: Icons.check_circle,
                          onTap: () {
                            if (report.userId != null) {
                              onStatusUpdate(
                                  report.id, report.userId!, 'solved');
                              Navigator.pop(context);
                            }
                          },
                        ),
                      if (report.status == ReportStatus.solved)
                        _ActionButton(
                          label: 'Reopen',
                          color: Colors.blue,
                          icon: Icons.refresh,
                          onTap: () {
                            if (report.userId != null) {
                              onStatusUpdate(
                                  report.id, report.userId!, 'reported');
                              Navigator.pop(context);
                            }
                          },
                        ),
                    ],
                  ),

                  // Escalate to Province (only in municipal view and not yet escalated)
                  if (!isProvincialView &&
                      !report.escalatedToProvince &&
                      report.userId != null) ...[
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.arrow_upward,
                            size: 16),
                        label: const Text('Escalate to Province'),
                        onPressed: () async {
                          Navigator.pop(context);
                          await onEscalate(
                              report.id, report.userId!);
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF4A148C),
                          side: const BorderSide(
                              color: Color(0xFF4A148C)),
                          padding: const EdgeInsets.symmetric(
                              vertical: 12),
                          shape: RoundedRectangleBorder(
                              borderRadius:
                                  BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Sends this report to the Provincial Administrator\'s dashboard.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: 11, color: Colors.grey.shade500),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _statusColor(ReportStatus s) {
    switch (s) {
      case ReportStatus.reported:
        return Colors.blue.shade700;
      case ReportStatus.ongoing:
        return Colors.orange.shade700;
      case ReportStatus.solved:
        return Colors.green.shade700;
    }
  }

  String _statusLabel(ReportStatus s) {
    switch (s) {
      case ReportStatus.reported:
        return 'Pending';
      case ReportStatus.ongoing:
        return 'Ongoing';
      case ReportStatus.solved:
        return 'Solved';
    }
  }
}

class _DetailSection extends StatelessWidget {
  final IconData icon;
  final String label;
  final String content;
  final Color lguColor;

  const _DetailSection({
    required this.icon,
    required this.label,
    required this.content,
    required this.lguColor,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: lguColor),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  color: lguColor),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          content,
          style: TextStyle(
              fontSize: 14, color: Colors.grey.shade800),
        ),
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String content;
  final Color color;

  const _DetailRow({
    required this.icon,
    required this.content,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 13, color: color),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            content,
            style: TextStyle(fontSize: 12, color: color),
          ),
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.color,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 14),
      label: Text(label, style: const TextStyle(fontSize: 13)),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10)),
        elevation: 0,
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN REPORT CARD
// ─────────────────────────────────────────────────────────────────────────────

class _AdminReportCard extends StatelessWidget {
  final ProblemReport report;
  final Color lguColor;
  final bool showMunicipality;
  final void Function(String reportId, String userId, String newStatus)
      onStatusUpdate;

  const _AdminReportCard({
    required this.report,
    required this.lguColor,
    required this.showMunicipality,
    required this.onStatusUpdate,
  });

  String _formatTimestamp(DateTime date) {
    final hour = date.hour > 12
        ? date.hour - 12
        : date.hour == 0
            ? 12
            : date.hour;
    final period = date.hour >= 12 ? 'PM' : 'AM';
    final minute = date.minute.toString().padLeft(2, '0');
    return '${date.month}/${date.day}/${date.year}  $hour:$minute $period';
  }

  Color _statusColor(ReportStatus s) {
    switch (s) {
      case ReportStatus.reported:
        return Colors.blue.shade700;
      case ReportStatus.ongoing:
        return Colors.orange.shade700;
      case ReportStatus.solved:
        return Colors.green.shade700;
    }
  }

  String _statusLabel(ReportStatus s) {
    switch (s) {
      case ReportStatus.reported:
        return 'Pending';
      case ReportStatus.ongoing:
        return 'Ongoing';
      case ReportStatus.solved:
        return 'Solved';
    }
  }

  IconData _statusIcon(ReportStatus s) {
    switch (s) {
      case ReportStatus.reported:
        return Icons.flag;
      case ReportStatus.ongoing:
        return Icons.construction;
      case ReportStatus.solved:
        return Icons.check_circle;
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(report.status);
    final priorityColor = report.priority.color;
    final isEscalated = report.escalatedToProvince;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 5, horizontal: 4),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isEscalated
            ? const BorderSide(color: Color(0xFF4A148C), width: 1.5)
            : BorderSide.none,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Priority header bar ──
          Container(
            width: double.infinity,
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: priorityColor.withValues(alpha: 0.15),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                Icon(report.priority.icon, size: 13, color: priorityColor),
                const SizedBox(width: 5),
                Text(
                  '${report.priority.displayName} Priority',
                  style: TextStyle(
                      color: priorityColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 11),
                ),
                const Spacer(),
                if (isEscalated) ...[
                  const Icon(Icons.arrow_upward,
                      size: 11, color: Color(0xFF4A148C)),
                  const SizedBox(width: 3),
                  const Text(
                    'ESCALATED',
                    style: TextStyle(
                        color: Color(0xFF4A148C),
                        fontSize: 10,
                        fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(width: 8),
                ],
                if (report.duplicateCount > 0) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color:
                          priorityColor.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${report.duplicateCount} similar',
                      style: TextStyle(
                          color: priorityColor,
                          fontSize: 10,
                          fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Category + status
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        report.category.displayName,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: lguColor,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(_statusIcon(report.status),
                              color: statusColor, size: 12),
                          const SizedBox(width: 4),
                          Text(
                            _statusLabel(report.status),
                            style: TextStyle(
                                color: statusColor,
                                fontWeight: FontWeight.bold,
                                fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),

                // Municipality (provincial view only)
                if (showMunicipality) ...[
                  Row(
                    children: [
                      Icon(Icons.location_city,
                          size: 12, color: Colors.grey.shade500),
                      const SizedBox(width: 4),
                      Text(
                        report.municipality,
                        style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade600,
                            fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                ],

                // Description (truncated)
                Text(
                  report.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 13, color: Color(0xFF555555)),
                ),
                const SizedBox(height: 6),

                // Location
                Row(
                  children: [
                    const Icon(Icons.location_on,
                        size: 12, color: Colors.grey),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        report.location,
                        style: const TextStyle(
                            fontSize: 12, color: Colors.grey),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),

                // Precise timestamp
                Row(
                  children: [
                    const Icon(Icons.schedule,
                        size: 12, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text(
                      _formatTimestamp(report.reportedAt),
                      style: const TextStyle(
                          fontSize: 11, color: Colors.grey),
                    ),
                    if (report.imageUrl != null &&
                        report.imageUrl!.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      const Icon(Icons.photo,
                          size: 11, color: Colors.blueGrey),
                    ],
                  ],
                ),
                const SizedBox(height: 8),

                // Quick status buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      'Tap card for details   ',
                      style: TextStyle(
                          fontSize: 10, color: Colors.grey.shade400),
                    ),
                    if (report.status != ReportStatus.ongoing)
                      _SmallStatusButton(
                        label: 'Ongoing',
                        color: Colors.orange,
                        onTap: () {
                          if (report.userId != null) {
                            onStatusUpdate(
                                report.id, report.userId!, 'ongoing');
                          } else {
                            ToastUtils.showError(
                                'Cannot update: missing user info');
                          }
                        },
                      ),
                    const SizedBox(width: 6),
                    if (report.status != ReportStatus.solved)
                      _SmallStatusButton(
                        label: 'Solved',
                        color: Colors.green,
                        onTap: () {
                          if (report.userId != null) {
                            onStatusUpdate(
                                report.id, report.userId!, 'solved');
                          } else {
                            ToastUtils.showError(
                                'Cannot update: missing user info');
                          }
                        },
                      ),
                    if (report.status == ReportStatus.solved)
                      _SmallStatusButton(
                        label: 'Reopen',
                        color: Colors.blue,
                        onTap: () {
                          if (report.userId != null) {
                            onStatusUpdate(
                                report.id, report.userId!, 'reported');
                          } else {
                            ToastUtils.showError(
                                'Cannot update: missing user info');
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

class _SmallStatusButton extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _SmallStatusButton({
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 28,
      child: ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          padding:
              const EdgeInsets.symmetric(horizontal: 10),
          textStyle: const TextStyle(
              fontSize: 11, fontWeight: FontWeight.bold),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(6)),
          elevation: 0,
        ),
        child: Text(label),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────

class _AnnouncementsTab extends StatelessWidget {
  final Color lguColor;
  final String municipality;

  const _AnnouncementsTab(
      {required this.lguColor, required this.municipality});

  Future<void> _deleteAnnouncement(
      BuildContext context, String docId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Announcement'),
        content: const Text(
            'Are you sure? This cannot be undone.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await FirebaseFirestore.instance
          .collection('announcements')
          .doc(docId)
          .delete();
      ToastUtils.showSuccess('Announcement deleted');
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('announcements')
          .orderBy('timestamp', descending: true)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Center(
              child: CircularProgressIndicator(color: lguColor));
        }

        final docs = snapshot.data?.docs ?? [];

        if (docs.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.campaign_outlined,
                    size: 72,
                    color: lguColor.withValues(alpha: 0.3)),
                const SizedBox(height: 16),
                Text('No announcements yet',
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade600)),
                const SizedBox(height: 8),
                Text('Tap the + button below to post one',
                    style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade400)),
              ],
            ),
          );
        }

        return ListView.builder(
          padding:
              const EdgeInsets.fromLTRB(16, 16, 16, 100),
          itemCount: docs.length,
          itemBuilder: (context, index) {
            final doc = docs[index];
            final data = doc.data() as Map<String, dynamic>;
            final title = data['title'] as String? ?? 'Announcement';
            final body = data['body'] as String? ?? '';
            final isUrgent = data['isUrgent'] as bool? ?? false;
            final postedBy = data['postedBy'] as String? ?? 'LGU';
            final muni = data['municipality'] as String? ?? '';
            final timestamp =
                (data['timestamp'] as Timestamp?)?.toDate();

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: isUrgent
                    ? Border.all(color: Colors.red.shade300)
                    : null,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: ListTile(
                contentPadding:
                    const EdgeInsets.fromLTRB(16, 10, 8, 10),
                leading: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: isUrgent
                        ? Colors.red.shade50
                        : lguColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    isUrgent
                        ? Icons.warning_amber_rounded
                        : Icons.campaign,
                    color: isUrgent ? Colors.red : lguColor,
                    size: 22,
                  ),
                ),
                title: Text(title,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 2),
                    Text(body,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color:
                                lguColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            muni == 'All'
                                ? 'Province-Wide'
                                : muni,
                            style: TextStyle(
                                fontSize: 10,
                                color: lguColor,
                                fontWeight: FontWeight.w600),
                          ),
                        ),
                        const SizedBox(width: 6),
                        if (timestamp != null)
                          Text(
                            '${timestamp.month}/${timestamp.day}/${timestamp.year}  '
                            '${timestamp.hour.toString().padLeft(2, '0')}:${timestamp.minute.toString().padLeft(2, '0')}',
                            style: TextStyle(
                                fontSize: 10,
                                color: Colors.grey.shade400),
                          ),
                      ],
                    ),
                  ],
                ),
                trailing: PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert),
                  onSelected: (value) {
                    if (value == 'delete') {
                      _deleteAnnouncement(context, doc.id);
                    }
                  },
                  itemBuilder: (_) => [
                    const PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(Icons.delete,
                              color: Colors.red, size: 18),
                          SizedBox(width: 8),
                          Text('Delete',
                              style: TextStyle(color: Colors.red)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD ANNOUNCEMENT BOTTOM SHEET
// ─────────────────────────────────────────────────────────────────────────────

class _AddAnnouncementSheet extends StatefulWidget {
  final Color lguColor;
  final String municipality;

  const _AddAnnouncementSheet(
      {required this.lguColor, required this.municipality});

  @override
  State<_AddAnnouncementSheet> createState() =>
      _AddAnnouncementSheetState();
}

class _AddAnnouncementSheetState extends State<_AddAnnouncementSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _bodyController = TextEditingController();
  final _sourceUrlController = TextEditingController();
  final _sourceLabelController = TextEditingController();
  final _postedByController = TextEditingController();
  String _selectedMunicipality = 'All';
  bool _isUrgent = false;
  bool _isPosting = false;

  @override
  void initState() {
    super.initState();
    _selectedMunicipality = widget.municipality;
    _postedByController.text = 'LGU ${widget.municipality}';
  }

  @override
  void dispose() {
    _titleController.dispose();
    _bodyController.dispose();
    _sourceUrlController.dispose();
    _sourceLabelController.dispose();
    _postedByController.dispose();
    super.dispose();
  }

  Future<void> _postAnnouncement() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isPosting = true);
    try {
      await FirebaseFirestore.instance
          .collection('announcements')
          .add({
        'title': _titleController.text.trim(),
        'body': _bodyController.text.trim(),
        'municipality': _selectedMunicipality,
        'isUrgent': _isUrgent,
        'sourceUrl': _sourceUrlController.text.trim(),
        'sourceLabel': _sourceLabelController.text.trim(),
        'postedBy': _postedByController.text.trim(),
        'imageUrl': '',
        'timestamp': FieldValue.serverTimestamp(),
      });
      if (mounted) {
        Navigator.pop(context);
        ToastUtils.showSuccess('Announcement posted successfully!');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isPosting = false);
        ToastUtils.showError('Failed to post: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final municipalities = ['All', ...AppConstants.municipalities];

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
          24, 16, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: widget.lguColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.campaign,
                        color: widget.lguColor, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Text('Post Announcement',
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: widget.lguColor)),
                ],
              ),
              const SizedBox(height: 20),
              _field(_titleController, 'Announcement Title *',
                  'e.g., Road Project Update in Bambang',
                  Icons.title, widget.lguColor,
                  validator: (v) => v == null || v.trim().isEmpty
                      ? 'Title is required'
                      : null,
                  maxLength: 100),
              const SizedBox(height: 12),
              _field(_bodyController, 'Message / Details *',
                  'Write the full announcement details here…',
                  Icons.message, widget.lguColor,
                  validator: (v) => v == null || v.trim().isEmpty
                      ? 'Message is required'
                      : null,
                  maxLines: 4,
                  maxLength: 500),
              const SizedBox(height: 12),
              _field(_postedByController, 'Posted By *',
                  'e.g., Gov. Darren Gambito',
                  Icons.person, widget.lguColor,
                  validator: (v) => v == null || v.trim().isEmpty
                      ? 'Posted by is required'
                      : null),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _selectedMunicipality,
                decoration: InputDecoration(
                  labelText: 'Target Municipality',
                  prefixIcon: Icon(Icons.location_city,
                      color: widget.lguColor),
                  focusedBorder: OutlineInputBorder(
                    borderSide:
                        BorderSide(color: widget.lguColor, width: 2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12)),
                  helperText:
                      'Select "All" to show to all municipalities',
                ),
                items: municipalities.map((m) {
                  return DropdownMenuItem(
                    value: m,
                    child: Text(
                        m == 'All' ? '🌍 All Municipalities' : m),
                  );
                }).toList(),
                onChanged: (v) =>
                    setState(() => _selectedMunicipality = v!),
              ),
              const SizedBox(height: 12),
              _field(_sourceUrlController, 'Source URL (Optional)',
                  'https://facebook.com/post/…',
                  Icons.link, widget.lguColor,
                  keyboardType: TextInputType.url,
                  helperText:
                      'Citizens can tap to view original post'),
              const SizedBox(height: 12),
              _field(_sourceLabelController,
                  'Source Label (Optional)',
                  'e.g., Posted by Gov. Gambito • Facebook',
                  Icons.label_outline, widget.lguColor),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: _isUrgent
                      ? Colors.red.shade50
                      : Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: _isUrgent
                          ? Colors.red.shade300
                          : Colors.grey.shade200),
                ),
                child: SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Row(
                    children: [
                      Icon(Icons.warning_amber_rounded,
                          color: _isUrgent
                              ? Colors.red
                              : Colors.grey,
                          size: 20),
                      const SizedBox(width: 8),
                      Text('Mark as Urgent',
                          style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: _isUrgent
                                  ? Colors.red
                                  : Colors.black87)),
                    ],
                  ),
                  subtitle: Text(
                      'Shows red border and URGENT badge to citizens',
                      style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey.shade500)),
                  value: _isUrgent,
                  activeColor: Colors.red,
                  onChanged: (v) =>
                      setState(() => _isUrgent = v),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _isPosting ? null : _postAnnouncement,
                  icon: _isPosting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white))
                      : const Icon(Icons.send),
                  label: Text(
                      _isPosting ? 'Posting…' : 'Post Announcement'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: widget.lguColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 48,
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.grey.shade600,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                      side: BorderSide(color: Colors.grey.shade300),
                    ),
                  ),
                  child: const Text('Cancel',
                      style: TextStyle(fontSize: 15)),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label,
    String hint,
    IconData prefixIcon,
    Color color, {
    String? Function(String?)? validator,
    int? maxLines,
    int? maxLength,
    TextInputType? keyboardType,
    String? helperText,
  }) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        helperText: helperText,
        prefixIcon: Icon(prefixIcon, color: color),
        focusedBorder: OutlineInputBorder(
            borderSide: BorderSide(color: color, width: 2),
            borderRadius: BorderRadius.circular(12)),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12)),
      ),
      validator: validator,
      maxLines: maxLines ?? 1,
      maxLength: maxLength,
      keyboardType: keyboardType,
    );
  }
}
