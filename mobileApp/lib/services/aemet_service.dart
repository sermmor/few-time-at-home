/// Direct AEMET XML parser – no backend dependency.
///
/// Ports the regex-based parsing logic from
/// backend/src/API/aemet.service.ts to Dart, including all
/// multi-level fallbacks for fine/coarse/global AEMET period formats.

import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/aemet_models.dart';

const _aemetDailyUrl =
    'https://www.aemet.es/xml/municipios/localidad_29067.xml';
const _aemetHourlyUrl =
    'https://www.aemet.es/xml/municipios_h/localidad_h_29067.xml';

// ── Low-level XML helpers ──────────────────────────────────────────────────────

/// Extracts every <dia fecha="YYYY-MM-DD"> block with its date.
List<({String date, String xml})> _extractAllDayXmls(String xml) {
  final regex = RegExp(
    r'<dia fecha="(\d{4}-\d{2}-\d{2})"[^>]*>([\s\S]*?)<\/dia>',
  );
  return regex
      .allMatches(xml)
      .map((m) => (date: m.group(1)!, xml: m.group(0)!))
      .toList();
}

/// Sky description for a tag with a specific periodo attribute.
String _getSkyDescRaw(String dayXml, String periodo) {
  for (final pattern in [
    RegExp('<estado_cielo[^>]*periodo="$periodo"[^>]*descripcion="([^"]*)"[^>]*>'),
    RegExp('<estado_cielo[^>]*descripcion="([^"]*)"[^>]*periodo="$periodo"[^>]*>'),
  ]) {
    final m = pattern.firstMatch(dayXml);
    if (m != null) return m.group(1)!.trim();
  }
  return '';
}

/// Sky description from a tag with NO periodo attribute (AEMET days 5-7).
String _getSkyDescGlobal(String dayXml) {
  // Negative lookahead ensures we skip periodo-qualified tags.
  final regex = RegExp(
    r'<estado_cielo(?![^>]*\bperiodo\b)[^>]*descripcion="([^"]*)"[^>]*>',
  );
  return regex.firstMatch(dayXml)?.group(1)?.trim() ?? '';
}

/// Forward + backward gap fill for a list of strings.
List<String> _fillGaps(List<String> values) {
  final result = List<String>.from(values);
  var last = '';
  for (var i = 0; i < result.length; i++) {
    if (result[i].isNotEmpty) {
      last = result[i];
    } else if (last.isNotEmpty) {
      result[i] = last;
    }
  }
  last = '';
  for (var i = result.length - 1; i >= 0; i--) {
    if (result[i].isNotEmpty) {
      last = result[i];
    } else if (last.isNotEmpty) {
      result[i] = last;
    }
  }
  return result;
}

/// 3-level sky description fallback:
///   Level 1 – fine sub-periods 00-06/06-12/12-18/18-24  (days 1-2)
///   Level 2 – coarse periods   00-12/12-24/00-24         (days 3-4)
///   Level 3 – global no-periodo tag                      (days 5-7)
({String morning, String afternoon, String night}) _getSkyDescriptions(
    String dayXml) {
  const subPeriods = ['00-06', '06-12', '12-18', '18-24'];
  final raw = subPeriods.map((p) => _getSkyDescRaw(dayXml, p)).toList();
  final filled = _fillGaps(raw);

  // Indices: 0=00-06, 1=06-12(morning), 2=12-18(afternoon), 3=18-24(night)
  var morning   = filled[1];
  var afternoon = filled[2];
  var night     = filled[3];

  // Level 2: coarser periods
  if (morning.isEmpty) {
    morning = _getSkyDescRaw(dayXml, '00-12').isNotEmpty
        ? _getSkyDescRaw(dayXml, '00-12')
        : _getSkyDescRaw(dayXml, '00-24');
  }
  if (afternoon.isEmpty) {
    afternoon = _getSkyDescRaw(dayXml, '12-24').isNotEmpty
        ? _getSkyDescRaw(dayXml, '12-24')
        : _getSkyDescRaw(dayXml, '00-24');
  }
  if (night.isEmpty) {
    night = _getSkyDescRaw(dayXml, '12-24').isNotEmpty
        ? _getSkyDescRaw(dayXml, '12-24')
        : _getSkyDescRaw(dayXml, '00-24');
  }

  // Level 3: global tag without any periodo
  if (morning.isEmpty || afternoon.isEmpty || night.isEmpty) {
    final global = _getSkyDescGlobal(dayXml);
    if (morning.isEmpty)   morning   = global;
    if (afternoon.isEmpty) afternoon = global;
    if (night.isEmpty)     night     = global;
  }

  return (
    morning:   morning.isEmpty   ? 'No disponible' : morning,
    afternoon: afternoon.isEmpty ? 'No disponible' : afternoon,
    night:     night.isEmpty     ? 'No disponible' : night,
  );
}

