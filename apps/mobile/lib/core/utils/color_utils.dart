import 'package:flutter/material.dart';

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

  /// Black or white — whichever is readable **on top of** [background].
  /// Use for text/icons drawn over a municipality-coloured fill (app bars,
  /// filled buttons, chips).
  static Color readableTextOn(Color background) {
    return ThemeData.estimateBrightnessForColor(background) == Brightness.dark
        ? Colors.white
        : Colors.black;
  }

  /// Returns [accent] adjusted so it is legible when used **as** a font/icon
  /// colour on the current surface [brightness].
  ///
  /// - On a **dark** surface a too-dark accent is lightened (maroon → soft red,
  ///   dark green → soft green) so it no longer disappears into the background.
  /// - On a **light** surface a too-light accent is darkened so it does not wash
  ///   out. Accents already in the legible range are returned unchanged, so the
  ///   municipality's colour identity is preserved wherever possible.
  static Color readableAccent(Color accent, Brightness brightness) {
    final hsl = HSLColor.fromColor(accent);
    if (brightness == Brightness.dark) {
      if (hsl.lightness < 0.62) {
        return hsl
            .withLightness(0.72)
            .withSaturation((hsl.saturation * 0.85).clamp(0.0, 1.0))
            .toColor();
      }
    } else {
      if (hsl.lightness > 0.62) {
        return hsl.withLightness(0.34).toColor();
      }
    }
    return accent;
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
