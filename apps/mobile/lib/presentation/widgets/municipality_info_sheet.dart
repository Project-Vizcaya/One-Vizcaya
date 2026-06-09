import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_constants.dart';
import '../../core/services/municipality_info_service.dart';
import '../../core/utils/toast_utils.dart';

/// Opens the municipality information sheet from the home header. Shows curated
/// offline facts immediately and enriches them with a live Wikipedia summary.
Future<void> showMunicipalityInfoSheet(
    BuildContext context, String municipality) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    useSafeArea: true,
    builder: (_) => _MunicipalityInfoSheet(municipality: municipality),
  );
}

class _MunicipalityInfoSheet extends StatefulWidget {
  final String municipality;
  const _MunicipalityInfoSheet({required this.municipality});

  @override
  State<_MunicipalityInfoSheet> createState() => _MunicipalityInfoSheetState();
}

class _MunicipalityInfoSheetState extends State<_MunicipalityInfoSheet> {
  bool _loadingWiki = true;
  String? _wikiSummary;

  @override
  void initState() {
    super.initState();
    _loadWiki();
  }

  Future<void> _loadWiki() async {
    final summary =
        await MunicipalityInfoService.fetchWikipediaSummary(widget.municipality);
    if (!mounted) return;
    setState(() {
      _wikiSummary = summary;
      _loadingWiki = false;
    });
  }

  Future<void> _openWikipedia() async {
    final uri =
        Uri.parse(MunicipalityInfoService.wikipediaUrl(widget.municipality));
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        ToastUtils.showError('Could not open Wikipedia');
      }
    } catch (e) {
      ToastUtils.showError('Failed to open link: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = AppConstants.municipalityThemes[widget.municipality] ??
        AppConstants.municipalityThemes['Generic']!;
    final primary = theme['appBarColor'] as Color;
    final tertiary = (theme['tertiaryColor'] as Color?) ??
        Theme.of(context).cardColor;
    final title = (theme['title'] as String?) ?? 'Nueva Vizcaya';
    final seal = AppConstants.municipalitySeals[widget.municipality];
    final barangays =
        AppConstants.municipalityBarangays[widget.municipality] ?? const [];
    final info = MunicipalityInfoService.infoFor(widget.municipality);

    return DraggableScrollableSheet(
      initialChildSize: 0.78,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => ConstrainedBox(
        constraints:
            const BoxConstraints(maxWidth: AppConstants.kContentMaxWidth),
        child: Container(
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: EdgeInsets.fromLTRB(
                      20, 16, 20, MediaQuery.of(context).padding.bottom + 32),
                  children: [
                    // ── Header ──
                    Row(
                      children: [
                        if (seal != null)
                          Image.asset(seal,
                              width: 56,
                              height: 56,
                              fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) =>
                                  Icon(Icons.location_city, color: primary))
                        else
                          Icon(Icons.location_city, color: primary, size: 48),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.municipality,
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: primary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                title,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontStyle: FontStyle.italic,
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurface
                                      .withValues(alpha: 0.7),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    if (info != null) ...[
                      _Section(
                        icon: Icons.info_outline,
                        color: primary,
                        title: 'About',
                        child: Text(info.about,
                            style: const TextStyle(fontSize: 14, height: 1.5)),
                      ),
                      _Section(
                        icon: Icons.flag_outlined,
                        color: primary,
                        title: 'Established',
                        child: Text(info.founded,
                            style: const TextStyle(fontSize: 14, height: 1.5)),
                      ),
                    ],

                    // ── Barangays ──
                    _Section(
                      icon: Icons.holiday_village_outlined,
                      color: primary,
                      title: 'Barangays (${barangays.length})',
                      child: Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: barangays
                            .map((b) => Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: tertiary,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(
                                        color:
                                            primary.withValues(alpha: 0.25)),
                                  ),
                                  child: Text(b,
                                      style: const TextStyle(fontSize: 12)),
                                ))
                            .toList(),
                      ),
                    ),

                    // ── Trivia ──
                    if (info != null && info.trivia.isNotEmpty)
                      _Section(
                        icon: Icons.lightbulb_outline,
                        color: primary,
                        title: 'Did you know?',
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: info.trivia
                              .map((t) => Padding(
                                    padding:
                                        const EdgeInsets.only(bottom: 8),
                                    child: Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Padding(
                                          padding:
                                              const EdgeInsets.only(top: 5),
                                          child: Icon(Icons.circle,
                                              size: 6, color: primary),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(t,
                                              style: const TextStyle(
                                                  fontSize: 14, height: 1.45)),
                                        ),
                                      ],
                                    ),
                                  ))
                              .toList(),
                        ),
                      ),

                    // ── Live Wikipedia summary ──
                    _Section(
                      icon: Icons.public,
                      color: primary,
                      title: 'From Wikipedia',
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (_loadingWiki)
                            Row(
                              children: [
                                SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: primary),
                                ),
                                const SizedBox(width: 10),
                                Text('Loading latest info…',
                                    style: TextStyle(
                                        fontSize: 13,
                                        color: Colors.grey.shade600)),
                              ],
                            )
                          else if (_wikiSummary != null)
                            Text(_wikiSummary!,
                                style:
                                    const TextStyle(fontSize: 14, height: 1.5))
                          else
                            Text(
                              'Live summary is unavailable right now. The '
                              'information above is available offline.',
                              style: TextStyle(
                                  fontSize: 13,
                                  fontStyle: FontStyle.italic,
                                  color: Colors.grey.shade600),
                            ),
                          const SizedBox(height: 12),
                          OutlinedButton.icon(
                            onPressed: _openWikipedia,
                            icon: const Icon(Icons.open_in_new, size: 16),
                            label: const Text('Read more on Wikipedia'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: primary,
                              side: BorderSide(
                                  color: primary.withValues(alpha: 0.5)),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 8),
                    Center(
                      child: Text(
                        'Compiled from public sources for general information.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 11, color: Colors.grey.shade500),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final Widget child;

  const _Section({
    required this.icon,
    required this.color,
    required this.title,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: color),
              ),
            ],
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}
