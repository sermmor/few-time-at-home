import 'package:flutter/material.dart';
import '../models/aemet_models.dart';
import '../services/aemet_service.dart';

class WeatherScreen extends StatefulWidget {
  const WeatherScreen({super.key});

  @override
  State<WeatherScreen> createState() => _WeatherScreenState();
}

class _WeatherScreenState extends State<WeatherScreen>
    with SingleTickerProviderStateMixin {
  // ── Palette ────────────────────────────────────────────────────────────────
  static const _bg       = Color(0xFF020C18);
  static const _bgCard   = Color(0xFF0B1E36);
  static const _cyan     = Color(0xFF00FFE7);
  static const _amber    = Color(0xFFFFBB00);
  static const _magenta  = Color(0xFFFF00CC);
  static const _rainBlue = Color(0xFF4A90FF);
  static const _greenOk  = Color(0xFF00FF88);
  static const _snow     = Color(0xFFAADDFF);
  static const _purple   = Color(0xFFBB66FF);

  // ── State ──────────────────────────────────────────────────────────────────
  late final TabController _tabs;
  List<DailyWeatherRow>  _daily  = [];
  List<HourlyWeatherRow> _hourly = [];
  bool    _loading = true;
  String? _error;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _loadAll();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  Future<void> _loadAll() async {
    setState(() { _loading = true; _error = null; });
    try {
      _daily  = await AemetService.fetchDaily();
      _hourly = await AemetService.fetchHourly();
      if (!mounted) return;
      setState(() => _loading = false);
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  // ── Date / time helpers ────────────────────────────────────────────────────
  static String _formatDate(String dateStr) {
    final date = DateTime.parse(dateStr);
    const wd = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    const mo = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
    return '${wd[date.weekday - 1]} ${date.day.toString().padLeft(2,'0')} ${mo[date.month - 1]}';
  }

  static bool _isToday(String dateStr) {
    final n = DateTime.now();
    return dateStr ==
        '${n.year}-${n.month.toString().padLeft(2,'0')}-${n.day.toString().padLeft(2,'0')}';
  }

  static bool _isCurrentHour(String dateStr, String hour) {
    final n = DateTime.now();
    return _isToday(dateStr) && hour == n.hour.toString().padLeft(2, '0');
  }

  // ── Sky helpers ─────────────────────────────────────────────────────────────
  static IconData _skyIcon(String desc) {
    final d = desc.toLowerCase();
    if (d.contains('torment') || d.contains('rayos'))                         return Icons.thunderstorm_outlined;
    if (d.contains('nieve')   || d.contains('nevada'))                        return Icons.ac_unit;
    if (d.contains('granizo'))                                                return Icons.grain;
    if (d.contains('lluvia')  || d.contains('llovizna') ||
        d.contains('chubasco')|| d.contains('precipitac'))                    return Icons.water_drop_outlined;
    if (d.contains('niebla')  || d.contains('bruma'))                         return Icons.blur_on_outlined;
    if (d.contains('cubierto')|| d.contains('muy nuboso'))                    return Icons.cloud;
    if (d.contains('nuboso')  || d.contains('nubes altas') ||
        d.contains('nublado'))                                                return Icons.cloud_queue;
    if (d.contains('poco nuboso') || d.contains('intervalos'))                return Icons.wb_cloudy;
    if (d.contains('despejad')|| d.contains('sol') || d.contains('soleado')) return Icons.wb_sunny;
    return Icons.wb_cloudy;
  }

  static Color _skyColor(String desc) {
    final d = desc.toLowerCase();
    if (d.contains('torment') || d.contains('rayos'))                          return _purple;
    if (d.contains('nieve')   || d.contains('nevada') || d.contains('granizo'))return _snow;
    if (d.contains('lluvia')  || d.contains('llovizna') ||
        d.contains('chubasco')|| d.contains('precipitac'))                     return _rainBlue;
    if (d.contains('niebla')  || d.contains('bruma'))                          return const Color(0xFF99AABB);
    if (d.contains('cubierto')|| d.contains('muy nuboso'))                     return const Color(0xFF6688AA);
    if (d.contains('nuboso')  || d.contains('nubes'))                          return const Color(0xFF88AACC);
    if (d.contains('poco nuboso') || d.contains('intervalos'))                 return const Color(0xFFAABBCC);
    if (d.contains('despejad')|| d.contains('sol'))                            return _amber;
    return const Color(0xFF88AACC);
  }

  // ── Temperature colours ────────────────────────────────────────────────────
  static Color _tempMinColor(int? t) {
    if (t == null) return _amber;
    if (t <= 5)  return const Color(0xFF66AAFF);
    if (t <= 12) return const Color(0xFF88CCFF);
    return _cyan;
  }

  static Color _tempMaxColor(int? t) {
    if (t == null) return _amber;
    if (t >= 35) return const Color(0xFFFF2200);
    if (t >= 28) return const Color(0xFFFF6622);
    if (t >= 22) return const Color(0xFFFFAA00);
    return _amber;
  }

  static Color _tempHourlyColor(int? t) {
    if (t == null) return _amber;
    if (t >= 35)  return const Color(0xFFFF2200);
    if (t >= 28)  return const Color(0xFFFF6622);
    if (t >= 22)  return const Color(0xFFFFAA00);
    if (t >= 15)  return _amber;
    if (t >= 8)   return _cyan;
    return const Color(0xFF88CCFF);
  }

  // ── Wind direction arrow ───────────────────────────────────────────────────
  static String _windArrow(String dir) {
    switch (dir.toUpperCase()) {
      case 'N':   return '↑';
      case 'NNE': return '↑';
      case 'NE':  return '↗';
      case 'ENE': return '→';
      case 'E':   return '→';
      case 'ESE': return '→';
      case 'SE':  return '↘';
      case 'SSE': return '↓';
      case 'S':   return '↓';
      case 'SSO': return '↓';
      case 'SO':  return '↙';
      case 'OSO': return '←';
      case 'O':   return '←';
      case 'ONO': return '←';
      case 'NO':  return '↖';
      case 'NNO': return '↑';
      case 'C':   return '○';
      default:    return '';
    }
  }

  static String _windLabel(String dir, int? speed) {
    if (dir.isEmpty && speed == null) return '--';
    final arrow = _windArrow(dir);
    final sp    = speed != null ? '${speed}km/h' : '';
    return '$arrow$dir $sp'.trim();
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: _buildAppBar(),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: _amber))
          : _error != null
              ? _buildError()
              : TabBarView(
                  controller: _tabs,
                  children: [
                    _buildDailyTab(),
                    _buildHourlyTab(),
                  ],
                ),
    );
  }

  // ── AppBar with embedded TabBar ────────────────────────────────────────────
  PreferredSizeWidget _buildAppBar() => AppBar(
        backgroundColor: _bg,
        elevation:       0,
        titleSpacing:    16,
        title: const Text(
          '// TIEMPO //',
          style: TextStyle(
            fontFamily:    'monospace',
            fontSize:      13,
            fontWeight:    FontWeight.bold,
            color:         _amber,
            letterSpacing: 2.5,
          ),
        ),
        actions: [
          IconButton(
            icon:      Icon(Icons.refresh, size: 20, color: _amber.withOpacity(0.55)),
            tooltip:   'Actualizar',
            onPressed: _loadAll,
          ),
        ],
        bottom: TabBar(
          controller:           _tabs,
          indicatorColor:       _amber,
          indicatorWeight:      2,
          labelColor:           _amber,
          unselectedLabelColor: _amber.withOpacity(0.35),
          labelStyle: const TextStyle(
            fontFamily:  'monospace',
            fontSize:    12,
            fontWeight:  FontWeight.bold,
            letterSpacing: 1,
          ),
          tabs: const [
            Tab(text: '📅  POR DÍAS'),
            Tab(text: '🕐  POR HORAS'),
          ],
        ),
      );

  // ── Empty / error states ───────────────────────────────────────────────────
  Widget _buildEmpty() => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.wb_cloudy, size: 60, color: _amber.withOpacity(0.12)),
            const SizedBox(height: 18),
            const Text(
              '// SIN DATOS //',
              style: TextStyle(
                fontFamily: 'monospace', color: _amber,
                fontSize: 13, letterSpacing: 2.5,
              ),
            ),
          ],
        ),
      );

  Widget _buildError() => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 48, color: _magenta.withOpacity(0.6)),
              const SizedBox(height: 16),
              Text(
                '// ERROR DE CONEXIÓN //',
                style: TextStyle(
                  fontFamily: 'monospace', color: _magenta.withOpacity(0.8),
                  fontSize: 13, letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 20),
              TextButton(
                onPressed: _loadAll,
                child: const Text('REINTENTAR',
                    style: TextStyle(fontFamily: 'monospace', color: _amber)),
              ),
            ],
          ),
        ),
      );

  // ── DAILY TAB ──────────────────────────────────────────────────────────────
  Widget _buildDailyTab() {
    if (_daily.isEmpty) return _buildEmpty();
    return RefreshIndicator(
      color:           _amber,
      backgroundColor: _bgCard,
      onRefresh:       _loadAll,
      child: ListView.builder(
        physics:     const AlwaysScrollableScrollPhysics(),
        padding:     const EdgeInsets.fromLTRB(12, 14, 12, 32),
        itemCount:   _daily.length,
        itemBuilder: (_, i) => _buildDayCard(_daily[i]),
      ),
    );
  }

  Widget _buildDayCard(DailyWeatherRow r) {
    final today       = _isToday(r.date);
    final dateLabel   = _formatDate(r.date);
    final borderColor = today ? _amber : _cyan.withOpacity(0.14);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color:        _bgCard,
        border:       Border.all(color: borderColor, width: today ? 1.5 : 1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Header ──────────────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
            decoration: BoxDecoration(
              color: today ? _amber.withOpacity(0.10) : Colors.transparent,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(7)),
            ),
            child: Row(
              children: [
                Text(
                  dateLabel,
                  style: TextStyle(
                    fontFamily:    'monospace',
                    color:         today ? _amber : _cyan.withOpacity(0.65),
                    fontSize:      13,
                    fontWeight:    FontWeight.bold,
                    letterSpacing: 1.5,
                  ),
                ),
                if (today) ...[
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color:        _amber.withOpacity(0.18),
                      border:       Border.all(color: _amber, width: 1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Text(
                      '◀ HOY',
                      style: TextStyle(
                        fontFamily:    'monospace',
                        color:         _amber,
                        fontSize:      9,
                        fontWeight:    FontWeight.bold,
                        letterSpacing: 1.5,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),

          // ── Sky row ──────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 10, 10, 0),
            child: Row(children: [
              Expanded(child: _buildSkyMiniCard('MAÑANA',  r.skyMorning)),
              const SizedBox(width: 6),
              Expanded(child: _buildSkyMiniCard('TARDE',   r.skyAfternoon)),
              const SizedBox(width: 6),
              Expanded(child: _buildSkyMiniCard('NOCHE',   r.skyNight)),
            ]),
          ),

          // ── Temp row ─────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 0),
            child: Row(
              children: [
                _tempBadge('↓', r.tempMin, _tempMinColor(r.tempMin)),
                const SizedBox(width: 14),
                _tempBadge('↑', r.tempMax, _tempMaxColor(r.tempMax)),
                if (r.uvMax != null) ...[
                  const Spacer(),
                  _uvBadge(r.uvMax!),
                ],
              ],
            ),
          ),

          // Thermal sensation (when available)
          if (r.thermalSensMin != null || r.thermalSensMax != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 3, 14, 0),
              child: Text(
                'S.T.  ↓${r.thermalSensMin ?? "--"}°  ↑${r.thermalSensMax ?? "--"}°',
                style: TextStyle(
                  fontFamily: 'monospace',
                  color:      _cyan.withOpacity(0.38),
                  fontSize:   10,
                ),
              ),
            ),

          // Humidity (when available)
          if (r.humidityMin != null || r.humidityMax != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 3, 14, 0),
              child: Text(
                'Humedad  ↓${r.humidityMin ?? "--"}%  ↑${r.humidityMax ?? "--"}%',
                style: TextStyle(
                  fontFamily: 'monospace',
                  color:      _cyan.withOpacity(0.38),
                  fontSize:   10,
                ),
              ),
            ),

          // ── Wind row ──────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 0),
            child: Row(
              children: [
                Icon(Icons.air, size: 12, color: _cyan.withOpacity(0.40)),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'M: ${_windLabel(r.windMorningDir, r.windMorningSpeed)}'
                    '   T: ${_windLabel(r.windAfternoonDir, r.windAfternoonSpeed)}'
                    '   N: ${_windLabel(r.windNightDir, r.windNightSpeed)}',
                    style: TextStyle(
                      fontFamily: 'monospace',
                      color:      _cyan.withOpacity(0.50),
                      fontSize:   10,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Max gust (when available)
          if (r.maxGust != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(32, 2, 14, 0),
              child: Text(
                'Racha máx: ${r.maxGust} km/h',
                style: TextStyle(
                  fontFamily: 'monospace',
                  color:      _cyan.withOpacity(0.28),
                  fontSize:   10,
                ),
              ),
            ),

          // ── Rain row ──────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
            child: _buildDailyRainRow(r),
          ),
        ],
      ),
    );
  }

  Widget _buildSkyMiniCard(String period, String desc) {
    final color = _skyColor(desc);
    final icon  = _skyIcon(desc);
    return Column(
      children: [
        Text(
          period,
          style: TextStyle(
            fontFamily:    'monospace',
            color:         color.withOpacity(0.50),
            fontSize:      9,
            letterSpacing: 1.8,
            fontWeight:    FontWeight.bold,
          ),
        ),
        const SizedBox(height: 7),
        Icon(icon, size: 26, color: color,
            shadows: [Shadow(color: color.withOpacity(0.45), blurRadius: 8)]),
        const SizedBox(height: 7),
        Text(
          desc,
          textAlign: TextAlign.center,
          maxLines:  2,
          overflow:  TextOverflow.ellipsis,
          style: TextStyle(
            fontFamily: 'monospace',
            color:      color.withOpacity(0.82),
            fontSize:   10,
            height:     1.4,
          ),
        ),
      ],
    );
  }

  Widget _tempBadge(String arrow, int? value, Color color) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            arrow,
            style: TextStyle(fontFamily: 'monospace', color: color.withOpacity(0.55), fontSize: 12),
          ),
          const SizedBox(width: 3),
          Text(
            value != null ? '${value}°' : '--',
            style: TextStyle(
              fontFamily: 'monospace',
              color:      color,
              fontSize:   22,
              fontWeight: FontWeight.bold,
              shadows:    [Shadow(color: color.withOpacity(0.35), blurRadius: 8)],
            ),
          ),
        ],
      );

  Widget _uvBadge(int uv) {
    final Color color;
    if (uv >= 8)       color = const Color(0xFFFF2200);
    else if (uv >= 6)  color = const Color(0xFFFF8800);
    else if (uv >= 3)  color = _amber;
    else               color = _greenOk;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color:        color.withOpacity(0.12),
        border:       Border.all(color: color.withOpacity(0.50)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        'UV $uv',
        style: TextStyle(fontFamily: 'monospace', color: color, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildDailyRainRow(DailyWeatherRow r) {
    final Color rainColor;
    if (r.rainProb >= 60)      rainColor = _rainBlue;
    else if (r.rainProb >= 30) rainColor = _cyan.withOpacity(0.80);
    else                       rainColor = _greenOk.withOpacity(0.75);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.water_drop_outlined, size: 12, color: rainColor.withOpacity(0.60)),
            const SizedBox(width: 6),
            Text(
              '${r.rainProb}%',
              style: TextStyle(
                fontFamily: 'monospace',
                color:      rainColor,
                fontSize:   14,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: LinearProgressIndicator(
                  value:           r.rainProb / 100.0,
                  minHeight:       4,
                  backgroundColor: rainColor.withOpacity(0.10),
                  valueColor:      AlwaysStoppedAnimation<Color>(rainColor),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'M: ${r.rainProbMorning}%   T: ${r.rainProbAfternoon}%   N: ${r.rainProbNight}%',
          style: TextStyle(
            fontFamily: 'monospace',
            color:      rainColor.withOpacity(0.45),
            fontSize:   10,
          ),
        ),
      ],
    );
  }

  // ── HOURLY TAB ─────────────────────────────────────────────────────────────
  Widget _buildHourlyTab() {
    if (_hourly.isEmpty) return _buildEmpty();

    // Build flat list: day headers interleaved with hour rows.
    final items = <({bool isHeader, String date, HourlyWeatherRow? row})>[];
    String? lastDate;
    for (final row in _hourly) {
      if (row.date != lastDate) {
        items.add((isHeader: true, date: row.date, row: null));
        lastDate = row.date;
      }
      items.add((isHeader: false, date: row.date, row: row));
    }

    return RefreshIndicator(
      color:           _amber,
      backgroundColor: _bgCard,
      onRefresh:       _loadAll,
      child: ListView.builder(
        physics:     const AlwaysScrollableScrollPhysics(),
        itemCount:   items.length,
        itemBuilder: (_, i) {
          final item = items[i];
          return item.isHeader
              ? _buildHourlyDayHeader(item.date)
              : _buildHourRow(item.row!);
        },
      ),
    );
  }

  Widget _buildHourlyDayHeader(String dateStr) {
    final label = _formatDate(dateStr);
    final today = _isToday(dateStr);
    return Container(
      color: today ? _amber.withOpacity(0.06) : Colors.transparent,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      child: Row(
        children: [
          Expanded(child: Container(height: 1, color: _cyan.withOpacity(0.12))),
          const SizedBox(width: 10),
          Text(
            label,
            style: TextStyle(
              fontFamily:    'monospace',
              color:         today ? _amber : _cyan.withOpacity(0.45),
              fontSize:      11,
              fontWeight:    FontWeight.bold,
              letterSpacing: 2,
            ),
          ),
          if (today) ...[
            const SizedBox(width: 7),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
              decoration: BoxDecoration(
                border:       Border.all(color: _amber.withOpacity(0.55)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'HOY',
                style: TextStyle(
                  fontFamily: 'monospace', color: _amber,
                  fontSize: 8, letterSpacing: 1.5,
                ),
              ),
            ),
          ],
          const SizedBox(width: 10),
          Expanded(child: Container(height: 1, color: _cyan.withOpacity(0.12))),
        ],
      ),
    );
  }

  Widget _buildHourRow(HourlyWeatherRow r) {
    final isCurrent = _isCurrentHour(r.date, r.hour);
    final skyColor  = _skyColor(r.sky);
    final skyIcon   = _skyIcon(r.sky);
    final tempColor = _tempHourlyColor(r.temperature);

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 7, 14, 7),
      decoration: BoxDecoration(
        color: isCurrent ? _magenta.withOpacity(0.09) : null,
        border: isCurrent
            ? const Border(left: BorderSide(color: _magenta, width: 2))
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Line 1: hour · sky icon · sky description · temperature
          Row(
            children: [
              Text(
                '${r.hour}:00',
                style: TextStyle(
                  fontFamily: 'monospace',
                  color:      isCurrent ? _magenta : _amber.withOpacity(0.65),
                  fontSize:   12,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 10),
              Icon(skyIcon, size: 15, color: skyColor),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  r.sky.isEmpty ? '—' : r.sky,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: 'monospace',
                    color:      skyColor.withOpacity(0.75),
                    fontSize:   11,
                  ),
                ),
              ),
              if (r.temperature != null)
                Text(
                  '${r.temperature}°',
                  style: TextStyle(
                    fontFamily: 'monospace',
                    color:      tempColor,
                    fontSize:   14,
                    fontWeight: FontWeight.bold,
                    shadows:    [Shadow(color: tempColor.withOpacity(0.35), blurRadius: 6)],
                  ),
                ),
            ],
          ),

          // Line 2: wind · humidity · rain probability
          Padding(
            padding: const EdgeInsets.only(left: 40, top: 3),
            child: Row(
              children: [
                // Wind
                if (r.windSpeed != null || r.windDir.isNotEmpty) ...[
                  Icon(Icons.air, size: 11, color: _cyan.withOpacity(0.40)),
                  const SizedBox(width: 4),
                  Text(
                    '${_windArrow(r.windDir)}${r.windDir} ${r.windSpeed ?? "--"}km/h',
                    style: TextStyle(
                      fontFamily: 'monospace',
                      color:      _cyan.withOpacity(0.50),
                      fontSize:   10,
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                // Humidity
                if (r.humidity != null) ...[
                  const Text('💧', style: TextStyle(fontSize: 10)),
                  const SizedBox(width: 2),
                  Text(
                    '${r.humidity}%',
                    style: TextStyle(
                      fontFamily: 'monospace',
                      color:      _cyan.withOpacity(0.45),
                      fontSize:   10,
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                // Rain probability (only when > 0)
                if (r.rainProb > 0) ...[
                  const Text('🌧', style: TextStyle(fontSize: 10)),
                  const SizedBox(width: 2),
                  Text(
                    '${r.rainProb}%',
                    style: TextStyle(
                      fontFamily: 'monospace',
                      color:      _rainBlue.withOpacity(0.70),
                      fontSize:   10,
                    ),
                  ),
                ],
                // Precipitation mm (when non-null and > 0)
                if (r.precipMm != null && r.precipMm! > 0) ...[
                  const SizedBox(width: 10),
                  Text(
                    '${r.precipMm}mm',
                    style: TextStyle(
                      fontFamily: 'monospace',
                      color:      _rainBlue.withOpacity(0.55),
                      fontSize:   10,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
