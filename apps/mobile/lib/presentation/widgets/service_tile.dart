import 'package:flutter/material.dart';

import '../../core/utils/color_utils.dart';

/// How loudly a service tile speaks. Colour carries meaning here: the town's
/// own colour marks the one main action, red marks emergency only, and every
/// other tile stays neutral, so the SOS card and the Report tile are what the
/// eye finds first. (A town tint for "My Reports" was tried and dropped: in
/// the red towns, Bambang, Alfonso Castañeda and Dupax del Sur, it looked like
/// the emergency tile.)
enum ServiceTileTone {
  /// Solid town colour: the one main action (Report a Problem).
  primary,

  /// Soft red tint: emergency contacts, quieter than the solid SOS card.
  emergency,

  /// White tile with a hairline border and a town-coloured icon.
  neutral,
}

class ServiceTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final ServiceTileTone tone;
  final Color accent;
  final VoidCallback onTap;
  final double iconContainerSize;

  const ServiceTile({
    super.key,
    required this.icon,
    required this.label,
    required this.tone,
    required this.accent,
    required this.onTap,
    this.iconContainerSize = 52.0,
  });

  static const _emergencyRed = Color(0xFFC62828);
  static const _hairline = Color(0xFFE2E7E1);

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final surface = dark ? Theme.of(context).colorScheme.surface : Colors.white;
    final hue = tone == ServiceTileTone.emergency ? _emergencyRed : accent;
    final Color fill, iconColor, border;
    switch (tone) {
      case ServiceTileTone.primary:
        // Darkened only as far as a white icon needs (Villaverde, Kasibu).
        fill = ColorUtils.textSafeAccent(hue, Colors.white);
        iconColor = Colors.white;
        border = fill;
      case ServiceTileTone.emergency:
        fill = Color.alphaBlend(
          hue.withValues(alpha: dark ? 0.22 : 0.10),
          surface,
        );
        // Stays a true red in dark mode: this one is meant to read as alarm.
        iconColor = ColorUtils.textSafeAccent(hue, fill, darkSaturation: 1);
        border = iconColor.withValues(alpha: 0.28);
      case ServiceTileTone.neutral:
        fill = surface;
        iconColor = ColorUtils.textSafeAccent(hue, surface);
        border = dark ? Colors.white.withValues(alpha: 0.12) : _hairline;
    }

    // Ripple feedback and button semantics (the visible label is read as
    // its name).
    return Semantics(
      button: true,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 92),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: iconContainerSize,
                  height: iconContainerSize,
                  decoration: BoxDecoration(
                    color: fill,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: border),
                  ),
                  child: ExcludeSemantics(
                    child: Icon(
                      icon,
                      color: iconColor,
                      size: iconContainerSize * 0.46,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  label,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Theme.of(context).textTheme.bodySmall?.color,
                    height: 1.2,
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
