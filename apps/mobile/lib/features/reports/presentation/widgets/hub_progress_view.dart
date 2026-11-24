import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/l10n/app_strings.dart';
import '../../../../core/utils/toast_utils.dart';
import '../../../../domain/models/hub_progress.dart';

/// The report's incident ID, selectable and copyable.
class IncidentIdLine extends StatelessWidget {
  final String incidentId;
  const IncidentIdLine({super.key, required this.incidentId});

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Row(
      children: [
        Text('${AppStrings.get('incidentIdLabel')}: ', style: TextStyle(fontSize: 12, color: muted)),
        Flexible(
          child: SelectableText(incidentId,
              style: const TextStyle(fontSize: 12.5, fontFamily: 'monospace', fontWeight: FontWeight.w600)),
        ),
        IconButton(
          tooltip: 'Copy incident ID',
          visualDensity: VisualDensity.compact,
          icon: const Icon(Icons.copy, size: 16),
          onPressed: () async {
            await Clipboard.setData(ClipboardData(text: incidentId));
            ToastUtils.showSuccess('Incident ID copied');
          },
        ),
      ],
    );
  }
}

/// The PDRRMO Command Hub's progress, for the reporter: the stage, a rounded
/// arrival time while on the way, and the agency. Never the responder's
/// position (docs/command-hub.md).
class HubProgressView extends StatelessWidget {
  final HubProgress hub;
  final Color accent;
  const HubProgressView({super.key, required this.hub, required this.accent});

  static String etaText(HubProgress h) => h.etaMin == 0
      ? AppStrings.get('hubEtaSoon')
      : AppStrings.get('hubEta').replaceAll('{lo}', '${h.etaMin}').replaceAll('{hi}', '${h.etaMax}');

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final muted = scheme.onSurfaceVariant;
    final current = hub.stageIndex;
    final done = hub.stage == 'resolved';
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: accent.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(Icons.local_shipping_outlined, size: 18, color: accent),
            const SizedBox(width: 6),
            Text(AppStrings.get('hubTitle'),
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: accent)),
          ]),
          const SizedBox(height: 10),
          for (var i = 0; i < HubProgress.stages.length; i++)
            _Step(
              label: AppStrings.get('hubStage_${HubProgress.stages[i]}'),
              state: i < current || (done && i == current) ? _StepState.done : i == current ? _StepState.now : _StepState.todo,
              last: i == HubProgress.stages.length - 1,
              accent: accent,
              muted: muted,
            ),
          if (hub.hasEta) ...[
            const SizedBox(height: 6),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(color: accent, borderRadius: BorderRadius.circular(10)),
              child: Row(children: [
                const Icon(Icons.schedule_rounded, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(etaText(hub),
                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
                ),
              ]),
            ),
          ],
          if (hub.agency != null) ...[
            const SizedBox(height: 8),
            Text('${AppStrings.get('hubAgency')}: ${hub.agency}',
                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
          ],
          if (current >= 2) ...[
            const SizedBox(height: 6),
            Text(AppStrings.get('hubPrivacyNote'), style: TextStyle(fontSize: 12.5, color: muted)),
          ],
        ],
      ),
    );
  }
}

enum _StepState { done, now, todo }

/// One stage in the vertical timeline: a marker, a connector line, the label.
class _Step extends StatelessWidget {
  final String label;
  final _StepState state;
  final bool last;
  final Color accent;
  final Color muted;
  const _Step({required this.label, required this.state, required this.last, required this.accent, required this.muted});

  @override
  Widget build(BuildContext context) {
    final reached = state != _StepState.todo;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 22,
            child: Column(children: [
              Container(
                width: 18,
                height: 18,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: state == _StepState.done ? accent : Colors.transparent,
                  border: Border.all(color: reached ? accent : muted.withValues(alpha: 0.45), width: 2),
                ),
                child: state == _StepState.done
                    ? const Icon(Icons.check, size: 12, color: Colors.white)
                    : state == _StepState.now
                        ? Center(child: Container(width: 8, height: 8, decoration: BoxDecoration(shape: BoxShape.circle, color: accent)))
                        : null,
              ),
              if (!last)
                Expanded(
                  child: Container(
                    width: 2,
                    margin: const EdgeInsets.symmetric(vertical: 2),
                    color: state == _StepState.done ? accent : muted.withValues(alpha: 0.3),
                  ),
                ),
            ]),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: last ? 0 : 12),
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  height: 1.2,
                  fontWeight: state == _StepState.now ? FontWeight.w800 : FontWeight.w500,
                  color: reached ? null : muted,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
