import 'dart:async';
import 'package:flutter/material.dart';

/// A professional top heads-up banner used for ALL in-app notifications
/// (report updates, announcements, normal broadcasts). It slides down from the
/// top, can be swiped up or tapped to dismiss, optionally opens a target screen
/// on tap, and auto-dismisses after a few seconds. Replaces the old plain green
/// bottom toast, which PDRRMO staff found easy to miss.
class InAppNotifier {
  const InAppNotifier._();

  static void show({
    required GlobalKey<NavigatorState> navigatorKey,
    required String label,
    required String title,
    required String body,
    IconData icon = Icons.notifications_active_rounded,
    Color accent = const Color(0xFF1B5E20),
    DateTime? timestamp,
    VoidCallback? onTap,
  }) {
    final navState = navigatorKey.currentState;
    if (navState == null) return;
    final overlay = navState.overlay;
    if (overlay == null) return;

    OverlayEntry? entry;
    var removed = false;
    void remove() {
      if (removed) return;
      removed = true;
      entry?.remove();
    }

    entry = OverlayEntry(
      builder: (_) => _HeadsUpBanner(
        label: label,
        title: title,
        body: body,
        icon: icon,
        accent: accent,
        timestamp: timestamp,
        onTap: onTap,
        onDismiss: remove,
      ),
    );
    overlay.insert(entry);
  }
}

/// Presents incoming broadcasts to citizens with a presentation that matches the
/// broadcast's severity:
///   • urgent  → a full-screen takeover alert that must be acknowledged
///   • normal  → the professional heads-up banner (via [InAppNotifier])
///
/// Driven from NotificationService's Firestore broadcast listener, which has the
/// full document (including the `urgent` flag) while the app is in the foreground.
class BroadcastPresenter {
  const BroadcastPresenter._();

  static void present({
    required GlobalKey<NavigatorState> navigatorKey,
    required bool urgent,
    required String title,
    required String body,
    DateTime? timestamp,
  }) {
    if (urgent) {
      final navState = navigatorKey.currentState;
      if (navState == null) return;
      navState.push(
        MaterialPageRoute<void>(
          fullscreenDialog: true,
          builder: (_) => UrgentBroadcastScreen(
            title: title,
            body: body,
            timestamp: timestamp,
          ),
        ),
      );
      return;
    }

    InAppNotifier.show(
      navigatorKey: navigatorKey,
      label: 'ANNOUNCEMENT',
      title: title,
      body: body,
      icon: Icons.campaign_rounded,
      accent: const Color(0xFF1B5E20),
      timestamp: timestamp,
    );
  }
}

String _formatTime(DateTime t) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  final h = t.hour % 12 == 0 ? 12 : t.hour % 12;
  final ampm = t.hour < 12 ? 'AM' : 'PM';
  final m = t.minute.toString().padLeft(2, '0');
  return '${months[t.month - 1]} ${t.day}, $h:$m $ampm';
}

/// Full-screen, high-severity alert. Requires an explicit acknowledgement so an
/// urgent provincial advisory can't be swiped away by accident.
class UrgentBroadcastScreen extends StatelessWidget {
  const UrgentBroadcastScreen({
    super.key,
    required this.title,
    required this.body,
    this.timestamp,
  });

  final String title;
  final String body;
  final DateTime? timestamp;

  @override
  Widget build(BuildContext context) {
    const deepRed = Color(0xFF8B0000);
    return PopScope(
      // Block the system back gesture — the user must tap "I Understand".
      canPop: false,
      child: Scaffold(
        backgroundColor: deepRed,
        body: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 24),
                      Center(
                        child: Container(
                          width: 92,
                          height: 92,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.warning_amber_rounded,
                            color: Colors.white,
                            size: 54,
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      const Center(
                        child: Text(
                          'URGENT ALERT',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 3,
                          ),
                        ),
                      ),
                      const SizedBox(height: 28),
                      Container(
                        padding: const EdgeInsets.all(22),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1A1A1A),
                                height: 1.2,
                              ),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              body,
                              style: const TextStyle(
                                fontSize: 16,
                                height: 1.55,
                                color: Color(0xFF333333),
                              ),
                            ),
                            const SizedBox(height: 22),
                            const Divider(height: 1),
                            const SizedBox(height: 14),
                            Row(
                              children: [
                                const Icon(Icons.account_balance,
                                    size: 16, color: deepRed),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Provincial Government of Nueva Vizcaya',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[700],
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (timestamp != null) ...[
                              const SizedBox(height: 6),
                              Padding(
                                padding: const EdgeInsets.only(left: 24),
                                child: Text(
                                  _formatTime(timestamp!),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: deepRed,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text(
                      'I UNDERSTAND',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Non-urgent heads-up banner: a clean card that slides down from the top,
/// can be swiped up or tapped, and auto-dismisses after a few seconds.
class _HeadsUpBanner extends StatefulWidget {
  const _HeadsUpBanner({
    required this.label,
    required this.title,
    required this.body,
    required this.icon,
    required this.accent,
    required this.onDismiss,
    this.timestamp,
    this.onTap,
  });

  final String label;
  final String title;
  final String body;
  final IconData icon;
  final Color accent;
  final DateTime? timestamp;
  final VoidCallback? onTap;
  final VoidCallback onDismiss;

  @override
  State<_HeadsUpBanner> createState() => _HeadsUpBannerState();
}

class _HeadsUpBannerState extends State<_HeadsUpBanner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<Offset> _slide;
  Timer? _timer;
  bool _dismissed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _slide = Tween<Offset>(
      begin: const Offset(0, -1.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
    _controller.forward();
    _timer = Timer(const Duration(seconds: 6), _dismiss);
  }

  Future<void> _dismiss() async {
    if (_dismissed) return;
    _dismissed = true;
    _timer?.cancel();
    if (mounted) {
      await _controller.reverse();
    }
    widget.onDismiss();
  }

  void _handleTap() {
    final onTap = widget.onTap;
    _timer?.cancel();
    // Dismiss immediately then run the action (e.g. navigate to the report).
    _dismissed = true;
    widget.onDismiss();
    if (onTap != null) onTap();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SlideTransition(
        position: _slide,
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
            child: Dismissible(
              key: const ValueKey('in-app-heads-up'),
              direction: DismissDirection.up,
              onDismissed: (_) {
                _dismissed = true;
                _timer?.cancel();
                widget.onDismiss();
              },
              child: Material(
                elevation: 8,
                borderRadius: BorderRadius.circular(14),
                color: Theme.of(context).cardColor,
                child: InkWell(
                  onTap: widget.onTap != null ? _handleTap : null,
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      border: Border(
                        left: BorderSide(color: widget.accent, width: 4),
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: widget.accent.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(widget.icon, color: widget.accent, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      widget.label,
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 1.2,
                                        color: widget.accent,
                                      ),
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: _dismiss,
                                    child: Icon(Icons.close,
                                        size: 18, color: Colors.grey[500]),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 3),
                              Text(
                                widget.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                widget.body,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 13,
                                  height: 1.3,
                                  color: Colors.grey[700],
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
            ),
          ),
        ),
      ),
    );
  }
}
