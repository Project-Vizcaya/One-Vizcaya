import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../screens/home_screen.dart';
import '../screens/login_screen.dart';
import '../screens/onboarding_screen.dart';
import '../screens/setup_screen.dart';
import '../screens/splash_screen.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  // Cached futures keyed by uid to avoid redundant reads on token refresh
  String? _cachedUid;
  Future<bool>? _onboardingFuture;
  Future<bool>? _setupFuture;

  Future<bool> _needsOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    return !(prefs.getBool('onboarding_complete') ?? false);
  }

  Future<bool> _needsProfileSetup(String uid) async {
    try {
      final doc = await FirebaseFirestore.instance
          .collection('users')
          .doc(uid)
          .get();
      final name = doc.data()?['name'] as String? ?? '';
      final municipality = doc.data()?['municipality'] as String? ?? '';
      return name.trim().isEmpty || municipality.trim().isEmpty;
    } catch (_) {
      // On Firestore error, send to setup so user can fill in their profile
      return true;
    }
  }

  void _refreshForUser(String uid) {
    if (_cachedUid == uid) return; // already have futures for this user
    _cachedUid = uid;
    _onboardingFuture = _needsOnboarding();
    _setupFuture = _needsProfileSetup(uid);
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SplashScreen();
        }

        final user = snapshot.data;
        if (user == null) {
          _cachedUid = null; // reset cache on logout
          return const LoginScreen();
        }

        _refreshForUser(user.uid);

        return FutureBuilder<bool>(
          future: _onboardingFuture,
          builder: (context, onbSnap) {
            if (onbSnap.connectionState == ConnectionState.waiting) {
              return const SplashScreen();
            }
            if (onbSnap.data == true) return const OnboardingScreen();

            return FutureBuilder<bool>(
              future: _setupFuture,
              builder: (context, setupSnap) {
                if (setupSnap.connectionState == ConnectionState.waiting) {
                  return const SplashScreen();
                }
                if (setupSnap.data == true) {
                  return const MunicipalitySetupScreen();
                }
                return const HomeScreen();
              },
            );
          },
        );
      },
    );
  }
}
