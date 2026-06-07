import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:url_launcher/url_launcher.dart';

class AnnouncementsCarousel extends StatelessWidget {
  final String municipality;
  const AnnouncementsCarousel({super.key, required this.municipality});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('announcements')
          .where('municipality', whereIn: [municipality, 'All'])
          .orderBy('timestamp', descending: true)
          .limit(5)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return const _EmptyAnnouncement();
        }
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SizedBox(
            height: 120,
            child: Center(child: CircularProgressIndicator()),
          );
        }
        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
          return const _EmptyAnnouncement();
        }
        final docs = snapshot.data!.docs;
        return SizedBox(
          height: 120,
          child: PageView.builder(
            itemCount: docs.length,
            itemBuilder: (context, index) {
              final data = docs[index].data() as Map<String, dynamic>;
              return _AnnouncementCard(data: data);
            },
          ),
        );
      },
    );
  }
}

class _AnnouncementCard extends StatelessWidget {
  final Map<String, dynamic> data;
  const _AnnouncementCard({required this.data});

  Future<void> _openSource() async {
    final url = data['sourceUrl'] as String? ?? '';
    if (url.isEmpty) return;
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title = data['title'] as String? ?? '';
    final body = data['body'] as String? ?? '';
    final isUrgent = data['isUrgent'] as bool? ?? false;
    final sourceUrl = data['sourceUrl'] as String? ?? '';
    final postedBy = data['postedBy'] as String? ?? '';

    return GestureDetector(
      onTap: sourceUrl.isNotEmpty ? _openSource : null,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isUrgent
              ? Colors.red.shade50
              : theme.colorScheme.primaryContainer,
          borderRadius: BorderRadius.circular(12),
          border: isUrgent ? Border.all(color: Colors.red, width: 1.5) : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (isUrgent) ...[
                  const Icon(
                    Icons.warning_amber_rounded,
                    color: Colors.red,
                    size: 14,
                  ),
                  const SizedBox(width: 4),
                ],
                Expanded(
                  child: Text(
                    title,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (sourceUrl.isNotEmpty)
                  const Icon(Icons.open_in_new, size: 12, color: Colors.grey),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              body,
              style: theme.textTheme.bodySmall,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            if (postedBy.isNotEmpty)
              Text(
                '— $postedBy',
                style: TextStyle(
                  fontSize: 10,
                  color: Colors.grey.shade500,
                  fontStyle: FontStyle.italic,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
      ),
    );
  }
}

class _EmptyAnnouncement extends StatelessWidget {
  const _EmptyAnnouncement();
  @override
  Widget build(BuildContext context) => Container(
    height: 120,
    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    decoration: BoxDecoration(
      color: Colors.grey.shade100,
      borderRadius: BorderRadius.circular(12),
    ),
    child: const Center(
      child: Text(
        'No announcements yet.',
        style: TextStyle(color: Colors.grey),
      ),
    ),
  );
}
