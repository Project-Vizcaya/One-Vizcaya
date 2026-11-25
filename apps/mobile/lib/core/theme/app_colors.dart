import 'package:flutter/material.dart';

/// Shared colours from the municipal colour guide
/// (docs/municipal-color-guide.md). They are the same in every
/// municipality: the town colour is an identity accent, never a status.
///
/// Status colours are the guide's, darkened where needed so each reaches
/// 4.5:1 as text on [background] and with white text on top (WCAG AA).
/// test/app_colors_test.dart checks every pair.
class AppColors {
  AppColors._();

  // Light theme neutrals.
  static const background = Color(0xFFF5F6F2);
  static const surface = Color(0xFFFFFFFF);
  static const ink = Color(0xFF202522);
  static const muted = Color(0xFF68716B);
  static const line = Color(0xFFE2E7E1);
  static const disabled = Color(0xFFA3AAA4);

  // Dark theme surfaces (as in main.dart's dark theme).
  static const darkBackground = Color(0xFF121316);
  static const darkSurface = Color(0xFF1C1E22);
  static const darkSurfaceHigh = Color(0xFF24272C);

  // Status. Emergency keeps the app's #C62828 (5.6:1 with white text; the
  // guide's #D92D35 is 4.8:1 and falls below 4.5 on the background).
  static const emergency = Color(0xFFC62828);
  static const success = Color(0xFF227F48); // guide #23834A
  static const warning = Color(0xFFA35F10); // guide #B86B12
  static const info = Color(0xFF2775A4); // guide #2878A8

  // Weather card.
  static const weatherSurface = Color(0xFFE8F1F8);
  static const weatherInk = Color(0xFF365F7D);
}
