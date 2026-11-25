import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/l10n/app_strings.dart';
import '../../../../core/utils/color_utils.dart';
import '../../../../presentation/state/municipality_state.dart';

/// Announcements posted within this window carry a NEW tag.
const kAnnouncementNewWindow = Duration(hours: 48);

bool isNewAnnouncement(DateTime? postedAt, DateTime now) =>
    postedAt != null && now.difference(postedAt) < kAnnouncementNewWindow;

DateTime? _postedAt(Map<String, dynamic> data) {
  final t = data['timestamp'];
  return t is Timestamp ? t.toDate() : null;
}

// Shared neutrals from the municipal colour guide (light) and the app's dark
// theme. The town colour is only an accent: the left bar, the label, NEW.
const _inkLight = Color(0xFF202522);
const _mutedLight = Color(0xFF68716B);
const _lineLight = Color(0xFFE2E7E1);
const _mutedDark = Color(0xFFA8ADB5);
const _emergencyRed = Color(0xFFC62828);

/// Card height that fits the label, a two-line headline, the summary and the
/// source at the user's text size.
double announcementCardHeight(double textScale) {
  final s = textScale.clamp(1.0, 2.0);
  final summaryLines = s > 1.5 ? 1 : 2;
  return 58 + (18 + 38 + 18.0 * summaryLines + 17) * s;
}

class AnnouncementsCarousel extends StatefulWidget {
  final String municipality;
  const AnnouncementsCarousel({super.key, required this.municipality});

  @override
  State<AnnouncementsCarousel> createState() => _AnnouncementsCarouselState();
}

class _AnnouncementsCarouselState extends State<AnnouncementsCarousel> {
  final _pages = PageController();
  int _page = 0;

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('announcements')
          .where('municipality', whereIn: [widget.municipality, 'All'])
          .orderBy('timestamp', descending: true)
          .limit(5)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return const _EmptyAnnouncement();
        }
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SizedBox(
            height: 120,
            child: Center(child: CircularProgressIndicator()),
          );
        }
        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
          return const _EmptyAnnouncement();
        }
        final items = snapshot.data!.docs
            .map((d) => d.data() as Map<String, dynamic>)
            .toList();
        return AnnouncementPager(
          items: items,
          accent: oneVizcayaState.activeTheme['appBarColor'] as Color,
          now: DateTime.now(),
          controller: _pages,
          page: _page,
          onPageChanged: (i) => setState(() => _page = i),
        );
      },
    );
  }
}

/// The swipeable cards plus page dots. Separate from the Firestore stream so
/// it can be rendered in tests.
class AnnouncementPager extends StatelessWidget {
  final List<Map<String, dynamic>> items;
  final Color accent;
  final DateTime now;
  final PageController? controller;
  final int page;
  final ValueChanged<int>? onPageChanged;

  const AnnouncementPager({
    super.key,
    required this.items,
    required this.accent,
    required this.now,
    this.controller,
    this.page = 0,
    this.onPageChanged,
  });

