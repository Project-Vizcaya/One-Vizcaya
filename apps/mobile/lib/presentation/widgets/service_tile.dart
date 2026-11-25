import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_colors.dart';
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

class ServiceTile extends StatefulWidget {
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

  @override
  State<ServiceTile> createState() => _ServiceTileState();
}

/// Press feedback: the tile sinks and takes on a soft tint while the finger is
/// down (quick), then springs back slightly past its size on release (a
/// little slower), with a light haptic tick. With "remove animations" on,
/// only the tint changes.
class _ServiceTileState extends State<ServiceTile>
    with SingleTickerProviderStateMixin {
  // 0 = at rest, 1 = fully pressed; dips below 0 for the release bounce.
  late final AnimationController _press = AnimationController(
    vsync: this,
    lowerBound: -0.3,
    upperBound: 1,
    value: 0,
  );

  static const _pressIn = Duration(milliseconds: 90);
  static const _release = Duration(milliseconds: 380);

  // Read once per dependency change, not inside gesture callbacks: a tap can
  // be cancelled while the tile is being torn down (e.g. leaving the page).
  bool _still = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _still = MediaQuery.of(context).disableAnimations;
  }

  void _down() => _press.animateTo(
    1,
    duration: _still ? Duration.zero : _pressIn,
    curve: Curves.easeOut,
  );

  void _up() {
    if (!mounted) return;
    _press.animateBack(
      0,
      duration: _still ? const Duration(milliseconds: 120) : _release,
      curve: _still ? Curves.linear : Curves.easeOutBack,
    );
  }

  Future<void> _tap() async {
    HapticFeedback.selectionClick();
    widget.onTap();
    // A quick tap still shows the whole press before springing back.
    if (_press.value < 1 && !_still) {
      final left = ((1 - _press.value) * _pressIn.inMilliseconds).round();
      await _press.animateTo(1, duration: Duration(milliseconds: left));
    }
    if (mounted) _up();
  }

  @override
  void dispose() {
    _press.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final surface = dark ? Theme.of(context).colorScheme.surface : Colors.white;
    final hue = widget.tone == ServiceTileTone.emergency
        ? AppColors.emergency
        : widget.accent;
    final Color fill, pressedFill, iconColor, border;
    switch (widget.tone) {
      case ServiceTileTone.primary:
        // The town colour, or its dark companion where white would not pass.
        fill = ColorUtils.readableAccent(hue, Brightness.light);
        pressedFill = Color.lerp(fill, Colors.black, 0.18)!;
        iconColor = Colors.white;
        border = fill;
      case ServiceTileTone.emergency:
        fill = Color.alphaBlend(
          hue.withValues(alpha: dark ? 0.22 : 0.10),
          surface,
        );
        pressedFill = Color.alphaBlend(
          hue.withValues(alpha: dark ? 0.34 : 0.2),
          surface,
        );
        // Stays a true red in dark mode: this one is meant to read as alarm.
        iconColor = ColorUtils.textSafeAccent(hue, fill, darkSaturation: 1);
        border = iconColor.withValues(alpha: 0.28);
      case ServiceTileTone.neutral:
        fill = surface;
        iconColor = ColorUtils.readableAccentOf(context, hue);
        // The town's own tint shows up under the finger.
        pressedFill = Color.alphaBlend(
          iconColor.withValues(alpha: dark ? 0.2 : 0.1),
          surface,
        );
        border = dark ? Colors.white.withValues(alpha: 0.12) : AppColors.line;
    }
    final size = widget.iconContainerSize;

    // Button semantics (the visible label is read as its name). The tile's
    // own press motion replaces the ink ripple.
    return Semantics(
      button: true,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: _tap,
          onTapDown: (_) => _down(),
          onTapCancel: _up,
          borderRadius: BorderRadius.circular(16),
          splashFactory: NoSplash.splashFactory,
          highlightColor: Colors.transparent,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 92),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedBuilder(
                  animation: _press,
                  builder: (context, _) {
                    final p = _press.value;
                    final t = p.clamp(0.0, 1.0);
                    return Transform.scale(
                      scale: _still ? 1 : 1 - 0.08 * p,
                      child: Container(
                        width: size,
                        height: size,
                        decoration: BoxDecoration(
                          color: Color.lerp(fill, pressedFill, t),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: Color.lerp(
                              border,
                              iconColor.withValues(alpha: 0.45),
                              t,
                            )!,
                          ),
                        ),
                        child: ExcludeSemantics(
                          child: Transform.scale(
                            // The icon swells a touch as the tile sinks.
                            scale: _still ? 1 : 1 + 0.1 * t,
                            child: Icon(
                              widget.icon,
                              color: iconColor,
                              size: size * 0.46,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 8),
                Text(
                  widget.label,
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
