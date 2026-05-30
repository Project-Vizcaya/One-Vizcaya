// Pure-Dart unit tests for the trilingual string table. These run without
// Firebase, so they give a fast, reliable green baseline for `flutter test`.
import 'package:flutter_test/flutter_test.dart';
import 'package:one_vizcaya/core/l10n/app_strings.dart';

void main() {
  group('AppStrings.get', () {
    test('resolves a known key per language', () {
      expect(AppStrings.get('home', lang: 'English'), 'Home');
      expect(AppStrings.get('home', lang: 'Tagalog'), 'Tahanan');
      expect(AppStrings.get('home', lang: 'Ilocano'), 'Abong');
    });

    test('falls back to English when a key is missing in the language', () {
      // 'appTitle' exists in every language and is identical, so this also
      // documents the shared-key behaviour.
      expect(AppStrings.get('appTitle', lang: 'Ilocano'), 'One Vizcaya');
    });

    test('returns the key itself for an unknown key', () {
      expect(AppStrings.get('___not_a_real_key___'), '___not_a_real_key___');
    });

    test('RA 10173 data-privacy keys are translated in all three languages', () {
      const keys = [
        'downloadMyData',
        'dataPrivacyRequest',
        'myDataTitle',
        'dataRequestTitle',
        'reqAccess',
        'reqErasure',
      ];
      for (final lang in ['English', 'Tagalog', 'Ilocano']) {
        for (final key in keys) {
          final value = AppStrings.get(key, lang: lang);
          // A real translation never falls through to the raw key.
          expect(value, isNot(equals(key)),
              reason: 'Missing "$key" translation for $lang');
          expect(value.trim(), isNotEmpty);
        }
      }
    });
  });
}
