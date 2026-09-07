/// Release notes shown to citizens in the "What's New" dialog after they update
/// the app. Add a new [ReleaseNote] at the TOP of [kReleaseNotes] for every
/// build that has user-facing changes, keyed by the pubspec build number
/// (must match AppConstants.buildNumber). Builds with only internal/back-end
/// changes can be omitted — the dialog simply won't appear for them.
library;

enum ChangeType { added, improved, fixed }

class ChangeEntry {
  final ChangeType type;
  final String text;
  const ChangeEntry(this.type, this.text);
}

class ReleaseNote {
  final String version; // e.g. '1.5.0'
  final int build; // e.g. 27 — matches AppConstants.buildNumber
  final String date; // human-readable, e.g. 'August 2026'
  final List<ChangeEntry> changes;
  const ReleaseNote({
    required this.version,
    required this.build,
    required this.date,
    required this.changes,
  });
}

/// Newest first.
const List<ReleaseNote> kReleaseNotes = [
  ReleaseNote(
    version: '1.8.0',
    build: 30,
    date: 'September 2026',
    changes: [
      ChangeEntry(ChangeType.improved,
          'Urgent alerts now stand out — an emergency broadcast or announcement arrives with a distinct sound, a pop-up banner, and a red highlight, so you never miss a critical advisory.'),
      ChangeEntry(ChangeType.fixed,
          'Weather, maps, and reliability improvements across the app.'),
    ],
  ),
  ReleaseNote(
    version: '1.7.0',
    build: 29,
    date: 'September 2026',
    changes: [
      ChangeEntry(ChangeType.added,
          'Use my location — the app can now set your municipality automatically based on where you are. Turn it on in Settings.'),
    ],
  ),
  ReleaseNote(
    version: '1.6.0',
    build: 28,
    date: 'September 2026',
    changes: [
      ChangeEntry(ChangeType.added,
          'New Citizen Guide — search and find government offices and services (SSS, LTO, NBI, Pag-IBIG and more) with tap-to-call, website, and map.'),
    ],
  ),
  ReleaseNote(
    version: '1.5.0',
    build: 27,
    date: 'August 2026',
    changes: [
      ChangeEntry(ChangeType.improved,
          'Notifications now appear at the top of the screen and are much easier to notice.'),
      ChangeEntry(ChangeType.added,
          'Urgent advisories take over the screen so you never miss a critical alert.'),
      ChangeEntry(ChangeType.added,
          'A search bar to quickly find what you are reporting — just type, e.g. "traffic".'),
      ChangeEntry(ChangeType.added,
          'A new "Others" category for concerns that are not in the list — just describe it.'),
    ],
  ),
];

/// The most recent release note at or below [build], or null if none applies.
/// Lets the dialog show the right notes even if a build without notes ships in
/// between (it falls back to the latest documented release).
ReleaseNote? releaseNoteForBuild(int build) {
  for (final note in kReleaseNotes) {
    if (note.build <= build) return note;
  }
  return null;
}