/// Rain probability for the first periodo that exists in the XML.
/// Falls back to the global no-periodo tag (days 5-7).
int _getRainProbWithFallback(String dayXml, List<String> periods) {
  for (final periodo in periods) {
    final escaped = periodo.replaceAll('-', r'\-');
    final regex = RegExp(
        '<prob_precipitacion[^>]*periodo="$escaped"[^>]*>(\\d+)<\\/prob_precipitacion>');
    final m = regex.firstMatch(dayXml);
    if (m != null) return int.parse(m.group(1)!);
  }
  // Global fallback: <prob_precipitacion>30</prob_precipitacion>
  final m = RegExp(r'<prob_precipitacion>(\d+)<\/prob_precipitacion>')
      .firstMatch(dayXml);
  return m != null ? int.parse(m.group(1)!) : 0;
}

int? _getTemperature(String dayXml, String type) {
  final blockMatch =
      RegExp(r'<temperatura>([\s\S]*?)<\/temperatura>').firstMatch(dayXml);
  if (blockMatch == null) return null;
  final m = RegExp('<$type>(-?\\d+)<\\/$type>').firstMatch(blockMatch.group(1)!);
  return m != null ? int.parse(m.group(1)!) : null;
}

({String dir, int? speed}) _getWindWithFallbacks(
    String dayXml, List<String> periods) {
  for (final periodo in periods) {
    final escaped = periodo.replaceAll('-', r'\-');
    final regex =
        RegExp('<viento[^>]*periodo="$escaped"[^>]*>([\\s\\S]*?)<\\/viento>');
    final m = regex.firstMatch(dayXml);
    if (m == null) continue;
    final block      = m.group(1)!;
    final dirMatch   = RegExp(r'<direccion>([^<]+)<\/direccion>').firstMatch(block);
    final speedMatch = RegExp(r'<velocidad>(\d+)<\/velocidad>').firstMatch(block);
    final dir   = dirMatch?.group(1)?.trim()  ?? '';
    final speed = speedMatch != null ? int.parse(speedMatch.group(1)!) : null;
    if (dir.isNotEmpty || speed != null) return (dir: dir, speed: speed);
  }
  return (dir: '', speed: null);
}

/// Highest gust across ALL racha_max tags within the day block.
int? _getMaxGustForDay(String dayXml) {
  final regex = RegExp(r'<racha_max[^>]*>(\d+)<\/racha_max>');
  int? max;
  for (final m in regex.allMatches(dayXml)) {
    final val = int.parse(m.group(1)!);
    if (max == null || val > max) max = val;
  }
  return max;
}

int? _getHumidityFromDay(String dayXml, String type) {
  final blockMatch =
      RegExp(r'<humedad_relativa>([\s\S]*?)<\/humedad_relativa>')
          .firstMatch(dayXml);
  if (blockMatch == null) return null;
  final m =
      RegExp('<$type>(-?\\d+)<\\/$type>').firstMatch(blockMatch.group(1)!);
  return m != null ? int.parse(m.group(1)!) : null;
}

