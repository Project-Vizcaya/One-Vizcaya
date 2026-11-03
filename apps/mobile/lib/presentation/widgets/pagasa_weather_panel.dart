import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart' hide TextDirection;
import 'package:url_launcher/url_launcher.dart';
import '../../data/models/pagasa_product.dart';

typedef CardBuilder = Widget Function({required Widget child, EdgeInsets? margin});
typedef TitleBuilder = Widget Function(String title, {IconData? icon});

/// OFFICIAL PAGASA WEATHER — NUEVA VIZCAYA.
///
/// Reads `pagasa_products/nueva_vizcaya` (written hourly by the
/// `pagasaRegionalWatch` Cloud Function from PAGASA's Northern Luzon PRSD
/// page). Rendered with the weather screen's own card/title builders so it
/// matches the existing design.
///
/// Rules this widget keeps:
///  - The forecast covers the PROVINCE. A selected municipality is never shown
///    as having its own PAGASA reading.
///  - Advisory text is shown verbatim. A thunderstorm item is shown as current
///    only while PAGASA's stated window lasts; with no stated window it says
///    so rather than guessing. Expired items are listed as expired.
///  - Nothing here creates an alert, and absent values are shown as absent.
class PagasaWeatherPanel extends StatelessWidget {
  final String municipality;
  final CardBuilder card;
  final TitleBuilder title;

  const PagasaWeatherPanel({
    super.key,
    required this.municipality,
    required this.card,
    required this.title,
  });

