import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/weather_model.dart';

class WeatherScreen extends StatefulWidget {
  const WeatherScreen({super.key});

  @override
  State<WeatherScreen> createState() => _WeatherScreenState();
}

class _WeatherScreenState extends State<WeatherScreen> {
  // ── Palette ────────────────────────────────────────────────────────────────
  static const _bg       = Color(0xFF020C18);
  static const _bgPanel  = Color(0xFF071526);
  static const _bgCard   = Color(0xFF0B1E36);
  static const _cyan     = Color(0xFF00FFE7);
  static const _amber    = Color(0xFFFFBB00);
  static const _amberDim = Color(0xAAFFBB00);
  static const _rainBlue = Color(0xFF4A90FF);
  static const _greenOk  = Color(0xFF00FF88);
  static const _snow     = Color(0xFFAADDFF);
  static const _purple   = Color(0xFFBB66FF);

  final _supabase = Supabase.instance.client;
  WeatherModel?    _weather;
  bool             _loading = true;
  RealtimeChannel? _channel;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    _loadWeather();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _channel?.unsubscribe();
    super.dispose();
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  Future<void> _loadWeather() async {
    setState(() => _loading = true);
    try {
      final data = await _supabase
          .from('weather')
          .select()
          .eq('id', 1)
          .maybeSingle();
      if (!mounted) return;
      setState(() {
        _weather = data != null ? WeatherModel.fromJson(data) : null;
        _loading = false;
      });
    } catch (e) {
      print('[Weather] Load error: $e');
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Realtime ───────────────────────────────────────────────────────────────
  void _subscribeRealtime() {
    _channel?.unsubscribe();
    _channel = _supabase
        .channel('public:weather')
        .onPostgresChanges(
          event:    PostgresChangeEvent.insert,
          schema:   'public',
          table:    'weather',
          callback: (payload) {
            if (!mounted) return;
            try {
              setState(() => _weather = WeatherModel.fromJson(payload.newRecord));
            } catch (e) {
              print('[Weather Realtime] INSERT error: $e');
            }
          },
        )
        .onPostgresChanges(
          event:    PostgresChangeEvent.update,
          schema:   'public',
          table:    'weather',
          callback: (payload) {
            if (!mounted) return;
            try {
              setState(() => _weather = WeatherModel.fromJson(payload.newRecord));
            } catch (e) {
              print('[Weather Realtime] UPDATE error: $e');
            }
          },
        )
        .subscribe();
  }

  // ── Sky helpers ─────────────────────────────────────────────────────────────
  IconData _skyIcon(String desc) {
    final d = desc.toLowerCase();
    if (d.contains('torment') || d.contains('rayos'))                            return Icons.thunderstorm_outlined;
    if (d.contains('nieve')   || d.contains('nevada'))                           return Icons.ac_unit;
    if (d.contains('granizo'))                                                   return Icons.grain;
    if (d.contains('lluvia')  || d.contains('llovizna') ||
        d.contains('chubasco')|| d.contains('precipitac'))                       return Icons.water_drop_outlined;
    if (d.contains('niebla')  || d.contains('bruma'))                            return Icons.blur_on_outlined;
    if (d.contains('cubierto')|| d.contains('muy nuboso'))                       return Icons.cloud;
    if (d.contains('nuboso')  || d.contains('nubes altas') ||
        d.contains('nublado'))                                                   return Icons.cloud_queue;
    if (d.contains('poco nuboso') || d.contains('intervalos'))                   return Icons.wb_cloudy;
    if (d.contains('despejad')|| d.contains('sol') || d.contains('soleado'))    return Icons.wb_sunny;
    return Icons.wb_cloudy;
  }

  Color _skyColor(String desc) {
    final d = desc.toLowerCase();
    if (d.contains('torment') || d.contains('rayos'))                            return _purple;
    if (d.contains('nieve')   || d.contains('nevada') || d.contains('granizo')) return _snow;
    if (d.contains('lluvia')  || d.contains('llovizna') ||
        d.contains('chubasco')|| d.contains('precipitac'))                       return _rainBlue;
    if (d.contains('niebla')  || d.contains('bruma'))                            return const Color(0xFF99AABB);
    if (d.contains('cubierto')|| d.contains('muy nuboso'))                       return const Color(0xFF6688AA);
    if (d.contains('nuboso')  || d.contains('nubes'))                            return const Color(0xFF88AACC);
    if (d.contains('poco nuboso') || d.contains('intervalos'))                   return const Color(0xFFAABBCC);
    if (d.contains('despejad')|| d.contains('sol'))                              return _amber;
    return const Color(0xFF88AACC);
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar:          _buildAppBar(),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: _amber))
          : _weather == null
              ? _buildEmpty()
              : RefreshIndicator(
                  color:           _amber,
                  backgroundColor: _bgPanel,
                  onRefresh:       _loadWeather,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
                    child:   _buildContent(_weather!),
                  ),
                ),
    );
  }

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
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: _amber.withOpacity(0.28)),
        ),
        actions: [
          IconButton(
            icon:      Icon(Icons.refresh, size: 20, color: _amber.withOpacity(0.55)),
            tooltip:   'Actualizar',
            onPressed: _loadWeather,
          ),
        ],
      );

  Widget _buildEmpty() => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.wb_cloudy, size: 60, color: _amber.withOpacity(0.12)),
            const SizedBox(height: 18),
            const Text(
              '// SIN DATOS //',
              style: TextStyle(
                fontFamily:    'monospace',
                color:         _amberDim,
                fontSize:      13,
                letterSpacing: 2.5,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'El pronóstico llegará a las 07:00',
              style: TextStyle(
                fontFamily: 'monospace',
                color:      _amber.withOpacity(0.28),
                fontSize:   11,
              ),
            ),
          ],
        ),
      );

  // ── Content ────────────────────────────────────────────────────────────────
  Widget _buildContent(WeatherModel w) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildDateHeader(w),
        const SizedBox(height: 20),
        _buildSkyRow(w),
        const SizedBox(height: 14),
        _buildTemperatureCard(w),
        const SizedBox(height: 14),
        _buildRainCard(w),
        const SizedBox(height: 20),
        _buildUpdatedAt(w),
      ],
    );
  }

  // ── Date header ────────────────────────────────────────────────────────────
  Widget _buildDateHeader(WeatherModel w) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        color:        _amber.withOpacity(0.06),
        border:       Border.all(color: _amber.withOpacity(0.32), width: 1),
        borderRadius: BorderRadius.circular(5),
      ),
      child: Row(
        children: [
          Icon(Icons.calendar_today_outlined, size: 13, color: _amberDim),
          const SizedBox(width: 10),
          Text(
            'MÁLAGA  ·  ${w.dateStr}',
            style: const TextStyle(
              fontFamily:    'monospace',
              color:         _amber,
              fontSize:      12,
              letterSpacing: 1.8,
              fontWeight:    FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  // ── Sky row (3 cards) ──────────────────────────────────────────────────────
  Widget _buildSkyRow(WeatherModel w) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(child: _buildSkyCard('MAÑANA',  '06 – 12h', w.skyMorning)),
        const SizedBox(width: 10),
        Expanded(child: _buildSkyCard('TARDE',   '12 – 18h', w.skyAfternoon)),
        const SizedBox(width: 10),
        Expanded(child: _buildSkyCard('NOCHE',   '18 – 24h', w.skyNight)),
      ],
    );
  }

  Widget _buildSkyCard(String period, String range, String description) {
    final col  = _skyColor(description);
    final icon = _skyIcon(description);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
      decoration: BoxDecoration(
        color:        _bgCard,
        border:       Border.all(color: col.withOpacity(0.30), width: 1),
        borderRadius: BorderRadius.circular(6),
        boxShadow: [
          BoxShadow(color: col.withOpacity(0.04), blurRadius: 10, spreadRadius: 1),
        ],
      ),
      child: Column(
        children: [
          // Period label
          Text(
            period,
            style: TextStyle(
              fontFamily:    'monospace',
              color:         col.withOpacity(0.65),
              fontSize:      9,
              letterSpacing: 1.8,
              fontWeight:    FontWeight.bold,
            ),
          ),
          Text(
            range,
            style: TextStyle(
              fontFamily: 'monospace',
              color:      col.withOpacity(0.30),
              fontSize:   8,
            ),
          ),
          const SizedBox(height: 14),
          // Icon with glow
          Icon(
            icon,
            size:    34,
            color:   col,
            shadows: [Shadow(color: col.withOpacity(0.55), blurRadius: 10)],
          ),
          const SizedBox(height: 12),
          // Description
          Text(
            description,
            textAlign: TextAlign.center,
            maxLines:  3,
            overflow:  TextOverflow.ellipsis,
            style: TextStyle(
              fontFamily: 'monospace',
              color:      col.withOpacity(0.85),
              fontSize:   10,
              height:     1.45,
            ),
          ),
        ],
      ),
    );
  }

  // ── Temperature card ───────────────────────────────────────────────────────
  Widget _buildTemperatureCard(WeatherModel w) {
    final minStr   = w.tempMin != null ? '${w.tempMin}°' : '--';
    final maxStr   = w.tempMax != null ? '${w.tempMax}°' : '--';
    final minColor = _tempColor(w.tempMin, isCold: true);
    final maxColor = _tempColor(w.tempMax, isCold: false);

    return _sectionCard(
      label: 'TEMPERATURA',
      icon:  Icons.thermostat_outlined,
      color: _amber,
      child: Column(
        children: [
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              _tempColumn('MÍN', minStr, minColor),
              Text(
                '/',
                style: TextStyle(
                  fontFamily: 'monospace',
                  color:      _amber.withOpacity(0.25),
                  fontSize:   28,
                ),
              ),
              _tempColumn('MÁX', maxStr, maxColor),
            ],
          ),
          if (w.tempMin != null && w.tempMax != null) ...[
            const SizedBox(height: 18),
            _buildGradientBar(),
          ],
        ],
      ),
    );
  }

  Color _tempColor(int? temp, {required bool isCold}) {
    if (temp == null) return _amberDim;
    if (isCold) {
      if (temp <= 5)  return const Color(0xFF66AAFF);
      if (temp <= 12) return const Color(0xFF88CCFF);
      return _cyan.withOpacity(0.8);
    } else {
      if (temp >= 35) return const Color(0xFFFF2200);
      if (temp >= 28) return const Color(0xFFFF6622);
      if (temp >= 22) return const Color(0xFFFFAA00);
      return _amber;
    }
  }

  Widget _tempColumn(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            fontFamily:    'monospace',
            color:         color.withOpacity(0.45),
            fontSize:      9,
            letterSpacing: 2,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          value,
          style: TextStyle(
            fontFamily:  'monospace',
            color:       color,
            fontSize:    34,
            fontWeight:  FontWeight.bold,
            shadows:     [Shadow(color: color.withOpacity(0.35), blurRadius: 12)],
          ),
        ),
      ],
    );
  }

  Widget _buildGradientBar() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: Container(
        height: 5,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Color(0xFF4499FF),
              Color(0xFF00FFE7),
              Color(0xFFFFBB00),
              Color(0xFFFF4422),
            ],
            stops: [0.0, 0.35, 0.65, 1.0],
          ),
        ),
      ),
    );
  }

  // ── Rain card ──────────────────────────────────────────────────────────────
  Widget _buildRainCard(WeatherModel w) {
    return _sectionCard(
      label: 'PRECIPITACIÓN',
      icon:  Icons.water_drop_outlined,
      color: w.willRain ? _rainBlue : _greenOk,
      child: Padding(
        padding: const EdgeInsets.only(top: 14),
        child: w.willRain ? _buildRainContent(w) : _buildNoRainContent(),
      ),
    );
  }

  Widget _buildNoRainContent() {
    return Row(
      children: [
        Icon(Icons.check_circle_outline, color: _greenOk, size: 20),
        const SizedBox(width: 12),
        Text(
          'SIN PRECIPITACIÓN PREVISTA',
          style: TextStyle(
            fontFamily:    'monospace',
            color:         _greenOk,
            fontSize:      12,
            letterSpacing: 1,
          ),
        ),
      ],
    );
  }

  Widget _buildRainContent(WeatherModel w) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Probability row
        Row(
          children: [
            Icon(Icons.water_drop, color: _rainBlue.withOpacity(0.7), size: 16),
            const SizedBox(width: 8),
            Text(
              'PROBABILIDAD: ',
              style: TextStyle(
                fontFamily:    'monospace',
                color:         _rainBlue.withOpacity(0.55),
                fontSize:      11,
                letterSpacing: 1,
              ),
            ),
            Text(
              '${w.rainProbability}%',
              style: const TextStyle(
                fontFamily:  'monospace',
                color:       _rainBlue,
                fontSize:    18,
                fontWeight:  FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Probability bar
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value:           w.rainProbability / 100.0,
            minHeight:       5,
            backgroundColor: _rainBlue.withOpacity(0.10),
            valueColor:      AlwaysStoppedAnimation<Color>(_rainBlue),
          ),
        ),
        // Rain periods
        if (w.rainPeriods.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(
            'FRANJAS HORARIAS',
            style: TextStyle(
              fontFamily:    'monospace',
              color:         _rainBlue.withOpacity(0.40),
              fontSize:      9,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 10),
          ...w.rainPeriods.map(
            (rp) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Icon(Icons.schedule, size: 12, color: _rainBlue.withOpacity(0.45)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      rp.label,
                      style: TextStyle(
                        fontFamily: 'monospace',
                        color:      _rainBlue.withOpacity(0.80),
                        fontSize:   11,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                    decoration: BoxDecoration(
                      color:        _rainBlue.withOpacity(0.08),
                      border:       Border.all(color: _rainBlue.withOpacity(0.45)),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${rp.probability}%',
                      style: const TextStyle(
                        fontFamily:  'monospace',
                        color:       _rainBlue,
                        fontSize:    11,
                        fontWeight:  FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  Widget _buildUpdatedAt(WeatherModel w) {
    final formatted = DateFormat('HH:mm  ·  dd/MM/yyyy').format(w.updatedAt.toLocal());
    return Center(
      child: Text(
        'actualizado: $formatted',
        style: TextStyle(
          fontFamily: 'monospace',
          color:      _amber.withOpacity(0.22),
          fontSize:   10,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  // ── Shared card wrapper ────────────────────────────────────────────────────
  Widget _sectionCard({
    required String  label,
    required IconData icon,
    required Color   color,
    required Widget  child,
  }) {
    return Container(
      width:   double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      decoration: BoxDecoration(
        color:        _bgCard,
        border:       Border.all(color: _cyan.withOpacity(0.10), width: 1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section label
          Row(
            children: [
              Icon(icon, size: 13, color: color.withOpacity(0.50)),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontFamily:    'monospace',
                  color:         color.withOpacity(0.45),
                  fontSize:      9,
                  letterSpacing: 2.2,
                  fontWeight:    FontWeight.bold,
                ),
              ),
            ],
          ),
          // Thin divider
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Container(
              height: 1,
              color:  color.withOpacity(0.10),
            ),
          ),
          child,
        ],
      ),
    );
  }
}
