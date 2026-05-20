import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../screens/home_screen.dart';
import '../screens/login_screen.dart';
import '../screens/onboarding_screen.dart';
import '../screens/setup_screen.dart';

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  Future<bool> _needsOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    return !(prefs.getBool('onboarding_complete') ?? false);
  }

  Future<bool> _needsProfileSetup(String uid) async {
    final doc = await FirebaseFirestore.instance
        .collection('users')
        .doc(uid)
        .get();
    final name = doc.data()?['name'] as String? ?? '';
    final municipality = doc.data()?['municipality'] as String? ?? '';
    return name.trim().isEmpty || municipality.trim().isEmpty;
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (snapshot.hasData) {
          final uid = snapshot.data!.uid;
          return FutureBuilder<bool>(
            future: _needsOnboarding(),
            builder: (context, onbSnap) {
              if (onbSnap.connectionState == ConnectionState.waiting) {
                return const Scaffold(
                    body: Center(child: CircularProgressIndicator()));
              }
              if (onbSnap.data == true) return const OnboardingScreen();
              return FutureBuilder<bool>(
                future: _needsProfileSetup(uid),
                builder: (context, setupSnap) {
                  if (setupSnap.connectionState == ConnectionState.waiting) {
                    return const Scaffold(
                        body: Center(child: CircularProgressIndicator()));
                  }
                  if (setupSnap.data == true) {
                    return const MunicipalitySetupScreen();
                  }
                  return const HomeScreen();
                },
              );
            },
          );
        }
        return const LoginScreen();
      },
    );
  }
}
