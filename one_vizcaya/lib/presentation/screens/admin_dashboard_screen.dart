import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../domain/models/problem_report.dart';
import '../../domain/enums/report_priority.dart';
import '../../domain/enums/report_status.dart';
import '../../domain/repositories/report_repository.dart';
import '../../data/repositories_impl/firebase_report_repository.dart';
import '../../data/services/admin_service.dart';
import '../../data/services/role_service.dart';
import '../../features/auth/domain/entities/app_user.dart';
import '../../core/utils/toast_utils.dart';
import '../../core/constants/app_constants.dart';
import '../../core/l10n/app_strings.dart';
import '../state/municipality_state.dart';
import 'qr_scanner_screen.dart';

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

  UserRole _currentUserRole = UserRole.admin;
  bool _isLoadingRole = true;

  ReportPriority? _filterPriority;
  ReportStatus? _filterStatus;
  bool _isProvincialView = false;
  bool _sortNewestFirst = true;
  bool _isOffline = false;

  TabController? _tabController;

  @override
  void initState() {
    super.initState();
    _loadUserRole();
  }

  @override
  void dispose() {
    _tabController?.dispose();
    super.dispose();
  }

  Future<void> _loadUserRole() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) {
      if (mounted) setState(() => _isLoadingRole = false);
      return;
    }
    final role = await adminService.getUserRole(uid);
    if (!mounted) return;

    _tabController?.dispose();
    _tabController = TabController(
      length: (role == UserRole.provincialAdmin || role == UserRole.superAdmin) ? 4 : 3,
      vsync: this,
    );

    setState(() {
      _currentUserRole = role;
      // Provincial & super admins default to provincial view
      // Super admin can toggle; provincial admin cannot
      _isProvincialView = role == UserRole.provincialAdmin || role == UserRole.superAdmin;
      _isLoadingRole = false;
      _rebuildReportsStream();
    });
  }

  String get _activeMunicipalityName =>
      oneVizcayaState.selectedMunicipality.value;

  Color get _activeLguColor =>
      oneVizcayaState.activeTheme['appBarColor'] as Color;

  Stream<List<ProblemReport>>? _reportsStream;

  void _rebuildReportsStream() {
    _reportsStream = _isProvincialView
        ? _reportRepository.getAllProvincialReports()
        : _reportRepository.getAllMunicipalityReports(_activeMunicipalityName);
  }

  void _showAddAnnouncementSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useSafeArea: true,
      builder: (_) => _AddAnnouncementSheet(
        lguColor: _activeLguColor,
        municipality: _activeMunicipalityName,
        isProvincialAdmin: _isProvincialView,
      ),
    );
  }

  void _showAddUserByPhoneSheet() {
    final phoneController = TextEditingController();
    bool isSearching = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useSafeArea: true,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (sheetCtx, setSheetState) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(sheetCtx).viewInsets.bottom +
                MediaQuery.of(sheetCtx).padding.bottom + 24,
            left: 24,
            right: 24,
            top: 16,
          ),
          child: SingleChildScrollView(
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
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Assign Admin Role',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                'Enter the registered phone number of the user.',
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: 'Phone Number',
                  hintText: '+639XXXXXXXXX',
                  prefixIcon: const Icon(Icons.phone_outlined),
                  filled: true,
                  fillColor: const Color(0xFFF7F7F7),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: _activeLguColor, width: 1.5),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                height: 50,
                child: ElevatedButton.icon(
                  icon: isSearching
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.search),
                  label: const Text('Find User'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _activeLguColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  onPressed: isSearching
                      ? null
                      : () async {
                          final raw = phoneController.text.trim();
                          if (raw.isEmpty) {
                            ToastUtils.showError('Enter a phone number.');
                            return;
                          }
                          // Normalize to E.164: 09XXXXXXXXX → +639XXXXXXXXX
                          String phone = raw;
                          if (raw.startsWith('0')) {
                            phone = '+63${raw.substring(1)}';
                          } else if (raw.startsWith('63') && !raw.startsWith('+')) {
                            phone = '+$raw';
                          }
                          setSheetState(() => isSearching = true);
                          try {
                            // Try E.164 format first, fall back to raw input
                            var query = await FirebaseFirestore.instance
                                .collection('users')
                                .where('phoneNumber', isEqualTo: phone)
                                .limit(1)
                                .get();
                            if (query.docs.isEmpty && phone != raw) {
                              query = await FirebaseFirestore.instance
                                  .collection('users')
                                  .where('phoneNumber', isEqualTo: raw)
                                  .limit(1)
                                  .get();
                            }

                            if (!mounted) return;

                            if (query.docs.isEmpty) {
                              setSheetState(() => isSearching = false);
                              ToastUtils.showError(
                                  'No user found with that phone number.');
                              return;
                            }

                            final doc = query.docs.first;
                            final data = doc.data();
                            final uid = doc.id;
                            final name = data['name'] as String? ?? '(No name)';
                            final roleStr = data['role'] as String? ?? 'citizen';
                            final currentRole = AppUser.roleFromString(roleStr);

                            if (mounted) Navigator.pop(sheetCtx);

                            // Reuse the existing role dialog from _RoleManagementTab
                            // by opening it directly
                            UserRole selected = currentRole;
                            await showDialog(
                              context: context,
                              builder: (ctx) => StatefulBuilder(
                                builder: (ctx, setDialogState) => AlertDialog(
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16)),
                                  title: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text('Assign Role',
                                          style: TextStyle(
                                              fontWeight: FontWeight.bold)),
                                      Text(name,
                                          style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.normal,
                                              color: Colors.grey.shade600)),
                                      Text(phone,
                                          style: TextStyle(
                                              fontSize: 12,
                                              color: Colors.grey.shade400)),
                                    ],
                                  ),
                                  content: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: UserRole.values.map((role) {
                                      return RadioListTile<UserRole>(
                                        dense: true,
                                        activeColor: _activeLguColor,
                                        title: Text(role.displayName,
                                            style: const TextStyle(
                                                fontSize: 14)),
                                        subtitle: _roleDescription(role),
                                        value: role,
                                        groupValue: selected,
                                        onChanged: (v) {
                                          if (v != null) {
                                            setDialogState(
                                                () => selected = v);
                                          }
                                        },
                                      );
                                    }).toList(),
                                  ),
                                  actions: [
                                    TextButton(
                                        onPressed: () =>
                                            Navigator.pop(ctx),
                                        child: const Text('Cancel')),
                                    ElevatedButton(
                                      onPressed: () async {
                                        Navigator.pop(ctx);
                                        await roleService.assignRole(
                                            uid, selected);
                                        if (mounted) {
                                          ToastUtils.showSuccess(
                                              'Role assigned to $name.');
                                        }
                                      },
                                      style: ElevatedButton.styleFrom(
                                          backgroundColor: _activeLguColor,
                                          foregroundColor: Colors.white),
                                      child: const Text('Save'),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          } catch (e) {
                            if (mounted) {
                              setSheetState(() => isSearching = false);
                              ToastUtils.showError('Search failed: $e');
                            }
                          }
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

  Widget? _roleDescription(UserRole role) {
    switch (role) {
      case UserRole.citizen:
        return const Text('Standard app user', style: TextStyle(fontSize: 11));
      case UserRole.admin:
        return const Text('Legacy admin (view only)', style: TextStyle(fontSize: 11));
      case UserRole.municipalAdmin:
        return const Text('Manages reports & announcements for their municipality',
            style: TextStyle(fontSize: 11));
      case UserRole.provincialAdmin:
        return const Text('Full access across all municipalities',
            style: TextStyle(fontSize: 11));
      case UserRole.superAdmin:
        return const Text('Full access — provincial + municipal view switching',
            style: TextStyle(fontSize: 11));
    }
  }

  // Scan a citizen's report QR and open it directly in the dashboard — fast
  // in-person triage at a field desk.
  Future<void> _scanReportQr() async {
    final raw = await scanReportQr(context);
    if (raw == null || !mounted) return;
    final parsed = parseReportQr(raw);
    if (parsed == null) {
      ToastUtils.showError(AppStrings.get('invalidQr'));
      return;
    }
    final reportId = parsed['reportId']!;
    final owner = parsed['owner'];

    ToastUtils.showInfo('Looking up report…');
    try {
      DocumentSnapshot<Map<String, dynamic>>? doc;

      // Preferred: exact path when the QR carries the owner uid.
      if (owner != null && owner.isNotEmpty) {
        final d = await FirebaseFirestore.instance
            .collection('users')
            .doc(owner)
            .collection('reports')
            .doc(reportId)
            .get();
        if (d.exists) doc = d;
      }

      if (!mounted) return;
      if (doc == null) {
        ToastUtils.showError('Report not found in your jurisdiction.');
        return;
      }
      _showReportDetail(ProblemReport.fromFirestore(doc));
    } catch (e) {
      if (mounted) ToastUtils.showError('Could not open report: $e');
    }
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
        canDelete: _currentUserRole == UserRole.provincialAdmin ||
            _currentUserRole == UserRole.superAdmin,
        onStatusUpdate: (reportId, userId, newStatus) =>
            _reportRepository.updateReportStatus(userId, reportId, newStatus),
        onEscalate: (reportId, userId) =>
            _reportRepository.escalateToProvince(userId, reportId),
        onDelete: (reportId, userId) =>
            _reportRepository.deleteReport(userId, reportId),
        onFlagUpdate: (reportId, userId, isFlagged) =>
            _reportRepository.flagReport(userId, reportId, isFlagged),
      ),
    );
  }

  List<ProblemReport> _applyFiltersAndSort(List<ProblemReport> reports) {
    // Always hide archived reports from active admin views
    var filtered =
        reports.where((r) => r.status != ReportStatus.archived).toList();

    if (_filterPriority != null) {
      filtered =
          filtered.where((r) => r.priority == _filterPriority).toList();
    }
    if (_filterStatus != null) {
      filtered = filtered.where((r) => r.status == _filterStatus).toList();
    }

    if (_sortNewestFirst) {
      filtered.sort((a, b) {
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
    if (_isLoadingRole) {
      return Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: CircularProgressIndicator(color: _activeLguColor),
        ),
      );
    }

    final lguColor = _activeLguColor;
    final muniName = _activeMunicipalityName;
    final tabController = _tabController!;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: lguColor,
        foregroundColor: Colors.white,
        title: Text(
          _isProvincialView
              ? 'Provincial Dashboard — All Municipalities'
              : '$muniName Admin Dashboard',
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          if (_currentUserRole == UserRole.admin ||
              _currentUserRole == UserRole.superAdmin)
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
                  _rebuildReportsStream();
                }),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: AppStrings.get('scanQr'),
            onPressed: _scanReportQr,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: () => setState(() {}),
          ),
        ],
        bottom: TabBar(
          controller: tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: [
            const Tab(icon: Icon(Icons.report_problem), text: 'Reports'),
            const Tab(icon: Icon(Icons.campaign), text: 'Announcements'),
            const Tab(icon: Icon(Icons.bar_chart), text: 'Analytics'),
            if (_currentUserRole == UserRole.provincialAdmin ||
                _currentUserRole == UserRole.superAdmin)
              const Tab(icon: Icon(Icons.manage_accounts), text: 'Users'),
          ],
        ),
      ),

      floatingActionButton: ListenableBuilder(
        listenable: tabController,
        builder: (context, _) {
          if (tabController.index == 1) {
            return FloatingActionButton.extended(
              onPressed: _showAddAnnouncementSheet,
              backgroundColor: lguColor,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: const Text('Post Announcement'),
            );
          }
          // Users tab is index 3 for provincial/super admins
          if (tabController.index == 3 &&
              (_currentUserRole == UserRole.provincialAdmin ||
                  _currentUserRole == UserRole.superAdmin)) {
            return FloatingActionButton(
              onPressed: _showAddUserByPhoneSheet,
              backgroundColor: lguColor,
              foregroundColor: Colors.white,
              child: const Icon(Icons.person_add),
            );
          }
          return const SizedBox.shrink();
        },
      ),

      body: TabBarView(
        controller: tabController,
        children: [
          // ── Tab 1: Reports ──
          Column(
            children: [
              if (_isOffline) _OfflineBanner(lguColor: lguColor),
              if (_isProvincialView) _ProvincialBanner(lguColor: lguColor),
              _buildSummaryBar(lguColor),
              _buildFilterBar(lguColor),
              _buildSortRow(lguColor),
              Expanded(
                child: StreamBuilder<List<ProblemReport>>(
                  stream: _reportsStream ?? const Stream.empty(),
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

                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return Center(
                          child:
                              CircularProgressIndicator(color: lguColor));
                    }

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

          // ── Tab 2: Announcements ──
          // isProvincialAdmin mirrors _isProvincialView so toggling view
          // correctly switches between province-wide and municipal scope.
          _AnnouncementsTab(
            lguColor: lguColor,
            municipality: muniName,
            isProvincialAdmin: _isProvincialView,
          ),

          // ── Tab 3: Analytics ──
          StreamBuilder<List<ProblemReport>>(
            stream: _reportsStream ?? const Stream.empty(),
            builder: (context, snapshot) {
              final reports = snapshot.data ?? [];
              return _AnalyticsTab(
                reports: reports,
                lguColor: lguColor,
              );
            },
          ),

          // ── Tab 4: Users (provincial + super admin only) ──
          if (_currentUserRole == UserRole.provincialAdmin ||
              _currentUserRole == UserRole.superAdmin)
            _RoleManagementTab(lguColor: lguColor),
        ],
      ),
    );
  }

  Widget _buildSummaryBar(Color lguColor) {
    return StreamBuilder<List<ProblemReport>>(
      stream: _reportsStream ?? const Stream.empty(),
      builder: (context, snapshot) {
        final reports = (snapshot.data ?? [])
            .where((r) => r.status != ReportStatus.archived)
            .toList();
        final total = reports.length;
        final critical = reports
            .where((r) =>
                r.priority == ReportPriority.critical &&
                r.status != ReportStatus.solved)
            .length;
        final pending =
            reports.where((r) => r.status == ReportStatus.reported).length;
        final acknowledged =
            reports.where((r) => r.status == ReportStatus.acknowledged).length;
        final underReview =
            reports.where((r) => r.status == ReportStatus.underReview).length;
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
                isSelected:
                    _filterPriority == null && _filterStatus == null,
                onTap: () => setState(() {
                  _filterPriority = null;
                  _filterStatus = null;
                }),
              ),
              _ClickableStatBadge(
                label: 'Critical',
                count: critical,
                color: ReportPriority.critical.color,
                isSelected:
                    _filterPriority == ReportPriority.critical,
                onTap: () => setState(() {
                  _filterPriority =
                      _filterPriority == ReportPriority.critical
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
                  _filterStatus =
                      _filterStatus == ReportStatus.reported
                          ? null
                          : ReportStatus.reported;
                  _filterPriority = null;
                }),
              ),
              _ClickableStatBadge(
                label: 'Ack\'d',
                count: acknowledged,
                color: Colors.teal.shade200,
                isSelected: _filterStatus == ReportStatus.acknowledged,
                onTap: () => setState(() {
                  _filterStatus =
                      _filterStatus == ReportStatus.acknowledged
                          ? null
                          : ReportStatus.acknowledged;
                  _filterPriority = null;
                }),
              ),
              _ClickableStatBadge(
                label: 'Review',
                count: underReview,
                color: Colors.purple.shade200,
                isSelected: _filterStatus == ReportStatus.underReview,
                onTap: () => setState(() {
                  _filterStatus =
                      _filterStatus == ReportStatus.underReview
                          ? null
                          : ReportStatus.underReview;
                  _filterPriority = null;
                }),
              ),
              _ClickableStatBadge(
                label: 'Ongoing',
                count: ongoing,
                color: Colors.orange.shade200,
                isSelected: _filterStatus == ReportStatus.ongoing,
                onTap: () => setState(() {
                  _filterStatus =
                      _filterStatus == ReportStatus.ongoing
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
                  _filterStatus =
                      _filterStatus == ReportStatus.solved
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
              ReportStatus.acknowledged,
              ReportStatus.underReview,
              ReportStatus.ongoing,
              ReportStatus.solved,
            ].map((s) {
              final label = s == ReportStatus.reported
                  ? 'Pending'
                  : s == ReportStatus.acknowledged
                      ? 'Acknowledged'
                      : s == ReportStatus.underReview
                          ? 'Under Review'
                          : s == ReportStatus.ongoing
                              ? 'Ongoing'
                              : 'Solved';
              final color = s == ReportStatus.reported
                  ? Colors.blue
                  : s == ReportStatus.acknowledged
                      ? Colors.teal
                      : s == ReportStatus.underReview
                          ? Colors.purple
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
          StreamBuilder<List<ProblemReport>>(
            stream: _reportsStream ?? const Stream.empty(),
            builder: (context, snapshot) {
              final reports = snapshot.data ?? [];
              if (reports.isEmpty) return const SizedBox.shrink();
              return IconButton(
                icon: Icon(Icons.picture_as_pdf,
                    size: 20, color: lguColor),
                tooltip: 'Export to PDF',
                padding: const EdgeInsets.symmetric(horizontal: 4),
                onPressed: () => _exportReportsToPdf(
                    _applyFiltersAndSort(reports), lguColor),
              );
            },
          ),
        ],
      ),
    );
  }

  Future<void> _exportReportsToPdf(
      List<ProblemReport> reports, Color lguColor) async {
    final pdf = pw.Document();

    final now = DateTime.now();
    final dateStr =
        '${now.day}/${now.month}/${now.year} ${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
    final municipality = _isProvincialView ? 'All Municipalities' : _activeMunicipalityName;

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        header: (_) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              'One Vizcaya — Problem Reports',
              style: pw.TextStyle(
                  fontSize: 18, fontWeight: pw.FontWeight.bold),
            ),
            pw.SizedBox(height: 4),
            pw.Text('Municipality: $municipality   |   Generated: $dateStr',
                style: const pw.TextStyle(fontSize: 10)),
            pw.Divider(),
          ],
        ),
        build: (_) => [
          pw.TableHelper.fromTextArray(
            headers: [
              '#', 'Category', 'Status', 'Priority',
              'Location', 'Reported', 'Resolved'
            ],
            headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9),
            cellStyle: const pw.TextStyle(fontSize: 8),
            columnWidths: {
              0: const pw.FixedColumnWidth(20),
              1: const pw.FlexColumnWidth(2),
              2: const pw.FixedColumnWidth(55),
              3: const pw.FixedColumnWidth(50),
              4: const pw.FlexColumnWidth(2.5),
              5: const pw.FixedColumnWidth(55),
              6: const pw.FixedColumnWidth(55),
            },
            data: reports.asMap().entries.map((e) {
              final i = e.key + 1;
              final r = e.value;
              final reported =
                  '${r.reportedAt.day}/${r.reportedAt.month}/${r.reportedAt.year}';
              final resolved = r.resolvedAt != null
                  ? '${r.resolvedAt!.day}/${r.resolvedAt!.month}/${r.resolvedAt!.year}'
                  : '—';
              return [
                '$i',
                r.category.displayName,
                r.status.toShortString(),
                r.priority.displayName,
                r.location,
                reported,
                resolved,
              ];
            }).toList(),
          ),
          pw.SizedBox(height: 12),
          pw.Text(
            'Total: ${reports.length} reports',
            style: pw.TextStyle(
                fontWeight: pw.FontWeight.bold, fontSize: 10),
          ),
        ],
      ),
    );

    await Printing.layoutPdf(
      onLayout: (_) async => pdf.save(),
      name: 'one_vizcaya_reports_$municipality.pdf',
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
  final bool canDelete;
  final void Function(String reportId, String userId, String newStatus)
      onStatusUpdate;
  final Future<void> Function(String reportId, String userId) onEscalate;
  final Future<void> Function(String reportId, String userId) onDelete;
  final Future<void> Function(String reportId, String userId, bool isFlagged)
      onFlagUpdate;

  const _ReportDetailSheet({
    required this.report,
    required this.lguColor,
    required this.isProvincialView,
    required this.canDelete,
    required this.onStatusUpdate,
    required this.onEscalate,
    required this.onDelete,
    required this.onFlagUpdate,
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

  // Open the report's photo evidence full-screen with pinch-to-zoom, so admins
  // can inspect details (cracks, water levels, plate numbers) during triage.
  void _showFullScreenPhoto(BuildContext context, String url, String reportId) {
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierColor: Colors.black,
        pageBuilder: (ctx, _, __) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            foregroundColor: Colors.white,
            leading: IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => Navigator.of(ctx).pop(),
            ),
          ),
          body: Center(
            child: Hero(
              tag: 'admin_report_photo_$reportId',
              child: InteractiveViewer(
                minScale: 0.8,
                maxScale: 5.0,
                child: Image.network(
                  url,
                  fit: BoxFit.contain,
                  loadingBuilder: (_, child, progress) => progress == null
                      ? child
                      : const Center(
                          child:
                              CircularProgressIndicator(color: Colors.white)),
                  errorBuilder: (_, __, ___) => const Center(
                    child: Text('Image unavailable',
                        style: TextStyle(color: Colors.white70)),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Report'),
        content: const Text(
            'Permanently delete this report? This cannot be undone.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              Navigator.pop(context);
              if (report.userId != null) {
                await onDelete(report.id, report.userId!);
              }
            },
            style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
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
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
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
                              size: 10, color: Color(0xFF4A148C)),
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
                  if (canDelete)
                    IconButton(
                      icon:
                          const Icon(Icons.delete_outline, color: Colors.red),
                      onPressed: () => _confirmDelete(context),
                      tooltip: 'Delete Report',
                      padding: EdgeInsets.zero,
                      iconSize: 22,
                    ),
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

            Expanded(
              child: ListView(
                controller: controller,
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                children: [
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

                  _DetailSection(
                    icon: Icons.description,
                    label: 'Description',
                    content: report.description,
                    lguColor: lguColor,
                  ),
                  const SizedBox(height: 12),

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

                  _DetailSection(
                    icon: Icons.schedule,
                    label: 'Submitted',
                    content: _formatFullTimestamp(report.reportedAt),
                    lguColor: lguColor,
                  ),

                  const SizedBox(height: 12),
                  if (report.isAnonymous)
                    _DetailSection(
                      icon: Icons.visibility_off,
                      label: 'Reporter',
                      content: 'Anonymous Citizen',
                      lguColor: lguColor,
                    )
                  else if (report.userPhone != null)
                    _DetailSection(
                      icon: Icons.phone,
                      label: 'Reporter Phone',
                      content: report.userPhone!,
                      lguColor: lguColor,
                    ),

                  if (report.status == ReportStatus.solved &&
                      report.resolvedAt != null) ...[
                    const SizedBox(height: 12),
                    Builder(builder: (context) {
                      final duration =
                          report.resolvedAt!.difference(report.reportedAt);
                      final days = duration.inDays;
                      final hours = duration.inHours.remainder(24);
                      final label = days > 0
                          ? 'Resolved in ${days}d ${hours}h'
                          : 'Resolved in ${hours}h';
                      return Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.green.shade200),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.timer_outlined,
                                size: 16, color: Colors.green.shade700),
                            const SizedBox(width: 8),
                            Text(
                              label,
                              style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.green.shade800),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],

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
                    GestureDetector(
                      onTap: () => _showFullScreenPhoto(
                          context, report.imageUrl!, report.id),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Stack(
                          alignment: Alignment.bottomRight,
                          children: [
                            Hero(
                              tag: 'admin_report_photo_${report.id}',
                              child: Image.network(
                                report.imageUrl!,
                                fit: BoxFit.cover,
                                width: double.infinity,
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
                            Container(
                              margin: const EdgeInsets.all(8),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.black54,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.zoom_in,
                                      size: 14, color: Colors.white),
                                  SizedBox(width: 4),
                                  Text('Tap to enlarge',
                                      style: TextStyle(
                                          color: Colors.white, fontSize: 11)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],

                  if (report.photoTimestamp != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.green.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.verified,
                                  size: 14, color: Colors.green.shade700),
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
                                  fontSize: 12, color: Color(0xFF4A148C)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),
                  const Divider(),
                  const SizedBox(height: 12),

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
                      if (report.status != ReportStatus.acknowledged)
                        _ActionButton(
                          label: 'Acknowledge',
                          color: Colors.teal,
                          icon: Icons.thumb_up_alt_outlined,
                          onTap: () {
                            if (report.userId != null) {
                              onStatusUpdate(
                                  report.id, report.userId!, 'acknowledged');
                              Navigator.pop(context);
                            }
                          },
                        ),
                      if (report.status != ReportStatus.underReview)
                        _ActionButton(
                          label: 'Under Review',
                          color: Colors.purple,
                          icon: Icons.rate_review,
                          onTap: () {
                            if (report.userId != null) {
                              onStatusUpdate(
                                  report.id, report.userId!, 'under_review');
                              Navigator.pop(context);
                            }
                          },
                        ),
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
                      if (report.userId != null)
                        _ActionButton(
                          label: report.isFlagged
                              ? 'Remove Flag'
                              : 'Flag Suspicious',
                          color: Colors.red,
                          icon: report.isFlagged
                              ? Icons.flag
                              : Icons.flag_outlined,
                          onTap: () {
                            onFlagUpdate(
                                report.id, report.userId!, !report.isFlagged);
                            Navigator.pop(context);
                          },
                        ),
                    ],
                  ),

                  if (!isProvincialView &&
                      !report.escalatedToProvince &&
                      report.userId != null) ...[
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.arrow_upward, size: 16),
                        label: const Text('Escalate to Province'),
                        onPressed: () async {
                          Navigator.pop(context);
                          await onEscalate(report.id, report.userId!);
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF4A148C),
                          side: const BorderSide(
                              color: Color(0xFF4A148C)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
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
      case ReportStatus.acknowledged:
        return Colors.teal.shade700;
      case ReportStatus.underReview:
        return Colors.purple.shade700;
      case ReportStatus.ongoing:
        return Colors.orange.shade700;
      case ReportStatus.solved:
        return Colors.green.shade700;
      case ReportStatus.archived:
        return Colors.grey.shade600;
    }
  }

  String _statusLabel(ReportStatus s) {
    switch (s) {
      case ReportStatus.reported:
        return 'Pending';
      case ReportStatus.acknowledged:
        return 'Acknowledged';
      case ReportStatus.underReview:
        return 'Under Review';
      case ReportStatus.ongoing:
        return 'Ongoing';
      case ReportStatus.solved:
        return 'Solved';
      case ReportStatus.archived:
        return 'Archived';
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
          style:
              TextStyle(fontSize: 14, color: Colors.grey.shade800),
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
      case ReportStatus.acknowledged:
        return Colors.teal.shade700;
      case ReportStatus.underReview:
        return Colors.purple.shade700;
      case ReportStatus.ongoing:
        return Colors.orange.shade700;
      case ReportStatus.solved:
        return Colors.green.shade700;
      case ReportStatus.archived:
        return Colors.grey.shade600;
    }
  }

  String _statusLabel(ReportStatus s) {
    switch (s) {
      case ReportStatus.reported:
        return 'Pending';
      case ReportStatus.acknowledged:
        return 'Acknowledged';
      case ReportStatus.underReview:
        return 'Under Review';
      case ReportStatus.ongoing:
        return 'Ongoing';
      case ReportStatus.solved:
        return 'Solved';
      case ReportStatus.archived:
        return 'Archived';
    }
  }

  IconData _statusIcon(ReportStatus s) {
    switch (s) {
      case ReportStatus.reported:
        return Icons.flag;
      case ReportStatus.acknowledged:
        return Icons.thumb_up_alt_outlined;
      case ReportStatus.underReview:
        return Icons.rate_review;
      case ReportStatus.ongoing:
        return Icons.construction;
      case ReportStatus.solved:
        return Icons.check_circle;
      case ReportStatus.archived:
        return Icons.archive;
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
                Icon(report.priority.icon,
                    size: 13, color: priorityColor),
                const SizedBox(width: 5),
                Text(
                  '${report.priority.displayName} Priority',
                  style: TextStyle(
                      color: priorityColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 11),
                ),
                const Spacer(),
                if (report.isFlagged) ...[
                  const Icon(Icons.flag, size: 11, color: Colors.red),
                  const SizedBox(width: 3),
                  const Text(
                    'FLAGGED',
                    style: TextStyle(
                        color: Colors.red,
                        fontSize: 10,
                        fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(width: 8),
                ],
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
                      color: priorityColor.withValues(alpha: 0.2),
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

                Text(
                  report.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 13, color: Color(0xFF555555)),
                ),
                const SizedBox(height: 6),

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

                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Tap card for details',
                        style: TextStyle(
                            fontSize: 10, color: Colors.grey.shade400),
                      ),
                    ),
                    if (report.status != ReportStatus.acknowledged)
                      _SmallStatusButton(
                        label: 'Ack',
                        color: Colors.teal,
                        onTap: () {
                          if (report.userId != null) {
                            onStatusUpdate(
                                report.id, report.userId!, 'acknowledged');
                          } else {
                            ToastUtils.showError(
                                'Cannot update: missing user info');
                          }
                        },
                      ),
                    const SizedBox(width: 4),
                    if (report.status != ReportStatus.underReview)
                      _SmallStatusButton(
                        label: 'Review',
                        color: Colors.purple,
                        onTap: () {
                          if (report.userId != null) {
                            onStatusUpdate(
                                report.id, report.userId!, 'under_review');
                          } else {
                            ToastUtils.showError(
                                'Cannot update: missing user info');
                          }
                        },
                      ),
                    const SizedBox(width: 4),
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
                    const SizedBox(width: 4),
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
          padding: const EdgeInsets.symmetric(horizontal: 10),
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
  final bool isProvincialAdmin;

  const _AnnouncementsTab({
    required this.lguColor,
    required this.municipality,
    required this.isProvincialAdmin,
  });

  Future<void> _deleteAnnouncement(
      BuildContext context, String docId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Announcement'),
        content:
            const Text('Are you sure? This cannot be undone.'),
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
    // Provincial admin sees all; municipal admin sees only their scope
    Query query = FirebaseFirestore.instance
        .collection('announcements')
        .orderBy('timestamp', descending: true);

    return Column(
      children: [
        // Scope indicator banner
        Container(
          width: double.infinity,
          padding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: isProvincialAdmin
              ? const Color(0xFF4A148C).withValues(alpha: 0.08)
              : lguColor.withValues(alpha: 0.08),
          child: Row(
            children: [
              Icon(
                isProvincialAdmin ? Icons.public : Icons.location_city,
                size: 14,
                color: isProvincialAdmin
                    ? const Color(0xFF4A148C)
                    : lguColor,
              ),
              const SizedBox(width: 8),
              Text(
                isProvincialAdmin
                    ? 'Showing all announcements across the province'
                    : 'Showing announcements for $municipality',
                style: TextStyle(
                  fontSize: 12,
                  color: isProvincialAdmin
                      ? const Color(0xFF4A148C)
                      : lguColor,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),

        Expanded(
          child: StreamBuilder<QuerySnapshot>(
            stream: query.snapshots(),
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return Center(
                  child: Text(
                    'Failed to load announcements',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                );
              }
              if (snapshot.connectionState == ConnectionState.waiting) {
                return Center(
                    child:
                        CircularProgressIndicator(color: lguColor));
              }

              final allDocs = snapshot.data?.docs ?? [];

              // Municipal admins only see their own + province-wide announcements
              final docs = isProvincialAdmin
                  ? allDocs
                  : allDocs.where((doc) {
                      final data = doc.data() as Map<String, dynamic>;
                      final muni = data['municipality'] as String? ?? '';
                      return muni == municipality || muni == 'All';
                    }).toList();

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
                  final data =
                      doc.data() as Map<String, dynamic>;
                  final title =
                      data['title'] as String? ?? 'Announcement';
                  final body = data['body'] as String? ?? '';
                  final isUrgent =
                      data['isUrgent'] as bool? ?? false;
                  final postedBy =
                      data['postedBy'] as String? ?? 'LGU';
                  final muni =
                      data['municipality'] as String? ?? '';
                  final timestamp =
                      (data['timestamp'] as Timestamp?)?.toDate();
                  final isProvinceWide = muni == 'All';

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: isUrgent
                          ? Border.all(color: Colors.red.shade300)
                          : isProvinceWide
                              ? Border.all(
                                  color: const Color(0xFF4A148C)
                                      .withValues(alpha: 0.4))
                              : null,
                      boxShadow: [
                        BoxShadow(
                          color:
                              Colors.black.withValues(alpha: 0.04),
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
                              : isProvinceWide
                                  ? const Color(0xFF4A148C)
                                      .withValues(alpha: 0.08)
                                  : lguColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          isUrgent
                              ? Icons.warning_amber_rounded
                              : isProvinceWide
                                  ? Icons.public
                                  : Icons.campaign,
                          color: isUrgent
                              ? Colors.red
                              : isProvinceWide
                                  ? const Color(0xFF4A148C)
                                  : lguColor,
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
                                  color: isProvinceWide
                                      ? const Color(0xFF4A148C)
                                          .withValues(alpha: 0.12)
                                      : lguColor
                                          .withValues(alpha: 0.1),
                                  borderRadius:
                                      BorderRadius.circular(4),
                                ),
                                child: Text(
                                  isProvinceWide
                                      ? '🌍 Province-Wide'
                                      : muni,
                                  style: TextStyle(
                                      fontSize: 10,
                                      color: isProvinceWide
                                          ? const Color(0xFF4A148C)
                                          : lguColor,
                                      fontWeight: FontWeight.w600),
                                ),
                              ),
                              const SizedBox(width: 6),
                              if (isUrgent) ...[
                                Container(
                                  padding:
                                      const EdgeInsets.symmetric(
                                          horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.red.shade50,
                                    borderRadius:
                                        BorderRadius.circular(4),
                                    border: Border.all(
                                        color: Colors.red.shade200),
                                  ),
                                  child: const Text(
                                    '⚠ URGENT',
                                    style: TextStyle(
                                        fontSize: 10,
                                        color: Colors.red,
                                        fontWeight: FontWeight.w700),
                                  ),
                                ),
                                const SizedBox(width: 6),
                              ],
                              if (timestamp != null)
                                Text(
                                  '${timestamp.month}/${timestamp.day}/${timestamp.year}',
                                  style: TextStyle(
                                      fontSize: 10,
                                      color: Colors.grey.shade400),
                                ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'By $postedBy',
                            style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey.shade500),
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
                                    style:
                                        TextStyle(color: Colors.red)),
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
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD ANNOUNCEMENT BOTTOM SHEET
// ─────────────────────────────────────────────────────────────────────────────

class _AddAnnouncementSheet extends StatefulWidget {
  final Color lguColor;
  final String municipality;
  final bool isProvincialAdmin;

  const _AddAnnouncementSheet({
    required this.lguColor,
    required this.municipality,
    required this.isProvincialAdmin,
  });

  @override
  State<_AddAnnouncementSheet> createState() =>
      _AddAnnouncementSheetState();
}

class _AddAnnouncementSheetState
    extends State<_AddAnnouncementSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _bodyController = TextEditingController();
  final _sourceUrlController = TextEditingController();
  final _sourceLabelController = TextEditingController();
  final _postedByController = TextEditingController();
  late String _selectedMunicipality;
  bool _isUrgent = false;
  bool _isPosting = false;

  @override
  void initState() {
    super.initState();
    // Provincial admins default to province-wide; municipal admins default to their municipality
    _selectedMunicipality =
        widget.isProvincialAdmin ? 'All' : widget.municipality;
    _postedByController.text = widget.isProvincialAdmin
        ? 'Provincial Government of Nueva Vizcaya'
        : 'LGU ${widget.municipality}';
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
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
          24,
          16,
          24,
          MediaQuery.of(context).viewInsets.bottom +
              MediaQuery.of(context).padding.bottom + 24),
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
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Post Announcement',
                            style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: widget.lguColor)),
                        Text(
                          widget.isProvincialAdmin
                              ? 'Province-wide or per municipality'
                              : 'For ${widget.municipality} residents',
                          style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade500),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              _field(_titleController, 'Announcement Title *',
                  'e.g., Road Project Update in Bambang',
                  Icons.title, widget.lguColor,
                  validator: (v) =>
                      v == null || v.trim().isEmpty
                          ? 'Title is required'
                          : null,
                  maxLength: 150),
              const SizedBox(height: 12),
              _field(_bodyController, 'Message / Details *',
                  'Write the full announcement details here…',
                  Icons.message, widget.lguColor,
                  validator: (v) =>
                      v == null || v.trim().isEmpty
                          ? 'Message is required'
                          : null,
                  maxLines: 6,
                  maxLength: 1000),
              const SizedBox(height: 12),
              _catalogField(
                  controller: _postedByController,
                  label: 'Posted By *',
                  hint: 'e.g., Provincial Government of Nueva Vizcaya',
                  prefixIcon: Icons.person,
                  color: widget.lguColor,
                  validator: (v) => v == null || v.trim().isEmpty
                      ? 'Posted by is required'
                      : null),
              const SizedBox(height: 12),

              // ── Audience scope ──
              if (widget.isProvincialAdmin) ...[
                DropdownButtonFormField<String>(
                  value: _selectedMunicipality,
                  decoration: InputDecoration(
                    labelText: 'Target Audience',
                    prefixIcon: Icon(Icons.public,
                        color: widget.lguColor),
                    focusedBorder: OutlineInputBorder(
                      borderSide: BorderSide(
                          color: widget.lguColor, width: 2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12)),
                    helperText:
                        '"All Municipalities" sends to everyone in the province',
                  ),
                  items: [
                    const DropdownMenuItem(
                      value: 'All',
                      child: Text('🌍 All Municipalities (Province-Wide)'),
                    ),
                    ...AppConstants.municipalities.map((m) =>
                        DropdownMenuItem(
                            value: m, child: Text(m))),
                  ],
                  onChanged: (v) =>
                      setState(() => _selectedMunicipality = v!),
                ),
              ] else ...[
                // Municipal admin: audience is locked to their municipality
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: widget.lguColor.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color:
                            widget.lguColor.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.location_city,
                          size: 18, color: widget.lguColor),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Target Audience',
                              style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade500)),
                          Text(widget.municipality,
                              style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  color: widget.lguColor)),
                        ],
                      ),
                      const Spacer(),
                      Icon(Icons.lock_outline,
                          size: 16, color: Colors.grey.shade400),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 12),
              _field(_sourceUrlController, 'Source URL (Optional)',
                  'https://facebook.com/post/…',
                  Icons.link, widget.lguColor,
                  keyboardType: TextInputType.url,
                  helperText:
                      'Citizens can tap to view original post'),
              const SizedBox(height: 12),
              _catalogField(
                  controller: _sourceLabelController,
                  label: 'Source Label (Optional)',
                  hint: 'e.g., Governor\'s Office • Facebook',
                  prefixIcon: Icons.label_outline,
                  color: widget.lguColor),
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
                  onChanged: (v) => setState(() => _isUrgent = v),
                ),
              ),
              const SizedBox(height: 20),

              SizedBox(
                height: 52,
                child: ElevatedButton.icon(
                  onPressed:
                      _isPosting ? null : _postAnnouncement,
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
      maxLengthEnforcement: MaxLengthEnforcement.enforced,
      inputFormatters: [
        if (maxLength != null) LengthLimitingTextInputFormatter(maxLength),
      ],
      keyboardType: keyboardType,
    );
  }

  // ── Catalog field: text input + Browse button ──────────────────────────────
  static const List<Map<String, dynamic>> _sourceCatalog = [
    {
      'category': 'Provincial Government & Key Agencies',
      'items': [
        'Provincial Government of Nueva Vizcaya',
        'Office of Governor Atty. Jose V. Gambito',
        'Atty. Jose "Papa Jing" Gambito',
        'PIA Nueva Vizcaya',
        'Nueva Vizcaya PDRRMO',
        'NVPPO - Nueva Vizcaya Police Provincial Office',
        'DepEd Tayo Nueva Vizcaya',
      ],
    },
    {
      'category': 'Municipal LGUs & Mayors',
      'items': [
        'LGU Alfonso Castañeda',
        'LGU Ambaguio',
        'Mayor Ronelio B. Danao (Ambaguio)',
        'LGU Aritao',
        'Mayor Remelina Peros-Galam (Aritao)',
        'LGU Bagabag',
        'LGU Bambang',
        'Benjamin "JAMIE" Cuaresma III (Bambang)',
        'LGU Bayombong',
        'Mayor Tony Bagasao (Bayombong)',
        'LGU Diadi',
        'LGU Dupax del Norte',
        'LGU Dupax del Sur',
        'LGU Kasibu',
        'LGU Kayapa',
        'LGU Quezon',
        'LGU Santa Fe',
        'LGU Solano',
        'LGU Villaverde',
      ],
    },
  ];

  Widget _catalogField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData prefixIcon,
    required Color color,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(prefixIcon, color: color),
        suffixIcon: IconButton(
          icon: Icon(Icons.list_alt_rounded, color: color),
          tooltip: 'Browse catalog',
          onPressed: () => _showCatalogPicker(controller, color),
        ),
        focusedBorder: OutlineInputBorder(
            borderSide: BorderSide(color: color, width: 2),
            borderRadius: BorderRadius.circular(12)),
        border:
            OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      validator: validator,
      maxLines: 1,
    );
  }

  void _showCatalogPicker(
      TextEditingController controller, Color accentColor) {
    String query = '';
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setLocal) {
          // Flatten + filter all catalog items
          List<Map<String, String>> filtered = [];
          for (final group
              in _sourceCatalog) {
            final cat = group['category'] as String;
            final items = group['items'] as List;
            for (final item in items) {
              if (query.isEmpty ||
                  item
                      .toString()
                      .toLowerCase()
                      .contains(query.toLowerCase())) {
                filtered.add({'category': cat, 'item': item as String});
              }
            }
          }

          return DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.6,
            maxChildSize: 0.92,
            minChildSize: 0.4,
            builder: (_, scrollCtrl) => Column(
              children: [
                // Handle bar
                const SizedBox(height: 8),
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 12),
                // Title
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    children: [
                      Icon(Icons.list_alt_rounded,
                          color: accentColor, size: 20),
                      const SizedBox(width: 8),
                      Text('Select Source',
                          style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                              color: accentColor)),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                // Search bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: TextField(
                    autofocus: false,
                    decoration: InputDecoration(
                      hintText: 'Search…',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      contentPadding:
                          const EdgeInsets.symmetric(vertical: 8),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide:
                              BorderSide(color: Colors.grey.shade300)),
                      enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide:
                              BorderSide(color: Colors.grey.shade300)),
                    ),
                    onChanged: (v) => setLocal(() => query = v),
                  ),
                ),
                const SizedBox(height: 8),
                const Divider(height: 1),
                // Results list
                Expanded(
                  child: filtered.isEmpty
                      ? const Center(
                          child: Text('No results',
                              style: TextStyle(color: Colors.grey)))
                      : ListView.builder(
                          controller: scrollCtrl,
                          itemCount: filtered.length,
                          itemBuilder: (_, i) {
                            final entry = filtered[i];
                            final showHeader = i == 0 ||
                                filtered[i - 1]['category'] !=
                                    entry['category'];
                            return Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                if (showHeader) ...[
                                  Padding(
                                    padding: const EdgeInsets.fromLTRB(
                                        16, 12, 16, 4),
                                    child: Text(
                                      entry['category']!,
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: accentColor,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ),
                                ],
                                ListTile(
                                  dense: true,
                                  leading: Icon(Icons.account_balance,
                                      size: 18,
                                      color: Colors.grey.shade500),
                                  title: Text(entry['item']!,
                                      style: const TextStyle(
                                          fontSize: 14)),
                                  onTap: () {
                                    controller.text = entry['item']!;
                                    Navigator.pop(ctx);
                                  },
                                ),
                              ],
                            );
                          },
                        ),
                ),
                // Custom entry option
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: TextButton.icon(
                    onPressed: () => Navigator.pop(ctx),
                    icon: const Icon(Icons.edit_outlined, size: 16),
                    label: const Text('Type a custom value instead'),
                    style: TextButton.styleFrom(
                        foregroundColor: Colors.grey.shade600),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS TAB
// ─────────────────────────────────────────────────────────────────────────────

class _AnalyticsTab extends StatelessWidget {
  final List<ProblemReport> reports;
  final Color lguColor;

  const _AnalyticsTab({
    required this.reports,
    required this.lguColor,
  });

  // Palette for pie chart slices
  static const List<Color> _slicePalette = [
    Color(0xFF1565C0),
    Color(0xFF2E7D32),
    Color(0xFFC62828),
    Color(0xFFE65100),
    Color(0xFF6A1B9A),
    Color(0xFF00838F),
    Color(0xFF558B2F),
    Color(0xFF4E342E),
    Color(0xFF37474F),
    Color(0xFFF9A825),
    Color(0xFFAD1457),
    Color(0xFF0277BD),
    Color(0xFF283593),
  ];

  @override
  Widget build(BuildContext context) {
    if (reports.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.bar_chart, size: 72, color: lguColor.withValues(alpha: 0.25)),
            const SizedBox(height: 16),
            Text(
              'No data yet',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.grey.shade500,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Analytics will appear once reports are submitted.',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade400),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        _buildKpiGrid(),
        const SizedBox(height: 20),
        _buildBarangayChart(),
        const SizedBox(height: 20),
        _buildCategoryPieChart(),
      ],
    );
  }

  // ── KPI Tiles ──────────────────────────────────────────────────────────────

  Widget _buildKpiGrid() {
    final total = reports.length;
    final resolved = reports.where((r) => r.status == ReportStatus.solved).length;
    final open = reports.where((r) => r.status != ReportStatus.solved).length;

    final solvedWithTime = reports
        .where((r) =>
            r.status == ReportStatus.solved && r.resolvedAt != null)
        .toList();
    final String avgResolution;
    if (solvedWithTime.isEmpty) {
      avgResolution = '—';
    } else {
      final totalDays = solvedWithTime.fold<int>(
        0,
        (sum, r) => sum + r.resolvedAt!.difference(r.reportedAt).inDays,
      );
      final avg = totalDays / solvedWithTime.length;
      avgResolution = '${avg.toStringAsFixed(1)} d';
    }

    return Card(
      elevation: 2,
      shadowColor: Colors.black12,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.dashboard_outlined, size: 16, color: lguColor),
                const SizedBox(width: 6),
                Text(
                  'Key Performance Indicators',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: lguColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: _KpiTile(
                    label: 'Total Reports',
                    value: '$total',
                    icon: Icons.assignment_outlined,
                    color: lguColor,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _KpiTile(
                    label: 'Resolved',
                    value: '$resolved',
                    icon: Icons.check_circle_outline,
                    color: Colors.green.shade700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _KpiTile(
                    label: 'Avg Resolution',
                    value: avgResolution,
                    icon: Icons.timer_outlined,
                    color: Colors.orange.shade700,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _KpiTile(
                    label: 'Open / Pending',
                    value: '$open',
                    icon: Icons.pending_outlined,
                    color: Colors.blue.shade700,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ── Bar Chart: Reports per Barangay ────────────────────────────────────────

  Widget _buildBarangayChart() {
    // Aggregate by barangay
    final Map<String, int> counts = {};
    for (final r in reports) {
      final key = (r.barangay == null || r.barangay!.trim().isEmpty)
          ? 'Unspecified'
          : r.barangay!.trim();
      counts[key] = (counts[key] ?? 0) + 1;
    }

    // Top 6 by count, descending (keeps bottom labels readable)
    final sorted = counts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final top = sorted.take(6).toList();

    if (top.isEmpty) return const SizedBox.shrink();

    final maxVal = top.first.value.toDouble();
    // Round the axis ceiling up to a whole number and use integer gridlines.
    final axisMax = (maxVal < 1 ? 1 : maxVal).ceilToDouble();
    final interval =
        (axisMax / 4).ceilToDouble().clamp(1.0, double.infinity).toDouble();

    return Card(
      elevation: 2,
      shadowColor: Colors.black12,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.location_on_outlined, size: 16, color: lguColor),
                const SizedBox(width: 6),
                Text(
                  'Reports per Barangay (Top ${top.length})',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: lguColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 220,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: axisMax,
                  minY: 0,
                  barTouchData: BarTouchData(
                    touchTooltipData: BarTouchTooltipData(
                      getTooltipItem: (group, groupIndex, rod, rodIndex) {
                        final name = top[group.x].key;
                        final count = rod.toY.toInt();
                        return BarTooltipItem(
                          '$name\n$count report${count == 1 ? '' : 's'}',
                          const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        );
                      },
                    ),
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    // Y axis: report counts (integers only)
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 28,
                        interval: interval,
                        getTitlesWidget: (value, meta) {
                          if (value != value.roundToDouble()) {
                            return const SizedBox.shrink();
                          }
                          return Text(
                            value.toInt().toString(),
                            style: const TextStyle(fontSize: 10),
                          );
                        },
                      ),
                    ),
                    // X axis: barangay names under each bar
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 44,
                        getTitlesWidget: (value, meta) {
                          final index = value.toInt();
                          if (index < 0 || index >= top.length) {
                            return const SizedBox.shrink();
                          }
                          final label = top[index].key;
                          final display = label.length > 10
                              ? '${label.substring(0, 9)}…'
                              : label;
                          return Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                              display,
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontSize: 9),
                            ),
                          );
                        },
                      ),
                    ),
                    topTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                  ),
                  gridData: FlGridData(
                    show: true,
                    drawHorizontalLine: true,
                    drawVerticalLine: false,
                    horizontalInterval: interval,
                    getDrawingHorizontalLine: (value) => FlLine(
                      color: Colors.grey.shade200,
                      strokeWidth: 1,
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: top.asMap().entries.map((e) {
                    final i = e.key;
                    final count = e.value.value.toDouble();
                    return BarChartGroupData(
                      x: i,
                      barRods: [
                        BarChartRodData(
                          toY: count,
                          color: lguColor,
                          width: 22,
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(4),
                          ),
                          backDrawRodData: BackgroundBarChartRodData(
                            show: true,
                            toY: axisMax,
                            color: lguColor.withValues(alpha: 0.07),
                          ),
                        ),
                      ],
                    );
                  }).toList(),
                ),
                swapAnimationDuration: const Duration(milliseconds: 400),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Pie Chart: Reports by Category ─────────────────────────────────────────

  Widget _buildCategoryPieChart() {
    final Map<String, int> counts = {};
    for (final r in reports) {
      final key = r.category.displayName;
      counts[key] = (counts[key] ?? 0) + 1;
    }

    final sorted = counts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    if (sorted.isEmpty) return const SizedBox.shrink();

    final total = reports.length;

    final sections = sorted.asMap().entries.map((e) {
      final i = e.key;
      final entry = e.value;
      final pct = entry.value / total * 100;
      return PieChartSectionData(
        value: entry.value.toDouble(),
        color: _slicePalette[i % _slicePalette.length],
        radius: 64,
        title: pct >= 7 ? '${pct.toStringAsFixed(0)}%' : '',
        titleStyle: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
        badgeWidget: null,
      );
    }).toList();

    return Card(
      elevation: 2,
      shadowColor: Colors.black12,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.pie_chart_outline, size: 16, color: lguColor),
                const SizedBox(width: 6),
                Text(
                  'Reports by Category',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: lguColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 180,
              child: PieChart(
                PieChartData(
                  sections: sections,
                  sectionsSpace: 2,
                  centerSpaceRadius: 40,
                  pieTouchData: PieTouchData(
                    touchCallback: (_, __) {},
                  ),
                ),
                swapAnimationDuration: const Duration(milliseconds: 400),
              ),
            ),
            const SizedBox(height: 16),
            // Legend
            Wrap(
              spacing: 10,
              runSpacing: 8,
              children: sorted.asMap().entries.map((e) {
                final i = e.key;
                final entry = e.value;
                final color = _slicePalette[i % _slicePalette.length];
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: color,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${entry.key} (${entry.value})',
                      style: const TextStyle(fontSize: 11),
                    ),
                  ],
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI TILE (used by _AnalyticsTab)
// ─────────────────────────────────────────────────────────────────────────────

class _KpiTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _KpiTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: color.withValues(alpha: 0.75),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE MANAGEMENT TAB  (Provincial Admin only)
// ─────────────────────────────────────────────────────────────────────────────

class _RoleManagementTab extends StatefulWidget {
  final Color lguColor;
  const _RoleManagementTab({required this.lguColor});

  @override
  State<_RoleManagementTab> createState() =>
      _RoleManagementTabState();
}

class _RoleManagementTabState extends State<_RoleManagementTab> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showRoleDialog(
      BuildContext context,
      String uid,
      String name,
      UserRole currentRole) {
    UserRole selected = currentRole;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16)),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Assign Role',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              Text(name,
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.normal,
                      color: Colors.grey.shade600)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: UserRole.values.map((role) {
              return RadioListTile<UserRole>(
                dense: true,
                activeColor: widget.lguColor,
                title: Text(role.displayName,
                    style: const TextStyle(fontSize: 14)),
                subtitle: _roleDescription(role),
                value: role,
                groupValue: selected,
                onChanged: (v) {
                  if (v != null) setDialogState(() => selected = v);
                },
              );
            }).toList(),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(ctx);
                await roleService.assignRole(uid, selected);
              },
              style: ElevatedButton.styleFrom(
                  backgroundColor: widget.lguColor,
                  foregroundColor: Colors.white),
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  Widget? _roleDescription(UserRole role) {
    switch (role) {
      case UserRole.citizen:
        return const Text('Standard app user', style: TextStyle(fontSize: 11));
      case UserRole.admin:
        return const Text('Legacy admin (view only)', style: TextStyle(fontSize: 11));
      case UserRole.municipalAdmin:
        return const Text('Manages reports & announcements for their municipality',
            style: TextStyle(fontSize: 11));
      case UserRole.provincialAdmin:
        return const Text('Full access across all municipalities',
            style: TextStyle(fontSize: 11));
      case UserRole.superAdmin:
        return const Text('Full access — provincial + municipal view switching',
            style: TextStyle(fontSize: 11));
    }
  }

  Color _roleColor(UserRole role) {
    switch (role) {
      case UserRole.citizen:
        return Colors.grey;
      case UserRole.admin:
        return Colors.blue;
      case UserRole.municipalAdmin:
        return Colors.green.shade700;
      case UserRole.provincialAdmin:
        return const Color(0xFF4A148C);
      case UserRole.superAdmin:
        return const Color(0xFF1B5E20);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          color: const Color(0xFF4A148C).withValues(alpha: 0.07),
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
          child: Row(
            children: [
              const Icon(Icons.manage_accounts,
                  size: 16, color: Color(0xFF4A148C)),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Assign roles to users. Changes take effect on their next login.',
                  style: TextStyle(
                      fontSize: 12, color: Color(0xFF4A148C)),
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search by name or municipality…',
              prefixIcon:
                  const Icon(Icons.search, color: Colors.grey),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12)),
              contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16, vertical: 10),
              isDense: true,
            ),
            onChanged: (v) =>
                setState(() => _searchQuery = v.toLowerCase()),
          ),
        ),
        Expanded(
          child: StreamBuilder<QuerySnapshot>(
            stream: roleService.getUsersStream(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return Center(
                    child: CircularProgressIndicator(
                        color: widget.lguColor));
              }

              if (snapshot.hasError) {
                return Center(
                  child: Text('Failed to load users: ${snapshot.error}',
                      textAlign: TextAlign.center),
                );
              }

              final allDocs = snapshot.data?.docs ?? [];
              final docs = _searchQuery.isEmpty
                  ? allDocs
                  : allDocs.where((doc) {
                      final data =
                          doc.data() as Map<String, dynamic>;
                      final name = (data['name'] as String? ?? '')
                          .toLowerCase();
                      final muni =
                          (data['municipality'] as String? ?? '')
                              .toLowerCase();
                      final phone =
                          (data['phoneNumber'] as String? ?? '')
                              .toLowerCase();
                      return name.contains(_searchQuery) ||
                          muni.contains(_searchQuery) ||
                          phone.contains(_searchQuery);
                    }).toList();

              if (allDocs.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.people_outline,
                          size: 64,
                          color: Colors.grey.shade300),
                      const SizedBox(height: 12),
                      Text('No users found',
                          style: TextStyle(
                              color: Colors.grey.shade500)),
                    ],
                  ),
                );
              }

              if (docs.isEmpty) {
                return const Center(
                    child: Text('No users match your search.'));
              }

              return ListView.builder(
                padding:
                    const EdgeInsets.fromLTRB(12, 0, 12, 24),
                itemCount: docs.length,
                itemBuilder: (context, index) {
                  final doc = docs[index];
                  final data =
                      doc.data() as Map<String, dynamic>;
                  final name =
                      data['name'] as String? ?? '(No name)';
                  final phone =
                      data['phoneNumber'] as String? ?? '';
                  final muni =
                      data['municipality'] as String? ?? '';
                  final roleStr =
                      data['role'] as String? ?? 'citizen';
                  final role =
                      AppUser.roleFromString(roleStr);
                  final roleColor = _roleColor(role);

                  final initials = name.isNotEmpty
                      ? name
                          .trim()
                          .split(' ')
                          .take(2)
                          .map((w) => w.isNotEmpty
                              ? w[0].toUpperCase()
                              : '')
                          .join()
                      : '?';

                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    child: ListTile(
                      onTap: () => _showRoleDialog(
                          context, doc.id, name, role),
                      leading: CircleAvatar(
                        backgroundColor:
                            roleColor.withValues(alpha: 0.15),
                        child: Text(initials,
                            style: TextStyle(
                                color: roleColor,
                                fontWeight: FontWeight.bold,
                                fontSize: 13)),
                      ),
                      title: Text(name,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14)),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (muni.isNotEmpty)
                            Text(muni,
                                style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey.shade600)),
                          if (phone.isNotEmpty)
                            Text(phone,
                                style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey.shade400)),
                        ],
                      ),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color:
                                  roleColor.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                  color: roleColor
                                      .withValues(alpha: 0.4)),
                            ),
                            child: Text(
                              role.displayName,
                              style: TextStyle(
                                  fontSize: 10,
                                  color: roleColor,
                                  fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Icon(Icons.edit,
                              size: 12, color: Colors.grey.shade400),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}
