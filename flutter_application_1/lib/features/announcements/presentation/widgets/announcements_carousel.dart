import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class AnnouncementsCarousel extends StatelessWidget {
  final String municipality;
  const AnnouncementsCarousel({super.key, required this.municipality});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('announcements')
          .where('municipality', isEqualTo: municipality)
          .orderBy('timestamp', descending: true)
          .limit(5)
          .snapshots(),
      builder: (context, snapshot) {
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
              return _AnnouncementCard(
                title: data['title'] ?? '',
                body: data['body'] ?? '',
                isUrgent: data['isUrgent'] ?? false,
              );
            },
          ),
        );
      },
    );
  }
}

class _AnnouncementCard extends StatelessWidget {
  final String title, body;
  final bool isUrgent;
  const _AnnouncementCard({
    required this.title,
    required this.body,
    required this.isUrgent,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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
                  size: 16,
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
            ],
          ),
          const SizedBox(height: 6),
          Text(
            body,
            style: theme.textTheme.bodySmall,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _EmptyAnnouncement extends StatelessWidget {
  const _EmptyAnnouncement();
  @override
  Widget build(BuildContext context) => Container(
    height: 120,
    margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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