  @override
  Widget build(BuildContext context) {
    final height = announcementCardHeight(
      MediaQuery.textScalerOf(context).scale(1),
    );
    final dotAccent = _textSafe(context, accent);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          height: height,
          child: PageView.builder(
            controller: controller,
            itemCount: items.length,
            onPageChanged: onPageChanged,
            itemBuilder: (context, i) =>
                AnnouncementCard(data: items[i], accent: accent, now: now),
          ),
        ),
        if (items.length > 1)
          ExcludeSemantics(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < items.length; i++)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: i == page ? 18 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(3),
                      // Unread-style hint: new posts you haven't swiped to
                      // keep the town colour, the rest are grey.
                      color:
                          i == page ||
                              isNewAnnouncement(_postedAt(items[i]), now)
                          ? dotAccent.withValues(alpha: i == page ? 1 : 0.45)
                          : Theme.of(
                              context,
                            ).colorScheme.onSurface.withValues(alpha: 0.18),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

Color _surfaceOf(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
    ? Theme.of(context).colorScheme.surface
    : Colors.white;

Color _textSafe(BuildContext context, Color accent) =>
    ColorUtils.textSafeAccent(accent, _surfaceOf(context));

/// White card, a narrow bar in the town's colour, a small label, a dark
/// headline and a muted summary. New posts get a NEW tag and a town-tinted
/// outline: noticeable next to older ones, still quieter than the SOS card.
class AnnouncementCard extends StatelessWidget {
  final Map<String, dynamic> data;
  final Color accent;
  final DateTime now;
  const AnnouncementCard({
    super.key,
    required this.data,
    required this.accent,
    required this.now,
  });

  Future<void> _openSource() async {
    final url = data['sourceUrl'] as String? ?? '';
    if (url.isEmpty) return;
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dark = theme.brightness == Brightness.dark;
    final title = data['title'] as String? ?? '';
    final body = data['body'] as String? ?? '';
    final isUrgent = data['isUrgent'] as bool? ?? false;
    final sourceUrl = data['sourceUrl'] as String? ?? '';
    final postedBy = data['postedBy'] as String? ?? '';
    final provincial = data['municipality'] == 'All';
    final isNew = isNewAnnouncement(_postedAt(data), now);

    final surface = _surfaceOf(context);
    final ink = dark ? theme.colorScheme.onSurface : _inkLight;
    final muted = dark ? _mutedDark : _mutedLight;
    final tone = isUrgent ? _emergencyRed : accent;
    final toneText = _textSafe(context, tone);
    // The bar is decoration, so light mode keeps the town's own colour; on a
    // dark surface it uses the lifted shade so maroon or navy stays visible.
    final bar = dark ? toneText : tone;
    final line = dark ? Colors.white.withValues(alpha: 0.12) : _lineLight;
    final label = AppStrings.get(
      isUrgent
          ? 'urgentBadge'
          : provincial
          ? 'annProvincial'
          : 'annOfficial',
    );
    final summaryLines = MediaQuery.textScalerOf(context).scale(1) > 1.5
        ? 1
        : 2;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isUrgent || isNew ? toneText.withValues(alpha: 0.5) : line,
          width: isUrgent || isNew ? 1.4 : 1,
        ),
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: sourceUrl.isNotEmpty ? _openSource : null,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 14, 14, 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  width: isNew || isUrgent ? 5 : 4,
                  decoration: BoxDecoration(
                    color: bar,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          if (isUrgent) ...[
                            Icon(
                              Icons.warning_amber_rounded,
                              size: 15,
                              color: toneText,
                            ),
                            const SizedBox(width: 4),
                          ],
                          // Label and NEW sit together on the left; the link icon
                          // stays right. The label truncates only if both can't fit.
                          Expanded(
                            child: Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    label,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.6,
                                      color: toneText,
                                    ),
                                  ),
                                ),
                                if (isNew) ...[
                                  const SizedBox(width: 8),
                                  _NewTag(color: toneText),
                                ],
                              ],
                            ),
                          ),
                          if (sourceUrl.isNotEmpty)
                            Icon(Icons.open_in_new, size: 14, color: muted),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          height: 1.25,
                          fontWeight: FontWeight.w700,
                          color: ink,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        body,
                        maxLines: summaryLines,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          height: 1.35,
                          color: muted,
                        ),
                      ),
                      if (postedBy.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          '— $postedBy',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: muted,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Small filled "NEW" tag. Its dot breathes a few times when the card first
/// appears, then rests, so it draws the eye once without nagging.
class _NewTag extends StatefulWidget {
  final Color color;
  const _NewTag({required this.color});

  @override
  State<_NewTag> createState() => _NewTagState();
}

class _NewTagState extends State<_NewTag> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 700),
    value: 1,
  );

  bool _pulsed = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_pulsed && !MediaQuery.of(context).disableAnimations) {
      _pulsed = true;
      _pulse.repeat(min: 0.3, max: 1, reverse: true, count: 6).whenComplete(() {
        if (mounted) _pulse.value = 1;
      });
    }
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fg = ColorUtils.readableTextOn(widget.color);
    return Container(
      padding: const EdgeInsets.fromLTRB(6, 2, 7, 2),
      decoration: BoxDecoration(
        color: widget.color,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          FadeTransition(
            opacity: _pulse,
            child: Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(color: fg, shape: BoxShape.circle),
            ),
          ),
          const SizedBox(width: 4),
          Text(
            AppStrings.get('annNew'),
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyAnnouncement extends StatelessWidget {
  const _EmptyAnnouncement();
  @override
  Widget build(BuildContext context) => Container(
    height: 120,
    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    decoration: BoxDecoration(
      color: Colors.grey.shade100,
      borderRadius: BorderRadius.circular(12),
    ),
    child: const Center(
      child: Text(
        'No announcements yet.',
        style: TextStyle(color: Colors.grey),
      ),
    ),
  );
}
