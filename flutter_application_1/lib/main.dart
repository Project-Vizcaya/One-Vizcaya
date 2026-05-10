import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'firebase_options.dart';

import 'presentation/screens/login_screen.dart';
import 'presentation/screens/setup_screen.dart';
import 'presentation/screens/home_screen.dart';
import 'presentation/screens/report_problem_screen.dart';
import 'presentation/screens/report_status_screen.dart';
import 'presentation/screens/emergency_contacts_screen.dart';
import 'presentation/screens/other_screens.dart';
import 'presentation/screens/admin_dashboard_screen.dart';
import 'presentation/screens/profile_management_screen.dart';
import 'presentation/screens/app_settings_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // ADD THIS BLOCK: Activate App Check for Bot Protection
  await FirebaseAppCheck.instance.activate(
    androidProvider: AndroidProvider.playIntegrity, // Standard for Android
  );

  // Enable offline persistence for web and mobile
  FirebaseFirestore.instance.settings = const Settings(
    persistenceEnabled: true,
  );

  runApp(const OneVizcayaApp());
}

class OneVizcayaApp extends StatelessWidget {
  const OneVizcayaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'One Vizcaya',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.light,
        primarySwatch: Colors.green,
        scaffoldBackgroundColor: const Color(0xFFF5F5F5),
        fontFamily: 'Roboto',
        iconTheme: const IconThemeData(color: Color(0xFF333333)),
        appBarTheme: const AppBarTheme(
          elevation: 0,
          backgroundColor: Color(0xFFF5F5F5),
          foregroundColor: Color(0xFF333333),
          titleTextStyle: TextStyle(
            color: Color(0xFF333333),
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
          iconTheme: IconThemeData(color: Color(0xFF333333)),
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16.0),
          ),
          color: Colors.white,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF4CAF50),
            foregroundColor: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14.0),
            ),
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
          ),
        ),
        textTheme: const TextTheme(
          headlineSmall: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 24,
            color: Color(0xFF333333),
          ),
          bodyLarge: TextStyle(fontSize: 16, color: Color(0xFF555555)),
          bodyMedium: TextStyle(fontSize: 14, color: Color(0xFF777777)),
          titleMedium: TextStyle(
            color: Color(0xFF333333),
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14.0),
            borderSide: BorderSide(color: Colors.grey.shade200),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14.0),
            borderSide: BorderSide(color: Colors.grey.shade200),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14.0),
            borderSide: const BorderSide(color: Color(0xFF4CAF50), width: 1.5),
          ),
        ),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4CAF50),
          brightness: Brightness.light,
        ),
      ),
      home: const LoginScreen(),
      routes: {
        '/login': (context) => const LoginScreen(),
        '/setup': (context) => const MunicipalitySetupScreen(),
        '/settings': (context) => const AppSettingsScreen(),
        '/home': (context) => const HomeScreen(),
        '/report': (context) => const ReportProblemScreen(),
        '/status': (context) => const ReportStatusScreen(),
        '/contacts': (context) => const EmergencyContactsScreen(),
        '/announcements': (context) => const AnnouncementsScreen(),
        '/support': (context) => const SupportScreen(),
        '/notifications': (context) => const NotificationsScreen(),
        '/profile': (context) => const ProfileManagementScreen(),
        '/admin': (context) => const AdminDashboardScreen(),
      },
    );
  }
}
