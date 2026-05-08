import 'package:flutter/material.dart';
// Import this package after adding it to your pubspec.yaml
import 'package:url_launcher/url_launcher.dart';

// Add these new imports for Firebase
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'firebase_options.dart';

// --- NEW: Global Municipality State (Singleton for Prototype) ---
class MunicipalityState {
  static final MunicipalityState _instance = MunicipalityState._internal();
  factory MunicipalityState() => _instance;
  MunicipalityState._internal();

  // The active municipality. We can use ValueNotifier to rebuild the UI instantly.
  ValueNotifier<String> selectedMunicipality = ValueNotifier<String>(
    'Bambang',
  ); // Default pilot town

  // Pre-defined color palettes for dynamic theming based on town LGU style.
  // Colors are inspired by the standard colorful look in image_c52ca1.png,
  // but the AppBar and dynamic welcomes will reflect the specific town.
  final Map<String, dynamic> municipalityThemes = {
    'Bambang': {
      'appBarColor': const Color(0xFFE2725B), // Terracotta or Earthy Brown
      'welcomeMsg':
          'Welcome to Bambang, The Argricultural Hub of Nueva Vizcaya!',
    },
    'Solano': {
      'appBarColor': const Color(0xFFFF4500), // Bright Red or Orange
      'welcomeMsg':
          'Welcome to Solano, The Commercial Center of Nueva Vizcaya!',
    },
    'Bayombong': {
      'appBarColor': const Color(0xFF228B22), // Forest Green
      'welcomeMsg':
          'Welcome to Bayombong, The Institutional Capital of Nueva Vizcaya!',
    },
    'Bagabag': {
      'appBarColor': const Color(0xFFFFD12A), // Pineapple Gold
      'secondaryColor': const Color(0xFF007FFF), // Azure Blue
      'welcomeMsg':
          'Welcome to Bagabag, The Gateway to the World-Famous Rice Terraces!',
    },
    'Diadi': {
      'appBarColor': const Color(0xFF004B49), // Deep Teal
      'secondaryColor': const Color(0xFFE6E6FA), // Mist White
      'welcomeMsg': 'Welcome to Diadi, The Last Frontier of the North!',
    },
    'Villaverde': {
      'appBarColor': const Color(0xFFDFFF00), // Light Lime
      'secondaryColor': const Color(0xFF928E85), // Stone
      'welcomeMsg': 'Welcome to Villaverde, The Land of Bountiful Harvests!',
    },
    'Quezon': {
      'appBarColor': const Color(0xFFC0C0C0), // Silver
      'secondaryColor': const Color(0xFF50C878), // Emerald
      'welcomeMsg': 'Welcome to Quezon, The Land of Hidden Natural Wealth!',
    },
    'Aritao': {
      'appBarColor': const Color(0xFFFF6E4A), // Sunrise Orange
      'secondaryColor': const Color(0xFFB66A50), // Clay
      'welcomeMsg': 'Welcome to Aritao, The Gateway to the Cagayan Valley!',
    },
    'Santa Fe': {
      'appBarColor': const Color(0xFF01796F), // Pine Green
      'secondaryColor': const Color(0xFF8C92AC), // Cool Gray
      'welcomeMsg': 'Welcome to Santa Fe, The Mountain Gateway of Vizcaya!',
    },
    'Alfonso Castañeda': {
      'appBarColor': const Color(0xFF4A5D23), // Dark Moss
      'secondaryColor': const Color(0xFF0B3B60), // Deep River Blue
      'welcomeMsg':
          'Welcome to Alfonso Castañeda, The Last Frontier of Nueva Vizcaya!',
    },
    'Kayapa': {
      'appBarColor': const Color(0xFFF28500), // Tangerine
      'secondaryColor': const Color(0xFF708090), // Fog Gray
      'welcomeMsg': 'Welcome to Kayapa, The Vegetable Bowl of the Province!',
    },
    'Dupax del Norte': {
      'appBarColor': const Color(0xFFCC5500), // Burnt Orange
      'secondaryColor': const Color(0xFFFFFDD0), // Cream
      'welcomeMsg': 'Welcome to Dupax del Norte, The Home of Cultural Harmony!',
    },
    'Dupax del Sur': {
      'appBarColor': const Color(0xFF800000), // Maroon
      'secondaryColor': const Color(0xFFFAEBD7), // Antique White
      'welcomeMsg': 'Welcome to Dupax del Sur, The Heart of Nueva Vizcaya!',
    },
    'Kasibu': {
      'appBarColor': const Color(0xFFFFD700), // Citrus Yellow
      'secondaryColor': const Color(0xFF9966CC), // Mountain Purple
      'welcomeMsg': 'Welcome to Kasibu, The Citrus Capital of the Philippines!',
    },
    'Ambaguio': {
      'appBarColor': const Color(0xFF87CEEB), // Sky Blue
      'secondaryColor': const Color(0xFF454D32), // Pine Needle
      'welcomeMsg': 'Welcome to Ambaguio, The Summer Capital of Vizcaya!',
    },
    'Generic': {
      'appBarColor': Colors.grey[700],
      'welcomeMsg': 'Welcome to your Municipality Connect!',
    },
  };

