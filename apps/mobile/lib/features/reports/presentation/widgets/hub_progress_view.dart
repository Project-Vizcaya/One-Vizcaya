import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/l10n/app_strings.dart';
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
          tooltip: 'Copy',
          visualDensity: VisualDensity.compact,
          icon: const Icon(Icons.copy, size: 16),
          onPressed: () => Clipboard.setData(ClipboardData(text: incidentId)),
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
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    final current = hub.stageIndex;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: accent.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(AppStrings.get('hubTitle'),
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: accent)),
          const SizedBox(height: 8),
          for (var i = 0; i < HubProgress.stages.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(children: [
                Icon(
                  i < current ? Icons.check_circle : i == current ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                  size: 18,
                  color: i <= current ? accent : muted.withValues(alpha: 0.5),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    AppStrings.get('hubStage_${HubProgress.stages[i]}'),
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: i == current ? FontWeight.bold : FontWeight.normal,
                      color: i <= current ? null : muted,
                    ),
                  ),
                ),
              ]),
            ),
          if (hub.hasEta) ...[
            const SizedBox(height: 4),
            Text(etaText(hub), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          ],
          if (hub.agency != null) ...[
            const SizedBox(height: 4),
            Text('${AppStrings.get('hubAgency')}: ${hub.agency}', style: const TextStyle(fontSize: 13)),
          ],
          if (current >= 2) ...[
            const SizedBox(height: 6),
            Text(AppStrings.get('hubPrivacyNote'),
                style: TextStyle(fontSize: 11.5, fontStyle: FontStyle.italic, color: muted)),
          ],
        ],
      ),
    );
  }
}
