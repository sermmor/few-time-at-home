import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../models/aemet_models.dart';
import '../services/aemet_service.dart';

class WeatherScreen extends StatefulWidget {
  const WeatherScreen({super.key});
  @override
  State<WeatherScreen> createState() => _WeatherScreenState();
}

class _WeatherScreenState extends State<WeatherScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  bool               _loading = true;
  String?            _error;
  List<DailyWeatherRow>  _daily  = [];
  List<HourlyWeatherRow> _hourly = [];

  static const _amber   = CyberColors.amber;
  static const _cyan    = CyberColors.cyan;
  static const _magenta = CyberColors.magenta;
  static const _blue    = CyberColors.blue;
  static const _gray    = CyberColors.gray;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() { _tabCtrl.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        AemetService.fetchDaily(),
        AemetService.fetchHourly(),
      ]);
      if (!mounted) return;
      setState(() {
        _daily   = results[0] as List<DailyWeatherRow>;
        _hourly  = results[1] as List<HourlyWeatherRow>;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  // ── Sky helpers ──────────────────────────────────────────────────────────
  static Color _skyColor(String desc) {
    final d = desc.toLowerCase();
    if (d.contains('tormenta'))              return const Color(0xFF7F00FF);
    if (d.contains('nieve') || d.contains('aguanieve')) return const Color(0xFFAADDFF);
    if (d.contains('lluvia') || d.contains('chubasco') || d.contains('llovizna'))
      return _blue;
    if (d.contains('nub') && d.contains('claro'))       return _amber;
    if (d.contains('despejado') || d.contains('poco nuboso')) return _amber;
    return _gray;
  }

  static IconData _skyIcon(String desc) {
    final d = desc.toLowerCase();
    if (d.contains('tormenta'))           return Icons.thunderstorm_outlined;
    if (d.contains('nieve'))              return Icons.ac_unit;
    if (d.contains('lluvia') || d.contains('chubasco')) return Icons.grain;
    if (d.contains('llovizna'))           return Icons.water_drop_outlined;
    if (d.contains('despejado') || d.contains('poco nuboso')) return Icons.wb_sunny_outlined;
    if (d.contains('nub'))                return Icons.cloud_outlined;
    return Icons.cloud_outlined;
  }

  static String _windArrow(String code) {
    const map = {
      'N':'↑','NNE':'↑↗','NE':'↗','ENE':'→↗','E':'→',
      'ESE':'→↘','SE':'↘','SSE':'↓↘','S':'↓','SSO':'↓↙',
      'SO':'↙','OSO':'←↙','O':'←','ONO':'←↖','NO':'↖','NNO':'↑↖',
      'C': '○',
    };
    return map[code.toUpperCase()] ?? code;
  }

  static Color _tempColor(int? t) {
    if (t == null) return _gray;
    if (t <= 5)  return _blue;
    if (t <= 15) return const Color(0xFF00BFFF);
    if (t <= 25) return _amber;
    if (t <= 35) return const Color(0xFFFF6600);
    return const Color(0xFFFF2200);
  }

  static Color _uvColor(int? uv) {
    if (uv == null) return _gray;
    if (uv < 3)  return const Color(0xFF00FF88);
    if (uv < 6)  return _amber;
    if (uv < 8)  return const Color(0xFFFF6600);
    return const Color(0xFFFF2200);
  }

  static String _formatDate(String date) {
    try {
      final d = DateTime.parse(date);
      return DateFormat('EEE dd MMM', 'es').format(d).toUpperCase();
    } catch (_) { return date; }
  }

  static bool _isToday(String date) {
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    return date == today;
  }

  // ── Build ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CyberColors.bg,
      appBar: AppBar(
        backgroundColor: CyberColors.bgPanel,
        title: const Row(children: [
          Icon(Icons.cloud_outlined, color: _amber, size: 18),
          SizedBox(width: 8),
          Text('// TIEMPO //', style: TextStyle(color: _amber, letterSpacing: 3, fontSize: 13)),
        ]),
        actions: [
          IconButton(
            icon:      const Icon(Icons.refresh, color: _amber),
            onPressed: _load,
            tooltip:   'Actualizar',
          ),
        ],
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: _amber,
          labelColor:     _amber,
          unselectedLabelColor: _gray,
          labelStyle:     const TextStyle(fontFamily: 'monospace', fontSize: 11, letterSpacing: 1.5),
          tabs: const [Tab(text: 'DIARIO'), Tab(text: 'HORA A HORA')],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: _amber))
          : _error != null
              ? _buildError()
              : TabBarView(
                  controller: _tabCtrl,
                  children: [_buildDailyTab(), _buildHourlyTab()],
                ),
    );
  }

  Widget _buildError() => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.wifi_off, color: _gray, size: 48),
        const SizedBox(height: 12),
        Text(_error!, style: const TextStyle(color: _gray, fontFamily: 'monospace', fontSize: 11)),
        const SizedBox(height: 16),
        CyberButton(label: 'REINTENTAR', color: _amber, onPressed: _load),
      ],
    ),
  );

  // ── Daily tab ─────────────────────────────────────────────────────────────
  Widget _buildDailyTab() {
    final isDesktop = MediaQuery.of(context).size.width >= 900;
    if (isDesktop) {
      // Grid layout for desktop
      return GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
          maxCrossAxisExtent: 340,
          mainAxisExtent:     320,
          crossAxisSpacing:   12,
          mainAxisSpacing:    12,
        ),
        itemCount: _daily.length,
        itemBuilder: (_, i) => _buildDayCard(_daily[i]),
      );
    }
    return ListView.separated(
      padding:   const EdgeInsets.all(12),
      itemCount: _daily.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) => _buildDayCard(_daily[i]),
    );
  }

  Widget _buildDayCard(DailyWeatherRow row) {
    final isToday  = _isToday(row.date);
    final skyColor = _skyColor(row.skyAfternoon);
    return Container(
      padding:    const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color:  isToday ? _amber.withOpacity(0.07) : CyberColors.bgPanel,
        border: Border.all(color: isToday ? _amber : CyberColors.border),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(children: [
            Text(_formatDate(row.date),
                style: TextStyle(
                    fontFamily: 'monospace', fontSize: 12, letterSpacing: 1.5,
                    color: isToday ? _amber : _gray)),
            if (isToday) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: _amber.withOpacity(0.2),
                  border: Border.all(color: _amber),
                  borderRadius: BorderRadius.circular(3),
                ),
                child: const Text('HOY', style: TextStyle(color: _amber, fontFamily: 'monospace', fontSize: 9)),
              ),
            ],
            const Spacer(),
            if (row.uvMax != null) Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                border: Border.all(color: _uvColor(row.uvMax)),
                borderRadius: BorderRadius.circular(3),
              ),
              child: Text('UV${row.uvMax}',
                  style: TextStyle(color: _uvColor(row.uvMax), fontFamily: 'monospace', fontSize: 9)),
            ),
          ]),
          const SizedBox(height: 10),
          // Sky + temperatures
          Row(children: [
            Icon(_skyIcon(row.skyAfternoon), color: skyColor, size: 32),
            const SizedBox(width: 10),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(row.skyAfternoon,
                  style: TextStyle(color: skyColor, fontFamily: 'monospace', fontSize: 11),
                  maxLines: 2, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 4),
              Row(children: [
                Text('↓ ${row.tempMin ?? '--'}°',
                    style: TextStyle(color: _tempColor(row.tempMin), fontFamily: 'monospace', fontSize: 12)),
                const SizedBox(width: 8),
                Text('↑ ${row.tempMax ?? '--'}°',
                    style: TextStyle(color: _tempColor(row.tempMax), fontFamily: 'monospace', fontSize: 12)),
              ]),
            ]),
          ]),
          const SizedBox(height: 8),
          // Rain prob
          if (row.rainProb > 0) ...[
            Row(children: [
              const Icon(Icons.water_drop_outlined, color: _blue, size: 14),
              const SizedBox(width: 4),
              Text('${row.rainProb}%',
                  style: const TextStyle(color: _blue, fontFamily: 'monospace', fontSize: 11)),
              const SizedBox(width: 8),
              Expanded(
                child: LinearProgressIndicator(
                  value:      row.rainProb / 100.0,
                  color:      _blue,
                  backgroundColor: CyberColors.bgLight,
                  minHeight:  3,
                ),
              ),
            ]),
            const SizedBox(height: 6),
          ],
          // Wind
          if (row.windAfternoonDir.isNotEmpty) Row(children: [
            Text(
              '${_windArrow(row.windAfternoonDir)} ${row.windAfternoonSpeed ?? '--'} km/h',
              style: const TextStyle(color: _gray, fontFamily: 'monospace', fontSize: 10),
            ),
          ]),
          // Humidity
          if (row.humidityMax != null) Row(children: [
            const Icon(Icons.water_outlined, color: _gray, size: 12),
            const SizedBox(width: 4),
            Text('${row.humidityMax}%',
                style: const TextStyle(color: _gray, fontFamily: 'monospace', fontSize: 10)),
          ]),
        ],
      ),
    );
  }

  // ── Hourly tab ────────────────────────────────────────────────────────────
  Widget _buildHourlyTab() {
    // Group by date
    final Map<String, List<HourlyWeatherRow>> grouped = {};
    for (final row in _hourly) {
      grouped.putIfAbsent(row.date, () => []).add(row);
    }
    final dates = grouped.keys.toList();

    return ListView.builder(
      itemCount: dates.length,
      itemBuilder: (_, i) {
        final date  = dates[i];
        final rows  = grouped[date]!;
        final isToday = _isToday(date);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: isToday ? _amber.withOpacity(0.07) : CyberColors.bgPanel,
              child: Row(children: [
                Container(width: 3, height: 16, color: _amber),
                const SizedBox(width: 10),
                Text(
                  _formatDate(date),
                  style: TextStyle(
                    fontFamily: 'monospace', fontSize: 11, letterSpacing: 2,
                    color: isToday ? _amber : _gray,
                  ),
                ),
                if (isToday) ...[
                  const SizedBox(width: 8),
                  const Text('HOY', style: TextStyle(color: _amber, fontFamily: 'monospace', fontSize: 9)),
                ],
              ]),
            ),
            ...rows.map((row) => _buildHourRow(row)),
            const Divider(color: CyberColors.border, height: 1),
          ],
        );
      },
    );
  }

  Widget _buildHourRow(HourlyWeatherRow row) {
    final now     = DateTime.now();
    final isCurH  = _isToday(row.date) && now.hour.toString().padLeft(2, '0') == row.hour;
    final skyCol  = _skyColor(row.sky);

    return Container(
      color: isCurH ? _magenta.withOpacity(0.06) : null,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        children: [
          // Hour
          Container(
            width: 42,
            child: Text(
              '${row.hour}:00',
              style: TextStyle(
                fontFamily: 'monospace', fontSize: 11, letterSpacing: 0.5,
                color: isCurH ? _cyan : _amber,
              ),
            ),
          ),
          if (isCurH) Container(width: 2, height: 18, color: _magenta, margin: const EdgeInsets.only(right: 6)),
          // Sky icon
          Icon(_skyIcon(row.sky), color: skyCol, size: 16),
          const SizedBox(width: 6),
          // Temperature
          SizedBox(
            width: 36,
            child: Text(
              '${row.temperature ?? '--'}°',
              style: TextStyle(color: _tempColor(row.temperature), fontFamily: 'monospace', fontSize: 12),
            ),
          ),
          // Wind
          Expanded(
            child: Text(
              row.windDir.isNotEmpty
                  ? '${_windArrow(row.windDir)} ${row.windSpeed ?? '--'} km/h'
                  : '',
              style: const TextStyle(color: _gray, fontFamily: 'monospace', fontSize: 10),
            ),
          ),
          // Humidity
          if (row.humidity != null)
            Text('💧${row.humidity}%',
                style: const TextStyle(color: _gray, fontFamily: 'monospace', fontSize: 10)),
          const SizedBox(width: 6),
          // Rain
          if (row.rainProb > 0)
            Text('🌧${row.rainProb}%',
                style: const TextStyle(color: _blue, fontFamily: 'monospace', fontSize: 10)),
        ],
      ),
    );
  }
}
