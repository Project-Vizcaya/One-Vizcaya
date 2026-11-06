import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_constants.dart';
import '../../core/constants/gov_office_directory.dart';
import '../../core/utils/color_utils.dart';
import '../../core/utils/toast_utils.dart';
import '../state/municipality_state.dart';

/// "Locate" / Citizen Guide: a searchable directory of government offices and
/// services with tap-to-call, tap-to-website, tap-to-email, and tap-to-map.
class CitizenGuideScreen extends StatefulWidget {
  const CitizenGuideScreen({super.key});

  @override
  State<CitizenGuideScreen> createState() => _CitizenGuideScreenState();
}

class _CitizenGuideScreenState extends State<CitizenGuideScreen> {
  final _searchCtrl = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _launch(Uri uri, String failMsg) async {
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        ToastUtils.showError(failMsg);
      }
    } catch (_) {
      ToastUtils.showError(failMsg);
    }
  }

  void _call(GovOffice o) {
    if (!o.hasDialablePhone) {
      ToastUtils.showInfo("This office's number is being verified.");
      return;
    }
    _launch(Uri(scheme: 'tel', path: o.phone!.replaceAll(RegExp(r'\s'), '')),
        'Could not start the call.');
  }

  void _openMap(GovOffice o) {
    final q = Uri.encodeComponent(
        o.hasAddress ? '${o.name}, ${o.address}' : o.name);
    _launch(Uri.parse('https://www.google.com/maps/search/?api=1&query=$q'),
        'Could not open the map.');
  }

  List<GovOffice> get _searchResults {
    final q = _query.trim().toLowerCase();
    return [
      for (final cat in kOfficeDirectory)
        ...cat.offices.where((o) => o.name.toLowerCase().contains(q)),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final lguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final searching = _query.trim().isNotEmpty;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: lguColor,
        foregroundColor: ColorUtils.readableTextOn(lguColor),
        title: const Text('Citizen Guide',
            style: TextStyle(fontWeight: FontWeight.w600)),
        elevation: 0,
      ),
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints:
              const BoxConstraints(maxWidth: AppConstants.kContentMaxWidth),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header + search
              Container(
                color: lguColor,
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Find the government office and service you need.',
                      style: TextStyle(
                        color: ColorUtils.readableTextOn(lguColor)
                            .withValues(alpha: 0.9),
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _searchCtrl,
                      onChanged: (v) => setState(() => _query = v),
                      textInputAction: TextInputAction.search,
                      decoration: InputDecoration(
                        isDense: true,
                        filled: true,
                        fillColor: Colors.white,
                        hintText: 'Search offices…',
                        prefixIcon:
                            Icon(Icons.search, color: Colors.grey.shade500),
                        suffixIcon: _query.isNotEmpty
                            ? IconButton(
                              tooltip: 'Close',
                                icon: const Icon(Icons.close, size: 18),
                                onPressed: () {
                                  _searchCtrl.clear();
                                  setState(() => _query = '');
                                },
                              )
                            : null,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              Expanded(
                child: searching
                    ? _buildSearchList()
                    : _buildCategoryList(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchList() {
    final results = _searchResults;
    if (results.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text(
            'No offices match "${_query.trim()}".',
            style: TextStyle(color: Colors.grey.shade600),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      itemCount: results.length,
      itemBuilder: (_, i) =>
          _OfficeCard(office: results[i], color: const Color(0xFF37474F),
              onCall: _call, onMap: _openMap, onLaunch: _launch),
    );
  }

  Widget _buildCategoryList() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        for (final cat in kOfficeDirectory) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 8, 4, 10),
            child: Row(
              children: [
                Icon(cat.icon, size: 18, color: cat.color),
                const SizedBox(width: 8),
                Text(
                  cat.title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: cat.color,
                  ),
                ),
              ],
            ),
          ),
          for (final o in cat.offices)
            _OfficeCard(office: o, color: cat.color,
                onCall: _call, onMap: _openMap, onLaunch: _launch),
          const SizedBox(height: 8),
        ],
      ],
    );
  }
}

class _OfficeCard extends StatelessWidget {
  final GovOffice office;
  final Color color;
  final void Function(GovOffice) onCall;
  final void Function(GovOffice) onMap;
  final Future<void> Function(Uri, String) onLaunch;

  const _OfficeCard({
    required this.office,
    required this.color,
    required this.onCall,
    required this.onMap,
    required this.onLaunch,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: theme.dividerColor.withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.account_balance, size: 20, color: color),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    office.name,
                    style: const TextStyle(
                        fontSize: 14.5, fontWeight: FontWeight.w600, height: 1.25),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _row(
            icon: Icons.location_on_outlined,
            text: office.hasAddress ? office.address! : 'Address being verified',
            muted: !office.hasAddress,
            onTap: () => onMap(office),
          ),
          if (office.hours != null && office.hours!.isNotEmpty)
            _row(icon: Icons.schedule, text: office.hours!, muted: false),
          if (office.website != null && office.website!.isNotEmpty)
            _row(
              icon: Icons.public,
              text: office.website!,
              link: true,
              onTap: () => onLaunch(
                  Uri.parse(office.website!), 'Could not open the website.'),
            ),
          _row(
            icon: Icons.call_outlined,
            text: office.hasDialablePhone ? office.phone! : 'Number being verified',
            muted: !office.hasDialablePhone,
            link: office.hasDialablePhone,
            onTap: () => onCall(office),
          ),
          if (office.email != null && office.email!.isNotEmpty)
            _row(
              icon: Icons.mail_outline,
              text: office.email!,
              link: true,
              onTap: () => onLaunch(
                  Uri(scheme: 'mailto', path: office.email!),
                  'Could not open email.'),
            ),
        ],
      ),
    );
  }

  Widget _row({
    required IconData icon,
    required String text,
    bool link = false,
    bool muted = false,
    VoidCallback? onTap,
  }) {
    final content = Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 15,
              color: muted ? Colors.grey.shade400 : Colors.grey.shade600),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 12.5,
                height: 1.35,
                fontStyle: muted ? FontStyle.italic : FontStyle.normal,
                color: muted
                    ? Colors.grey.shade500
                    : link
                        ? const Color(0xFF1565C0)
                        : Colors.grey.shade800,
                decoration: link ? TextDecoration.underline : null,
              ),
            ),
          ),
        ],
      ),
    );
    return (onTap != null && !muted)
        ? InkWell(onTap: onTap, child: content)
        : content;
  }
}
