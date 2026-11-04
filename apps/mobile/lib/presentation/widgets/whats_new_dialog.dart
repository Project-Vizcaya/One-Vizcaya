import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/app_constants.dart';
import '../../core/constants/whats_new.dart';

/// A mandatory "What's New" dialog shown once on the home page the first time a
/// citizen opens the app after updating to a new build. It lists what was added,
/// improved, or fixed so users know the update brought real changes.
///
/// Tracking: the last build for which the dialog was acknowledged is stored in
/// SharedPreferences. A fresh install is recorded silently (new users don't need
/// a changelog); only an actual version increase triggers the dialog.
class WhatsNewDialog extends StatelessWidget {
  final ReleaseNote note;
  final Color color;
  const WhatsNewDialog({super.key, required this.note, required this.color});

  static const _key = 'last_seen_whats_new_build';

  /// Call from the home screen (post-frame). Shows the dialog only when the
  /// installed build is newer than the last acknowledged one AND there are notes
  /// to show. Safe to call every time the home page builds.
  static Future<void> maybeShow(BuildContext context, Color color) async {
    final prefs = await SharedPreferences.getInstance();
    final current = AppConstants.buildNumber;
    final lastSeen = prefs.getInt(_key);

    // Fresh install: record the current build without showing a changelog.
    if (lastSeen == null) {
      await prefs.setInt(_key, current);
      return;
    }
    if (current <= lastSeen) return;

    final note = releaseNoteForBuild(current);
    if (note == null) {
      // Updated, but this build has no user-facing notes — record and move on.
      await prefs.setInt(_key, current);
      return;
    }

    if (!context.mounted) return;
    await showDialog<void>(
      context: context,
      barrierDismissible: false, // mandatory — must acknowledge
      builder: (_) => WhatsNewDialog(note: note, color: color),
    );
    await prefs.setInt(_key, current);
  }

  ({IconData icon, Color color, String label}) _style(ChangeType t) {
    switch (t) {
      case ChangeType.added:
        return (icon: Icons.add_circle, color: const Color(0xFF2E7D32), label: 'New');
      case ChangeType.improved:
        return (icon: Icons.trending_up, color: const Color(0xFF1565C0), label: 'Improved');
      case ChangeType.fixed:
        return (icon: Icons.build_circle, color: const Color(0xFFE65100), label: 'Fixed');
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      // Block the back gesture so it can only be dismissed via the button.
      canPop: false,
      child: Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(22, 22, 22, 18),
              decoration: BoxDecoration(
                color: color,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.auto_awesome, color: Colors.white, size: 24),
                      const SizedBox(width: 10),
                      const Text(
                        "What's New",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Version ${note.version} · ${note.date}',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),

            // Changes
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: note.changes.map((c) {
                    final s = _style(c.type);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(s.icon, size: 20, color: s.color),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  s.label.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 1,
                                    color: s.color,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  c.text,
                                  style: const TextStyle(fontSize: 14, height: 1.4),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),

            // Acknowledge
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 6, 20, 20),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: color,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text(
                    'Got it',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
