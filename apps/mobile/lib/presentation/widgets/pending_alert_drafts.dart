import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../core/utils/callable.dart';
import '../../core/utils/toast_utils.dart';

/// Alerts awaiting a human decision (PDRRMO §2, P3 mobile approval):
/// automated weather drafts, and urgent or province-wide alerts proposed by
/// an admin, which need a SECOND admin. Mirrors the web console's
/// PendingAlertsCard. Decisions go through the decideAlertDraft Cloud
/// Function, which re-checks role, town, expiry and that the approver is not
/// the proposer, then sends and audits.
///
/// [municipality] null = province-wide view (provincial admins).
class PendingAlertDraftsBanner extends StatelessWidget {
  final String? municipality;
  const PendingAlertDraftsBanner({super.key, required this.municipality});

  Query<Map<String, dynamic>> get _query {
    final q = FirebaseFirestore.instance
        .collection('alert_drafts')
        .where('status', isEqualTo: 'pending');
    // Scoped to a town -> only that town's drafts; this is also what the
    // rules allow a municipal admin to query.
    return municipality == null ? q : q.where('municipality', isEqualTo: municipality);
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: _query.snapshots(),
      builder: (context, snap) {
        final docs = snap.data?.docs ?? const [];
        if (docs.isEmpty) return const SizedBox.shrink();
        final urgent = docs.any((d) => d.data()['urgent'] == true);
        final color = urgent ? const Color(0xFFB71C1C) : const Color(0xFF8D6E00);
        return Semantics(
          button: true,
          label: '${docs.length} alerts awaiting approval. Review.',
          excludeSemantics: true,
          child: Material(
            color: color.withValues(alpha: 0.12),
            child: InkWell(
              onTap: () => showModalBottomSheet<void>(
                context: context,
                isScrollControlled: true,
                useSafeArea: true,
                builder: (_) => _DraftsSheet(query: _query),
              ),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 48),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: Row(
                    children: [
                      Icon(Icons.pending_actions_rounded, color: color),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          '${docs.length} alert${docs.length == 1 ? '' : 's'} awaiting approval'
                          '${urgent ? ' · includes URGENT' : ''}',
                          style: TextStyle(fontWeight: FontWeight.w700, color: color),
                        ),
                      ),
                      Text('Review', style: TextStyle(color: color, fontWeight: FontWeight.w600)),
                      Icon(Icons.chevron_right, color: color),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _DraftsSheet extends StatelessWidget {
  final Query<Map<String, dynamic>> query;
  const _DraftsSheet({required this.query});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      builder: (context, controller) => StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
        stream: query.snapshots(),
        builder: (context, snap) {
          final docs = [...(snap.data?.docs ?? const <QueryDocumentSnapshot<Map<String, dynamic>>>[])]
            ..sort((a, b) {
              final ta = (a.data()['createdAt'] as Timestamp?)?.millisecondsSinceEpoch ?? 0;
              final tb = (b.data()['createdAt'] as Timestamp?)?.millisecondsSinceEpoch ?? 0;
              return tb.compareTo(ta);
            });
          return ListView(
            controller: controller,
            padding: const EdgeInsets.all(16),
            children: [
              const Text('Alerts awaiting approval',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(
                'None is sent to the public until approved. Check PAGASA advisories before approving a weather alert.',
                style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 12),
              if (docs.isEmpty) const Text('Nothing is waiting.'),
              for (final d in docs) _DraftCard(id: d.id, data: d.data()),
            ],
          );
        },
      ),
    );
  }
}

class _DraftCard extends StatefulWidget {
  final String id;
  final Map<String, dynamic> data;
  const _DraftCard({required this.id, required this.data});

  @override
  State<_DraftCard> createState() => _DraftCardState();
}

class _DraftCardState extends State<_DraftCard> {
  bool _busy = false;

  Future<void> _decide(String decision, {String? note}) async {
    setState(() => _busy = true);
    try {
      await callFunction('decideAlertDraft', {
        'draftId': widget.id,
        'decision': decision,
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      });
      ToastUtils.showSuccess(decision == 'approve'
          ? 'Alert approved and sent'
          : 'Alert not sent');
    } on CallableException catch (e) {
      ToastUtils.showError(e.message);
    } catch (e) {
      ToastUtils.showError('Could not complete: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirmApprove(String where, bool urgent) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Send this alert?'),
        content: Text('This sends a push notification to every user in $where'
            '${urgent ? ' as an URGENT alert (sound and full-screen)' : ''}.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Confirm and send')),
        ],
      ),
    );
    if (ok == true) await _decide('approve');
  }

