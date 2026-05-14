import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../state/municipality_state.dart';
import '../../core/utils/toast_utils.dart';

class AnnouncementsScreen extends StatelessWidget {
  const AnnouncementsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final lguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final municipality = oneVizcayaState.selectedMunicipality.value;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F7),
      appBar: AppBar(
        backgroundColor: lguColor,
        foregroundColor: Colors.white,
        title: const Text('Announcements',
            style: TextStyle(fontWeight: FontWeight.w600)),
        elevation: 0,
      ),
      body: _AnnouncementsList(
        municipality: municipality,
        lguColor: lguColor,
      ),
    );
  }
}

class _AnnouncementsList extends StatefulWidget {
  final String municipality;
  final Color lguColor;

  const _AnnouncementsList(
      {required this.municipality, required this.lguColor});

  @override
  State<_AnnouncementsList> createState() => _AnnouncementsListState();
}

class _AnnouncementsListState extends State<_AnnouncementsList> {
  List<QueryDocumentSnapshot> _docs = [];
  bool _isLoading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _loadAnnouncements();
  }

  Future<void> _loadAnnouncements() async {
    setState(() {
      _isLoading = true;
      _hasError = false;
    });
    try {
      // Query 1: municipality-specific
      final q1 = await FirebaseFirestore.instance
          .collection('announcements')
          .where('municipality', isEqualTo: widget.municipality)
          .orderBy('timestamp', descending: true)
          .get();

      // Query 2: province-wide (All)
      final q2 = await FirebaseFirestore.instance
          .collection('announcements')
          .where('municipality', isEqualTo: 'All')
          .orderBy('timestamp', descending: true)
          .get();

      // Merge and deduplicate
      final Map<String, QueryDocumentSnapshot> merged = {};
      for (final doc in [...q1.docs, ...q2.docs]) {
        merged[doc.id] = doc;
      }

      // Sort by timestamp descending
      final sorted = merged.values.toList()
        ..sort((a, b) {
          final aTime = (a.data() as Map)['timestamp'] as Timestamp?;
          final bTime = (b.data() as Map)['timestamp'] as Timestamp?;
          if (aTime == null || bTime == null) return 0;
          return bTime.compareTo(aTime);
        });

      if (mounted) {
        setState(() {
          _docs = sorted;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _hasError = true;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Center(
          child: CircularProgressIndicator(color: widget.lguColor));
    }

    if (_hasError) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline,
                size: 48, color: Colors.red.shade300),
            const SizedBox(height: 16),
            Text('Failed to load announcements',
                style: TextStyle(color: Colors.grey.shade600)),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _loadAnnouncements,
              style: ElevatedButton.styleFrom(
                  backgroundColor: widget.lguColor,
                  foregroundColor: Colors.white),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_docs.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.campaign_outlined,
                size: 72,
                color: widget.lguColor.withValues(alpha: 0.3)),
            const SizedBox(height: 16),
            Text('No announcements yet',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey.shade600)),
            const SizedBox(height: 8),
            Text('Check back later for updates\nfrom your local government.',
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 13, color: Colors.grey.shade400)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAnnouncements,
      color: widget.lguColor,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _docs.length,
        itemBuilder: (context, index) {
          final data = _docs[index].data() as Map<String, dynamic>;
          return _AnnouncementCard(
              data: data, lguColor: widget.lguColor);
        },
      ),
    );
  }
}

class _AnnouncementCard extends StatelessWidget {
  final Map<String, dynamic> data;
  final Color lguColor;

  const _AnnouncementCard(
      {required this.data, required this.lguColor});

  Future<void> _openSource(String url) async {
    final uri = Uri.parse(url);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        ToastUtils.showError('Could not open link');
      }
    } catch (e) {
      ToastUtils.showError('Failed to open link: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = data['title'] as String? ?? 'Announcement';
    final body = data['body'] as String? ?? '';
    final isUrgent = data['isUrgent'] as bool? ?? false;
    final sourceUrl = data['sourceUrl'] as String? ?? '';
    final sourceLabel = data['sourceLabel'] as String? ?? '';
    final postedBy = data['postedBy'] as String? ?? 'LGU';
    final imageUrl = data['imageUrl'] as String? ?? '';
    final timestamp = (data['timestamp'] as Timestamp?)?.toDate();
    final municipality = data['municipality'] as String? ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: isUrgent
            ? Border.all(color: Colors.red.shade400, width: 1.5)
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (imageUrl.isNotEmpty)
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(16)),
              child: Image.network(
                imageUrl,
                height: 180,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (isUrgent) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: Colors.red.shade300),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.warning_amber_rounded,
                                size: 12, color: Colors.red.shade600),
                            const SizedBox(width: 4),
                            Text('URGENT',
                                style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.red.shade600)),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: lguColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        municipality == 'All'
                            ? 'Province-Wide'
                            : municipality,
                        style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: lguColor),
                      ),
                    ),
                    const Spacer(),
                    if (timestamp != null)
                      Text(timeago.format(timestamp),
                          style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey.shade400)),
                  ],
                ),
                const SizedBox(height: 10),
                Text(title,
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1A1A2E),
                        height: 1.3)),
                const SizedBox(height: 8),
                Text(body,
                    style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                        height: 1.5)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: lguColor.withValues(alpha: 0.15),
                      child: Icon(Icons.person,
                          size: 16, color: lguColor),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(postedBy,
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey.shade700)),
                    ),
                  ],
                ),
                if (sourceUrl.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  const Divider(height: 1),
                  const SizedBox(height: 10),
                  GestureDetector(
                    onTap: () => _openSource(sourceUrl),
                    child: Row(
                      children: [
                        Icon(Icons.open_in_new,
                            size: 14, color: lguColor),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            sourceLabel.isNotEmpty
                                ? sourceLabel
                                : 'View original post',
                            style: TextStyle(
                                fontSize: 12,
                                color: lguColor,
                                fontWeight: FontWeight.w600,
                                decoration: TextDecoration.underline),
                          ),
                        ),
                        Icon(Icons.chevron_right,
                            size: 16, color: lguColor),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}