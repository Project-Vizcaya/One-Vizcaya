import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/utils/toast_utils.dart';

/// Full in-app Privacy Policy, written to satisfy Republic Act No. 10173
/// (Data Privacy Act of 2012). Mirrors the repository PRIVACY.md so the policy
/// the citizen consents to in-app matches the published document. DPO and NPC
/// contacts are tappable.
class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  Future<void> _launch(BuildContext context, String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      ToastUtils.showError('Could not open $url');
    }
  }

  @override
  Widget build(BuildContext context) {
    final lguColor = const Color(0xFF2E7D32);
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Privacy Policy'),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
            16, 16, 16, MediaQuery.of(context).padding.bottom + 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Compliance banner ──
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: lguColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: lguColor.withValues(alpha: 0.3)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.verified_user_outlined, color: lguColor),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Data Privacy Act of 2012 Compliant',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'One Vizcaya processes your personal data in accordance '
                          'with Republic Act No. 10173 (Data Privacy Act of 2012) '
                          'and its Implementing Rules and Regulations.',
                          style: TextStyle(
                              fontSize: 12.5,
                              height: 1.4,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withValues(alpha: 0.75)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            const _MetaLine('Effective Date: May 27, 2026'),
            _MetaLine('App Version: ${AppConstants.appVersion}'),
            const SizedBox(height: 12),

            const _SectionTitle('1. Introduction'),
            const _SectionBody(
              'One Vizcaya ("the App") is a civic reporting platform for the '
              'citizens and Local Government Units (LGUs) of Nueva Vizcaya. This '
              'policy explains how we collect, use, store, and protect your '
              'personal data. By completing the setup screen, you give your '
              'informed consent to this policy.',
            ),

            const _SectionTitle('2. Data Controller'),
            const _SectionBody(
              'The Provincial Government of Nueva Vizcaya is the data controller. '
              'Upon adoption, the LGU is responsible for how your data is '
              'processed under RA 10173.',
            ),

            const _SectionTitle('3. Data We Collect'),
            const _SectionBody(
              'Following the principle of data minimization, we collect only:\n'
              '•  Full Name — to personalise your account and route reports\n'
              '•  Mobile Number (via Firebase Authentication) — to verify you\n'
              '•  Municipality & Barangay — to route reports to the correct LGU\n'
              '•  Problem Reports (text, photos, GPS) — your civic reports\n'
              '•  Device push token — to send you status notifications\n'
              '•  Consent timestamp — for legal compliance\n\n'
              'We do NOT collect national ID numbers, financial information, or '
              'biometric data. Photos are stripped of hidden EXIF metadata '
              '(GPS, camera serial) before upload.',
            ),

            const _SectionTitle('4. Anonymous Reporting'),
            const _SectionBody(
              'You may submit reports anonymously. Anonymous reports exclude '
              'your name, phone number, and user ID. You will not receive status '
              'update notifications for anonymous reports.',
            ),

            const _SectionTitle('5. How We Use Your Data'),
            const _SectionBody(
              'Your data is used only to: route civic reports to the appropriate '
              'LGU; send you status notifications; show emergency contacts and '
              'announcements for your area; and produce aggregated, anonymised '
              'analytics for LGU planning. Your data is never sold.',
            ),

            const _SectionTitle('6. Data Sharing'),
            const _SectionBody(
              'Your data is shared only with: Firebase (Google Cloud) for '
              'authentication and hosting; OpenWeatherMap for weather (no '
              'personal data shared); and authorised LGU staff who review reports '
              'within your jurisdiction.',
            ),

            const _SectionTitle('7. Data Retention'),
            const _SectionBody(
              'Active reports are kept until resolved or archived. Reports older '
              'than 12 months are auto-archived; reports older than 24 months are '
              'permanently deleted with their photos. Your profile is kept until '
              'you request account deletion.',
            ),

            const _SectionTitle('8. Your Rights under RA 10173'),
            const _SectionBody(
              'You have the right to: Access your data; Correct inaccurate data; '
              'request Erasure or Blocking; Object to processing; Data '
              'Portability (receive a structured copy); Withdraw your consent at '
              'any time; and to lodge a Complaint with the National Privacy '
              'Commission. You also have the right to be informed and the right '
              'to damages for violations under the Act.\n\n'
              'You can exercise these in the app: Settings → Location & Privacy → '
              '"Download My Data" (access & portability) and "Data Privacy '
              'Request" (access / correction / erasure / objection / complaint). '
              'Withdrawing consent or deleting your account stops further '
              'processing, though some data may be retained where the law '
              'requires.',
            ),

            const _SectionTitle('9. Security'),
            const _SectionBody(
              'All data is transmitted over HTTPS/TLS. Firebase Security Rules '
              'restrict access to authenticated users and authorised admins. '
              'Firebase App Check blocks unauthorised API calls. We use phone-OTP '
              'login, so no passwords are stored. Photo EXIF metadata is stripped '
              'before upload, and deleting your account also deletes your photos.',
            ),

            const _SectionTitle('10. Children'),
            const _SectionBody(
              'One Vizcaya is not directed to children under 18 and we do not '
              'knowingly collect their data. If you believe a minor has provided '
              'data, contact the DPO for immediate deletion.',
            ),

            const _SectionTitle('11. Legal Basis for Processing'),
            const _SectionBody(
              'We process your personal data only when there is a lawful basis '
              'under Sections 12 and 13 of RA 10173, namely:\n'
              '•  Your informed consent, given on the setup screen;\n'
              '•  Compliance with a legal obligation of the LGU;\n'
              '•  The legitimate public-service function and mandate of the LGU '
              'to respond to citizen reports.\n\n'
              'Sensitive personal information, if ever collected, is processed '
              'only with your consent or as otherwise allowed by law.',
            ),

            const _SectionTitle('12. International Data Transfers'),
            const _SectionBody(
              'One Vizcaya uses Google Firebase (Firebase Authentication, Cloud '
              'Firestore, Storage, Messaging and App Check). Google may process '
              'and store data on secure servers located outside the Philippines. '
              'Where this happens, the transfer is protected by Google\'s '
              'contractual and security safeguards, and we remain accountable '
              'for your data under RA 10173.',
            ),

            const _SectionTitle('13. Changes to This Policy'),
            const _SectionBody(
              'We may update this policy to reflect new features or legal '
              'requirements. Material changes will be announced in the app and '
              'the Effective Date above will be updated. Continued use after an '
              'update means you accept the revised policy; if you do not agree, '
              'you may withdraw consent or delete your account.',
            ),

            const SizedBox(height: 20),
            const _SectionTitle('Contact'),
            const SizedBox(height: 4),
            _ContactCard(
              icon: Icons.account_balance_outlined,
              iconColor: lguColor,
              title: AppConstants.dpoName,
              lines: [
                AppConstants.dpoOffice,
                AppConstants.dpoAddress,
                AppConstants.dpoEmail,
              ],
              onTap: () => _launch(context, 'mailto:${AppConstants.dpoEmail}'),
            ),
            _ContactCard(
              icon: Icons.policy_outlined,
              iconColor: lguColor,
              title: AppConstants.npcName,
              lines: [
                AppConstants.npcAddress,
                AppConstants.npcWebsite,
                AppConstants.npcHotline,
              ],
              onTap: () => _launch(context, AppConstants.npcWebsite),
            ),
          ],
        ),
      ),
    );
  }
}

class _MetaLine extends StatelessWidget {
  final String text;
  const _MetaLine(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 2),
        child: Text(
          text,
          style: TextStyle(
              fontSize: 12,
              color: Theme.of(context)
                  .colorScheme
                  .onSurface
                  .withValues(alpha: 0.6)),
        ),
      );
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 18, bottom: 6),
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
      Text(text, style: const TextStyle(fontSize: 14, height: 1.55));
}

class _ContactCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final List<String> lines;
  final VoidCallback onTap;

  const _ContactCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.lines,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
      ),
      child: ListTile(
        onTap: onTap,
        leading: Icon(icon, color: iconColor),
        title: Text(title,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Text(lines.join('\n'),
            style: const TextStyle(fontSize: 12, height: 1.5)),
        isThreeLine: lines.length > 2,
        trailing: const Icon(Icons.open_in_new, size: 18),
      ),
    );
  }
}
