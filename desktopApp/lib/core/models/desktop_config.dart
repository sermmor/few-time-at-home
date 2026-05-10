/// Data models mirroring the TypeScript interfaces used by the web frontend.
/// All fromJson constructors are lenient (missing fields fall back to defaults).

class StickyNote {
  final String id;
  final int    workspaceIndex;
  final double x, y, width, height;
  final String content;
  final String? color;
  final double  fontSize;
  final double  alpha;

  const StickyNote({
    required this.id,
    required this.workspaceIndex,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    required this.content,
    this.color,
    this.fontSize = 13,
    this.alpha    = 1.0,
  });

  factory StickyNote.fromJson(Map<String, dynamic> j) => StickyNote(
    id:             j['id']             as String,
    workspaceIndex: (j['workspaceIndex'] as num).toInt(),
    x:              (j['x']             as num).toDouble(),
    y:              (j['y']             as num).toDouble(),
    width:          (j['width']         as num).toDouble(),
    height:         (j['height']        as num).toDouble(),
    content:        j['content']        as String? ?? '',
    color:          j['color']          as String?,
    fontSize:       (j['fontSize']      as num?)?.toDouble() ?? 13,
    alpha:          (j['alpha']         as num?)?.toDouble() ?? 1.0,
  );

  Map<String, dynamic> toJson() => {
    'id':             id,
    'workspaceIndex': workspaceIndex,
    'x': x, 'y': y, 'width': width, 'height': height,
    'content':  content,
    if (color    != null) 'color':    color,
    'fontSize':  fontSize,
    'alpha':     alpha,
  };

  StickyNote copyWith({
    double? x, double? y,
    double? width, double? height,
    String? content,
  }) => StickyNote(
    id: id, workspaceIndex: workspaceIndex,
    x: x ?? this.x, y: y ?? this.y,
    width:  width  ?? this.width,
    height: height ?? this.height,
    content: content ?? this.content,
    color: color, fontSize: fontSize, alpha: alpha,
  );
}

// ─────────────────────────────────────────────────────────────────────────────

class DesktopLink {
  final String  id;
  final int     workspaceIndex;
  final double  x, y;
  final String  url, name;
  final String? favicon;

  const DesktopLink({
    required this.id,
    required this.workspaceIndex,
    required this.x,
    required this.y,
    required this.url,
    required this.name,
    this.favicon,
  });

  factory DesktopLink.fromJson(Map<String, dynamic> j) => DesktopLink(
    id:             j['id']             as String,
    workspaceIndex: (j['workspaceIndex'] as num).toInt(),
    x:              (j['x']             as num).toDouble(),
    y:              (j['y']             as num).toDouble(),
    url:            j['url']            as String? ?? '',
    name:           j['name']           as String? ?? '',
    favicon:        j['favicon']        as String?,
  );

