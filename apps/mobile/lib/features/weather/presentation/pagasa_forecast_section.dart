import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../domain/weather_models.dart';

/// Disclosure required by DOST-PAGASA's permission to use its data.
const kPagasaDisclosure =
    'Data from DOST-PAGASA. One Vizcaya is not an official PAGASA app; it only displays PAGASA\'s data.';

Color? _hex(String? s) {
  if (s == null) return null;
  final h = s.replaceFirst('#', '');
  final v = int.tryParse(h.length == 6 ? 'FF$h' : h, radix: 16);
  return v == null ? null : Color(v);
}

String _ago(DateTime t, DateTime now) {
  final d = now.difference(t);
  if (d.inMinutes < 1) return 'just now';
  if (d.inMinutes < 60) return '${d.inMinutes} min ago';
  if (d.inHours < 24) return '${d.inHours} h ago';
  return '${d.inDays} d ago';
}

String _deg(double? v) => v == null ? '–' : '${v.round()}°';

/// Official alerts for Nueva Vizcaya. Shown on the weather screen and the
/// emergency contacts screen. When alerts cannot be loaded it says so and
/// never shows another source's warnings instead.
class PagasaAlertsBanner extends StatelessWidget {
  final AlertsState state;
  final DateTime? now;
  const PagasaAlertsBanner({super.key, required this.state, this.now});

  @override
  Widget build(BuildContext context) {
    final at = now ?? DateTime.now();
    if (!state.available) {
      return _box(
        context,
        color: const Color(0xFF5D4037),
        icon: Icons.cloud_off_rounded,
        title: 'Official alerts unavailable',
        body: state.fetchedAt == null
            ? 'PAGASA alerts could not be loaded. Check PAGASA\'s own channels.'
            : 'Last updated ${_ago(state.fetchedAt!, at)}. Check PAGASA\'s own channels.',
      );
    }
    if (state.alerts.isEmpty) return const SizedBox.shrink();
    return Column(
      children: [
        for (final a in state.alerts)
          Semantics(
            button: true,
            label: 'PAGASA alert: ${a.title}. Tap to read.',
            excludeSemantics: true,
            child: InkWell(
              onTap: () => _open(context, a),
              child: _box(
                context,
                color: const Color(0xFF8B0000),
                icon: Icons.warning_amber_rounded,
                title: a.title,
                body: a.message,
                maxLines: 2,
                trailing: const Icon(Icons.chevron_right, color: Colors.white),
              ),
            ),
          ),
      ],
    );
  }

  Widget _box(BuildContext context,
      {required Color color,
      required IconData icon,
      required String title,
      required String body,
      int? maxLines,
      Widget? trailing}) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
      padding: const EdgeInsets.all(12),
      constraints: const BoxConstraints(minHeight: 48),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(12)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Colors.white, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
                const SizedBox(height: 2),
                Text(body,
                    maxLines: maxLines,
                    overflow: maxLines == null ? null : TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 13)),
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }

  void _open(BuildContext context, WeatherAlert a) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(a.title),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              SelectableText(a.message),
              const SizedBox(height: 12),
              Text(
                [
                  if (a.issuedBy != null) 'Issued by ${a.issuedBy}',
                  if (a.issuedAt != null) 'at ${_stamp(a.issuedAt!)}',
                  if (a.validUntil != null) '· valid until ${_stamp(a.validUntil!)}',
                ].join(' '),
                style: TextStyle(fontSize: 12, color: Theme.of(ctx).colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 8),
              Text(kPagasaDisclosure,
                  style: TextStyle(fontSize: 12, color: Theme.of(ctx).colorScheme.onSurfaceVariant)),
            ],
          ),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
      ),
    );
  }

  static String _stamp(DateTime t) {
    final h = t.hour % 12 == 0 ? 12 : t.hour % 12;
    return '${t.month}/${t.day} $h:${t.minute.toString().padLeft(2, '0')} ${t.hour < 12 ? 'AM' : 'PM'}';
  }
}

