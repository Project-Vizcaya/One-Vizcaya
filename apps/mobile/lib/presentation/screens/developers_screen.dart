import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/color_utils.dart';
import '../state/municipality_state.dart';

/// The people behind One Vizcaya. The Lead Developer is featured first, followed
/// by the co-developers, each shown with their areas of contribution.
class DevelopersScreen extends StatelessWidget {
  const DevelopersScreen({super.key});

  // Lead Developer — featured on its own card above the team list.
  static const String _leadName = 'Aaron Anthony A. Gano II';
  static const String _leadRole = 'Lead Developer · Front & Back-End';
  static const String _leadSubtitle = 'Founder & Lead Developer of One Vizcaya';
  static const List<String> _leadAreas = [
    'Mobile App Development (Flutter)',
    'UI / UX Design',
    'Backend & Firebase Integration',
    'Quality Assurance & Testing',
    'Community & LGU / PLGU Coordination',
  ];

  // Co-developers, each with their own areas of contribution.
  static const List<Map<String, dynamic>> _team = [
    {
      'name': 'Sean Godric Reyes',
      'role': 'Co-Developer · Back-End',
      'areas': [
        'Mobile App Development',
        'Backend & Firebase Integration',
        'Database & Security',
      ],
    },
    {
      'name': 'Darius Acosta',
      'role': 'Head Relations Officer',
      'areas': [
        'Community & LGU / PLGU Coordination',
      ],
    },
  ];

  static String initials(String name) {
    const suffixes = {'ii', 'iii', 'iv', 'v', 'jr', 'jr.', 'sr', 'sr.'};
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty && !suffixes.contains(p.toLowerCase()))
        .toList();
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
    final muted =
        Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7);
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: lguColor,
        foregroundColor: ColorUtils.readableTextOn(lguColor),
        title: const Text('Developers'),
      ),
      body: ListView(
        padding: EdgeInsets.fromLTRB(
            16, 16, 16, MediaQuery.of(context).padding.bottom + 32),
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
            style: TextStyle(fontSize: 13, height: 1.45, color: muted),
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      radius: 32,
                      backgroundColor: lguColor,
                      child: Text(
                        initials(_leadName),
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
                              Expanded(
                                child: Text(
                                  _leadRole.toUpperCase(),
                                  style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.6,
                                      color: lguColor),
                                ),
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
                            _leadSubtitle,
                            style: TextStyle(fontSize: 12.5, color: muted),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _AreaChips(areas: _leadAreas, color: lguColor),
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
                name: m['name'] as String,
                role: m['role'] as String,
                areas: List<String>.from(m['areas'] as List),
                initials: initials(m['name'] as String),
                color: lguColor,
              )),

          const SizedBox(height: 24),
          Center(
            child: Text(
              'One Vizcaya • ${AppConstants.appVersionDisplay}',
              style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
          ),
          const SizedBox(height: 4),
          Center(
            child: Text(
              'Made for the People of Nueva Vizcaya',
              style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
          ),
        ],
      ),
    );
  }
}

/// Small rounded chips listing a member's areas of contribution.
class _AreaChips extends StatelessWidget {
  final List<String> areas;
  final Color color;

  const _AreaChips({required this.areas, required this.color});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: areas
          .map((a) => Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: color.withValues(alpha: 0.25)),
                ),
                child: Text(
                  a,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
              ))
          .toList(),
    );
  }
}

class _TeamTile extends StatelessWidget {
  final String name;
  final String role;
  final List<String> areas;
  final String initials;
  final Color color;

  const _TeamTile({
    required this.name,
    required this.role,
    required this.areas,
    required this.initials,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final muted =
        Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: color.withValues(alpha: 0.12),
                child: Text(
                  initials,
                  style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.bold,
                      fontSize: 14),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      role,
                      style: TextStyle(fontSize: 12.5, color: muted),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (areas.isNotEmpty) ...[
            const SizedBox(height: 12),
            _AreaChips(areas: areas, color: color),
          ],
        ],
      ),
    );
  }
}
