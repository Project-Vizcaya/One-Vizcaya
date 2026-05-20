import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../state/municipality_state.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/toast_utils.dart';

class OtherScreens extends StatelessWidget {
  const OtherScreens({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: Text('Other Screens')));
  }
}

// ═══════════════════════════════════════════
// SUPPORT & FAQs SCREEN
// ═══════════════════════════════════════════

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  int? _expandedIndex;

  static const List<Map<String, String>> _faqs = [
    {
      'q': 'How do I submit a report?',
      'a':
          'Tap "Report Problem" on the home screen. Select a category, describe the issue, attach a photo if available, and tap "Submit Report". Your report will be routed to your selected municipality\'s LGU automatically.',
    },
    {
      'q': 'How long does it take for my report to be resolved?',
      'a':
          'Resolution time depends on the severity and type of issue. Critical and High priority reports are typically addressed within 24–72 hours. Medium and Low priority reports may take up to 7 days. You can track status in "My Reports".',
    },
    {
      'q': 'Can I report issues from a different municipality?',
      'a':
          'Yes! Tap your municipality name at the top of the home screen to switch to a different municipality before submitting your report.',
    },
    {
      'q': 'What types of issues can I report?',
      'a':
          'You can report: Road & Infrastructure damage, Flooding & Drainage issues, Public Safety concerns, Environmental violations, Public Health hazards, and Disaster & Risk Management situations.',
    },
    {
      'q': 'Is my personal information safe?',
      'a':
          'Yes. One Vizcaya complies with Republic Act No. 10173 (Data Privacy Act of 2012). We only collect your phone number and municipality. Your data is encrypted using Google Firebase\'s enterprise-grade security and is never sold to third parties.',
    },
    {
      'q': 'Why was my SMS verification blocked?',
      'a':
          'Firebase automatically blocks devices that request too many OTPs in a short period. Please wait 24 hours before trying again. This is a security measure to prevent spam.',
    },
    {
      'q': 'Can I delete my account?',
      'a':
          'Yes. Under RA 10173, you have the right to request account deletion. Contact the LGU administrator or the PDRRMO Nueva Vizcaya at 09178500670 to process your deletion request within 30 days.',
    },
    {
      'q': 'Why does the weather show "Offline Fallback Data"?',
      'a':
          'This appears when the app cannot access your GPS location or the weather service is temporarily unavailable. Tap the refresh icon on the weather widget to retry, or ensure location permissions are enabled in your phone settings.',
    },
    {
      'q': 'What is the National Emergency Hotline?',
      'a':
          'The National Emergency Hotline is 911. For Nueva Vizcaya-specific emergencies, contact PDRRMO at 09178500670. You can find all local emergency numbers in the "Emergency Contacts" section.',
    },
    {
      'q': 'How do I update my municipality selection?',
      'a':
          'On the home screen, tap your municipality name at the top left to open the municipality picker. Select your new municipality and it will take effect immediately.',
    },
  ];

  static const List<Map<String, dynamic>> _contactOptions = [
    {
      'icon': Icons.phone,
      'label': 'PDRRMO Nueva Vizcaya',
      'value': '09178500670',
      'type': 'phone',
      'color': Color(0xFF2E7D32),
    },
    {
      'icon': Icons.email,
      'label': 'Provincial Email',
      'value': 'pdrrmonuevavizcaya@gmail.com',
      'type': 'email',
      'color': Color(0xFF1565C0),
    },
    {
      'icon': Icons.language,
      'label': 'Official Website',
      'value': 'https://nuevavizcaya.gov.ph',
      'type': 'url',
      'color': Color(0xFF00796B),
    },
  ];

  Future<void> _launchContact(String type, String value) async {
    Uri uri;
    switch (type) {
      case 'phone':
        uri = Uri(scheme: 'tel', path: value);
        break;
      case 'email':
        uri = Uri(scheme: 'mailto', path: value);
        break;
      case 'url':
        uri = Uri.parse(value);
        break;
      default:
        return;
    }
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        ToastUtils.showError('Could not open $value');
      }
    } catch (e) {
      ToastUtils.showError('Failed to open: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final lguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final municipality = oneVizcayaState.selectedMunicipality.value;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F7),
      appBar: AppBar(
        backgroundColor: lguColor,
        foregroundColor: Colors.white,
        title: const Text(
          'Support & FAQs',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Header Banner ──
            Container(
              color: lguColor,
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      municipality,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'How can we help?',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Find answers to common questions below.',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),

            // ── Contact Us Section ──
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
              child: Text(
                'CONTACT US',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey.shade500,
                  letterSpacing: 1.2,
                ),
              ),
            ),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                children: List.generate(_contactOptions.length, (i) {
                  final item = _contactOptions[i];
                  final isLast = i == _contactOptions.length - 1;
                  return Column(
                    children: [
                      ListTile(
                        leading: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: (item['color'] as Color).withValues(
                              alpha: 0.1,
                            ),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            item['icon'] as IconData,
                            color: item['color'] as Color,
                            size: 20,
                          ),
                        ),
                        title: Text(
                          item['label'] as String,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                        subtitle: Text(
                          item['value'] as String,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        trailing: ExcludeSemantics(
                          child: Icon(
                            Icons.arrow_forward_ios,
                            size: 14,
                            color: Colors.grey.shade400,
                          ),
                        ),
                        onTap: () => _launchContact(
                          item['type'] as String,
                          item['value'] as String,
                        ),
                      ),
                      if (!isLast)
                        Divider(
                          height: 1,
                          indent: 68,
                          color: Colors.grey.shade100,
                        ),
                    ],
                  );
                }),
              ),
            ),

            // ── FAQ Section ──
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
              child: Text(
                'FREQUENTLY ASKED QUESTIONS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey.shade500,
                  letterSpacing: 1.2,
                ),
              ),
            ),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                children: List.generate(_faqs.length, (i) {
                  final faq = _faqs[i];
                  final isExpanded = _expandedIndex == i;
                  final isLast = i == _faqs.length - 1;

                  return Column(
                    children: [
                      InkWell(
                        onTap: () => setState(() {
                          _expandedIndex = isExpanded ? null : i;
                        }),
                        borderRadius: BorderRadius.vertical(
                          top: i == 0 ? const Radius.circular(16) : Radius.zero,
                          bottom: isLast
                              ? const Radius.circular(16)
                              : Radius.zero,
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 14,
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  color: isExpanded
                                      ? lguColor
                                      : lguColor.withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: ExcludeSemantics(
                                  child: Icon(
                                    isExpanded ? Icons.remove : Icons.add,
                                    size: 14,
                                    color: isExpanded ? Colors.white : lguColor,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  faq['q']!,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                    color: isExpanded
                                        ? lguColor
                                        : const Color(0xFF333333),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      AnimatedCrossFade(
                        firstChild: const SizedBox.shrink(),
                        secondChild: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.fromLTRB(52, 0, 16, 14),
                          child: Text(
                            faq['a']!,
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade600,
                              height: 1.6,
                            ),
                          ),
                        ),
                        crossFadeState: isExpanded
                            ? CrossFadeState.showSecond
                            : CrossFadeState.showFirst,
                        duration: const Duration(milliseconds: 200),
                      ),
                      if (!isLast)
                        Divider(
                          height: 1,
                          indent: 52,
                          color: Colors.grey.shade100,
                        ),
                    ],
                  );
                }),
              ),
            ),

            // ── Footer ──
            Padding(
              padding: EdgeInsets.fromLTRB(24, 16, 24, MediaQuery.of(context).padding.bottom + 48),
              child: Column(
                children: [
                  const Divider(),
                  const SizedBox(height: 12),
                  Text(
                    'One Vizcaya v${AppConstants.appVersion}',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade600,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Developed by Aaron Anthony A. Gano II\nNueva Vizcaya State University',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade500,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'In compliance with RA 10173 (Data Privacy Act of 2012)',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey.shade400,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AnnouncementsScreen extends StatelessWidget {
  const AnnouncementsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final lguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final municipality = oneVizcayaState.selectedMunicipality.value;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: lguColor,
        foregroundColor: Colors.white,
        title: const Text('Announcements'),
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance
            .collection('announcements')
            .where('municipality', whereIn: [municipality, 'All'])
            .orderBy('timestamp', descending: true)
            .snapshots(),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return const Center(child: Text('Failed to load announcements.'));
          }
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final docs = snapshot.data?.docs ?? [];
          if (docs.isEmpty) {
            return const Center(
              child: Text(
                'No announcements yet.',
                style: TextStyle(color: Colors.grey),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: docs.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final data = docs[index].data() as Map<String, dynamic>;
              final title = data['title'] as String? ?? '';
              final body = data['body'] as String? ?? '';
              final isUrgent = data['isUrgent'] as bool? ?? false;
              final postedBy = data['postedBy'] as String? ?? '';
              final ts = data['timestamp'];
              String dateStr = '';
              if (ts is Timestamp) {
                final dt = ts.toDate().toLocal();
                dateStr =
                    '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
              }

              return Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isUrgent ? Colors.red.shade50 : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: isUrgent
                      ? Border.all(color: Colors.red, width: 1.5)
                      : Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (isUrgent) ...[
                          const Icon(Icons.warning_amber_rounded,
                              color: Colors.red, size: 16),
                          const SizedBox(width: 6),
                        ],
                        Expanded(
                          child: Text(
                            title,
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                        ),
                        if (dateStr.isNotEmpty)
                          Text(dateStr,
                              style: const TextStyle(
                                  fontSize: 11, color: Colors.grey)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(body,
                        style: const TextStyle(fontSize: 14, height: 1.4)),
                    if (postedBy.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        '— $postedBy',
                        style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade500,
                            fontStyle: FontStyle.italic),
                      ),
                    ],
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  String _formatTime(dynamic ts) {
    if (ts == null) return '';
    final dt = ts is Timestamp ? ts.toDate() : DateTime.now();
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.month}/${dt.day}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final lguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final user = FirebaseAuth.instance.currentUser;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: lguColor,
        foregroundColor: Colors.white,
        title: const Text('Notifications'),
      ),
      body: user == null
          ? const Center(child: Text('Please log in to see notifications.'))
          : StreamBuilder<QuerySnapshot>(
              stream: FirebaseFirestore.instance
                  .collection('users')
                  .doc(user.uid)
                  .collection('notifications')
                  .orderBy('timestamp', descending: true)
                  .limit(50)
                  .snapshots(),
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final docs = snap.data?.docs ?? [];
                if (docs.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.notifications_none,
                            size: 64, color: Colors.grey.shade300, semanticLabel: 'No notifications'),
                        const SizedBox(height: 16),
                        const Text('No notifications yet.',
                            style: TextStyle(color: Colors.grey)),
                      ],
                    ),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.symmetric(
                      vertical: 12, horizontal: 16),
                  itemCount: docs.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final data = docs[i].data() as Map<String, dynamic>;
                    final isRead = data['read'] == true;
                    final statusColors = {
                      'solved': const Color(0xFF2E7D32),
                      'ongoing': const Color(0xFFE65100),
                      'reported': const Color(0xFF1565C0),
                    };
                    final statusColor =
                        statusColors[data['status']] ?? lguColor;
                    return Container(
                      decoration: BoxDecoration(
                        color: isRead
                            ? Colors.white
                            : lguColor.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isRead
                              ? Colors.grey.shade200
                              : lguColor.withOpacity(0.25),
                        ),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        leading: CircleAvatar(
                          backgroundColor: statusColor.withOpacity(0.15),
                          child: Icon(
                            data['status'] == 'solved'
                                ? Icons.check_circle
                                : data['status'] == 'ongoing'
                                    ? Icons.construction
                                    : Icons.flag,
                            color: statusColor,
                            size: 20,
                            semanticLabel: data['status'] == 'solved'
                                ? 'Solved'
                                : data['status'] == 'ongoing'
                                    ? 'Ongoing'
                                    : 'Reported',
                          ),
                        ),
                        title: Text(
                          data['title'] ?? 'Update',
                          style: TextStyle(
                            fontWeight: isRead
                                ? FontWeight.normal
                                : FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            Text(data['body'] ?? '',
                                style: const TextStyle(fontSize: 13)),
                            const SizedBox(height: 4),
                            Text(
                              _formatTime(data['timestamp']),
                              style: const TextStyle(
                                  fontSize: 11, color: Colors.grey),
                            ),
                          ],
                        ),
                        trailing: !isRead
                            ? Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                    color: lguColor,
                                    shape: BoxShape.circle),
                              )
                            : null,
                        onTap: () {
                          if (!isRead) {
                            docs[i].reference.update({'read': true});
                          }
                        },
                      ),
                    );
                  },
                );
              },
            ),
    );
  }
}
