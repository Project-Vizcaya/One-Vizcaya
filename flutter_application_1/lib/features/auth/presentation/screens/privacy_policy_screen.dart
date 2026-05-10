import 'package:flutter/material.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Privacy Policy')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'Data Privacy Policy',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text(
              'In compliance with Republic Act No. 10173 (Data Privacy Act of 2012)',
              style: TextStyle(fontStyle: FontStyle.italic),
            ),
            SizedBox(height: 16),
            _SectionTitle('What We Collect'),
            _SectionBody(
              'We collect only: Full Name, Phone Number, and Municipality. No unnecessary personal data is collected.',
            ),
            _SectionTitle('How We Use It'),
            _SectionBody(
              'Your data is used solely for LGU emergency response and issue resolution within Nueva Vizcaya. It is never sold or shared with third parties.',
            ),
            _SectionTitle('How We Protect It'),
            _SectionBody(
              'All data is stored on Google Firebase, which provides encryption at rest and in transit, and is ISO 27001 certified.',
            ),
            _SectionTitle('Your Rights'),
            _SectionBody(
              'Under RA 10173, you have the right to access, correct, and request deletion of your personal data at any time by contacting the LGU administrator.',
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 12, bottom: 4),
    child: Text(
      text,
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
    ),
  );
}

class _SectionBody extends StatelessWidget {
  final String text;
  const _SectionBody(this.text);
  @override
  Widget build(BuildContext context) =>
      Text(text, style: const TextStyle(fontSize: 14, height: 1.5));
}
