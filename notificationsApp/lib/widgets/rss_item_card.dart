import 'package:flutter/material.dart';
import '../models/rss_item.dart';

class RssItemCard extends StatelessWidget {
  const RssItemCard({super.key, required this.item, required this.onTap});

  final RssItem item;
  final VoidCallback onTap;

  static const _bg     = Color(0xFF071526);
  static const _border = Color(0xFF1A3A5C);
  static const _orange = Color(0xFFFF7700);
  static const _white  = Color(0xFFE8F0F8);
  static const _gray   = Color(0xFF7A9BB8);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _bg,
          border: Border.all(color: _border),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title
            if (item.title.isNotEmpty) ...[
              Text(
                item.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: _white,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 5),
            ],
            // Author · date
            if (item.authorDate.isNotEmpty)
              Text(
                item.authorDate,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: _orange.withOpacity(0.9),
                  fontSize: 11,
                  fontFamily: 'monospace',
                  letterSpacing: 0.3,
                ),
              ),
            // Content
            if (item.content.isNotEmpty) ...[
              const SizedBox(height: 7),
              Text(
                item.content,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: _gray,
                  fontSize: 12,
                  height: 1.4,
                ),
              ),
            ],
            // Link row
            if (item.link.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.open_in_new,
                      size: 12, color: _orange.withOpacity(0.6)),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      item.link,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: _orange.withOpacity(0.55),
                        fontSize: 10,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
