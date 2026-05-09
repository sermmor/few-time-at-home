import 'dart:io';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/models/desktop_config.dart';
import '../../../core/services/asset_cache_service.dart';

/// Clickable link widget on the desktop canvas.
/// Shows favicon (if available), name, and opens the URL on tap.
class DesktopLinkWidget extends StatefulWidget {
  final DesktopLink link;
  final String profileName;
  final double left, top;

  const DesktopLinkWidget({
    super.key,
    required this.link,
    required this.profileName,
    required this.left,
    required this.top,
  });

  @override
  State<DesktopLinkWidget> createState() => _DesktopLinkWidgetState();
}

class _DesktopLinkWidgetState extends State<DesktopLinkWidget> {
  String? _faviconPath;

  @override
  void initState() {
    super.initState();
    if (widget.link.favicon != null && widget.link.favicon!.isNotEmpty) {
      _resolveFavicon();
    }
  }

  Future<void> _resolveFavicon() async {
    final path = await AssetCacheService.instance.resolveFavicon(
      widget.profileName,
      widget.link.favicon!,
    );
    if (mounted) setState(() => _faviconPath = path);
  }

  Future<void> _launch() async {
    final uri = Uri.tryParse(widget.link.url);
    if (uri == null) return;
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: widget.left,
      top:  widget.top,
      child: GestureDetector(
        onTap: _launch,
        child: SizedBox(
          width: 72,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Icon / favicon
              Container(
                width:  52,
                height: 52,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white12),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: _faviconPath != null
                      ? Image.file(File(_faviconPath!), fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const _DefaultIcon())
                      : const _DefaultIcon(),
                ),
              ),
              const SizedBox(height: 4),
              // Label
              Text(
                widget.link.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  shadows: [Shadow(blurRadius: 4, color: Colors.black87)],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DefaultIcon extends StatelessWidget {
  const _DefaultIcon();
  @override
  Widget build(BuildContext context) => const Icon(
    Icons.language,
    color: Colors.white38,
    size: 28,
  );
}
