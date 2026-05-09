import 'package:flutter/material.dart';
import 'notes_theme.dart';

class NotesSyntaxController extends TextEditingController {
  NotesSyntaxController({String? text}) : super(text: text);

  @override
  TextSpan buildTextSpan({
    required BuildContext context,
    TextStyle? style,
    required bool withComposing,
  }) {
    final List<InlineSpan> children = [];
    final text = this.text;

    final pattern = RegExp(
      r'(?<header>^#{1,6}\s+.*$)|'
      r'(?<code>`[^`]+`)|'
      r'(?<bold>\*\*.*?\*\*)|'
      r'(?<italic>\*.*?\*)|'
      r'(?<link>\[.*?\]\(.*?\))',
      multiLine: true,
    );

    int lastMatchEnd = 0;
    for (final match in pattern.allMatches(text)) {
      if (match.start > lastMatchEnd) {
        children.add(TextSpan(
          text: text.substring(lastMatchEnd, match.start),
          style: style,
        ));
      }

      TextStyle matchStyle = style ?? const TextStyle();
      if (match.namedGroup('header') != null) {
        matchStyle = matchStyle.copyWith(
            color: NotesTheme.neonMagenta, fontWeight: FontWeight.bold);
      } else if (match.namedGroup('code') != null) {
        matchStyle = matchStyle.copyWith(
            color: NotesTheme.neonYellow,
            backgroundColor: NotesTheme.darkGrey);
      } else if (match.namedGroup('bold') != null) {
        matchStyle = matchStyle.copyWith(
            color: NotesTheme.neonCyan, fontWeight: FontWeight.bold);
      } else if (match.namedGroup('italic') != null) {
        matchStyle = matchStyle.copyWith(
            color: NotesTheme.neonCyan, fontStyle: FontStyle.italic);
      } else if (match.namedGroup('link') != null) {
        matchStyle = matchStyle.copyWith(
            color: NotesTheme.neonCyan,
            decoration: TextDecoration.underline);
      }

      children.add(TextSpan(text: match.group(0), style: matchStyle));
      lastMatchEnd = match.end;
    }

    if (lastMatchEnd < text.length) {
      children.add(TextSpan(
        text: text.substring(lastMatchEnd),
        style: style,
      ));
    }

    return TextSpan(style: style, children: children);
  }
}
