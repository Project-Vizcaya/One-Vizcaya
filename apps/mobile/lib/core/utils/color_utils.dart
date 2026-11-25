import 'package:flutter/material.dart';

import '../constants/app_constants.dart';
import '../theme/app_colors.dart';

/// Colour-contrast helpers for the municipality theming.
///
/// Each municipality has an accent (`appBarColor`) that ranges from very dark
/// (Bambang maroon `#800000`, Bayombong dark green `#006400`) to lighter tones.
/// Those accents read fine as text on a light surface, but become unreadable
/// when placed as a font/icon colour on a dark surface (dark mode, dark cards).
/// These helpers keep the accent's identity while guaranteeing it stays legible
/// against whatever background it sits on.
class ColorUtils {
  ColorUtils._();

  /// Black or white — whichever has more contrast **on top of**
  /// [background]. Use for text/icons drawn over a municipality-coloured fill
  /// (app bars, filled buttons, chips). Picks by WCAG contrast, not by a
  /// brightness guess: Aritao coral now gets black (5.4:1, white was 2.9:1).
  static Color readableTextOn(Color background) =>
      contrast(Colors.white, background) >= contrast(Colors.black, background)
      ? Colors.white
      : Colors.black;

  /// Returns [accent] adjusted so it is legible (4.5:1, WCAG AA) when used
  /// **as** a font/icon colour on the app's surfaces for [brightness].
  ///
  /// - **Light**: the town colour itself when it passes on the shared
  ///   background; otherwise the town's `darkColor` from
  ///   AppConstants.municipalityThemes (so headings and the selected nav item
  ///   use the same shade), or a darkened shade for any other colour.
  /// - **Dark**: lifted and softened until it passes on the lightest dark
  ///   surface (maroon becomes rose rather than alarm red).
  static Color readableAccent(Color accent, Brightness brightness) {
    if (brightness == Brightness.dark) {
      return textSafeAccent(accent, AppColors.darkSurfaceHigh);
    }
    if (contrast(accent, AppColors.background) >= 4.5) return accent;
    return townDarkOf(accent) ?? textSafeAccent(accent, AppColors.background);
  }

  /// The configured `darkColor` of the town whose primary is [primary].
  static Color? townDarkOf(Color primary) {
    for (final t in AppConstants.municipalityThemes.values) {
      if (t['appBarColor'] == primary) return t['darkColor'] as Color?;
    }
    return null;
  }

  /// Convenience: [readableAccent] resolved from a [BuildContext]'s theme.
  static Color readableAccentOf(BuildContext context, Color accent) =>
      readableAccent(accent, Theme.of(context).brightness);

  /// WCAG contrast ratio between two colours (1–21).
  static double contrast(Color a, Color b) {
    final la = a.computeLuminance(), lb = b.computeLuminance();
    return (la > lb ? la + 0.05 : lb + 0.05) /
        (la > lb ? lb + 0.05 : la + 0.05);
  }

  /// [accent] darkened (on a light [surface]) or lightened (on a dark one),
  /// keeping its hue, until small text in it reaches [minRatio] (WCAG AA).
  /// Light town colours such as Villaverde lime or Kasibu orange need this;
  /// the heuristic in [readableAccent] lets them through.
  ///
  /// On a dark surface the lifted shade is also softened (saturation capped at
  /// [darkSaturation]) so a maroon town reads as rose, not as alarm red.
  static Color textSafeAccent(
    Color accent,
    Color surface, {
    double minRatio = 4.5,
    double darkSaturation = 0.6,
  }) {
    final darken = surface.computeLuminance() > 0.5;
    var hsl = HSLColor.fromColor(accent);
    if (!darken && contrast(accent, surface) < minRatio) {
      hsl = hsl.withSaturation(hsl.saturation.clamp(0.0, darkSaturation));
    }
    for (
      var i = 0;
      i < 40 && contrast(hsl.toColor(), surface) < minRatio;
      i++
    ) {
      final l = hsl.lightness + (darken ? -0.02 : 0.02);
      hsl = hsl.withLightness(l.clamp(0.0, 1.0));
    }
    return hsl.toColor();
  }
}