int? _getThermalSensFromDay(String dayXml, String type) {
  final blockMatch =
      RegExp(r'<sens_termica>([\s\S]*?)<\/sens_termica>').firstMatch(dayXml);
  if (blockMatch == null) return null;
  final m =
      RegExp('<$type>(-?\\d+)<\\/$type>').firstMatch(blockMatch.group(1)!);
  return m != null ? int.parse(m.group(1)!) : null;
}

int? _getUvMaxFromDay(String dayXml) {
  final m = RegExp(r'<uv_max>(\d+)<\/uv_max>').firstMatch(dayXml);
  return m != null ? int.parse(m.group(1)!) : null;
}

// ── Hourly helpers ─────────────────────────────────────────────────────────────

int? _getHourlyIntValue(String dayXml, String tag, String hour) {
  final regex =
      RegExp('<$tag[^>]*periodo="$hour"[^>]*>(-?[\\d.]+)<\\/$tag>');
  final m = regex.firstMatch(dayXml);
  if (m == null) return null;
  return double.parse(m.group(1)!).round();
}

String _getHourlySkyDesc(String dayXml, String hour) {
  for (final pattern in [
    RegExp('<estado_cielo[^>]*periodo="$hour"[^>]*descripcion="([^"]*)"[^>]*>'),
    RegExp('<estado_cielo[^>]*descripcion="([^"]*)"[^>]*periodo="$hour"[^>]*>'),
  ]) {
    final m = pattern.firstMatch(dayXml);
    if (m != null) return m.group(1)!.trim();
  }
  return '';
}

({String dir, int? speed}) _getHourlyWind(String dayXml, String hour) {
  final regex =
      RegExp('<viento[^>]*periodo="$hour"[^>]*>([\\s\\S]*?)<\\/viento>');
  final m = regex.firstMatch(dayXml);
  if (m == null) return (dir: '', speed: null);
  final block      = m.group(1)!;
  final dirMatch   = RegExp(r'<direccion>([^<]+)<\/direccion>').firstMatch(block);
  final speedMatch = RegExp(r'<velocidad>(\d+)<\/velocidad>').firstMatch(block);
  return (
    dir:   dirMatch?.group(1)?.trim()  ?? '',
    speed: speedMatch != null ? int.parse(speedMatch.group(1)!) : null,
  );
}

int? _getHourlyMaxGust(String dayXml, String hour) {
  final regex =
      RegExp('<racha_max[^>]*periodo="$hour"[^>]*>(\\d+)<\\/racha_max>');
  final m = regex.firstMatch(dayXml);
  return m != null ? int.parse(m.group(1)!) : null;
}

/// Maps a 0-23 hour to its AEMET rain-probability band (HHMM, no hyphen).
int _getRainProbForHour(String dayXml, int hourNum) {
  final String periodo;
  if (hourNum < 8)       periodo = '0208';
  else if (hourNum < 14) periodo = '0814';
  else if (hourNum < 20) periodo = '1420';
  else                   periodo = '2002';
  final regex = RegExp(
      '<prob_precipitacion[^>]*periodo="$periodo"[^>]*>(\\d+)<\\/prob_precipitacion>');
  return regex.firstMatch(dayXml) != null
      ? int.parse(regex.firstMatch(dayXml)!.group(1)!)
      : 0;
}

// ── Service class ──────────────────────────────────────────────────────────────

class AemetService {
  AemetService._(); // static-only

