import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:timeago/timeago.dart' as timeago;

class CommunityFeed extends StatelessWidget {
  final String municipality;
  const CommunityFeed({super.key, required this.municipality});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collectionGroup('reports')
          .where('municipality', isEqualTo: municipality)
          .where('status', isEqualTo: 'solved')
          .orderBy('reportedAt', descending: true)
          .limit(10)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'Unable to load resolved reports.',
              style: TextStyle(color: Colors.grey),
            ),
          );
        }
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.check_circle_outline,
                    size: 48, color: Colors.green.shade200),
                const SizedBox(height: 12),
                const Text(
                  'No resolved reports yet',
                  style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey),
                ),
                const SizedBox(height: 6),
                Text(
                  'Reports marked as solved will appear here',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade400),
                ),
              ],
            ),
          );
        }
        final docs = snapshot.data!.docs;
        return ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: docs.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final rawData = docs[index].data();
            if (rawData == null) return const SizedBox.shrink();
            final data = rawData as Map<String, dynamic>;
            final reportedAt =
                (data['reportedAt'] as Timestamp?)?.toDate();
            final category = data['category'] as String? ?? 'Report';
            final location = data['location'] as String? ?? '';
            return ListTile(
              leading: CircleAvatar(
                backgroundColor: Theme.of(context).colorScheme.primary,
                child:
                    const Icon(Icons.check, color: Colors.white, size: 16),
              ),
              title: Text(
                category,
                style: const TextStyle(fontWeight: FontWeight.w600),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              subtitle: Text(
                location,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              trailing: reportedAt != null
                  ? Text(
                      timeago.format(reportedAt),
                      style: const TextStyle(
                          fontSize: 11, color: Colors.grey),
                    )
                  : null,
            );
          },
        );
      },
    );
  }
}