  static const _accent = Color(0xFF7FB2FF);
  static const _muted = Color(0xFFB9C7E0);
  static const _amber = Color(0xFFFFD180);

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
      stream: FirebaseFirestore.instance
          .collection('pagasa_products')
          .doc('nueva_vizcaya')
          .snapshots(),
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting && !snap.hasData) {
          return card(child: _heading(child: _status(
            Icons.hourglass_top_rounded, _muted,
            'Loading the official PAGASA forecast…',
          )));
        }
        final data = snap.data?.data();
        final p = (snap.hasError || data == null) ? null : PagasaProduct.fromMap(data);
        final now = DateTime.now();
        final freshness = pagasaFreshness(p, now);

        if (freshness == PagasaFreshness.unavailable) {
          return card(child: _heading(child: _status(
            Icons.cloud_off_rounded, _amber,
            'Official PAGASA data is temporarily unavailable.'
            '${p?.lastErrorAt != null ? ' Last attempt ${_fmt(p!.lastErrorAt)}.' : ''}',
          )));
        }

        return Column(children: [
          card(child: _heading(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _freshnessBanner(p!, freshness),
              const SizedBox(height: 10),
              _coverageNote(),
              const SizedBox(height: 12),
              _forecast(p, now),
            ],
          ))),
          if (p.outlook.isNotEmpty) card(child: _outlook(p, now)),
          card(child: _advisories(p, now)),
          if (p.synopsisText != null) card(child: _synopsis(p, now)),
        ]);
      },
    );
  }

  // ── building blocks ──────────────────────────────────────────────────────

  Widget _heading({required Widget child}) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          title('Official PAGASA Weather — Nueva Vizcaya', icon: Icons.verified_rounded),
          child,
        ],
      );

  Widget _status(IconData icon, Color color, String text) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: TextStyle(color: color, fontSize: 12.5, height: 1.35))),
        ],
      );

  Widget _freshnessBanner(PagasaProduct p, PagasaFreshness f) {
    final last = p.lastSuccessAt ?? p.retrievedAt;
    switch (f) {
      case PagasaFreshness.updated:
        return _status(Icons.check_circle_outline_rounded, const Color(0xFFA5D6A7),
            'Updated from PAGASA ${_fmt(last)}.');
      case PagasaFreshness.cached:
        return _status(Icons.history_rounded, _amber,
            'Showing the last PAGASA data retrieved ${_fmt(last)}. '
            '${p.lastErrorAt != null && p.lastErrorAt!.isAfter(last!) ? 'The latest update attempt failed.' : 'A newer update has not arrived yet.'}');
      case PagasaFreshness.stale:
        return _status(Icons.warning_amber_rounded, const Color(0xFFFF8A80),
            'Stale: this PAGASA data was last retrieved ${_fmt(last)}. '
            'Check pagasa.dost.gov.ph for the current forecast.');
      case PagasaFreshness.unavailable:
        return const SizedBox.shrink();
    }
  }

  Widget _coverageNote() => Text(
        'Provincial forecast covering Nueva Vizcaya. It is not a reading from a '
        'weather station in $municipality.',
        style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.35),
      );

  Widget _forecast(PagasaProduct p, DateTime now) {
    final expired = p.forecastValidUntil != null && now.isAfter(p.forecastValidUntil!);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _subhead('24-hour provincial forecast'),
        if (expired)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: _status(Icons.schedule_rounded, _amber,
                'This forecast expired ${_fmt(p.forecastValidUntil)}. A newer one has not been retrieved.'),
          ),
        if (p.day != null) _periodRow('Day', p.day!),
        if (p.night != null) _periodRow('Night', p.night!),
        _meta(p, coverage: p.forecastCoverage, issued: p.forecastIssuedAt, validUntil: p.forecastValidUntil),
      ],
    );
  }

  Widget _periodRow(String label, PagasaPeriod x) {
    final temps = [
      if (x.low != null) 'Low ${x.low!.round()}°C',
      if (x.high != null) 'High ${x.high!.round()}°C',
    ].join(' · ');
    final wind = [x.windSpeed, x.windDirection].whereType<String>().join(', ');
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(),
              style: const TextStyle(color: _accent, fontSize: 10.5, fontWeight: FontWeight.w700, letterSpacing: 1)),
          if (x.description != null)
            Text(x.description!, style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.3)),
          if (temps.isNotEmpty) Text(temps, style: const TextStyle(color: Colors.white70, fontSize: 12.5)),
          if (wind.isNotEmpty) Text('Wind: $wind', style: const TextStyle(color: Colors.white70, fontSize: 12.5)),
        ],
      ),
    );
  }

  Widget _outlook(PagasaProduct p, DateTime now) {
    // One Vizcaya's own threshold: PAGASA issues this outlook daily, so after
    // 36 hours it is flagged as possibly outdated.
    final old = p.outlookIssuedAt != null &&
        now.difference(p.outlookIssuedAt!) > const Duration(hours: 36);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        title('PAGASA 5-day outlook — Nueva Vizcaya', icon: Icons.date_range_rounded),
        if (old)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _status(Icons.schedule_rounded, _amber,
                'Issued ${_fmt(p.outlookIssuedAt)} — may be outdated.'),
          ),
        ...p.outlook.map((d) => _periodRow(
            [d.label, if (d.date != null) _fmtDate(d.date!)].whereType<String>().join(' · '),
            d.period)),
        _meta(p, coverage: p.forecastCoverage, issued: p.outlookIssuedAt),
      ],
    );
  }

  Widget _advisories(PagasaProduct p, DateTime now) {
    final current = p.thunderstorms.where((t) => !t.isExpired(now)).toList();
    final expired = p.thunderstorms.where((t) => t.isExpired(now)).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        title('PAGASA rainfall & thunderstorm information', icon: Icons.thunderstorm_outlined),
        // ── heavy rainfall ──
        _subhead('Heavy rainfall warning'),
        if (p.rainfallNoneIssued == true)
          _status(Icons.check_rounded, Colors.white70, 'No heavy rainfall warning issued by PAGASA.')
        else if (p.rainfallText != null)
          // Not the "none issued" sentence: shown exactly as published, with
          // no colour level or severity invented by the app.
          _verbatim('As published by PAGASA:', p.rainfallText!)
        else
          _status(Icons.help_outline_rounded, _muted, 'Rainfall warning status was not found on the PAGASA page.'),
        _meta(p, coverage: p.rainfallCoverage),
        const SizedBox(height: 14),
        // ── thunderstorms ──
        _subhead('Thunderstorm information and watch'),
        if (current.isEmpty)
          _status(Icons.check_rounded, Colors.white70, 'No current thunderstorm information published.'),
        ...current.map((t) => _thunderstorm(t, expired: false)),
        if (expired.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text('Expired', style: TextStyle(color: Colors.white.withValues(alpha: 0.45), fontSize: 11, fontWeight: FontWeight.w700)),
          ...expired.map((t) => _thunderstorm(t, expired: true)),
        ],
        _meta(p, coverage: p.thunderstormCoverage),
      ],
    );
  }

  Widget _thunderstorm(PagasaThunderstorm t, {required bool expired}) {
    final kindLabel = switch (t.kind) {
      'advisory' => 'Thunderstorm Advisory',
      'watch' => 'Thunderstorm Watch',
      'information' => 'Thunderstorm Information',
      _ => 'PAGASA thunderstorm item',
    };
    final validity = t.validUntil != null
        ? (expired ? 'Expired ${_fmt(t.validUntil)}' : 'Valid until ${_fmt(t.validUntil)}')
        : 'Validity not stated by PAGASA';
    final faded = expired ? 0.45 : 1.0;
    return Opacity(
      opacity: faded,
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.10)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(spacing: 6, runSpacing: 4, children: [
              _chip(kindLabel, _accent),
              _chip(t.mentionsNuevaVizcaya ? 'Names Nueva Vizcaya' : 'Does not name Nueva Vizcaya',
                  t.mentionsNuevaVizcaya ? _amber : _muted),
            ]),
            const SizedBox(height: 6),
            Text(t.text, style: const TextStyle(color: Colors.white, fontSize: 12.5, height: 1.4)),
            const SizedBox(height: 4),
            Text(validity, style: const TextStyle(color: Colors.white60, fontSize: 11)),
          ],
        ),
      ),
    );
  }

  Widget _synopsis(PagasaProduct p, DateTime now) {
    final expired = p.synopsisValidUntil != null && now.isAfter(p.synopsisValidUntil!);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        title(
          p.synopsisMentionsTropicalCyclone
              ? 'PAGASA synopsis & tropical cyclone information'
              : 'PAGASA regional synopsis',
          icon: p.synopsisMentionsTropicalCyclone ? Icons.cyclone_rounded : Icons.public_rounded,
        ),
        if (expired)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: _status(Icons.schedule_rounded, _amber, 'This synopsis expired ${_fmt(p.synopsisValidUntil)}.'),
          ),
        Text(p.synopsisText!, style: const TextStyle(color: Colors.white, fontSize: 12.5, height: 1.4)),
        if (p.synopsisMentionsTropicalCyclone)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              'Shown as published. For official tropical cyclone warnings and wind '
              'signals, follow PAGASA bulletins and PDRRMO.',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.55), fontSize: 11),
            ),
          ),
        _meta(p, coverage: p.synopsisCoverage, issued: p.synopsisIssuedAt, validUntil: p.synopsisValidUntil),
      ],
    );
  }

  /// Attribution, coverage, issued / valid / retrieved times and source link.
  Widget _meta(PagasaProduct p,
      {PagasaCoverage? coverage, DateTime? issued, DateTime? validUntil}) {
    final cov = coverage == null
        ? null
        : '${coverage.level == 'province' ? 'Province' : 'Region'}: ${coverage.name}';
    final lines = <String>[
      'Source: ${p.office}',
      if (cov != null) 'Coverage: $cov',
      if (issued != null) 'Issued ${_fmt(issued)}',
      if (validUntil != null) 'Valid until ${_fmt(validUntil)}',
      'Retrieved ${_fmt(p.lastSuccessAt ?? p.retrievedAt)}',
    ];
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(lines.join(' · '),
              style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 10.5, height: 1.35)),
          InkWell(
            onTap: () => launchUrl(Uri.parse(p.sourceUrl), mode: LaunchMode.externalApplication),
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 4),
              child: Text('View original on PAGASA ↗',
                  style: TextStyle(color: _accent, fontSize: 11, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _subhead(String s) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(s, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700)),
      );

  Widget _verbatim(String label, String text) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: _amber.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _amber.withValues(alpha: 0.35)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: _amber, fontSize: 11, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(text, style: const TextStyle(color: Colors.white, fontSize: 12.5, height: 1.4)),
          ],
        ),
      );

  Widget _chip(String s, Color c) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
        decoration: BoxDecoration(
          color: c.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(s, style: TextStyle(color: c, fontSize: 10.5, fontWeight: FontWeight.w600)),
      );

  /// Philippine time regardless of the device's time zone, so a timestamp
  /// reads the same as PAGASA's own "Issued at" text.
  static String _fmt(DateTime? t) {
    if (t == null) return 'at an unknown time';
    final pht = t.toUtc().add(const Duration(hours: 8));
    return '${DateFormat('MMM d, h:mm a').format(pht)} PHT';
  }

  static String _fmtDate(String ymd) {
    final d = DateTime.tryParse(ymd);
    return d == null ? ymd : DateFormat('MMM d').format(d);
  }
}
