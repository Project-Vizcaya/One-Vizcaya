import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../state/municipality_state.dart';

/// The people behind One Vizcaya. The Lead Developer is featured first, followed
/// by the broader Project: Vizcaya Team organised by area of contribution.
class DevelopersScreen extends StatelessWidget {
  const DevelopersScreen({super.key});

  // Lead Developer is highlighted on its own card above the team list.
  static const String _leadName = 'Aaron Anthony A. Gano II';
  static const String _leadRole = 'Lead Developer';

  // Areas of contribution under the Project: Vizcaya Team banner. Names can be
  // filled in by the team; roles describe how One Vizcaya was built.
  static const List<Map<String, String>> _team = [
    {
      'name': 'Project: Vizcaya Team',
      'role': 'Mobile App Development (Flutter)',
    },
    {
      'name': 'Project: Vizcaya Team',
      'role': 'UI / UX Design',
    },
    {
      'name': 'Project: Vizcaya Team',
      'role': 'Backend & Firebase Integration',
    },
    {
      'name': 'Project: Vizcaya Team',
      'role': 'Quality Assurance & Testing',
    },
    {
      'name': 'Project: Vizcaya Team',
      'role': 'Community & LGU Coordination',
    },
  ];

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty) return '?';
    if (parts.length == 1) {
      return parts.first.characters.take(2).toString().toUpperCase();
    }
    return (parts.first.characters.first + parts.last.characters.first)
        .toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final lguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: lguColor,
        foregroundColor: Colors.white,
        title: const Text('Developers'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          // ── Intro ──
          Text(
            'Meet the Team',
            style: TextStyle(
                fontSize: 22, fontWeight: FontWeight.bold, color: lguColor),
          ),
          const SizedBox(height: 6),
          Text(
            'One Vizcaya is built by the Project: Vizcaya Team for the citizens '
            'and Local Government Units of Nueva Vizcaya.',
            style: TextStyle(
                fontSize: 13,
                height: 1.45,
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.7)),
          ),
          const SizedBox(height: 20),

          // ── Lead Developer (featured) ──
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  lguColor.withValues(alpha: 0.16),
                  lguColor.withValues(alpha: 0.04),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: lguColor.withValues(alpha: 0.35)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: lguColor,
                  child: Text(
                    _initials(_leadName),
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.star, size: 16, color: lguColor),
                          const SizedBox(width: 4),
                          Text(
                            _leadRole.toUpperCase(),
                            style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.6,
                                color: lguColor),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _leadName,
                        style: const TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Founder & Lead Developer of One Vizcaya',
                        style: TextStyle(
                            fontSize: 12.5,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withValues(alpha: 0.7)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // ── Team list ──
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 8),
            child: Text(
              'PROJECT: VIZCAYA TEAM',
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.6,
                  color: Colors.grey.shade600),
            ),
          ),
          ..._team.map((m) => _TeamTile(
                name: m['name'] ?? '',
                role: m['role'] ?? '',
                initials: _initials(m['name'] ?? ''),
                color: lguColor,
              )),

          const SizedBox(height: 24),
          Center(
            child: Text(
              'One Vizcaya • ${AppConstants.appVersionDisplay}',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
            ),
          ),
          const SizedBox(height: 4),
          Center(
            child: Text(
              'Made for the People of Nueva Vizcaya',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
            ),
          ),
        ],
      ),
    );
  }
}

class _TeamTile extends StatelessWidget {
  final String name;
  final String role;
  final String initials;
  final Color color;

  const _TeamTile({
    required this.name,
    required this.role,
    required this.initials,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
      ),
      child: ListTile(
        leading: CircleAvatar(
          radius: 22,
          backgroundColor: color.withValues(alpha: 0.12),
          child: Text(
            initials,
            style: TextStyle(
                color: color, fontWeight: FontWeight.bold, fontSize: 14),
          ),
        ),
        title: Text(
          name,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        subtitle: Text(
          role,
          style: const TextStyle(fontSize: 12.5),
        ),
      ),
    );
  }
}
