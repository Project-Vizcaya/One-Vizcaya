import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:timeago/timeago.dart' as timeago;

class CommunityFeed extends StatelessWidget {
  final String municipality;
  const CommunityFeed({super.key, required this.municipality});

  @override
  Widget build(BuildContext context) {
    // Privacy (RA 10173): this used to list every solved report in the town,
    // which meant any signed-in user could read other residents' reports in
    // full, phone number and GPS included. It now shows only the signed-in
    // user's OWN resolved reports, and firestore.rules no longer let residents
    // read anyone else's. Filtered in code so no extra index is needed.
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return const SizedBox.shrink();
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('users')
          .doc(uid)
          .collection('reports')
          .orderBy('reportedAt', descending: true)
          .limit(50)
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
        if (!snapshot.hasData) return _empty();
        final docs = snapshot.data!.docs
            .where((d) => (d.data() as Map<String, dynamic>)['status'] == 'solved')
            .take(10)
            .toList();
        if (docs.isEmpty) return _empty();
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

  Widget _empty() {
    return Padding(
          padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.check_circle_outline,
                  size: 48, color: Colors.green.shade200),
              const SizedBox(height: 12),
              const Text(
                'None of your reports is resolved yet',
                style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey),
              ),
              const SizedBox(height: 6),
              Text(
                'Your reports appear here once they are marked as solved',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Colors.grey.shade400),
              ),
            ],
          ),
        );
  }
}