  // Helper function to get theme data
  Map<String, dynamic> get activeTheme =>
      municipalityThemes[selectedMunicipality.value] ??
      municipalityThemes['Generic']!;
}

// Instantiate global state singleton
final oneVizcayaState = MunicipalityState();

// List of Vizcaya Municipalities for selection
final List<String> vizcayaMunicipalitiesList = [
  'Alfonso Castañeda',
  'Ambaguio',
  'Aritao',
  'Bagabag',
  'Bambang',
  'Bayombong',
  'Diadi',
  'Dupax del Norte',
  'Dupax del Sur',
  'Kasibu',
  'Kayapa',
  'Quezon',
  'Santa Fe',
  'Solano',
  'Villaverde',
];

// --- Main Application ---

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  
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
        primarySwatch: Colors.blue,
        // Global style elements, individual town color palettes applied dynamically.
        scaffoldBackgroundColor: const Color(0xFFF5F5F5),
        iconTheme: const IconThemeData(color: Colors.white),
        // Use standard theme settings here, dynamic overrides in specific screens.
        appBarTheme: const AppBarTheme(
          elevation: 0,
          titleTextStyle: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
          iconTheme: IconThemeData(color: Colors.white),
        ),
        cardTheme: CardThemeData(
          elevation: 0, // Flat design matching dynamic look in image_c52ca1.png
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12.0),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFFFBE26), // Dynamic Tile Orange
            foregroundColor: const Color(0xFF004A6D), // Dynamic Dark Blue text
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8.0),
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
          // Specific style for the colorful grid titles in image_c52ca1.png
          titleMedium: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8.0),
            borderSide: const BorderSide(color: Colors.grey),
          ),
          // We will apply the active town's color in screens.
        ),
      ),
      home: const LoginScreen(),
      routes: {
        '/setup': (context) => const MunicipalitySetupScreen(),
        '/home': (context) => const HomeScreen(),
        '/report': (context) => const ReportProblemScreen(),
        '/status': (context) => const ReportStatusScreen(),
        '/contacts': (context) => const EmergencyContactsScreen(),
        '/announcements': (context) => const AnnouncementsScreen(),
        '/support': (context) => const SupportScreen(),
      },
    );
  }
}

// --- Data Models ---

class ProblemReport {
  final String id;
  final String category;
  final String description;
  final String location;
  final String municipality; // New: Report is now localized
  final ReportStatus status;
  final DateTime reportedAt;

  ProblemReport({
    required this.id,
    required this.category,
    required this.description,
    required this.location,
    required this.municipality,
    required this.status,
    required this.reportedAt,
  });
}

enum ReportStatus { reported, ongoing, solved }

// --- Screens ---

