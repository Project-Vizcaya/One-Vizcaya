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

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  _AdminDashboardScreenState createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen>
    with SingleTickerProviderStateMixin {
  final ReportRepository _reportRepository = FirebaseReportRepository();
  ReportPriority? _filterPriority;
  ReportStatus? _filterStatus;
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

  void _showAddAnnouncementSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useSafeArea: true,
      builder: (_) => _AddAnnouncementSheet(
        lguColor: oneVizcayaState.activeTheme['appBarColor'] as Color,
        municipality: oneVizcayaState.selectedMunicipality.value,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeLguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final activeMunicipalityName = oneVizcayaState.selectedMunicipality.value;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: activeLguColor,
        foregroundColor: Colors.white,
        title: Text('$activeMunicipalityName Admin'),
        actions: [
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

      // ── FAB — Add Announcement (only visible on Announcements tab) ──
      floatingActionButton: ListenableBuilder(
        listenable: _tabController,
        builder: (context, _) {
          if (_tabController.index != 1) return const SizedBox.shrink();
          return FloatingActionButton.extended(
            onPressed: _showAddAnnouncementSheet,
            backgroundColor: activeLguColor,
            foregroundColor: Colors.white,
            icon: const Icon(Icons.add),
            label: const Text('Post Announcement'),
          );
        },
      ),

      body: TabBarView(
        controller: _tabController,
        children: [
          // ── Tab 1: Reports ──
          Column(
            children: [
              _buildSummaryBar(activeLguColor, activeMunicipalityName),
              _buildFilterBar(activeLguColor),
              Expanded(
                child: StreamBuilder<List<ProblemReport>>(
                  stream: _reportRepository.getAllMunicipalityReports(
                    activeMunicipalityName,
                  ),
                  builder: (context, snapshot) {
                    if (snapshot.hasError) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.error_outline,
                              size: 64,
                              color: Colors.red,
                            ),
                            const SizedBox(height: 16),
                            Text('Error: ${snapshot.error}'),
                            const SizedBox(height: 8),
                            const Text(
                              'Note: This feature requires a Firestore\ncollection group index on "reports".',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
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
                            Icon(
                              Icons.inbox,
                              size: 64,
                              color: activeLguColor.withValues(alpha: 0.3),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No reports submitted to $activeMunicipalityName yet.',
                            ),
                          ],
                        ),
                      );
                    }

                    var reports = snapshot.data!;
                    if (_filterPriority != null) {
                      reports = reports
                          .where((r) => r.priority == _filterPriority)
                          .toList();
                    }
                    if (_filterStatus != null) {
                      reports = reports
                          .where((r) => r.status == _filterStatus)
                          .toList();
                    }
                    reports.sort((a, b) {
                      if (a.status == ReportStatus.solved &&
                          b.status != ReportStatus.solved) {
                        return 1;
                      }
                      if (b.status == ReportStatus.solved &&
                          a.status != ReportStatus.solved) {
                        return -1;
                      }
                      return b.priorityScore.compareTo(a.priorityScore);
                    });

                    if (reports.isEmpty) {
                      return const Center(
                        child: Text('No reports match the selected filters.'),
                      );
                    }

                    return ListView.builder(
                      padding: const EdgeInsets.all(8.0),
                      itemCount: reports.length,
                      itemBuilder: (context, index) {
                        return _AdminReportCard(
                          report: reports[index],
                          lguColor: activeLguColor,
                          onStatusUpdate: (reportId, userId, newStatus) {
                            _reportRepository.updateReportStatus(
                              userId,
                              reportId,
                              newStatus,
                            );
                          },
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),

          // ── Tab 2: Announcements ──
          _AnnouncementsTab(
            lguColor: activeLguColor,
            municipality: activeMunicipalityName,
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
        final critical = reports
            .where(
              (r) =>
                  r.priority == ReportPriority.critical &&
                  r.status != ReportStatus.solved,
            )
            .length;
        final pending = reports
            .where((r) => r.status == ReportStatus.reported)
            .length;
        final ongoing = reports
            .where((r) => r.status == ReportStatus.ongoing)
            .length;
        final solved = reports
            .where((r) => r.status == ReportStatus.solved)
            .length;

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [lguColor, lguColor.withValues(alpha: 0.7)],
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _StatBadge(label: 'Total', count: total, color: Colors.white),
              _StatBadge(
                label: 'Critical',
                count: critical,
                color: ReportPriority.critical.color,
              ),
              _StatBadge(
                label: 'Pending',
                count: pending,
                color: Colors.blue.shade200,
              ),
              _StatBadge(
                label: 'Ongoing',
                count: ongoing,
                color: Colors.orange.shade200,
              ),
              _StatBadge(
                label: 'Solved',
                count: solved,
                color: Colors.green.shade200,
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
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      color: Colors.grey.shade100,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            const Text(
              'Priority: ',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
            ),
            FilterChip(
              label: const Text('All', style: TextStyle(fontSize: 12)),
              selected: _filterPriority == null,
              selectedColor: lguColor.withValues(alpha: 0.2),
              onSelected: (_) => setState(() => _filterPriority = null),
              visualDensity: VisualDensity.compact,
            ),
            const SizedBox(width: 4),
            ...ReportPriority.values.reversed.map(
              (p) => Padding(
                padding: const EdgeInsets.only(right: 4),
                child: FilterChip(
                  avatar: Icon(p.icon, size: 12, color: p.color),
                  label: Text(
                    p.displayName,
                    style: const TextStyle(fontSize: 12),
                  ),
                  selected: _filterPriority == p,
                  selectedColor: p.color.withValues(alpha: 0.2),
                  onSelected: (_) => setState(() => _filterPriority = p),
                  visualDensity: VisualDensity.compact,
                ),
              ),
            ),
            const SizedBox(width: 12),
            const Text(
              'Status: ',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
            ),
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
                  label: Text(label, style: const TextStyle(fontSize: 12)),
                  selected: _filterStatus == s,
                  selectedColor: color.withValues(alpha: 0.2),
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

// ═══════════════════════════════════════════
// ANNOUNCEMENTS TAB
// ═══════════════════════════════════════════

class _AnnouncementsTab extends StatelessWidget {
  final Color lguColor;
  final String municipality;

  const _AnnouncementsTab({required this.lguColor, required this.municipality});

  Future<void> _deleteAnnouncement(BuildContext context, String docId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Announcement'),
        content: const Text(
          'Are you sure you want to delete this announcement? This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
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
          return Center(child: CircularProgressIndicator(color: lguColor));
        }

        final docs = snapshot.data?.docs ?? [];

        if (docs.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.campaign_outlined,
                  size: 72,
                  color: lguColor.withValues(alpha: 0.3),
                ),
                const SizedBox(height: 16),
                Text(
                  'No announcements yet',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Tap the + button below to post one',
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade400),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
          itemCount: docs.length,
          itemBuilder: (context, index) {
            final doc = docs[index];
            final data = doc.data() as Map<String, dynamic>;
            final title = data['title'] as String? ?? 'Announcement';
            final body = data['body'] as String? ?? '';
            final isUrgent = data['isUrgent'] as bool? ?? false;
            final postedBy = data['postedBy'] as String? ?? 'LGU';
            final muni = data['municipality'] as String? ?? '';
            final timestamp = (data['timestamp'] as Timestamp?)?.toDate();

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
                contentPadding: const EdgeInsets.fromLTRB(16, 10, 8, 10),
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
                    isUrgent ? Icons.warning_amber_rounded : Icons.campaign,
                    color: isUrgent ? Colors.red : lguColor,
                    size: 22,
                  ),
                ),
                title: Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 2),
                    Text(
                      body,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: lguColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            muni == 'All' ? 'Province-Wide' : muni,
                            style: TextStyle(
                              fontSize: 10,
                              color: lguColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          timestamp != null
                              ? '${timestamp.month}/${timestamp.day}/${timestamp.year}'
                              : '',
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.grey.shade400,
                          ),
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
                          Icon(Icons.delete, color: Colors.red, size: 18),
                          SizedBox(width: 8),
                          Text('Delete', style: TextStyle(color: Colors.red)),
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

// ═══════════════════════════════════════════
// ADD ANNOUNCEMENT BOTTOM SHEET
// ═══════════════════════════════════════════

class _AddAnnouncementSheet extends StatefulWidget {
  final Color lguColor;
  final String municipality;

  const _AddAnnouncementSheet({
    required this.lguColor,
    required this.municipality,
  });

  @override
  State<_AddAnnouncementSheet> createState() => _AddAnnouncementSheetState();
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
      await FirebaseFirestore.instance.collection('announcements').add({
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
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
        24,
        16,
        24,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Drag handle ──
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
              const SizedBox(height: 16),

              // ── Header ──
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: widget.lguColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Icons.campaign,
                      color: widget.lguColor,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Post Announcement',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: widget.lguColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // ── Title ──
              TextFormField(
                controller: _titleController,
                decoration: InputDecoration(
                  labelText: 'Announcement Title *',
                  hintText: 'e.g., Road Project Update in Bambang',
                  prefixIcon: Icon(Icons.title, color: widget.lguColor),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: widget.lguColor, width: 2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Title is required' : null,
                maxLength: 100,
              ),
              const SizedBox(height: 12),

              // ── Body ──
              TextFormField(
                controller: _bodyController,
                decoration: InputDecoration(
                  labelText: 'Message / Details *',
                  hintText: 'Write the full announcement details here...',
                  prefixIcon: Icon(Icons.message, color: widget.lguColor),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: widget.lguColor, width: 2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                validator: (v) => v == null || v.trim().isEmpty
                    ? 'Message is required'
                    : null,
                maxLines: 4,
                maxLength: 500,
              ),
              const SizedBox(height: 12),

              // ── Posted By ──
              TextFormField(
                controller: _postedByController,
                decoration: InputDecoration(
                  labelText: 'Posted By *',
                  hintText: 'e.g., Gov. Darren Gambito, Mayor Juan Dela Cruz',
                  prefixIcon: Icon(Icons.person, color: widget.lguColor),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: widget.lguColor, width: 2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                validator: (v) => v == null || v.trim().isEmpty
                    ? 'Posted by is required'
                    : null,
              ),
              const SizedBox(height: 12),

              // ── Municipality ──
              DropdownButtonFormField<String>(
                value: _selectedMunicipality,
                decoration: InputDecoration(
                  labelText: 'Target Municipality',
                  prefixIcon: Icon(Icons.location_city, color: widget.lguColor),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: widget.lguColor, width: 2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  helperText: 'Select "All" to show to all municipalities',
                ),
                items: municipalities.map((m) {
                  return DropdownMenuItem(
                    value: m,
                    child: Text(m == 'All' ? '🌍 All Municipalities' : m),
                  );
                }).toList(),
                onChanged: (v) => setState(() => _selectedMunicipality = v!),
              ),
              const SizedBox(height: 12),

              // ── Source URL (optional) ──
              TextFormField(
                controller: _sourceUrlController,
                decoration: InputDecoration(
                  labelText: 'Source URL (Optional)',
                  hintText: 'https://facebook.com/post/... or official link',
                  prefixIcon: Icon(Icons.link, color: widget.lguColor),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: widget.lguColor, width: 2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  helperText: 'Citizens can tap to view original Facebook post',
                ),
                keyboardType: TextInputType.url,
              ),
              const SizedBox(height: 12),

              // ── Source Label ──
              TextFormField(
                controller: _sourceLabelController,
                decoration: InputDecoration(
                  labelText: 'Source Label (Optional)',
                  hintText: 'e.g., Posted by Gov. Gambito • Facebook',
                  prefixIcon: Icon(Icons.label_outline, color: widget.lguColor),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: widget.lguColor, width: 2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // ── Urgent Toggle ──
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: _isUrgent ? Colors.red.shade50 : Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _isUrgent
                        ? Colors.red.shade300
                        : Colors.grey.shade200,
                  ),
                ),
                child: SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Row(
                    children: [
                      Icon(
                        Icons.warning_amber_rounded,
                        color: _isUrgent ? Colors.red : Colors.grey,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Mark as Urgent',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: _isUrgent ? Colors.red : Colors.black87,
                        ),
                      ),
                    ],
                  ),
                  subtitle: Text(
                    'Shows red border and URGENT badge to citizens',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                  ),
                  value: _isUrgent,
                  activeColor: Colors.red,
                  onChanged: (v) => setState(() => _isUrgent = v),
                ),
              ),

              const SizedBox(height: 20),

              // ── Post Button ──
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
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.send),
                  label: Text(_isPosting ? 'Posting...' : 'Post Announcement'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: widget.lguColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                ),
              ),
              const SizedBox(height: 8),

              // ── Cancel ──
              SizedBox(
                height: 48,
                width: double.infinity,
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
}

// ═══════════════════════════════════════════
// SHARED WIDGETS (unchanged from original)
// ═══════════════════════════════════════════

class _StatBadge extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _StatBadge({
    required this.label,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          '$count',
          style: TextStyle(
            color: color,
            fontSize: 22,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 11),
        ),
      ],
    );
  }
}

class _AdminReportCard extends StatelessWidget {
  final ProblemReport report;
  final Color lguColor;
  final void Function(String reportId, String userId, String newStatus)
  onStatusUpdate;

  const _AdminReportCard({
    required this.report,
    required this.lguColor,
    required this.onStatusUpdate,
  });

  String _formatDate(DateTime date) => '${date.month}/${date.day}/${date.year}';

  Color _getStatusColor(ReportStatus status) {
    switch (status) {
      case ReportStatus.reported:
        return Colors.blue.shade700;
      case ReportStatus.ongoing:
        return Colors.orange.shade700;
      case ReportStatus.solved:
        return Colors.green.shade700;
    }
  }

  String _getStatusText(ReportStatus status) {
    switch (status) {
      case ReportStatus.reported:
        return 'Pending';
      case ReportStatus.ongoing:
        return 'Ongoing';
      case ReportStatus.solved:
        return 'Solved';
    }
  }

  IconData _getStatusIcon(ReportStatus status) {
    switch (status) {
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
    final statusColor = _getStatusColor(report.status);
    final priorityColor = report.priority.color;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6.0, horizontal: 4.0),
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: priorityColor.withValues(alpha: 0.15),
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
                  style: TextStyle(
                    color: priorityColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
                const Spacer(),
                Text(
                  'Score: ${report.priorityScore}',
                  style: TextStyle(color: priorityColor, fontSize: 11),
                ),
                if (report.duplicateCount > 0) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: priorityColor.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.people,
                          size: 10,
                          color: Colors.black54,
                        ),
                        const SizedBox(width: 3),
                        Text(
                          '${report.duplicateCount} similar',
                          style: TextStyle(
                            color: priorityColor,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
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
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20.0),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _getStatusIcon(report.status),
                            color: statusColor,
                            size: 14,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _getStatusText(report.status),
                            style: TextStyle(
                              color: statusColor,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  report.description,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const Divider(height: 20),
                Row(
                  children: [
                    const Icon(Icons.location_on, size: 14, color: Colors.grey),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        report.location,
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(
                      Icons.calendar_today,
                      size: 14,
                      color: Colors.grey,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _formatDate(report.reportedAt),
                      style: const TextStyle(fontSize: 13),
                    ),
                  ],
                ),
                if (report.userPhone != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.phone, size: 14, color: Colors.grey),
                      const SizedBox(width: 6),
                      Text(
                        report.userPhone!,
                        style: const TextStyle(fontSize: 13),
                      ),
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
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Text(
                      'Update Status: ',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    if (report.status != ReportStatus.ongoing)
                      _StatusButton(
                        label: 'Ongoing',
                        color: Colors.orange,
                        onTap: () {
                          if (report.userId != null) {
                            onStatusUpdate(
                              report.id,
                              report.userId!,
                              'ongoing',
                            );
                          } else {
                            ToastUtils.showError(
                              'Cannot update: missing user info',
                            );
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
                            ToastUtils.showError(
                              'Cannot update: missing user info',
                            );
                          }
                        },
                      ),
                    if (report.status == ReportStatus.solved)
                      _StatusButton(
                        label: 'Reopen',
                        color: Colors.blue,
                        onTap: () {
                          if (report.userId != null) {
                            onStatusUpdate(
                              report.id,
                              report.userId!,
                              'reported',
                            );
                          } else {
                            ToastUtils.showError(
                              'Cannot update: missing user info',
                            );
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

  const _StatusButton({
    required this.label,
    required this.color,
    required this.onTap,
  });

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