  Future<void> _reject(bool mine) async {
    final controller = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(mine ? 'Withdraw this alert?' : 'Reject this alert?'),
        content: TextField(
          controller: controller,
          maxLength: 500,
          decoration: const InputDecoration(
              labelText: 'Why (optional, recorded in the audit log)'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(mine ? 'Withdraw' : 'Reject')),
        ],
      ),
    );
    final note = controller.text;
    controller.dispose();
    if (ok == true) await _decide('reject', note: note);
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.data;
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    final urgent = d['urgent'] == true;
    final town = (d['municipality'] as String?) ?? '';
    final where = town.isEmpty ? 'the province' : town;
    final expires = (d['expiresAt'] as Timestamp?)?.toDate();
    final expired = expires != null && expires.isBefore(DateTime.now());
    final requestedBy = d['requestedBy'] as String?;
    final mine = requestedBy != null && requestedBy == FirebaseAuth.instance.currentUser?.uid;
    final provider = (d['evidence'] is Map) ? (d['evidence'] as Map)['provider'] as String? : null;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: urgent ? const Color(0xFFE57373) : Theme.of(context).dividerColor),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(spacing: 6, runSpacing: 6, children: [
              if (urgent) _chip('URGENT', const Color(0xFFB71C1C)),
              _chip(town.isEmpty ? 'Province-wide' : town, muted),
              if (d['source'] is String) _chip(d['source'] as String, muted),
              if (expired) _chip('Expired', muted),
            ]),
            const SizedBox(height: 8),
            Text('${d['title'] ?? ''}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text('${d['body'] ?? ''}', style: const TextStyle(fontSize: 14)),
            const SizedBox(height: 6),
            Text(
              [
                if (requestedBy != null)
                  'Proposed by ${mine ? 'you' : (d['requestedByName'] as String?) ?? 'another admin'}.',
                if (provider != null) 'Based on $provider forecast data (third-party, not PAGASA).',
                if (expires != null && !expired) 'Expires ${_fmt(expires)}.',
              ].join(' '),
              style: TextStyle(fontSize: 12, color: muted),
            ),
            const SizedBox(height: 8),
            if (_busy)
              const Padding(
                padding: EdgeInsets.all(8),
                child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
              )
            else
              Wrap(spacing: 8, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
                if (!expired && !mine)
                  FilledButton.icon(
                    style: FilledButton.styleFrom(minimumSize: const Size(0, 48)),
                    onPressed: () => _confirmApprove(where, urgent),
                    icon: const Icon(Icons.check),
                    label: const Text('Approve…'),
                  ),
                if (mine && !expired)
                  Text('Waiting for another admin to approve.', style: TextStyle(fontSize: 12, color: muted)),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(minimumSize: const Size(0, 48)),
                  onPressed: () => _reject(mine),
                  icon: const Icon(Icons.close),
                  label: Text(expired ? 'Dismiss' : mine ? 'Withdraw' : 'Reject'),
                ),
              ]),
          ],
        ),
      ),
    );
  }

  static String _fmt(DateTime t) {
    final h = t.hour % 12 == 0 ? 12 : t.hour % 12;
    return '${t.month}/${t.day} $h:${t.minute.toString().padLeft(2, '0')} ${t.hour < 12 ? 'AM' : 'PM'}';
  }

  Widget _chip(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.6)),
        ),
        child: Text(text, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
      );
}
