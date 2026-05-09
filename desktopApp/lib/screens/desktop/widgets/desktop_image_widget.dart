import 'dart:io';
import 'package:flutter/material.dart';
import '../../../core/models/desktop_config.dart';
import '../../../core/services/asset_cache_service.dart';

/// Image widget pinned at an absolute position on the desktop canvas.
/// Downloads the file from GDrive via [AssetCacheService] on first use.
class DesktopImageWidget extends StatefulWidget {
  final DesktopImage image;
  final String profileName;
  final double left, top, width, height;

  const DesktopImageWidget({
    super.key,
    required this.image,
    required this.profileName,
    required this.left,
    required this.top,
    required this.width,
    required this.height,
  });

  @override
  State<DesktopImageWidget> createState() => _DesktopImageWidgetState();
}

class _DesktopImageWidgetState extends State<DesktopImageWidget> {
  String? _localPath;
  bool    _loading = true;

  @override
  void initState() {
    super.initState();
    _resolve();
  }

  Future<void> _resolve() async {
    final path = await AssetCacheService.instance.resolveAsset(
      widget.profileName,
      widget.image.cloudPath,
    );
    if (mounted) setState(() { _localPath = path; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: widget.left, top: widget.top,
      width: widget.width, height: widget.height,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(6),
        child: _loading
            ? const Center(
                child: SizedBox(
                  width: 24, height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white24),
                ),
              )
            : _localPath != null
                ? Image.file(
                    File(_localPath!),
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const _Placeholder(),
                  )
                : const _Placeholder(),
      ),
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder();
  @override
  Widget build(BuildContext context) => Container(
    color: Colors.white10,
    child: const Center(
      child: Icon(Icons.broken_image_outlined, color: Colors.white24, size: 32),
    ),
  );
}
