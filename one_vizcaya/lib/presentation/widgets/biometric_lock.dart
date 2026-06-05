import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// SharedPreferences key for the biometric app-lock toggle (Settings).
const String kBiometricAppLockKey = 'biometric_app_lock';

/// Wraps the whole app (via MaterialApp.builder). When the biometric app lock
/// is enabled and a user is signed in, it covers the entire UI with a lock
/// screen on launch and whenever the app returns from the background, requiring
/// biometric (or device-credential) authentication to continue.
///
/// Fail-safe: device credential is allowed as a fallback, so a user is never
/// permanently locked out if a fingerprint sensor misreads.
class BiometricLockOverlay extends StatefulWidget {
  final Widget child;
  const BiometricLockOverlay({super.key, required this.child});

  @override
  State<BiometricLockOverlay> createState() => _BiometricLockOverlayState();
}

class _BiometricLockOverlayState extends State<BiometricLockOverlay>
    with WidgetsBindingObserver {
  final LocalAuthentication _auth = LocalAuthentication();
  bool _enabled = false;
  bool _locked = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadAndMaybeLock();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  bool get _signedIn => FirebaseAuth.instance.currentUser != null;

  Future<void> _loadAndMaybeLock() async {
    final prefs = await SharedPreferences.getInstance();
    _enabled = prefs.getBool(kBiometricAppLockKey) ?? false;
    if (_enabled && _signedIn) {
      if (mounted) setState(() => _locked = true);
      _authenticate();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      // Re-lock when leaving the foreground so content is hidden in the
      // app switcher and a fresh unlock is required on return.
      if (_enabled && _signedIn && !_locked && mounted) {
        setState(() => _locked = true);
      }
    } else if (state == AppLifecycleState.resumed) {
      if (_locked && _signedIn) {
        _authenticate();
      } else {
        // Pick up a newly-enabled lock without needing a relaunch.
        _loadAndMaybeLock();
      }
    }
  }

  Future<void> _authenticate() async {
    if (_busy) return;
    setState(() => _busy = true);
    bool ok = false;
    try {
      // No biometricOnly flag → device PIN/pattern works as a fallback, so a
      // user is never permanently locked out by a misreading sensor.
      ok = await _auth.authenticate(
        localizedReason: 'Unlock One Vizcaya to continue',
      );
    } catch (_) {
      ok = false;
    }
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (ok) _locked = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_locked && _signedIn)
          Positioned.fill(
            child: _LockScreen(busy: _busy, onUnlock: _authenticate),
          ),
      ],
    );
  }
}

class _LockScreen extends StatelessWidget {
  final bool busy;
  final VoidCallback onUnlock;
  const _LockScreen({required this.busy, required this.onUnlock});

  @override
  Widget build(BuildContext context) {
    return Material(
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF15522F),
              Color(0xFF2E8B43),
              Color(0xFFE2B53C),
              Color(0xFFE3892F),
            ],
            stops: [0.0, 0.42, 0.8, 1.0],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.18),
                        blurRadius: 20,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Image.asset(
                    'assets/images/Seal_of_Nueva_Vizcaya.svg.png',
                    width: 92,
                    height: 92,
                    errorBuilder: (_, __, ___) => const Icon(Icons.lock,
                        size: 92, color: Color(0xFF2E7D32)),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'One Vizcaya is Locked',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Verify your identity to continue',
                  style: TextStyle(color: Colors.white70, fontSize: 14),
                ),
                const SizedBox(height: 40),
                // ── Biometric unlock button (image-4 style) ──
                GestureDetector(
                  onTap: busy ? null : onUnlock,
                  child: Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.15),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: busy
                        ? const Padding(
                            padding: EdgeInsets.all(30),
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                  Color(0xFF2E7D32)),
                            ),
                          )
                        : const Icon(Icons.fingerprint,
                            size: 52, color: Color(0xFF15522F)),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  busy ? 'Authenticating…' : 'Tap to use biometrics',
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