// 1. Login Screen (Now Phone-based only)
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isLoading = false;
  final _phoneController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  Future<void> _loginWithPhone() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    String phoneNumber = _phoneController.text.trim();
    if (phoneNumber.startsWith('09')) {
      phoneNumber = '+63${phoneNumber.substring(1)}';
    }

    try {
      await FirebaseAuth.instance.verifyPhoneNumber(
        phoneNumber: phoneNumber,
        verificationCompleted: (PhoneAuthCredential credential) async {
          await FirebaseAuth.instance.signInWithCredential(credential);
          if (mounted) {
            // New Flow: Successful login -> Setup municipality first time
            Navigator.of(context).pushReplacementNamed('/setup');
          }
        },
        verificationFailed: (FirebaseAuthException e) {
          if (mounted) {
            setState(() => _isLoading = false);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Verification failed: ${e.message}')),
            );
          }
        },
        codeSent: (String verificationId, int? resendToken) {
          if (mounted) {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) =>
                    PhoneVerificationScreen(verificationId: verificationId),
              ),
            );
          }
        },
        codeAutoRetrievalTimeout: (String verificationId) {},
      );
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('An error occurred: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Standard LGU branding color for login
    const primaryColor = Color(0xFF00796B);

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32.0),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Image.asset(
                  'assets/images/Seal_of_Nueva_Vizcaya.svg.png',
                  height: 120,
                ),
                const SizedBox(height: 16),
                Text(
                  'Welcome to\nOne Vizcaya',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: primaryColor,
                    fontSize: 28,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Connecting you directly to your municipality.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 48),
                if (_isLoading)
                  const Center(child: CircularProgressIndicator())
                else ...[
                  TextFormField(
                    controller: _phoneController,
                    decoration: const InputDecoration(
                      labelText: 'Phone Number',
                      hintText: '09171234567',
                      prefixIcon: Icon(Icons.phone),
                    ),
                    keyboardType: TextInputType.phone,
                    validator: (value) {
                      if (value == null || value.isEmpty)
                        return 'Please enter your phone number';
                      if (!value.startsWith('09') || value.length != 11)
                        return 'Please enter a valid 11-digit number starting with 09';
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.phone, color: Colors.white),
                    label: const Text('Sign in with Phone Number'),
                    onPressed: _loginWithPhone,
                    style: ElevatedButton.styleFrom(
                      backgroundColor:
                          primaryColor, // Bambang primary green for login
                      foregroundColor: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'We will send a verification code to this number.',
                    textAlign: TextAlign.center,
                    style: Theme.of(
                      context,
                    ).textTheme.bodyMedium?.copyWith(fontSize: 12),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// --- PHONE VERIFICATION SCREEN ---

class PhoneVerificationScreen extends StatefulWidget {
  final String verificationId;

  const PhoneVerificationScreen({super.key, required this.verificationId});

  @override
  _PhoneVerificationScreenState createState() =>
      _PhoneVerificationScreenState();
}

class _PhoneVerificationScreenState extends State<PhoneVerificationScreen> {
  final _codeController = TextEditingController();
  bool _isLoading = false;

  Future<void> _verifyCode() async {
    if (_codeController.text.isEmpty) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: widget.verificationId,
        smsCode: _codeController.text,
      );

      await FirebaseAuth.instance.signInWithCredential(credential);

      if (mounted) {
        // Successful Verification -> Setup municipality first time
        Navigator.of(
          context,
        ).pushNamedAndRemoveUntil('/setup', (route) => false);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to verify code: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Enter Verification Code'),
        backgroundColor: const Color(0xFF00796B), // Primary Teal
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Enter the 6-digit code sent to your phone.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _codeController,
                decoration: const InputDecoration(
                  labelText: 'Verification Code',
                  hintText: '123456',
                ),
                keyboardType: TextInputType.number,
                maxLength: 6,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 24, letterSpacing: 8),
              ),
              const SizedBox(height: 24),
              if (_isLoading)
                const Center(child: CircularProgressIndicator())
              else
                ElevatedButton(
                  onPressed: _verifyCode,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00796B), // Primary Teal
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Verify and Sign In'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// --- NEW: Municipality Setup Screen (First time login) ---
class MunicipalitySetupScreen extends StatefulWidget {
  const MunicipalitySetupScreen({super.key});

  @override
  _MunicipalitySetupScreenState createState() =>
      _MunicipalitySetupScreenState();
}

class _MunicipalitySetupScreenState extends State<MunicipalitySetupScreen> {
  String? _selectedTown;

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF00796B); // Pilot Teal

    return Scaffold(
      appBar: AppBar(
        title: const Text('Welcome to One Vizcaya'),
        backgroundColor: primaryColor,
        automaticallyImplyLeading: false, // Don't allow back to login
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(Icons.location_on, size: 80, color: primaryColor),
              const SizedBox(height: 24),
              Text(
                'Select Your Municipality',
                textAlign: TextAlign.center,
                style: Theme.of(
                  context,
                ).textTheme.headlineSmall?.copyWith(color: primaryColor),
              ),
              const SizedBox(height: 12),
              Text(
                'This defines your default homepage and allows your reports to route correctly.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 48),
              DropdownButtonFormField<String>(
                value: _selectedTown,
                hint: const Text('Select Municipality'),
                isExpanded: true,
                dropdownColor: Colors.white,
                style: const TextStyle(color: Colors.black87, fontSize: 16),
                items: vizcayaMunicipalitiesList.map((String town) {
                  return DropdownMenuItem<String>(
                    value: town,
                    child: Text(town),
                  );
                }).toList(),
                onChanged: (newValue) {
                  setState(() {
                    _selectedTown = newValue;
                  });
                },
                decoration: InputDecoration(
                  labelText: 'Municipality',
                  prefixIcon: Icon(Icons.location_city, color: primaryColor),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: primaryColor, width: 2),
                  ),
                  labelStyle: const TextStyle(color: primaryColor),
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _selectedTown == null
                    ? null
                    : () {
                        // Set the global state singleton. Louie from Bambang logic.
                        oneVizcayaState.selectedMunicipality.value =
                            _selectedTown!;
                        Navigator.of(context).pushReplacementNamed('/home');
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Complete Setup'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// 2. Home Screen (Dashboard) - Dynamic Theming Applied
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<String>(
      valueListenable: oneVizcayaState.selectedMunicipality,
      builder: (context, municipality, child) {
        // Apply the dynamic theme colors and data based on selection.
        final activeTheme = oneVizcayaState.activeTheme;
        final appBarColor = activeTheme['appBarColor'];
        final welcomeMsg = activeTheme['welcomeMsg'];

        return Scaffold(
          appBar: AppBar(
            backgroundColor: appBarColor,
            // Municipality Selector in AppBar - Enables dynamic transitions (Bambang to Solano)
            title: Row(
              children: [
                Icon(Icons.location_on, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: municipality,
                      dropdownColor:
                          appBarColor, // Keeps dropdown readable against dynamic theme
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                      iconEnabledColor: Colors.white,
                      items: vizcayaMunicipalitiesList.map((String value) {
                        return DropdownMenuItem<String>(
                          value: value,
                          child: Text(value),
                        );
                      }).toList(),
                      onChanged: (String? newValue) {
                        if (newValue != null) {
                          // Crucial for cross-municipality reporting: instantly re-theme and re-data the app.
                          oneVizcayaState.selectedMunicipality.value = newValue;
                        }
                      },
                    ),
                  ),
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.notifications),
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => const NotificationsScreen(),
                    ),
                  );
                },
              ),
              IconButton(
                icon: const Icon(Icons.account_circle),
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => const ProfileScreen(),
                    ),
                  );
                },
              ),
            ],
          ),
          body: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Dynamic Welcome Message Panel
                Container(
                  color: appBarColor.withOpacity(0.1),
                  padding: const EdgeInsets.symmetric(
                    vertical: 24,
                    horizontal: 16,
                  ),
                  child: Column(
                    children: [
                      Text(
                        welcomeMsg,
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: appBarColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Tap an option below to engage with your municipality.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 13, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
                // Grid implemented exactly as image_c52ca1.png colorful tiles
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: GridView.count(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    shrinkWrap: true, // Needed inside SingleChildScrollView
                    physics:
                        const NeverScrollableScrollPhysics(), // Scroll managed by parent
                    children: [
                      HomeGridItem(
                        title: 'Report a Problem',
                        subtitle: 'Local problem? Report it now.',
                        icon: Icons.report_problem,
                        // Position colors from image_c52ca1.png
                        backgroundColor: const Color(
                          0xFF35A551,
                        ), // Tile Green 1
                        textColor: const Color(
                          0xFF004A6D,
                        ), // Title text color from image
                        onTap: () => Navigator.of(context).pushNamed('/report'),
                      ),
                      HomeGridItem(
                        title: 'My Reports Status',
                        subtitle: 'Track status of your local reports.',
                        icon: Icons.history,
                        // Position colors from image_c52ca1.png
                        backgroundColor: const Color(
                          0xFFFFBE26,
                        ), // Dynamic Orange
                        textColor: const Color(
                          0xFF004A6D,
                        ), // Title text color from image
                        onTap: () => Navigator.of(context).pushNamed('/status'),
                      ),
                      HomeGridItem(
                        title: 'Emergency Contacts',
                        subtitle:
                            'Tap to call $municipality emergency services.',
                        icon: Icons.local_hospital,
                        // Position colors from image_c52ca1.png
                        backgroundColor: const Color(
                          0xFF004A6D,
                        ), // Dynamic Dark Blue
                        textColor: Colors
                            .white, // Inverted text color for dynamic darkblue
                        onTap: () =>
                            Navigator.of(context).pushNamed('/contacts'),
                      ),
                      HomeGridItem(
                        title: 'Announcements',
                        subtitle: 'Latest news for $municipality.',
                        icon: Icons.campaign,
                        // Position colors from image_c52ca1.png
                        backgroundColor: const Color(
                          0xFF006B3A,
                        ), // Dark Green 2
                        textColor: Colors.white, // Inverted text color
                        onTap: () =>
                            Navigator.of(context).pushNamed('/announcements'),
                      ),
                      HomeGridItem(
                        title: 'Support & FAQs',
                        subtitle: 'Get app help and LGU support info.',
                        icon: Icons.help_outline,
                        // Position colors from image_c52ca1.png
                        backgroundColor: const Color(
                          0xFF00796B,
                        ), // Primary Green (Teal)
                        textColor: Colors.white, // Inverted text color
                        onTap: () =>
                            Navigator.of(context).pushNamed('/support'),
                      ),
                      HomeGridItem(
                        title: 'Log Out',
                        subtitle: 'Sign out and return to login screen.',
                        icon: Icons.logout,
                        // Position colors from image_c52ca1.png
                        backgroundColor: const Color(
                          0xFFFFBE26,
                        ), // Dynamic Orange
                        textColor: const Color(
                          0xFF004A6D,
                        ), // Title text color from image
                        onTap: () {
                          FirebaseAuth.instance.signOut();
                          Navigator.of(context).pushReplacement(
                            MaterialPageRoute(
                              builder: (context) => const LoginScreen(),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class HomeGridItem extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color backgroundColor;
  final Color textColor;
  final VoidCallback onTap;

  const HomeGridItem({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.backgroundColor,
    required this.textColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: backgroundColor, // Exact colorful feel from image_c52ca1.png
      elevation: 0,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12.0),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(
                icon,
                size: 40,
                color: textColor, // Icon matches text color for dynamic looks
              ),
              const SizedBox(height: 12),
              Text(
                title,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color:
                      textColor, // Inverted text dynamic colors from image_c52ca1.png
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  color: textColor.withOpacity(0.8), // Faded dynamic subtitle
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// 3. Report a Problem Screen (Localized and Dynamic)
class ReportProblemScreen extends StatefulWidget {
  const ReportProblemScreen({super.key});

  @override
  _ReportProblemScreenState createState() => _ReportProblemScreenState();
}

class _ReportProblemScreenState extends State<ReportProblemScreen> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedCategory;
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  bool _isOffline = false;

  final List<String> _categories = [
    'Environmental & Sanitation',
    'Infrastructure & Roads',
    'Public Lighting & Utilities',
    'Water & Sewage Systems',
    'Health & Public Safety',
    'Peace & Order Disturbance',
    'Disaster & Risk Management',
    'Social & Community Services',
    'General Inquiries & Others',
  ];

  final Map<String, String> _categoryDescriptions = {
    'Environmental & Sanitation':
        'Includes: Improper Waste Management, Solid Waste Issues, Dirty/Clogged Canals, Illegal Dumping.',
    'Infrastructure & Roads':
        'Includes: Potholes, Damaged Roads/Bridges, Road Maintenance Needed, Broken Sidewalks.',
    'Public Lighting & Utilities':
        'Includes: Broken Streetlights, Electrical Repairs, Power Outages, Fallen Poles.',
    'Water & Sewage Systems':
        'Includes: Water Leakage, Water Supply Issues, Pipe Bursts, Sewage Overflow.',
    'Health & Public Safety':
        'Includes: Stray Animals, Unsanitary Food Establishments, Dengue Concerns, Stagnant Water, Fire Hazards.',
    'Peace & Order Disturbance':
        'Includes: Noise Complaints, Suspicious Activities, Traffic Violations, Public Nuisance.',
    'Disaster & Risk Management':
        'Includes: Flooding, Landslides, Fallen Trees, Natural Disaster Damage.',
    'Social & Community Services':
        'Includes: PWD/Senior Citizen Concerns, Child Welfare, Social Welfare Assistance.',
    'General Inquiries & Others':
        'Includes: Miscellaneous Reports, General Concerns, Feedback.',
  };

  void _submitReport() {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save();

      // Critical fix for cross-municipality journey: Explicitly include the municipality in report details
      final municipalityReportingTo =
          oneVizcayaState.selectedMunicipality.value;

      final reportDetails =
          'Reporting to: $municipalityReportingTo\n'
          'Category: $_selectedCategory\n'
          'Location: ${_locationController.text}\n'
          'Description: ${_descriptionController.text}';

      if (_isOffline) {
        // SMS Fallback logic using the generic hotline for that specific town.
        _sendSmsReport(municipalityReportingTo, reportDetails);
      } else {
        _sendOnlineReport(municipalityReportingTo, reportDetails);
      }
    }
  }

  Future<void> _sendSmsReport(String municipality, String details) async {
    // Dynamic SMS hotline (Louie/Bambang scenario will route to Bambang number)
    // TODO: Maintain database of LGU SMS hotlines based on municipality state
    String localizedHotline = '+639170000000'; // Generic pilot number
    if (municipality == 'Solano')
      localizedHotline = '+639181111111'; // Solano Hotline (Louie's journey)

    final String smsUri =
        'sms:$localizedHotline?body=${Uri.encodeComponent(details)}';
    try {
      if (await canLaunchUrl(Uri.parse(smsUri))) {
        await launchUrl(Uri.parse(smsUri));
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open SMS app.')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to open SMS app: $e')));
    }
  }

  Future<void> _sendOnlineReport(String municipality, String details) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final user = FirebaseAuth.instance.currentUser;
      final String userId = user?.uid ?? 'anonymous';
      final String userPhone = user?.phoneNumber ?? 'No number';

      final Map<String, dynamic> reportData = {
        'userId': userId,
        'userPhone': userPhone,
        // CRITICAL FOR PROVINCIAL EXPANSION:
        // Report data now inherently contains which LGU backend this belongs to.
        'municipality': municipality,
        'category': _selectedCategory,
        'location': _locationController.text,
        'description': _descriptionController.text,
        'status': 'reported',
        'reportedAt': FieldValue.serverTimestamp(),
      };

      // Unified provincial reports collection - localized by LGU field.
      // Fire and forget: don't await. Firestore will cache this locally and sync when possible.
      FirebaseFirestore.instance.collection('reports').add(reportData).catchError((e) {
        debugPrint("Background sync error: $e");
      });

      if (!mounted) return;
      Navigator.of(context).pop();

      _locationController.clear();
      _descriptionController.clear();
      setState(() {
        _selectedCategory = null;
      });

      _showConfirmationDialog(
        title: 'Report Submitted',
        content:
            'Your report has been successfully routed to the $municipality municipal engineering database.',
      );
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error submitting report: $e')));
    }
  }

  void _showConfirmationDialog({
    required String title,
    required String content,
  }) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          TextButton(
            child: const Text('OK'),
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pop();
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Dynamic theme colors applied automatically based on global state swap.
    final dynamicTheme = oneVizcayaState.activeTheme;
    final primaryLguColor = dynamicTheme['appBarColor'];
    final activeMunicipalityName = oneVizcayaState.selectedMunicipality.value;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: primaryLguColor,
        title: Text('Report Problem to $activeMunicipalityName'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SwitchListTile(
                title: Text(
                  _isOffline
                      ? 'Report via SMS (Offline)'
                      : 'Report via App (Online)',
                  style: Theme.of(
                    context,
                  ).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                subtitle: Text(
                  _isOffline
                      ? 'Uses your phone\'s SMS plan. Standard rates may apply.'
                      : 'Uses mobile data or Wi-Fi.',
                ),
                value: _isOffline,
                onChanged: (value) {
                  setState(() {
                    _isOffline = value;
                  });
                },
                activeThumbColor: primaryLguColor,
              ),
              const SizedBox(height: 24),

              DropdownButtonFormField<String>(
                value: _selectedCategory,
                hint: const Text('Select Problem Category'),
                isExpanded: true,
                dropdownColor: Colors.white,
                style: const TextStyle(color: Colors.black87, fontSize: 16),
                items: _categories.map((String category) {
                  return DropdownMenuItem<String>(
                    value: category,
                    child: Text(category),
                  );
                }).toList(),
                onChanged: (newValue) {
                  setState(() {
                    _selectedCategory = newValue;
                  });
                },
                validator: (value) =>
                    value == null ? 'Please select a category' : null,
                decoration: InputDecoration(
                  labelText: 'Category',
                  prefixIcon: Icon(Icons.category, color: primaryLguColor),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: primaryLguColor, width: 2),
                  ),
                  labelStyle: TextStyle(color: primaryLguColor),
                ),
              ),
              if (_selectedCategory != null)
                Padding(
                  padding: const EdgeInsets.only(
                    top: 8.0,
                    left: 12.0,
                    right: 12.0,
                  ),
                  child: Text(
                    _categoryDescriptions[_selectedCategory!] ?? '',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[700],
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _locationController,
                decoration: InputDecoration(
                  labelText: 'Location / Landmark',
                  prefixIcon: Icon(Icons.location_on, color: primaryLguColor),
                  hintText: 'e.g., "In front of Solano Municipal Hall"',
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: primaryLguColor, width: 2),
                  ),
                  labelStyle: TextStyle(color: primaryLguColor),
                ),
                validator: (value) => value == null || value.isEmpty
                    ? 'Please enter a location'
                    : null,
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _descriptionController,
                decoration: InputDecoration(
                  labelText: 'Brief Description',
                  prefixIcon: Icon(Icons.description, color: primaryLguColor),
                  hintText: 'Describe the problem in detail.',
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: primaryLguColor, width: 2),
                  ),
                  labelStyle: TextStyle(color: primaryLguColor),
                ),
                maxLines: 4,
                validator: (value) => value == null || value.isEmpty
                    ? 'Please enter a description'
                    : null,
              ),
              const SizedBox(height: 16),

              OutlinedButton.icon(
                icon: const Icon(Icons.camera_alt),
                label: const Text('Attach Photo (Optional)'),
                onPressed: _isOffline
                    ? null
                    : () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Image picker not yet implemented'),
                          ),
                        );
                      },
                style: OutlinedButton.styleFrom(
                  foregroundColor: primaryLguColor,
                  side: BorderSide(color: primaryLguColor),
                ),
              ),

              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _submitReport,
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryLguColor,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Submit Report'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _locationController.dispose();
    super.dispose();
  }
}

// 4. Report Status Screen (Dynamic Filtering)
class ReportStatusScreen extends StatelessWidget {
  const ReportStatusScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Apply dynamic theme colors based on active town state swap.
    final activeLguColor = oneVizcayaState.activeTheme['appBarColor'];
    final activeMunicipalityName = oneVizcayaState.selectedMunicipality.value;
    final user = FirebaseAuth.instance.currentUser;

    if (user == null) {
      return const Scaffold(
        body: Center(child: Text('Please log in to view reports.')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: activeLguColor,
        title: Text('My Reports to $activeMunicipalityName'),
      ),
      body: StreamBuilder<QuerySnapshot>(
        // CRITICAL FOR PROVINCIAL EXPANSION:
        // Filter reports to ONLY show ones associated with the currently viewed LGU dashboard.
        // This ensures Louie only sees his Bambang reports when viewed under Bambang context,
        // and Solano reports when viewing the Solano dashboard context.
        stream: FirebaseFirestore.instance
            .collection('reports')
            .where('userId', isEqualTo: user.uid)
            .where(
              'municipality',
              isEqualTo: activeMunicipalityName,
            ) // Dynamic local query
            .orderBy('reportedAt', descending: true)
            .snapshots(),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }

          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.history,
                    size: 64,
                    color: activeLguColor.withOpacity(0.3),
                  ),
                  const SizedBox(height: 16),
                  Text('No reports submitted to $activeMunicipalityName yet.'),
                ],
              ),
            );
          }

          final reports = snapshot.data!.docs;

          return ListView.builder(
            padding: const EdgeInsets.all(8.0),
            itemCount: reports.length,
            itemBuilder: (context, index) {
              final doc = reports[index];
              final data = doc.data() as Map<String, dynamic>;

              final report = ProblemReport(
                id: doc.id,
                category: data['category'] ?? 'Unknown',
                description: data['description'] ?? '',
                location: data['location'] ?? '',
                municipality:
                    data['municipality'] ??
                    'Unknown', // Explicit municipality in data
                status: _parseStatus(data['status']),
                reportedAt:
                    (data['reportedAt'] as Timestamp?)?.toDate() ??
                    DateTime.now(),
              );

              // Pass the active town color to the card for dynamic look.
              return ReportStatusCard(report: report, lguColor: activeLguColor);
            },
          );
        },
      ),
    );
  }

  ReportStatus _parseStatus(String? status) {
    switch (status) {
      case 'ongoing':
        return ReportStatus.ongoing;
      case 'solved':
        return ReportStatus.solved;
      default:
        return ReportStatus.reported;
    }
  }
}