/// The official PAGASA forecast for the user's barangay (or town): current
/// conditions with PAGASA's heat-index and rainfall categories, the next 24
/// hours, 5 days, the nearest station, and the attribution and disclosure.
class PagasaForecastSection extends StatelessWidget {
  final WeatherSnapshot<dynamic> snapshot;

  /// Card and section-title builders from the host screen, for a matching look.
  final Widget Function({required Widget child, EdgeInsets? margin}) card;
  final Widget Function(String title, {IconData? icon}) title;
  final DateTime? now;

  const PagasaForecastSection({
    super.key,
    required this.snapshot,
    required this.card,
    required this.title,
    this.now,
  });

  static const _text = TextStyle(color: Colors.white, fontSize: 14);
  static const _muted = TextStyle(color: Color(0xFFB9C7E0), fontSize: 12);

  @override
  Widget build(BuildContext context) {
    if (snapshot.officialSourceOff) return const SizedBox.shrink();
    final at = now ?? DateTime.now();
    final f = snapshot.pagasa;
    return Column(
      children: [
        if (snapshot.mode != WeatherMode.internationalOnly) PagasaAlertsBanner(state: snapshot.alerts, now: at),
        if (f == null || snapshot.mode == WeatherMode.internationalOnly)
          card(
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: Color(0xFFB9C7E0), size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    snapshot.international != null
                        ? 'PAGASA forecast is not available right now. Showing the international forecast below.'
                        : 'PAGASA forecast is not available right now.',
                    style: _text,
                  ),
                ),
              ],
            ),
          )
        else ...[
          _current(f, at),
          if (f.hourly.isNotEmpty) _hourly(f),
          if (f.daily.isNotEmpty) _daily(f),
          if (f.stations.isNotEmpty) _station(f.stations.first, at),
          _footer(f),
        ],
      ],
    );
  }

  Widget _chip(String label, String? colorHex) {
    final c = _hex(colorHex) ?? const Color(0xFF7FB2FF);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.22),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: c),
      ),
      child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }

  Widget _icon(String? url, double size) => url == null
      ? Icon(Icons.wb_cloudy_outlined, color: Colors.white70, size: size)
      : Image.network(url,
          width: size,
          height: size,
          errorBuilder: (_, _, _) => Icon(Icons.wb_cloudy_outlined, color: Colors.white70, size: size));

  Widget _current(PagasaForecast f, DateTime at) {
    final c = f.current;
    final where = [
      if (f.barangay != null && !f.municipalityLevel) 'Brgy. ${f.barangay}',
      if (f.municipality != null) f.municipality!,
    ].join(', ');
    final intl = snapshot.internationalSummary;
    return card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          title('PAGASA forecast${where.isEmpty ? '' : ' · $where'}', icon: Icons.verified_outlined),
          if (c != null)
            Row(
              children: [
                _icon(c.iconUrl, 48),
                const SizedBox(width: 12),
                Text(_deg(c.tempC),
                    style: const TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.w300)),
                const SizedBox(width: 12),
                Expanded(child: Text(c.desc ?? '', style: _text)),
              ],
            ),
          if (c != null) ...[
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8, children: [
              if (c.heatIndexC != null || c.heatIndexDesc != null)
                _chip('Heat index ${_deg(c.heatIndexC)}${c.heatIndexDesc == null ? '' : ' · ${c.heatIndexDesc}'}',
                    c.heatIndexColor),
              if (c.rainMm != null || c.rainDesc != null)
                _chip('Rain ${c.rainMm == null ? '' : '${c.rainMm!.toStringAsFixed(1)} mm'}'
                    '${c.rainDesc == null ? '' : ' · ${c.rainDesc}'}', c.rainColor),
            ]),
          ],
          if (snapshot.mode == WeatherMode.sideBySide && intl != null && c != null) ...[
            const SizedBox(height: 12),
            Text('PAGASA ${_deg(c.tempC)}C · Intl ${_deg(intl.tempC)}C', style: _text),
            if (snapshot.sourcesDiffer)
              const Padding(
                padding: EdgeInsets.only(top: 4),
                child: Text('The two sources differ. PAGASA is the official one.',
                    style: TextStyle(color: Color(0xFFFFD54F), fontSize: 12)),
              ),
          ],
          const SizedBox(height: 10),
          Text(
            '${f.stale ? 'Not refreshed · last ' : ''}updated ${_ago(f.fetchedAt, at)}'
            '${f.municipalityLevel ? ' · town-centre forecast' : ''}',
            style: f.stale ? _muted.copyWith(color: const Color(0xFFFFD54F)) : _muted,
          ),
        ],
      ),
    );
  }

  Widget _hourly(PagasaForecast f) => card(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            title('Next 24 hours · PAGASA', icon: Icons.schedule),
            SizedBox(
              height: 104,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: f.hourly.length,
                separatorBuilder: (_, _) => const SizedBox(width: 14),
                itemBuilder: (_, i) {
                  final h = f.hourly[i];
                  return Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(h.timeLabel ?? '', style: _muted),
                      _icon(h.iconUrl, 28),
                      Text(_deg(h.tempC), style: _text),
                      Text(h.rainMm == null ? '' : '${h.rainMm!.toStringAsFixed(1)} mm', style: _muted),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      );

  Widget _daily(PagasaForecast f) => card(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            title('5-day forecast · PAGASA', icon: Icons.calendar_today_outlined),
            for (final d in f.daily)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Row(
                  children: [
                    SizedBox(width: 64, child: Text(d.dayLabel ?? d.dateLabel ?? '', style: _text)),
                    _icon(d.iconUrl, 24),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        [d.desc, d.rainDesc].whereType<String>().toSet().join(' · '),
                        style: _muted,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text('${_deg(d.tempMaxC)} / ${_deg(d.tempMinC)}', style: _text),
                  ],
                ),
              ),
            if (snapshot.mode == WeatherMode.pagasaPrimary && snapshot.international != null)
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text(
                  'Days 6–7, chance of rain, wind, UV and sunrise/sunset are below, from the international source.',
                  style: _muted,
                ),
              ),
          ],
        ),
      );

  Widget _station(StationReading s, DateTime at) => card(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            title('Nearest PAGASA station (${s.distanceKm} km away)', icon: Icons.sensors),
            Text(s.name, style: _text.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text(
              [
                if (s.tempC != null) '${s.tempC!.toStringAsFixed(1)} °C',
                if (s.humidityPct != null) '${s.humidityPct!.round()}% humidity',
                if (s.rain1hMm != null) '${s.rain1hMm!.toStringAsFixed(1)} mm rain in the last hour',
              ].join(' · '),
              style: _text,
            ),
            const SizedBox(height: 4),
            Text(
              'There is no PAGASA station inside Nueva Vizcaya; this one is the closest.'
              '${s.observedAt == null ? '' : ' Observed ${_ago(s.observedAt!, at)}.'}',
              style: _muted,
            ),
          ],
        ),
      );

  Widget _footer(PagasaForecast f) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(kPagasaDisclosure, style: _muted),
            if (f.rainMapUrl != null || f.briefingUrl != null)
              Wrap(spacing: 4, children: [
                if (f.rainMapUrl != null) _link('PAGASA rain map', f.rainMapUrl!),
                if (f.briefingUrl != null) _link('PAGASA daily briefing', f.briefingUrl!),
              ]),
          ],
        ),
      );

  Widget _link(String label, String url) => TextButton.icon(
        style: TextButton.styleFrom(foregroundColor: const Color(0xFF7FB2FF), minimumSize: const Size(0, 44)),
        onPressed: () => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication),
        icon: const Icon(Icons.open_in_new, size: 16),
        label: Text(label),
      );
}
