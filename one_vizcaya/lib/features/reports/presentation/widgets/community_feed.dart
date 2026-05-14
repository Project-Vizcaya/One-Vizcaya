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
          .where('status', isEqualTo: 'Resolved')
          .orderBy('timestamp', descending: true)
          .limit(10)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
          return const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'No resolved reports yet.',
              style: TextStyle(color: Colors.grey),
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
            final data = docs[index].data() as Map<String, dynamic>;
            final timestamp = (data['timestamp'] as Timestamp?)?.toDate();
            return ListTile(
              leading: CircleAvatar(
                backgroundColor: Theme.of(context).colorScheme.primary,
                child: const Icon(Icons.check, color: Colors.white, size: 16),
              ),
              title: Text(
                data['title'] ?? '',
                style: const TextStyle(fontWeight: FontWeight.w600),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              subtitle: Text(data['category'] ?? ''),
              trailing: timestamp != null
                  ? Text(
                      timeago.format(timestamp),
                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                    )
                  : null,
            );
          },
        );
      },
    );
  }
}