class ReportStatusCard extends StatelessWidget {
  final ProblemReport report;
  final Color lguColor; // New: Pass color to card dynamically

  const ReportStatusCard({
    super.key,
    required this.report,
    required this.lguColor,
  });

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }

  IconData _getStatusIcon(ReportStatus status) {
    switch (status) {
      case ReportStatus.reported:
        return Icons.flag;
      case ReportStatus.ongoing:
        return Icons.construction;
      case ReportStatus.solved:
        return Icons.check_circle;
    }
  }

  Color _getStatusColor(ReportStatus status) {
    switch (status) {
      case ReportStatus.reported:
        return Colors.blue.shade700;
      case ReportStatus.ongoing:
        return Colors.orange.shade700;
      case ReportStatus.solved:
        return Colors.green.shade700;
    }
  }

  String _getStatusText(ReportStatus status) {
    switch (status) {
      case ReportStatus.reported:
        return 'Reported';
      case ReportStatus.ongoing:
        return 'Ongoing Process';
      case ReportStatus.solved:
        return 'Problem Solved';
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor(report.status);
    final statusText = _getStatusText(report.status);
    final statusIcon = _getStatusIcon(report.status);

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 8.0),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Text(
                    report.category,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      // Dynamic Color applied based on town swap (Pilot Teal Green)
                      color: lguColor,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: statusColor.withAlpha((255 * 0.1).round()),
                    borderRadius: BorderRadius.circular(20.0),
                  ),
                  child: Row(
                    children: [
                      Icon(statusIcon, color: statusColor, size: 16),
                      const SizedBox(width: 6),
                      Text(
                        statusText,
                        style: TextStyle(
                          color: statusColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Divider(),
            const SizedBox(height: 8),

            Text(
              report.description,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.location_on, size: 16, color: Colors.grey),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    report.location,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                const SizedBox(width: 8),
                Text(
                  'Reported on: ${_formatDate(report.reportedAt)}',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// 5. Emergency Contacts Screen (Dynamic Filtering & Theming)
class EmergencyContactsScreen extends StatelessWidget {
  const EmergencyContactsScreen({super.key});

  IconData _getIconForType(String? type) {
    switch (type) {
      case 'police':
        return Icons.local_police;
      case 'fire':
        return Icons.fire_truck;
      case 'medical':
        return Icons.local_hospital;
      case 'disaster':
        return Icons.warning;
      default:
        return Icons.phone;
    }
  }

  Future<void> _makeCall(String phoneNumber, BuildContext context) async {
    final Uri launchUri = Uri(scheme: 'tel', path: phoneNumber);
    try {
      if (await canLaunchUrl(launchUri)) {
        await launchUrl(launchUri);
      } else {
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open dialer for $phoneNumber')),
        );
      }
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to make call: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    // Apply dynamic theme colors based on active town state swap.
    final activeLguColor = oneVizcayaState.activeTheme['appBarColor'];
    final activeMunicipalityName = oneVizcayaState.selectedMunicipality.value;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: activeLguColor,
        title: Text('$activeMunicipalityName Emergency'),
      ),
      body: StreamBuilder<QuerySnapshot>(
        // CRITICAL FOR PROVINCIAL EXPANSION:
        // Localized query: Get contacts associated specifically with this municipality.
        // Louie's Bambang scenario pulls Bambang numbers; Solano scenario pulls Solano numbers.
        stream: FirebaseFirestore.instance
            .collection('emergency_contacts')
            .where(
              'municipality',
              isEqualTo: activeMunicipalityName,
            ) // Localized Query
            .snapshots(),
        builder: (context, snapshot) {
          if (snapshot.hasError)
            return Center(child: Text('Error: ${snapshot.error}'));
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.warning_amber,
                    size: 64,
                    color: activeLguColor.withOpacity(0.3),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No localized emergency contacts loaded for $activeMunicipalityName yet.',
                  ),
                ],
              ),
            );
          }

          final contacts = snapshot.data!.docs;

          return ListView.builder(
            padding: const EdgeInsets.all(8.0),
            itemCount: contacts.length,
            itemBuilder: (context, index) {
              final data = contacts[index].data() as Map<String, dynamic>;
              final name = data['name'] ?? 'Emergency';
              final number = data['number'] ?? '';
              final type = data['type'] ?? 'general';

              return Card(
                margin: const EdgeInsets.symmetric(
                  vertical: 6.0,
                  horizontal: 8.0,
                ),
                child: ListTile(
                  leading: Icon(
                    _getIconForType(type),
                    // Inverted text color dynamic looks (Primary Green 2)
                    color: activeLguColor,
                    size: 36,
                  ),
                  title: Text(
                    name,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  subtitle: Text(
                    number,
                    style: Theme.of(
                      context,
                    ).textTheme.bodyMedium?.copyWith(fontSize: 16),
                  ),
                  trailing: const Icon(Icons.call, color: Colors.green),
                  onTap: () => _makeCall(number, context),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

// 6. Announcements Screen (Dynamic Local Filtering)
class AnnouncementsScreen extends StatelessWidget {
  const AnnouncementsScreen({super.key});

  // Mock data representing localized database rows
  // TODO: Create Firestore database and dynamic streams filtered by LGU (similar to contacts)
  static final List<Map<String, String>> _allAnnouncements = [
    {
      'municipality': 'Bambang',
      'title': 'Community Agri-Fair',
      'date': 'Oct 30',
      'body':
          'Join the Bambang town plaza for the local agricultural produce fair! 8AM-5PM.',
    },
    {
      'municipality': 'Solano',
      'title': 'Public Market Drainage Upgrade',
      'date': 'Oct 28',
      'body':
          'Maintenance ongoing on market drainage; Expect temporary road closures around Solano market area.',
    },
    {
      'municipality': 'Bayombong',
      'title': 'Provincial Tourism Week',
      'date': 'Oct 25',
      'body':
          'Grand parade and culture show hosted at Capitol Complex. All Vizcayano invited!',
    },
  ];

  @override
  Widget build(BuildContext context) {
    // Apply dynamic theme colors based on active town state swap.
    final activeLguColor = oneVizcayaState.activeTheme['appBarColor'];
    final activeMunicipalityName = oneVizcayaState.selectedMunicipality.value;

    // Localized dynamic data: Filter the universal provincial feed for only this municipality's context.
    final localAnnouncements = _allAnnouncements
        .where(
          (announcement) =>
              announcement['municipality'] == activeMunicipalityName,
        )
        .toList();

    return Scaffold(
      appBar: AppBar(
        backgroundColor: activeLguColor,
        title: Text('$activeMunicipalityName News'),
      ),
      body: localAnnouncements.isEmpty
          ? Center(
              child: Text(
                "No localized announcements for $activeMunicipalityName right now.",
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(8.0),
              itemCount: localAnnouncements.length,
              itemBuilder: (context, index) {
                final announcement = localAnnouncements[index];
                return Card(
                  margin: const EdgeInsets.symmetric(
                    vertical: 8.0,
                    horizontal: 8.0,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          announcement['title']!,
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            // Dynamic looks title inverted text color (Primary Green 2)
                            color: activeLguColor,
                            fontSize: 18,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Posted: ${announcement['date']!}',
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(
                                fontStyle: FontStyle.italic,
                                fontSize: 12,
                              ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          announcement['body']!,
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(fontSize: 15, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}

// 7. Support Screen
class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Dynamic looks primary color from top row positions in image_c52ca1.png colorful grid
    const colorTeal = Color(0xFF00796B); // Teal looks in colorful grid image

    return Scaffold(
      appBar: AppBar(
        backgroundColor: colorTeal,
        title: const Text('One Vizcaya Support'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          _buildFAQItem(
            context,
            colorTeal,
            'How do I change my municipality?',
            'Simply tap the location selector (containing your town\'s name) in the top AppBar of the Home Screen. Select any municipality in Nueva Vizcaya to instantly swap the dashboard context to that town. (Journey example for Louie: Bambang to Solano).',
          ),
          _buildFAQItem(
            context,
            colorTeal,
            'Is reporting truly localized?',
            'Yes. Reports are inherently tagged with the municipality selected globally in the app at the moment of submission. This ensures your report routes directly to the correct LGU backend dashboard.',
          ),
          const Divider(height: 32),
          Text(
            'Need more help?',
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontSize: 20, color: colorTeal),
          ),
          const SizedBox(height: 16),
          ListTile(
            leading: const Icon(Icons.email, color: colorTeal),
            title: const Text('Email Provincial Support'),
            subtitle: const Text('support@vizcaya.gov.ph'),
            onTap: () {
              _launchGenericUrl('mailto:support@vizcaya.gov.ph', context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.public, color: colorTeal),
            title: const Text('Visit Provincial Website'),
            subtitle: const Text('https://www.vizcaya.gov.ph'),
            onTap: () {
              _launchGenericUrl('https://www.vizcaya.gov.ph', context);
            },
          ),
        ],
      ),
    );
  }

  Future<void> _launchGenericUrl(String url, BuildContext context) async {
    final Uri uri = Uri.parse(url);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        if (!context.mounted) return;
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Could not launch $url')));
      }
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to launch: $e')));
    }
  }

  Widget _buildFAQItem(
    BuildContext context,
    Color color,
    String question,
    String answer,
  ) {
    return ExpansionTile(
      title: Text(
        question,
        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
      iconColor: color,
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Text(
            answer,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(fontSize: 15, height: 1.4),
          ),
        ),
      ],
    );
  }
}

// --- NEW: Profile Screen ---
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    // Standard dynamic teal looks from images colorful grid top positions
    const primaryColor = Color(0xFF00796B);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: primaryColor,
        title: const Text('My Profile'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.account_circle, size: 100, color: Colors.grey),
            const SizedBox(height: 20),
            Text('Phone Number', style: Theme.of(context).textTheme.bodyMedium),
            Text(
              user?.phoneNumber ?? 'No Number',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 10),
            Text(
              'User ID: ${user?.uid.substring(0, 5)}...',
              style: TextStyle(color: Colors.grey[400]),
            ),
            const SizedBox(height: 40),
            ElevatedButton.icon(
              icon: const Icon(Icons.logout),
              label: const Text('Log Out'),
              style: ElevatedButton.styleFrom(
                backgroundColor:
                    primaryColor, // Bambang primary green for logout looks
                foregroundColor: Colors.white,
              ),
              onPressed: () async {
                await FirebaseAuth.instance.signOut();
                if (context.mounted) {
                  Navigator.of(
                    context,
                  ).pushNamedAndRemoveUntil('/', (route) => false);
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}

// --- NEW: Notifications Screen ---
class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF00796B),
        title: const Text('One Vizcaya Notifications'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.notifications_none,
              size: 80,
              color: const Color(0xFF00796B).withOpacity(0.3),
            ),
            const SizedBox(height: 16),
            const Text('No dynamic Vizcaya alerts available.'),
          ],
        ),
      ),
    );
  }
}
