import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../core/utils/toast_utils.dart';

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
            Navigator.of(context).pushReplacementNamed('/setup');
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
                builder: (context) => PhoneVerificationScreen(verificationId: verificationId),
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

  @override
  Widget build(BuildContext context) {
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
                Image.asset('assets/images/Seal_of_Nueva_Vizcaya.svg.png', height: 120),
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
                      if (value == null || value.isEmpty) return 'Please enter your phone number';
                      if (!value.startsWith('09') || value.length != 11) return 'Please enter a valid 11-digit number starting with 09';
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.phone, color: Colors.white),
                    label: const Text('Sign in with Phone Number'),
                    onPressed: _loginWithPhone,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryColor,
                      foregroundColor: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'We will send a verification code to this number.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 12),
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

class PhoneVerificationScreen extends StatefulWidget {
  final String verificationId;
  const PhoneVerificationScreen({super.key, required this.verificationId});

  @override
  _PhoneVerificationScreenState createState() => _PhoneVerificationScreenState();
}

class _PhoneVerificationScreenState extends State<PhoneVerificationScreen> {
  final _codeController = TextEditingController();
  bool _isLoading = false;

  Future<void> _verifyCode() async {
    if (_codeController.text.isEmpty) return;
    setState(() => _isLoading = true);

    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: widget.verificationId,
        smsCode: _codeController.text,
      );

      await FirebaseAuth.instance.signInWithCredential(credential);

      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/setup', (route) => false);
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
      appBar: AppBar(
        title: const Text('Enter Verification Code'),
        backgroundColor: const Color(0xFF00796B),
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
                    backgroundColor: const Color(0xFF00796B),
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
