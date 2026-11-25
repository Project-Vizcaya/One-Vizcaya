// Contrast checks for the municipal colour guide: every town and every shared
// colour, in light and dark mode (WCAG AA, 4.5:1 for normal text).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_vizcaya/core/constants/app_constants.dart';
import 'package:one_vizcaya/core/theme/app_colors.dart';
import 'package:one_vizcaya/core/utils/color_utils.dart';

double cr(Color a, Color b) => ColorUtils.contrast(a, b);

void main() {
  final towns = AppConstants.municipalityThemes;

  test('every town defines a primary, a dark and a light colour', () {
    towns.forEach((town, t) {
      expect(t['appBarColor'], isA<Color>(), reason: town);
      expect(t['darkColor'], isA<Color>(), reason: town);
      expect(t['tertiaryColor'], isA<Color>(), reason: town);
    });
  });

  test('darkColor reads as text on the background and carries white text', () {
    towns.forEach((town, t) {
      final dark = t['darkColor'] as Color;
      expect(
        cr(dark, AppColors.background),
        greaterThanOrEqualTo(4.5),
        reason: '$town darkColor on background',
      );
      expect(
        cr(Colors.white, dark),
        greaterThanOrEqualTo(4.5),
        reason: 'white on $town darkColor',
      );
    });
  });

  test('readableAccent passes on every light and dark surface', () {
    towns.forEach((town, t) {
      final c = t['appBarColor'] as Color;
      final light = ColorUtils.readableAccent(c, Brightness.light);
      for (final bg in [AppColors.background, AppColors.surface]) {
        expect(
          cr(light, bg),
          greaterThanOrEqualTo(4.5),
          reason: '$town light on $bg',
        );
      }
      final dark = ColorUtils.readableAccent(c, Brightness.dark);
      for (final bg in [
        AppColors.darkBackground,
        AppColors.darkSurface,
        AppColors.darkSurfaceHigh,
      ]) {
        expect(
          cr(dark, bg),
          greaterThanOrEqualTo(4.5),
          reason: '$town dark on $bg',
        );
      }
    });
  });

  test('a town colour that already passes is kept as is', () {
    const bambang = Color(0xFF800000);
    expect(ColorUtils.readableAccent(bambang, Brightness.light), bambang);
  });

  test('a failing town colour uses its configured dark shade', () {
    final v = towns['Villaverde']!;
    expect(
      ColorUtils.readableAccent(v['appBarColor'] as Color, Brightness.light),
      v['darkColor'],
    );
  });

  test('text on every town colour fill reaches 4.5:1', () {
    towns.forEach((town, t) {
      final c = t['appBarColor'] as Color;
      expect(
        cr(ColorUtils.readableTextOn(c), c),
        greaterThanOrEqualTo(4.5),
        reason: town,
      );
    });
  });

  test('status colours read as text and carry white text', () {
    for (final c in [
      AppColors.emergency,
      AppColors.success,
      AppColors.warning,
      AppColors.info,
      AppColors.ink,
      AppColors.muted,
    ]) {
      expect(
        cr(c, AppColors.background),
        greaterThanOrEqualTo(4.5),
        reason: '$c on background',
      );
      expect(
        cr(c, AppColors.surface),
        greaterThanOrEqualTo(4.5),
        reason: '$c on white',
      );
    }
    for (final c in [
      AppColors.emergency,
      AppColors.success,
      AppColors.warning,
      AppColors.info,
    ]) {
      expect(
        cr(Colors.white, c),
        greaterThanOrEqualTo(4.5),
        reason: 'white on $c',
      );
    }
    expect(
      cr(AppColors.weatherInk, AppColors.weatherSurface),
      greaterThanOrEqualTo(4.5),
    );
  });
}