  static Future<List<DailyWeatherRow>> fetchDaily() async {
    final xml = await _fetchXml(_aemetDailyUrl);
    if (xml == null) return [];

    return _extractAllDayXmls(xml).map((entry) {
      final date   = entry.date;
      final dayXml = entry.xml;

      final sky = _getSkyDescriptions(dayXml);

      final windMorning   = _getWindWithFallbacks(dayXml, ['06-12', '00-12', '00-24']);
      final windAfternoon = _getWindWithFallbacks(dayXml, ['12-18', '12-24', '00-24']);
      final windNight     = _getWindWithFallbacks(dayXml, ['18-24', '12-24', '00-24']);

      return DailyWeatherRow(
        date:               date,
        tempMin:            _getTemperature(dayXml, 'minima'),
        tempMax:            _getTemperature(dayXml, 'maxima'),
        thermalSensMin:     _getThermalSensFromDay(dayXml, 'minima'),
        thermalSensMax:     _getThermalSensFromDay(dayXml, 'maxima'),
        humidityMin:        _getHumidityFromDay(dayXml, 'minima'),
        humidityMax:        _getHumidityFromDay(dayXml, 'maxima'),
        uvMax:              _getUvMaxFromDay(dayXml),
        skyMorning:         sky.morning,
        skyAfternoon:       sky.afternoon,
        skyNight:           sky.night,
        rainProb:           _getRainProbWithFallback(dayXml, ['00-24']),
        rainProbMorning:    _getRainProbWithFallback(dayXml, ['M', '00-12']),
        rainProbAfternoon:  _getRainProbWithFallback(dayXml, ['T', '12-24']),
        rainProbNight:      _getRainProbWithFallback(dayXml, ['N', '12-24']),
        windMorningDir:     windMorning.dir,
        windMorningSpeed:   windMorning.speed,
        windAfternoonDir:   windAfternoon.dir,
        windAfternoonSpeed: windAfternoon.speed,
        windNightDir:       windNight.dir,
        windNightSpeed:     windNight.speed,
        maxGust:            _getMaxGustForDay(dayXml),
      );
    }).toList();
  }

  static Future<List<HourlyWeatherRow>> fetchHourly() async {
    final xml = await _fetchXml(_aemetHourlyUrl);
    if (xml == null) return [];

    final rows = <HourlyWeatherRow>[];
    for (final entry in _extractAllDayXmls(xml)) {
      final date   = entry.date;
      final dayXml = entry.xml;
      for (var h = 0; h < 24; h++) {
        final hour = h.toString().padLeft(2, '0');
        final temp = _getHourlyIntValue(dayXml, 'temperatura', hour);
        if (temp == null) continue; // hour not present
        final wind = _getHourlyWind(dayXml, hour);
        rows.add(HourlyWeatherRow(
          date:        date,
          hour:        hour,
          temperature: temp,
          // AEMET uses snake_case: sens_termica, humedad_relativa
          thermalSens: _getHourlyIntValue(dayXml, 'sens_termica', hour),
          sky:         _getHourlySkyDesc(dayXml, hour),
          precipMm:    _getHourlyIntValue(dayXml, 'precipitacion', hour),
          rainProb:    _getRainProbForHour(dayXml, h),
          windDir:     wind.dir,
          windSpeed:   wind.speed,
          maxGust:     _getHourlyMaxGust(dayXml, hour),
          humidity:    _getHourlyIntValue(dayXml, 'humedad_relativa', hour),
        ));
      }
    }
    return rows;
  }

  // ── HTTP ────────────────────────────────────────────────────────────────────

  static Future<String?> _fetchXml(String url) async {
    try {
      final response = await http.get(
        Uri.parse(url),
        headers: {'User-Agent': 'Mozilla/5.0 (compatible; FewTimeAtHome/1.0)'},
      );
      if (response.statusCode != 200) {
        debugPrint('[AEMET] HTTP ${response.statusCode} fetching $url');
        return null;
      }
      // AEMET XMLs are ISO-8859-1; try Latin-1 first, UTF-8 as fallback.
      try {
        return latin1.decode(response.bodyBytes);
      } catch (_) {
        return utf8.decode(response.bodyBytes, allowMalformed: true);
      }
    } catch (e) {
      debugPrint('[AEMET] Error fetching $url: $e');
      return null;
    }
  }
}