  Map<String, dynamic> toJson() => {
    'id': id, 'workspaceIndex': workspaceIndex,
    'x': x, 'y': y,
    'url': url, 'name': name,
    if (favicon != null) 'favicon': favicon,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

class DesktopImage {
  final String id;
  final int    workspaceIndex;
  final double x, y, width, height;
  final String cloudPath;

  const DesktopImage({
    required this.id,
    required this.workspaceIndex,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    required this.cloudPath,
  });

  factory DesktopImage.fromJson(Map<String, dynamic> j) => DesktopImage(
    id:             j['id']             as String,
    workspaceIndex: (j['workspaceIndex'] as num).toInt(),
    x:              (j['x']             as num).toDouble(),
    y:              (j['y']             as num).toDouble(),
    width:          (j['width']         as num).toDouble(),
    height:         (j['height']        as num? ?? 0).toDouble(),
    cloudPath:      j['cloudPath']      as String? ?? '',
  );

  Map<String, dynamic> toJson() => {
    'id': id, 'workspaceIndex': workspaceIndex,
    'x': x, 'y': y, 'width': width, 'height': height,
    'cloudPath': cloudPath,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

class DesktopPanel {
  final String id;
  final int    workspaceIndex;
  final double x, y, width, height;

  const DesktopPanel({
    required this.id,
    required this.workspaceIndex,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
  });

  factory DesktopPanel.fromJson(Map<String, dynamic> j) => DesktopPanel(
    id:             j['id']             as String,
    workspaceIndex: (j['workspaceIndex'] as num).toInt(),
    x:              (j['x']             as num).toDouble(),
    y:              (j['y']             as num).toDouble(),
    width:          (j['width']         as num).toDouble(),
    height:         (j['height']        as num).toDouble(),
  );

  Map<String, dynamic> toJson() => {
    'id': id, 'workspaceIndex': workspaceIndex,
    'x': x, 'y': y, 'width': width, 'height': height,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

class DesktopConfig {
  final int              rows, cols;
  final List<String>     wallpapers;  // cloud paths, one per workspace
  final List<StickyNote> notes;
  final List<DesktopLink> links;
  final bool             tabletMode;
  final List<DesktopImage>  images;
  final List<DesktopPanel>  panels;

  const DesktopConfig({
    required this.rows,
    required this.cols,
    required this.wallpapers,
    required this.notes,
    required this.links,
    this.tabletMode = false,
    required this.images,
    required this.panels,
  });

  int get workspaceCount => rows * cols;

  factory DesktopConfig.empty() => const DesktopConfig(
    rows: 4, cols: 4,
    wallpapers: [],
    notes: [], links: [], images: [], panels: [],
  );

  factory DesktopConfig.fromJson(Map<String, dynamic> j) {
    final rows = (j['rows'] as num? ?? 4).toInt();
    final cols = (j['cols'] as num? ?? 4).toInt();
    final total = rows * cols;
    final raw = (j['wallpapers'] as List?)?.cast<String?>() ?? [];
    final wallpapers = List.generate(total, (i) => (i < raw.length ? raw[i] : null) ?? '');

    return DesktopConfig(
      rows:       rows,
      cols:       cols,
      wallpapers: wallpapers,
      notes:      ((j['notes']   as List?) ?? []).map((e) => StickyNote.fromJson(e as Map<String, dynamic>)).toList(),
      links:      ((j['links']   as List?) ?? []).map((e) => DesktopLink.fromJson(e as Map<String, dynamic>)).toList(),
      tabletMode: j['tabletMode'] as bool? ?? false,
      images:     ((j['images']  as List?) ?? []).map((e) => DesktopImage.fromJson(e as Map<String, dynamic>)).toList(),
      panels:     ((j['panels']  as List?) ?? []).map((e) => DesktopPanel.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Map<String, dynamic> toJson() => {
    'rows': rows, 'cols': cols,
    'wallpapers': wallpapers,
    'tabletMode': tabletMode,
    'notes':   notes.map((e) => e.toJson()).toList(),
    'links':   links.map((e) => e.toJson()).toList(),
    'images':  images.map((e) => e.toJson()).toList(),
    'panels':  panels.map((e) => e.toJson()).toList(),
  };

  DesktopConfig copyWith({
    int?              rows,
    int?              cols,
    List<String>?     wallpapers,
    List<StickyNote>? notes,
    List<DesktopLink>? links,
    bool?             tabletMode,
    List<DesktopImage>?  images,
    List<DesktopPanel>?  panels,
  }) => DesktopConfig(
    rows:       rows       ?? this.rows,
    cols:       cols       ?? this.cols,
    wallpapers: wallpapers ?? this.wallpapers,
    notes:      notes      ?? this.notes,
    links:      links      ?? this.links,
    tabletMode: tabletMode ?? this.tabletMode,
    images:     images     ?? this.images,
    panels:     panels     ?? this.panels,
  );
}

// ─────────────────────────────────────────────────────────────────────────────

class ProfileMeta {
  final String name;
  final String jsonFileId;

  const ProfileMeta({required this.name, required this.jsonFileId});
}
