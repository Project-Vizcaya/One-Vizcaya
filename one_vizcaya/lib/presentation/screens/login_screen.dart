import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/utils/toast_utils.dart';
import '../../features/auth/presentation/screens/privacy_policy_screen.dart';
import '../../core/widgets/sms_cooldown_button.dart';
import '../state/municipality_state.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  bool _isLoading = false;
  bool _hasValidInput = false;
  bool _showBiometric = false;
  bool _isBiometricLoading = false;
  int _biometricFailCount = 0;

  final _phoneController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;
  final LocalAuthentication _localAuth = LocalAuthentication();

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOut,
    );
    _fadeController.forward();
    _phoneController.addListener(_checkInput);
    _checkBiometricAvailability();
  }

  Future<void> _checkBiometricAvailability() async {
    try {
      final canCheck = await _localAuth.canCheckBiometrics;
      if (!canCheck) return;
      final prefs = await SharedPreferences.getInstance();
      final savedPhone = prefs.getString('saved_phone_number');
      if (savedPhone != null && savedPhone.isNotEmpty) {
        if (mounted) setState(() => _showBiometric = true);
      }
    } catch (_) {}
  }

  void _checkInput() {
    final text = _phoneController.text.trim();
    final isValid = text.startsWith('09') && text.length == 11;
    if (isValid != _hasValidInput) {
      setState(() => _hasValidInput = isValid);
    }
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

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
          // Save only after successful auth
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('saved_phone_number', _phoneController.text.trim());
          if (mounted) {
            // Let AuthGate decide routing (setup vs home) based on profile state
            Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
          }
        },
        verificationFailed: (FirebaseAuthException e) {
          if (mounted) {
            setState(() => _isLoading = false);
            ToastUtils.showError('Verification failed: ${e.message}');
          }
        },
        codeSent: (String verificationId, int? resendToken) {
          if (mounted) {
            setState(() => _isLoading = false);
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) =>
                    PhoneVerificationScreen(
                      verificationId: verificationId,
                      phoneNumber: phoneNumber,
                    ),
              ),
            );
          }
        },
        codeAutoRetrievalTimeout: (String verificationId) {},
      );
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ToastUtils.showError('An error occurred: $e');
      }
    }
  }

  Future<void> _loginWithBiometric() async {
    // Check if biometrics are set up on the device
    try {
      final canCheck = await _localAuth.canCheckBiometrics;
      if (!canCheck) {
        ToastUtils.showError('Biometric authentication not set up on this device');
        return;
      }
      final availableBiometrics = await _localAuth.getAvailableBiometrics();
      if (availableBiometrics.isEmpty) {
        ToastUtils.showError('Biometric authentication not set up on this device');
        return;
      }
    } catch (_) {
      ToastUtils.showError('Biometric authentication not set up on this device');
      return;
    }

    if (_biometricFailCount >= 3) {
      ToastUtils.showError('Too many failed attempts. Please log in with your phone number.');
      return;
    }

    setState(() => _isBiometricLoading = true);

    try {
      final authenticated = await _localAuth.authenticate(
        localizedReason: 'Verify your identity to sign in',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );

      if (!mounted) return;

      if (!authenticated) {
        // User cancelled — do nothing silently
        setState(() => _isBiometricLoading = false);
        return;
      }

      final prefs = await SharedPreferences.getInstance();
      final savedPhone = prefs.getString('saved_phone_number');
      if (savedPhone == null || savedPhone.isEmpty) {
        setState(() => _isBiometricLoading = false);
        ToastUtils.showError('No saved phone number. Please log in manually first.');
        return;
      }

      // Pre-fill and trigger OTP flow
      _phoneController.text = savedPhone;
      _checkInput();
      setState(() => _isBiometricLoading = false);
      await _loginWithPhone();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isBiometricLoading = false;
        _biometricFailCount++;
      });
      if (_biometricFailCount >= 3) {
        ToastUtils.showError('Too many failed attempts. Please log in with your phone number.');
      } else {
        // Only show error for unexpected failures, not user cancellation
        final errStr = e.toString().toLowerCase();
        if (!errStr.contains('cancel') && !errStr.contains('user_cancel')) {
          ToastUtils.showError('Biometric authentication failed.');
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Column(
            children: [
              // ── Top bar with Help ──
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF333333),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.help_outline,
                            color: Colors.white,
                            size: 16,
                          ),
                          SizedBox(width: 6),
                          Text(
                            'Help',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // ── Main content ──
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SizedBox(height: 48),

                        // ── App Logo ──
                        Center(
                          child: Image.asset(
                            'assets/images/Seal_of_Nueva_Vizcaya.svg.png',
                            height: 80,
                          ),
                        ),
                        const SizedBox(height: 16),

                        // ── App Name ──
                        const Center(
                          child: Text(
                            'One Vizcaya',
                            style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF4CAF50),
                              letterSpacing: -0.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Center(
                          child: Text(
                            'Isang Boses. Isang Vizcaya.',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF4CAF50),
                              letterSpacing: 0.2,
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Center(
                          child: Text(
                            'Connecting you to your municipality',
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ),

                        const SizedBox(height: 56),

                        // ── Phone Number Field ──
                        if (_isLoading)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 60),
                            child: Center(
                              child: CircularProgressIndicator(
                                color: Color(0xFF4CAF50),
                                strokeWidth: 2.5,
                              ),
                            ),
                          )
                        else ...[
                          Text(
                            'Phone Number',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: const Color(
                                0xFF4CAF50,
                              ).withValues(alpha: 0.8),
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            style: TextStyle(
                              fontSize: 16,
                              color: Theme.of(context).textTheme.bodyLarge?.color,
                            ),
                            decoration: InputDecoration(
                              hintText: '09171234567',
                              hintStyle: TextStyle(color: Colors.grey.shade400),
                              prefixIcon: Padding(
                                padding: const EdgeInsets.only(
                                  left: 16,
                                  right: 8,
                                ),
                                child: Icon(
                                  Icons.phone_outlined,
                                  color: Colors.grey.shade400,
                                  size: 20,
                                ),
                              ),
                              filled: true,
                              fillColor: Theme.of(context).cardColor,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 20,
                                vertical: 18,
                              ),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide(
                                  color: Colors.grey.shade200,
                                ),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide(
                                  color: Colors.grey.shade200,
                                ),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: const BorderSide(
                                  color: Color(0xFF4CAF50),
                                  width: 1.5,
                                ),
                              ),
                              errorBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: const BorderSide(
                                  color: Colors.redAccent,
                                ),
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty)
                                return 'Please enter your phone number';
                              if (!value.startsWith('09') ||
                                  value.length != 11) {
                                return 'Please enter a valid 11-digit number starting with 09';
                              }
                              return null;
                            },
                          ),

                          const SizedBox(height: 16),

                          // ── Privacy Policy link ──
                          Center(
                            child: TextButton(
                              onPressed: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const PrivacyPolicyScreen(),
                                ),
                              ),
                              child: const Text(
                                'Privacy Policy (RA 10173)',
                                style: TextStyle(
                                  color: Color(0xFF4CAF50),
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ),

                          // ── Need help link ──
                          Center(
                            child: TextButton(
                              onPressed: () => ToastUtils.showInfo(
                                'Contact support for help',
                              ),
                              child: const Text(
                                'Need help signing in?',
                                style: TextStyle(
                                  color: Color(0xFF4CAF50),
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 24),

                          // ── Info text ──
                          Center(
                            child: Text(
                              'We will send a verification code to this number.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade500,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),

              // ── Bottom Login Button ──
              if (!_isLoading) ...[
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeOut,
                    width: double.infinity,
                    height: 56,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: _hasValidInput
                          ? [
                              BoxShadow(
                                color: const Color(
                                  0xFF388E3C,
                                ).withValues(alpha: 0.45),
                                blurRadius: 18,
                                offset: const Offset(0, 6),
                                spreadRadius: 1,
                              ),
                            ]
                          : [],
                    ),
                    child: ElevatedButton(
                      onPressed: _loginWithPhone,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _hasValidInput
                            ? const Color(0xFF388E3C)
                            : const Color(0xFFBDBDBD),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text(
                        'Log in',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                  ),
                ),

                // ── "— or —" divider + biometric button (only if available) ──
                if (_showBiometric) ...[
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Row(
                      children: [
                        Expanded(child: Divider(color: Colors.grey.shade300)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Text(
                            'or',
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade400,
                            ),
                          ),
                        ),
                        Expanded(child: Divider(color: Colors.grey.shade300)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                    child: InkWell(
                      onTap: _isBiometricLoading ? null : _loginWithBiometric,
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            vertical: 14, horizontal: 20),
                        decoration: BoxDecoration(
                          border: Border.all(
                              color: const Color(0xFF4CAF50).withValues(alpha: 0.4)),
                          borderRadius: BorderRadius.circular(12),
                          color: const Color(0xFF4CAF50).withValues(alpha: 0.05),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _isBiometricLoading
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Color(0xFF4CAF50),
                                    ),
                                  )
                                : const Icon(Icons.fingerprint,
                                    color: Color(0xFF4CAF50), size: 24),
                            const SizedBox(width: 10),
                            const Text(
                              'Sign in with Biometrics',
                              style: TextStyle(
                                color: Color(0xFF4CAF50),
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ] else
                  const SizedBox(height: 24),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class PhoneVerificationScreen extends StatefulWidget {
  final String verificationId;
  final String phoneNumber;
  const PhoneVerificationScreen({
    super.key,
    required this.verificationId,
    required this.phoneNumber,
  });

  @override
  _PhoneVerificationScreenState createState() =>
      _PhoneVerificationScreenState();
}

class _PhoneVerificationScreenState extends State<PhoneVerificationScreen> {
  final _codeController = TextEditingController();
  bool _isLoading = false;
  late String _currentVerificationId;

  @override
  void initState() {
    super.initState();
    _currentVerificationId = widget.verificationId;
  }

  Future<void> _verifyCode() async {
    if (_codeController.text.length < 6) {
      ToastUtils.showError('Please enter the complete 6-digit code.');
      return;
    }
    setState(() => _isLoading = true);

    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: _currentVerificationId,
        smsCode: _codeController.text,
      );
      final result = await FirebaseAuth.instance.signInWithCredential(credential);
      final user = result.user;

      // Auto-create Firestore user document on first login so that:
      // 1) Admin role-assignment search can find this user by phoneNumber
      // 2) Profile screen always has a document to read/update
      if (user != null) {
        final ref = FirebaseFirestore.instance.collection('users').doc(user.uid);
        final existing = await ref.get();
        if (!existing.exists) {
          await ref.set({
            'uid': user.uid,
            'phoneNumber': user.phoneNumber ?? '',
            'name': '',
            'email': '',
            'location': '',
            'municipality': oneVizcayaState.selectedMunicipality.value,
            'role': 'citizen',
            'createdAt': FieldValue.serverTimestamp(),
          });
        } else if (existing.data()?['phoneNumber'] == null ||
                   (existing.data()?['phoneNumber'] as String).isEmpty) {
          // Patch missing phoneNumber on older documents
          await ref.update({'phoneNumber': user.phoneNumber ?? ''});
        }
      }

      if (mounted) {
        // Let AuthGate decide routing (setup vs home) based on profile state
        Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ToastUtils.showError('Failed to verify code: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          'Verification',
          style: TextStyle(
            color: Theme.of(context).textTheme.titleLarge?.color,
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        foregroundColor: Theme.of(context).textTheme.titleLarge?.color,
        elevation: 0,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: const BoxDecoration(
                  color: Color(0xFFE8F5E9),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.sms_outlined,
                  size: 32,
                  color: Color(0xFF4CAF50),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Enter Verification Code',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).textTheme.headlineSmall?.color,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Enter the 6-digit code sent to your phone.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
              ),
              const SizedBox(height: 32),
              TextFormField(
                controller: _codeController,
                decoration: InputDecoration(
                  hintText: '• • • • • •',
                  hintStyle: TextStyle(
                    color: Colors.grey.shade400,
                    fontSize: 24,
                    letterSpacing: 8,
                  ),
                  filled: true,
                  fillColor: Theme.of(context).cardColor,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 18,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: Colors.grey.shade200),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: Colors.grey.shade200),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(
                      color: Color(0xFF4CAF50),
                      width: 1.5,
                    ),
                  ),
                ),
                keyboardType: TextInputType.number,
                maxLength: 6,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 28,
                  letterSpacing: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),

              // ── SMS Cooldown Button ──
              SmsCooldownButton(
                onSend: () async {
                  try {
                    await FirebaseAuth.instance.verifyPhoneNumber(
                      phoneNumber: widget.phoneNumber,
                      verificationCompleted: (_) {},
                      verificationFailed: (e) {
                        ToastUtils.showError('Resend failed: ${e.message}');
                      },
                      codeSent: (newVerificationId, _) {
                        _currentVerificationId = newVerificationId;
                        ToastUtils.showInfo('A new code has been sent.');
                      },
                      codeAutoRetrievalTimeout: (_) {},
                    );
                  } catch (e) {
                    ToastUtils.showError('Resend failed: $e');
                  }
                },
              ),

              const SizedBox(height: 16),
              if (_isLoading)
                const Center(
                  child: CircularProgressIndicator(
                    color: Color(0xFF4CAF50),
                    strokeWidth: 2.5,
                  ),
                )
              else
                SizedBox(
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _verifyCode,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4CAF50),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Text(
                      'Verify & Sign In',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
