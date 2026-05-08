import 'dart:convert';

class RssItem {
  final String title;
  final String authorDate;
  final String content;   // HTML already stripped
  final String link;

  const RssItem({
    required this.title,
    required this.authorDate,
    required this.content,
    required this.link,
  });

  /// Parse from the backend message string:
  ///   [title\n]author - date\ncontent_html\noriginalLink
  factory RssItem.fromMessageString(String raw) {
    final lines = raw.split('\n');

    // Find originalLink = last non-empty line starting with 'http'
    String link = '';
    int linkIdx = lines.length;
    for (int i = lines.length - 1; i >= 0; i--) {
      final t = lines[i].trim();
      if (t.startsWith('http')) {
        link = t;
        linkIdx = i;
        break;
      }
    }

    final beforeLink = lines.sublist(0, linkIdx);

    // Find author-date line = first non-empty line containing ' - '
    // that does NOT start with '<' (to skip HTML lines)
    int authorDateIdx = -1;
    String authorDate = '';
    for (int i = 0; i < beforeLink.length; i++) {
      final t = beforeLink[i].trim();
      if (t.contains(' - ') && !t.startsWith('<') && t.isNotEmpty) {
        authorDate = t;
        authorDateIdx = i;
        break;
      }
    }

    final title = authorDateIdx > 0
        ? beforeLink.sublist(0, authorDateIdx).join(' ').trim()
        : '';

    final contentLines = authorDateIdx >= 0
        ? beforeLink.sublist(authorDateIdx + 1)
        : beforeLink;

    final content = _stripHtml(contentLines.join('\n')).trim();

    return RssItem(
      title: title,
      authorDate: authorDate,
      content: content,
      link: link,
    );
  }

  static String _stripHtml(String html) {
    return html
        .replaceAll(RegExp(r'<[^>]*>'), '')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&nbsp;', ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  Map<String, dynamic> toJson() => {
    'title': title,
    'authorDate': authorDate,
    'content': content,
    'link': link,
  };

  factory RssItem.fromJson(Map<String, dynamic> json) => RssItem(
    title:      json['title']      as String? ?? '',
    authorDate: json['authorDate'] as String? ?? '',
    content:    json['content']    as String? ?? '',
    link:       json['link']       as String? ?? '',
  );
}
