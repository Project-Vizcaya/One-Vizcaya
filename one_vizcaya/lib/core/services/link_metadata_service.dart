import 'package:http/http.dart' as http;

/// Metadata scraped from a web page, used to auto-fill an announcement from a
/// pasted source link (Open Graph tags, with sensible HTML fallbacks).
class LinkMetadata {
  final String? title;
  final String? description;
  final String? siteName;

  const LinkMetadata({this.title, this.description, this.siteName});

  bool get isEmpty =>
      (title == null || title!.isEmpty) &&
      (description == null || description!.isEmpty);
}

class LinkMetadataService {
  /// Fetches the page at [rawUrl] and extracts its headline/body metadata.
  /// Returns null on network failure; an (possibly empty) [LinkMetadata]
  /// otherwise so callers can tell "fetched but nothing usable" apart.
  static Future<LinkMetadata?> fetch(String rawUrl) async {
    var url = rawUrl.trim();
    if (url.isEmpty) return null;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://$url';
    }
    final uri = Uri.tryParse(url);
    if (uri == null || !uri.hasAuthority) return null;

    try {
      final res = await http.get(
        uri,
        headers: const {
          // A browser-like UA improves the odds that sites return OG tags.
          'user-agent':
              'Mozilla/5.0 (Linux; Android) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
          'accept': 'text/html,application/xhtml+xml',
        },
      ).timeout(const Duration(seconds: 12));
      if (res.statusCode != 200) return null;
      final html = res.body;
      return LinkMetadata(
        title: _meta(html, ['og:title', 'twitter:title']) ?? _title(html),
        description: _meta(
            html, ['og:description', 'twitter:description', 'description']),
        siteName: _meta(html, ['og:site_name']),
      );
    } catch (_) {
      return null;
    }
  }

  // Finds a <meta> tag whose property/name matches one of [keys] and returns
  // its (entity-decoded) content attribute.
  static String? _meta(String html, List<String> keys) {
    final tagRe = RegExp(r'<meta\b[^>]*>', caseSensitive: false);
    for (final key in keys) {
      final keyRe = RegExp(
          '(?:property|name)\\s*=\\s*["\']${RegExp.escape(key)}["\']',
          caseSensitive: false);
      for (final m in tagRe.allMatches(html)) {
        final tag = m.group(0)!;
        if (!keyRe.hasMatch(tag)) continue;
        final dq = RegExp(r'content\s*=\s*"([^"]*)"', caseSensitive: false)
            .firstMatch(tag);
        final sq = RegExp(r"content\s*=\s*'([^']*)'", caseSensitive: false)
            .firstMatch(tag);
        final content = dq?.group(1) ?? sq?.group(1);
        if (content != null && content.trim().isNotEmpty) {
          return _decode(content.trim());
        }
      }
    }
    return null;
  }

  static String? _title(String html) {
    final m = RegExp(r'<title[^>]*>([\s\S]*?)</title>', caseSensitive: false)
        .firstMatch(html);
    final t = m?.group(1)?.trim();
    return (t == null || t.isEmpty) ? null : _decode(t);
  }

  // Minimal HTML entity decoding for the few entities common in titles.
  static String _decode(String s) => s
      .replaceAll('&amp;', '&')
      .replaceAll('&quot;', '"')
      .replaceAll('&#39;', "'")
      .replaceAll('&#039;', "'")
      .replaceAll('&apos;', "'")
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}
