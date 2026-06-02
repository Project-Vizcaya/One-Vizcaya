import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../core/constants/app_constants.dart';
import '../../core/l10n/app_strings.dart';
import '../state/municipality_state.dart';
import '../../core/utils/toast_utils.dart';

class AnnouncementsScreen extends StatelessWidget {
  const AnnouncementsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final lguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final municipality = oneVizcayaState.selectedMunicipality.value;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: lguColor,
        foregroundColor: Colors.white,
        title: const Text(
          'Announcements',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        elevation: 0,
      ),
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: AppConstants.kContentMaxWidth),
          child: _AnnouncementsList(municipality: municipality, lguColor: lguColor),
        ),
      ),
    );
  }
}

// Uses a real-time stream (snapshots) so new announcements appear instantly
// and the screen doesn't silently fail on Firestore permission errors.
class _AnnouncementsList extends StatefulWidget {
  final String municipality;
  final Color lguColor;

  const _AnnouncementsList(
      {required this.municipality, required this.lguColor});

  @override
  State<_AnnouncementsList> createState() => _AnnouncementsListState();
}

class _AnnouncementsListState extends State<_AnnouncementsList> {
  Set<String> _bookmarkedIds = {};
  bool _showBookmarked = false;
  bool _newestFirst = true;
  // null = all agencies; otherwise the selected "postedBy" agency name.
  String? _agencyFilter;

  static const String _prefsKey = 'bookmarked_announcements';

  @override
  void initState() {
    super.initState();
    _loadBookmarks();
  }

