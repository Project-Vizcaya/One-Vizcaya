import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart'; // Added for kIsWeb and kReleaseMode
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:app_links/app_links.dart';
import 'firebase_options.dart';

import 'data/services/notification_service.dart';
import 'presentation/screens/login_screen.dart';
import 'presentation/screens/setup_screen.dart';
import 'presentation/screens/home_screen.dart';
import 'presentation/screens/report_problem_screen.dart';
import 'presentation/screens/report_status_screen.dart';
import 'presentation/screens/emergency_contacts_screen.dart';
import 'presentation/screens/other_screens.dart';
import 'presentation/screens/announcements_screen.dart';
import 'presentation/screens/admin_dashboard_screen.dart';
import 'presentation/screens/profile_management_screen.dart';
import 'presentation/screens/app_settings_screen.dart';
import 'presentation/screens/onboarding_screen.dart';
import 'presentation/screens/weather_detail_screen.dart';
import 'presentation/screens/my_data_screen.dart';
import 'presentation/screens/data_request_screen.dart';
import 'features/auth/presentation/screens/privacy_policy_screen.dart';
import 'presentation/widgets/auth_gate.dart';
import 'presentation/state/municipality_state.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load cached settings instantly — no network needed
  try {
    await oneVizcayaState.loadPersistedState();
  } catch (e) {
    debugPrint('Failed to load persisted state: $e');
  }

  // Initialize Firebase core — required before AuthGate can function
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    FirebaseFirestore.instance.settings = const Settings(
      persistenceEnabled: true,
    );
  } catch (e) {
    debugPrint('Firebase core init error: $e');
  }

  // Show the app immediately — users see the screen in ~1-2 seconds
  runApp(const OneVizcayaApp());

  // App Check and notifications are non-critical for the first frame.
  // Fire-and-forget so they never delay the visible UI.
  if (!kIsWeb) {
    FirebaseAppCheck.instance
        .activate(
          androidProvider: AndroidProvider.debug,
          appleProvider: kReleaseMode
              ? AppleProvider.deviceCheck
              : AppleProvider.debug,
        )
        .catchError((e) => debugPrint('App Check error: $e'));
  }
  NotificationService.instance
      .initialize()
      .then((_) => NotificationService.instance.navigatorKey = _navigatorKey)
      .catchError((e) => debugPrint('Notification init error: $e'));
}

final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

class OneVizcayaApp extends StatefulWidget {
  const OneVizcayaApp({super.key});

  @override
  State<OneVizcayaApp> createState() => _OneVizcayaAppState();
}

class _OneVizcayaAppState extends State<OneVizcayaApp> {
  late final AppLinks _appLinks;
  StreamSubscription<Uri>? _linkSubscription;

  @override
  void initState() {
    super.initState();
    _appLinks = AppLinks();
    _initDeepLinks();
    // FCM tap routing: handle terminated-app notification tap
    WidgetsBinding.instance.addPostFrameCallback((_) {
      NotificationService.instance.handleInitialMessage();
    });
  }

  Future<void> _initDeepLinks() async {
    // Handle cold-start deep link
    try {
      final initialUri = await _appLinks.getInitialLink();
      if (initialUri != null) {
        _handleDeepLink(initialUri);
      }
    } catch (e) {
      debugPrint('Deep link initial error: $e');
    }

    // Handle foreground deep links
    _linkSubscription = _appLinks.uriLinkStream.listen(
      _handleDeepLink,
      onError: (e) => debugPrint('Deep link stream error: $e'),
    );
  }

  void _handleDeepLink(Uri uri) {
    if (uri.scheme == 'onevizcaya' &&
        uri.host == 'status' &&
        uri.queryParameters.containsKey('reportId')) {
      final reportId = uri.queryParameters['reportId'];
      _navigatorKey.currentState?.pushNamed(
        '/status',
        arguments: {'reportId': reportId},
      );
    }
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: oneVizcayaState.isDarkMode,
      builder: (context, isDark, _) {
        return ValueListenableBuilder<String>(
          valueListenable: oneVizcayaState.language,
          builder: (context, lang, _) {
        // FIX 7: oneVizcayaStateLang is now kept in sync inside setLanguage()
        // and loadPersistedState() in municipality_state.dart — no need to set it here.
        return MaterialApp(
          navigatorKey: _navigatorKey,
          title: 'One Vizcaya',
          debugShowCheckedModeBanner: false,
          themeMode: isDark ? ThemeMode.dark : ThemeMode.light,
          darkTheme: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF4CAF50),
            ),
          ),
          // NOTE: flutter_localizations ships Filipino as 'fil' — there is no
          // 'tl' locale. Using 'tl' meant no delegate could supply
          // MaterialLocalizations, so any Material widget that needs it
          // (e.g. RefreshIndicator) threw at build and blanked the screen.
          locale: lang == 'Tagalog' ? const Locale('fil') : const Locale('en'),
          supportedLocales: const [Locale('en'), Locale('fil')],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          // Guarantee the resolved locale is always one the Global delegates
          // support, so MaterialLocalizations is never missing — on any device
          // language. Filipino/Tagalog devices report 'fil' or 'tl'.
          localeResolutionCallback: (locale, supportedLocales) {
            if (locale != null &&
                (locale.languageCode == 'fil' || locale.languageCode == 'tl')) {
              return const Locale('fil');
            }
            return const Locale('en');
          },
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
                padding:
                    const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
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
                borderSide:
                    const BorderSide(color: Color(0xFF4CAF50), width: 1.5),
              ),
            ),
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF4CAF50),
              brightness: Brightness.light,
            ),
          ),
          home: const AuthGate(),
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
            '/onboarding': (context) => const OnboardingScreen(),
            '/weather': (context) => WeatherDetailScreen(
                  municipality:
                      oneVizcayaState.selectedMunicipality.value,
                ),
            '/privacy': (context) => const PrivacyPolicyScreen(),
            '/my-data': (context) => const MyDataScreen(),
            '/data-request': (context) => const DataRequestScreen(),
          },
        );
          },
        );
      },
    );
  }
}
