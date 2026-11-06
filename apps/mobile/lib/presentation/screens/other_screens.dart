import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../core/l10n/app_strings.dart';
import '../state/municipality_state.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/toast_utils.dart';
import '../../core/utils/color_utils.dart';
import '../../data/services/notification_feed.dart';
import 'dart:async';

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

  List<Map<String, String>> get _faqs => [
    {'q': AppStrings.get('faq1q'), 'a': AppStrings.get('faq1a')},
    {'q': AppStrings.get('faq2q'), 'a': AppStrings.get('faq2a')},
    {'q': AppStrings.get('faq3q'), 'a': AppStrings.get('faq3a')},
    {'q': AppStrings.get('faq4q'), 'a': AppStrings.get('faq4a')},
    {'q': AppStrings.get('faq5q'), 'a': AppStrings.get('faq5a')},
    {'q': AppStrings.get('faq6q'), 'a': AppStrings.get('faq6a')},
    {'q': AppStrings.get('faq7q'), 'a': AppStrings.get('faq7a')},
    {'q': AppStrings.get('faq8q'), 'a': AppStrings.get('faq8a')},
    {'q': AppStrings.get('faq9q'), 'a': AppStrings.get('faq9a')},
    {'q': AppStrings.get('faq10q'), 'a': AppStrings.get('faq10a')},
    {'q': AppStrings.get('faq11q'), 'a': AppStrings.get('faq11a')},
    {'q': AppStrings.get('faq12q'), 'a': AppStrings.get('faq12a')},
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
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: lguColor,
        foregroundColor: ColorUtils.readableTextOn(lguColor),
        title: Text(
          AppStrings.get('faqTitle'),
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        elevation: 0,
      ),
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: AppConstants.kContentMaxWidth),
          child: SingleChildScrollView(
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
                  Text(
                    AppStrings.get('howCanWeHelp'),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    AppStrings.get('findAnswers'),
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
                AppStrings.get('contactUs'),
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
                color: Theme.of(context).cardColor,
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
                          color: Theme.of(context).dividerColor,
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
                AppStrings.get('faqHeader'),
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
                color: Theme.of(context).cardColor,
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
                                        : Theme.of(context).colorScheme.onSurface,
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
                          color: Theme.of(context).dividerColor,
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
          ),
        ),
    );
  }
}
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  StreamSubscription<List<FeedItem>>? _sub;
  List<FeedItem>? _items;
  // Items newer than this were unread when the inbox opened → highlighted.
  DateTime _prevSeen = DateTime.fromMillisecondsSinceEpoch(0);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    _prevSeen = await getLastSeen();
    await markFeedSeen(); // opening the inbox clears the bell badge
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) {
      if (mounted) setState(() => _items = const []);
      return;
    }
    _sub = notificationFeedStream(
      uid,
      oneVizcayaState.selectedMunicipality.value,
    ).listen((items) {
      if (mounted) setState(() => _items = items);
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  String _formatTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return AppStrings.get('justNow');
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.month}/${dt.day}/${dt.year}';
  }

  ({IconData icon, Color color}) _visual(FeedItem item, Color accent) {
    if (item.type == FeedType.broadcast) {
      return item.urgent
          ? (icon: Icons.warning_amber_rounded, color: const Color(0xFFD32F2F))
          : (icon: Icons.podcasts_rounded, color: accent);
    }
    if (item.type == FeedType.announcement) {
      return item.urgent
          ? (icon: Icons.warning_amber_rounded, color: const Color(0xFFD32F2F))
          : (icon: Icons.campaign_outlined, color: accent);
    }
    switch (item.status) {
      case 'solved':
      case 'success':
        return (icon: Icons.check_circle, color: const Color(0xFF2E7D32));
      case 'ongoing':
        return (icon: Icons.construction, color: const Color(0xFFE65100));
      case 'urgent':
        return (icon: Icons.warning_amber_rounded, color: const Color(0xFF8B0000));
      case 'info':
        return (icon: Icons.send, color: const Color(0xFF1565C0));
      default:
        return (icon: Icons.flag, color: const Color(0xFF1565C0));
    }
  }

  void _openItem(FeedItem item) {
    if (item.type == FeedType.report &&
        item.reportId != null &&
        item.reportId!.isNotEmpty) {
      Navigator.of(context)
          .pushNamed('/status', arguments: {'reportId': item.reportId});
    } else if (item.type == FeedType.announcement) {
      Navigator.of(context).pushNamed('/announcements');
    } else if (item.type == FeedType.broadcast) {
      _showBroadcast(item);
    }
  }

  // A broadcast is re-read in full here (P2): the push may have been missed,
  // dismissed or cut short by the notification tray.
  void _showBroadcast(FeedItem item) {
    final red = Theme.of(context).colorScheme.error;
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              AppStrings.get(item.urgent ? 'broadcastAlertUrgent' : 'broadcastAlert'),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: item.urgent ? red : Theme.of(ctx).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 4),
            Text(item.title),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              SelectableText(item.body),
              const SizedBox(height: 12),
              Text(_formatTime(item.time),
                  style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(ctx).colorScheme.onSurfaceVariant)),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(AppStrings.get('ok')),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final lguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final accent = ColorUtils.readableAccentOf(context, lguColor);
    final user = FirebaseAuth.instance.currentUser;
    final items = _items;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: lguColor,
        foregroundColor: ColorUtils.readableTextOn(lguColor),
        title: Text(AppStrings.get('notificationsTitle')),
      ),
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints:
              const BoxConstraints(maxWidth: AppConstants.kContentMaxWidth),
          child: user == null
              ? Center(child: Text(AppStrings.get('loginForNotifications')))
              : items == null
                  ? const Center(child: CircularProgressIndicator())
                  : items.isEmpty
                      ? _empty()
                      : ListView.separated(
                          padding: const EdgeInsets.symmetric(
                              vertical: 12, horizontal: 16),
                          itemCount: items.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 8),
                          itemBuilder: (context, i) => _tile(items[i], accent),
                        ),
        ),
      ),
    );
  }

  Widget _empty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.notifications_none,
              size: 64,
              color: Colors.grey.shade300,
              semanticLabel: 'No notifications'),
          const SizedBox(height: 16),
          Text(AppStrings.get('allCaughtUp'),
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w500,
                  color: Colors.grey.shade600)),
          const SizedBox(height: 8),
          Text(AppStrings.get('notifyWhenChanged'),
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.grey.shade400)),
        ],
      ),
    );
  }

  Widget _tile(FeedItem item, Color accent) {
    final unread = item.time.isAfter(_prevSeen);
    final v = _visual(item, accent);
    return Container(
      decoration: BoxDecoration(
        color: unread
            ? accent.withValues(alpha: 0.06)
            : Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: unread
              ? accent.withValues(alpha: 0.25)
              : Theme.of(context).dividerColor,
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: v.color.withValues(alpha: 0.15),
          child: Icon(v.icon, color: v.color, size: 20),
        ),
        title: Row(
          children: [
            if (item.type == FeedType.announcement)
              Padding(
                padding: const EdgeInsets.only(right: 6),
                child: Icon(Icons.campaign, size: 13, color: accent),
              ),
            Expanded(
              child: Text(
                item.title,
                style: TextStyle(
                  fontWeight: unread ? FontWeight.w700 : FontWeight.normal,
                  fontSize: 14,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(item.body,
                style: const TextStyle(fontSize: 13),
                maxLines: 3,
                overflow: TextOverflow.ellipsis),
            const SizedBox(height: 4),
            Text(_formatTime(item.time),
                style: const TextStyle(fontSize: 11, color: Colors.grey)),
          ],
        ),
        trailing: unread
            ? Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
              )
            : const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
        onTap: () => _openItem(item),
      ),
    );
  }
}