  Future<void> _loadBookmarks() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefsKey);
    if (raw != null) {
      final list = (jsonDecode(raw) as List).cast<String>();
      if (mounted) setState(() => _bookmarkedIds = list.toSet());
    }
  }

  Future<void> _toggleBookmark(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final isCurrentlyBookmarked = _bookmarkedIds.contains(id);
    setState(() {
      if (isCurrentlyBookmarked) {
        _bookmarkedIds.remove(id);
      } else {
        _bookmarkedIds.add(id);
      }
    });
    await prefs.setString(_prefsKey, jsonEncode(_bookmarkedIds.toList()));
    ToastUtils.showSuccess(isCurrentlyBookmarked
        ? 'Removed from bookmarks'
        : 'Saved to bookmarks');
  }

  Stream<QuerySnapshot> _buildStream() {
    return FirebaseFirestore.instance
        .collection('announcements')
        .orderBy('timestamp', descending: true)
        .snapshots();
  }

  Future<void> _onRefresh() async {
    // Force a fresh Firestore fetch
    await FirebaseFirestore.instance
        .collection('announcements')
        .orderBy('timestamp', descending: true)
        .get(const GetOptions(source: Source.server))
        .catchError((_) {});
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot>(
      stream: _buildStream(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Center(
              child: CircularProgressIndicator(color: widget.lguColor));
        }

        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline,
                    size: 48,
                    color: Colors.red.shade300,
                    semanticLabel: 'Error loading announcements'),
                const SizedBox(height: 16),
                Text(AppStrings.get('failedLoad'),
                    style: TextStyle(color: Colors.grey.shade600)),
                const SizedBox(height: 8),
                Text(
                  '${snapshot.error}',
                  textAlign: TextAlign.center,
                  style:
                      TextStyle(fontSize: 11, color: Colors.grey.shade400),
                ),
              ],
            ),
          );
        }

        // Filter: show announcements for this municipality OR province-wide ('All')
        final allDocs = (snapshot.data?.docs ?? []).where((doc) {
          final data = doc.data() as Map<String, dynamic>;
          final muni = data['municipality'] as String? ?? '';
          return muni == widget.municipality || muni == 'All';
        }).toList();

        // Distinct agencies (postedBy) for the agency filter dropdown.
        final agencies = allDocs
            .map((d) =>
                (d.data() as Map<String, dynamic>)['postedBy'] as String? ??
                'LGU')
            .toSet()
            .toList()
          ..sort();

        // If the selected agency no longer exists in the feed, reset it.
        if (_agencyFilter != null && !agencies.contains(_agencyFilter)) {
          _agencyFilter = null;
        }

        // Apply bookmark + agency filters
        var docs = allDocs.where((d) {
          if (_showBookmarked && !_bookmarkedIds.contains(d.id)) return false;
          if (_agencyFilter != null) {
            final by = (d.data() as Map<String, dynamic>)['postedBy']
                    as String? ??
                'LGU';
            if (by != _agencyFilter) return false;
          }
          return true;
        }).toList();

        // The stream is newest-first; reverse for oldest-first.
        if (!_newestFirst) docs = docs.reversed.toList();

        return RefreshIndicator(
          color: Colors.green,
          onRefresh: _onRefresh,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // ── Filter chips row ──
              SliverToBoxAdapter(
                child: Padding(
                  padding:
                      const EdgeInsets.fromLTRB(16, 12, 16, 4),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      FilterChip(
                        label: Text(AppStrings.get('filterAll')),
                        selected: !_showBookmarked,
                        onSelected: (_) =>
                            setState(() => _showBookmarked = false),
                        selectedColor:
                            widget.lguColor.withValues(alpha: 0.15),
                        checkmarkColor: widget.lguColor,
                        labelStyle: TextStyle(
                          color: !_showBookmarked
                              ? widget.lguColor
                              : Colors.grey.shade600,
                          fontWeight: !_showBookmarked
                              ? FontWeight.w600
                              : FontWeight.normal,
                        ),
                      ),
                      FilterChip(
                        avatar: Icon(
                          _showBookmarked
                              ? Icons.bookmark
                              : Icons.bookmark_border,
                          size: 16,
                          color: _showBookmarked
                              ? Colors.green
                              : Colors.grey.shade600,
                        ),
                        label: Text(
                            'Bookmarked${_bookmarkedIds.isNotEmpty ? " (${_bookmarkedIds.length})" : ""}'),
                        selected: _showBookmarked,
                        onSelected: (_) =>
                            setState(() => _showBookmarked = !_showBookmarked),
                        selectedColor:
                            Colors.green.withValues(alpha: 0.15),
                        checkmarkColor: Colors.green,
                        labelStyle: TextStyle(
                          color: _showBookmarked
                              ? Colors.green
                              : Colors.grey.shade600,
                          fontWeight: _showBookmarked
                              ? FontWeight.w600
                              : FontWeight.normal,
                        ),
                      ),
                      // ── Sort: newest / oldest ──
                      ActionChip(
                        avatar: Icon(
                          _newestFirst
                              ? Icons.arrow_downward
                              : Icons.arrow_upward,
                          size: 16,
                          color: widget.lguColor,
                        ),
                        label: Text(_newestFirst ? 'Newest' : 'Oldest'),
                        labelStyle: TextStyle(
                          color: widget.lguColor,
                          fontWeight: FontWeight.w600,
                        ),
                        side: BorderSide(
                            color: widget.lguColor.withValues(alpha: 0.4)),
                        backgroundColor:
                            widget.lguColor.withValues(alpha: 0.06),
                        onPressed: () =>
                            setState(() => _newestFirst = !_newestFirst),
                      ),
                      // ── Agency filter ──
                      PopupMenuButton<String?>(
                        tooltip: 'Filter by agency',
                        onSelected: (v) => setState(() => _agencyFilter = v),
                        itemBuilder: (ctx) => [
                          PopupMenuItem<String?>(
                            value: null,
                            child: Row(
                              children: [
                                Icon(Icons.done,
                                    size: 16,
                                    color: _agencyFilter == null
                                        ? widget.lguColor
                                        : Colors.transparent),
                                const SizedBox(width: 8),
                                const Text('All Agencies'),
                              ],
                            ),
                          ),
                          ...agencies.map((a) => PopupMenuItem<String?>(
                                value: a,
                                child: Row(
                                  children: [
                                    Icon(Icons.done,
                                        size: 16,
                                        color: _agencyFilter == a
                                            ? widget.lguColor
                                            : Colors.transparent),
                                    const SizedBox(width: 8),
                                    Flexible(child: Text(a)),
                                  ],
                                ),
                              )),
                        ],
                        child: Chip(
                          avatar: Icon(Icons.apartment,
                              size: 16, color: widget.lguColor),
                          label: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _agencyFilter == null
                                    ? 'Agency'
                                    : (_agencyFilter!.length > 18
                                        ? '${_agencyFilter!.substring(0, 18)}…'
                                        : _agencyFilter!),
                              ),
                              const Icon(Icons.arrow_drop_down, size: 18),
                            ],
                          ),
                          labelStyle: TextStyle(
                            color: _agencyFilter == null
                                ? Colors.grey.shade600
                                : widget.lguColor,
                            fontWeight: _agencyFilter == null
                                ? FontWeight.normal
                                : FontWeight.w600,
                          ),
                          side: BorderSide(
                              color: _agencyFilter == null
                                  ? Colors.grey.shade300
                                  : widget.lguColor.withValues(alpha: 0.4)),
                          backgroundColor: _agencyFilter == null
                              ? null
                              : widget.lguColor.withValues(alpha: 0.06),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              if (docs.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _showBookmarked
                                ? Icons.bookmark_border
                                : Icons.campaign_outlined,
                            size: _showBookmarked ? 56 : 64,
                            color: _showBookmarked
                                ? Colors.grey.shade300
                                : widget.lguColor.withValues(alpha: 0.3),
                            semanticLabel: _showBookmarked
                                ? 'No bookmarks'
                                : 'No announcements',
                          ),
                          SizedBox(height: _showBookmarked ? 12 : 16),
                          Text(
                            _showBookmarked
                                ? 'No saved announcements'
                                : AppStrings.get('noAnnouncements'),
                            style: TextStyle(
                                fontSize: _showBookmarked ? 16 : 18,
                                fontWeight: FontWeight.w600,
                                color: _showBookmarked
                                    ? Colors.grey.shade500
                                    : Colors.grey.shade600),
                          ),
                          SizedBox(height: _showBookmarked ? 6 : 8),
                          Text(
                            _showBookmarked
                                ? 'Tap the bookmark icon on any announcement to save it for later'
                                : 'Check back later for updates from ${widget.municipality} LGU',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                fontSize: 13,
                                color: _showBookmarked
                                    ? Colors.grey.shade400
                                    : Colors.grey.shade400),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(
                    16,
                    8,
                    16,
                    MediaQuery.of(context).padding.bottom + 16,
                  ),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final doc = docs[index];
                        final data =
                            doc.data() as Map<String, dynamic>;
                        return _AnnouncementCard(
                          data: data,
                          docId: doc.id,
                          lguColor: widget.lguColor,
                          isBookmarked:
                              _bookmarkedIds.contains(doc.id),
                          onBookmarkToggle: () =>
                              _toggleBookmark(doc.id),
                        );
                      },
                      childCount: docs.length,
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _AnnouncementCard extends StatefulWidget {
  final Map<String, dynamic> data;
  final String docId;
  final Color lguColor;
  final bool isBookmarked;
  final VoidCallback onBookmarkToggle;

  const _AnnouncementCard({
    required this.data,
    required this.docId,
    required this.lguColor,
    required this.isBookmarked,
    required this.onBookmarkToggle,
  });

  @override
  State<_AnnouncementCard> createState() => _AnnouncementCardState();
}

class _AnnouncementCardState extends State<_AnnouncementCard> {
  bool _animating = false;

  void _handleBookmarkTap() {
    setState(() => _animating = true);
    Future.delayed(const Duration(milliseconds: 200), () {
      if (mounted) setState(() => _animating = false);
    });
    widget.onBookmarkToggle();
  }

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
    final title = widget.data['title'] as String? ?? 'Announcement';
    final body = widget.data['body'] as String? ?? '';
    final isUrgent = widget.data['isUrgent'] as bool? ?? false;
    final sourceUrl = widget.data['sourceUrl'] as String? ?? '';
    final sourceLabel = widget.data['sourceLabel'] as String? ?? '';
    final postedBy = widget.data['postedBy'] as String? ?? 'LGU';
    final imageUrl = widget.data['imageUrl'] as String? ?? '';
    final timestamp = (widget.data['timestamp'] as Timestamp?)?.toDate();
    final municipality = widget.data['municipality'] as String? ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
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
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(16),
              ),
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
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: Colors.red.shade300),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.warning_amber_rounded,
                              size: 12,
                              color: Colors.red.shade600,
                              semanticLabel: 'Urgent',
                            ),
                            const SizedBox(width: 4),
                            Text(
                              AppStrings.get('urgentBadge'),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Colors.red.shade600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: widget.lguColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        municipality == 'All'
                            ? 'Province-Wide'
                            : municipality,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: widget.lguColor,
                        ),
                      ),
                    ),
                    const Spacer(),
                    if (timestamp != null)
                      Text(
                        timeago.format(timestamp),
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey.shade400,
                        ),
                      ),
                    const SizedBox(width: 8),
                    // ── Bookmark button ──
                    Semantics(
                      label: widget.isBookmarked
                          ? 'Remove bookmark'
                          : 'Bookmark announcement',
                      button: true,
                      child: GestureDetector(
                        onTap: _handleBookmarkTap,
                        child: AnimatedScale(
                          scale: _animating ? 1.3 : 1.0,
                          duration: const Duration(milliseconds: 150),
                          child: Icon(
                            widget.isBookmarked
                                ? Icons.bookmark
                                : Icons.bookmark_border,
                            size: 22,
                            color: widget.isBookmarked
                                ? const Color(0xFF4CAF50)
                                : Colors.grey.shade400,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.onSurface,
                    height: 1.3,
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Text(
                  body,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey.shade600,
                    height: 1.5,
                  ),
                  maxLines: 6,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: widget.lguColor.withValues(alpha: 0.15),
                      child: Icon(Icons.person, size: 16, color: widget.lguColor),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        postedBy,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade700,
                        ),
                      ),
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
                            size: 14,
                            color: widget.lguColor,
                            semanticLabel: 'Open link'),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            sourceLabel.isNotEmpty
                                ? sourceLabel
                                : AppStrings.get('viewOriginalPost'),
                            style: TextStyle(
                              fontSize: 12,
                              color: widget.lguColor,
                              fontWeight: FontWeight.w600,
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ),
                        ExcludeSemantics(
                          child: Icon(Icons.chevron_right,
                              size: 16, color: widget.lguColor),
                        ),
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
