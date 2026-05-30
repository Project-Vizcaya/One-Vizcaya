#!/bin/bash
# SessionStart hook for One Vizcaya.
# Installs the Flutter SDK (with its bundled Dart) and project dependencies so
# `flutter analyze`, `flutter test`, and the Cloud Functions tooling work in
# Claude Code on the web. Idempotent: re-runs are fast because the container
# filesystem is cached after the first successful run.
set -euo pipefail

# Only do heavy setup in the remote (web) environment. Locally you already have
# your own Flutter install. Pass CLAUDE_CODE_REMOTE=true to force it for testing.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

FLUTTER_VERSION="3.44.0"
FLUTTER_HOME="${HOME}/flutter"
FLUTTER_BIN="${FLUTTER_HOME}/bin"
APP_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}/one_vizcaya"
FUNCTIONS_DIR="${APP_DIR}/functions"

export PATH="${FLUTTER_BIN}:${PATH}"

# Persist PATH (and a writable pub cache) for the rest of the session.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  {
    echo "export PATH=\"${FLUTTER_BIN}:\$PATH\""
    echo "export PUB_CACHE=\"${HOME}/.pub-cache\""
  } >> "${CLAUDE_ENV_FILE}"
fi

install_flutter() {
  local url="https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_${FLUTTER_VERSION}-stable.tar.xz"
  echo "Downloading Flutter ${FLUTTER_VERSION}…"
  rm -rf "${FLUTTER_HOME}"
  curl -fsSL "${url}" -o /tmp/flutter.tar.xz
  echo "Extracting Flutter to ${FLUTTER_HOME}…"
  tar -xf /tmp/flutter.tar.xz -C "${HOME}"
  rm -f /tmp/flutter.tar.xz
}

# Install only if missing or the wrong version (cache-friendly).
if [ -x "${FLUTTER_BIN}/flutter" ] \
   && "${FLUTTER_BIN}/flutter" --version 2>/dev/null | grep -q "Flutter ${FLUTTER_VERSION}"; then
  echo "Flutter ${FLUTTER_VERSION} already present — skipping download."
else
  install_flutter
fi

# Flutter uses git internally; mark the SDK dir safe when running as root.
git config --global --add safe.directory "${FLUTTER_HOME}" 2>/dev/null || true

# Disable analytics/telemetry so nothing blocks on a prompt.
flutter --version
flutter config --no-analytics >/dev/null 2>&1 || true
dart --disable-analytics >/dev/null 2>&1 || true

# Generate PLACEHOLDER secret files if missing, so the project compiles for
# `flutter analyze` / `flutter test`. These are gitignored (firebase_options.dart
# and secrets.dart) and contain NO real credentials — a clean clone otherwise
# fails to compile. Real values are supplied separately for actual runtime/builds.
SECRETS_FILE="${APP_DIR}/lib/secrets.dart"
if [ ! -f "${SECRETS_FILE}" ]; then
  echo "Creating placeholder lib/secrets.dart…"
  cat > "${SECRETS_FILE}" << 'DART'
// AUTO-GENERATED PLACEHOLDER (gitignored) — created by the SessionStart hook so
// the project compiles for analysis/tests. Not a real key. Replace locally for
// actual OpenWeatherMap calls.
const String openWeatherApiKey = 'PLACEHOLDER_OPENWEATHER_API_KEY';
DART
fi

FIREBASE_OPTS_FILE="${APP_DIR}/lib/firebase_options.dart"
if [ ! -f "${FIREBASE_OPTS_FILE}" ]; then
  echo "Creating placeholder lib/firebase_options.dart…"
  cat > "${FIREBASE_OPTS_FILE}" << 'DART'
// AUTO-GENERATED PLACEHOLDER (gitignored) — created by the SessionStart hook so
// the project compiles for analysis/tests. Contains NO real Firebase config.
// Run `flutterfire configure` locally to generate the real file.
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform => const FirebaseOptions(
        apiKey: 'PLACEHOLDER',
        appId: '1:000000000000:android:0000000000000000',
        messagingSenderId: '000000000000',
        projectId: 'placeholder-project',
        storageBucket: 'placeholder-project.appspot.com',
      );
}
DART
fi

# Resolve Flutter/Dart package dependencies for the app.
if [ -f "${APP_DIR}/pubspec.yaml" ]; then
  echo "Running flutter pub get in ${APP_DIR}…"
  (cd "${APP_DIR}" && flutter pub get)
fi

# Install Cloud Functions (Node 22) dependencies for linting/testing functions.
if [ -f "${FUNCTIONS_DIR}/package.json" ]; then
  echo "Running npm install in ${FUNCTIONS_DIR}…"
  (cd "${FUNCTIONS_DIR}" && npm install --no-audit --no-fund)
fi

echo "SessionStart setup complete."
