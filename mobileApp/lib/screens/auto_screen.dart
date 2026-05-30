// ignore_for_file: deprecated_member_use, use_build_context_synchronously

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/grayscale_service.dart';

class AutoScreen extends StatefulWidget {
  const AutoScreen({super.key});

  @override
  State<AutoScreen> createState() => _AutoScreenState();
}

class _AutoScreenState extends State<AutoScreen> with WidgetsBindingObserver {
  // ── Palette ───────────────────────────────────────────────────────────────
  static const _purple    = Color(0xFF7F00FF);
  static const _purpleDim = Color(0x997F00FF);
  static const _cyan      = Color(0xFF00FFE7);
  static const _cyanDim   = Color(0x9900FFE7);
  static const _amber     = Color(0xFFFFB300);
  static const _orange    = Color(0xFFFF9900);
  static const _green     = Color(0xFF00FF88);
  static const _bg        = Color(0xFF020C18);
  static const _bgPanel   = Color(0xFF071526);
  static const _bgPanelLt = Color(0xFF0A1E3A);

  // ── State ─────────────────────────────────────────────────────────────────
  bool _hasPermission    = false;
  bool _isGrayscale      = false;
  bool _isLoading        = true;
  bool _scheduleEnabled  = false;

  TimeOfDay _startTime = const TimeOfDay(hour: 22, minute: 0);
  TimeOfDay _endTime   = const TimeOfDay(hour: 7,  minute: 0);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadState();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _checkPermissionAndRefresh();
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  Future<void> _loadState() async {
    setState(() => _isLoading = true);
    final hasPerm  = await GrayscaleService.checkPermission();
    final isGrey   = hasPerm ? await GrayscaleService.isGrayscaleEnabled() : false;
    final schedule = await GrayscaleService.getSchedule();
    setState(() {
      _hasPermission   = hasPerm;
      _isGrayscale     = isGrey;
      _scheduleEnabled = schedule['enabled'] ?? false;
      _startTime = TimeOfDay(hour: schedule['startHour'] ?? 22, minute: schedule['startMinute'] ?? 0);
      _endTime   = TimeOfDay(hour: schedule['endHour']   ?? 7,  minute: schedule['endMinute']   ?? 0);
      _isLoading = false;
    });
  }

  Future<void> _checkPermissionAndRefresh() async {
    final hasPerm = await GrayscaleService.checkPermission();
    if (hasPerm == _hasPermission) return;
    setState(() => _hasPermission = hasPerm);
    if (hasPerm) {
      final isGrey = await GrayscaleService.isGrayscaleEnabled();
      setState(() => _isGrayscale = isGrey);
      _snack('// PERMISO_SISTEMA DETECTADO //', color: _green);
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  Future<void> _toggleGrayscale(bool value) async {
    if (!_hasPermission) return;
    try {
      final ok = await GrayscaleService.setGrayscale(value);
      if (ok) {
        setState(() => _isGrayscale = value);
        _snack(
          value ? '// GRISES_ACTIVO — SIN_DISTRACCIONES //' : '// COLOR_NORMAL RESTAURADO //',
          color: value ? _cyan : _purple,
        );
      }
    } catch (_) {
      _snack('// ERROR — VERIFICAR_PERMISOS //', color: Colors.red.shade400);
      _loadState();
    }
  }

  Future<void> _saveSchedule(bool enabled) async {
    if (!_hasPermission) return;
    final ok = await GrayscaleService.setSchedule(
      enabled:     enabled,
      startHour:   _startTime.hour,
      startMinute: _startTime.minute,
      endHour:     _endTime.hour,
      endMinute:   _endTime.minute,
    );
    if (ok) {
      setState(() => _scheduleEnabled = enabled);
      _snack(
        enabled ? '// PROGRAMACIÓN_NOCTURNA ACTIVADA //' : '// PROGRAMACIÓN_NOCTURNA DESACTIVADA //',
        color: enabled ? _orange : _cyanDim,
      );
    } else {
      _snack('// ERROR AL GUARDAR PROGRAMACIÓN //', color: Colors.red.shade400);
    }
  }

  Future<void> _selectTime(BuildContext context, bool isStart) async {
    if (!_hasPermission) return;
    final picked = await showTimePicker(
      context:     context,
      initialTime: isStart ? _startTime : _endTime,
      builder: (ctx, child) => Theme(
        data: ThemeData.dark().copyWith(
          colorScheme: ColorScheme.dark(
            primary:   _purple,
            onPrimary: Colors.white,
            surface:   _bgPanelLt,
            onSurface: Colors.white,
          ),
          dialogBackgroundColor: _bgPanel,
        ),
        child: child!,
      ),
    );
    if (picked == null) return;
    setState(() { if (isStart) _startTime = picked; else _endTime = picked; });
    if (_scheduleEnabled) _saveSchedule(true);
  }

  void _copyToClipboard(String cmd) {
    Clipboard.setData(ClipboardData(text: cmd));
    _snack('// COPIADO AL PORTAPAPELES //', color: _purple);
  }

  void _snack(String msg, {required Color color}) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg, style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: Colors.white, letterSpacing: 1)),
      backgroundColor:  color.withOpacity(0.9),
      behavior:         SnackBarBehavior.floating,
      shape:            RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      duration:         const Duration(seconds: 3),
    ));
  }

  String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  // ── Build ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: _bg,
        body: Center(child: CircularProgressIndicator(color: _purple)),
      );
    }

    return Scaffold(
      backgroundColor: _bg,
      appBar:          _buildAppBar(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildPermissionPanel(),
            const SizedBox(height: 14),
            _buildConcentrationPanel(),
            const SizedBox(height: 14),
            _buildSchedulePanel(),
            const SizedBox(height: 24),
            _buildFooter(),
          ],
        ),
      ),
    );
  }

  // ── AppBar ────────────────────────────────────────────────────────────────
  PreferredSizeWidget _buildAppBar() => AppBar(
    backgroundColor: _bg,
    elevation:       0,
    titleSpacing:    16,
    title: const Text(
      'AUTO',
      style: TextStyle(
        fontFamily:    'monospace',
        fontSize:      12,
        fontWeight:    FontWeight.bold,
        color:         _purple,
        letterSpacing: 4,
      ),
    ),
    bottom: PreferredSize(
      preferredSize: const Size.fromHeight(1),
      child: Container(height: 1, color: _purple.withOpacity(0.35)),
    ),
    actions: [
      IconButton(
        icon:      Icon(Icons.refresh, size: 20, color: _purpleDim),
        tooltip:   'Verificar permisos',
        onPressed: _loadState,
      ),
    ],
  );

  // ── Permission panel ──────────────────────────────────────────────────────
  Widget _buildPermissionPanel() {
    final accent = _hasPermission ? _green : _amber;

    return _panel(
      accent: accent,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(children: [
            Icon(
              _hasPermission ? Icons.check_circle_outline : Icons.warning_amber_rounded,
              color: accent, size: 16,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                _hasPermission ? '// ACCESO_SEGURO CONCEDIDO //' : '// REQUIERE_PERMISO ADB //',
                style: TextStyle(
                  fontFamily: 'monospace', fontSize: 11,
                  fontWeight: FontWeight.bold, color: accent, letterSpacing: 1,
                ),
              ),
            ),
          ]),
          const SizedBox(height: 10),

          if (_hasPermission) ...[
            Text(
              'WRITE_SECURE_SETTINGS activo. Modo Concentración y Programación Nocturna operativos.',
              style: TextStyle(fontFamily: 'monospace', fontSize: 11, color: _cyanDim, height: 1.5),
            ),
          ] else ...[
            Text(
              'Se necesita un permiso especial concedido por ADB para controlar el modo de color de la pantalla.',
              style: TextStyle(fontFamily: 'monospace', fontSize: 11, color: _cyanDim, height: 1.5),
            ),
            const SizedBox(height: 14),

            _buildStep('01', 'Activa Opciones de Desarrollador:\nAjustes > Acerca del teléfono > Información de software\nPulsa 7 veces sobre "Número de compilación".'),
            _buildStep('02', 'Habilita la Depuración USB:\nAjustes > Opciones de desarrollador > Depuración USB.'),
            _buildStep('03', 'Conecta al PC y autoriza la conexión:\nConecta por USB, desbloquea la pantalla y pulsa "Permitir" en el popup de depuración.'),
            _buildStep('04', 'Ejecuta uno de estos comandos en tu PC:'),

            const SizedBox(height: 10),
            _buildCmdBox(
              'ADB en PATH:',
              'adb shell pm grant com.ftah.notifications_app android.permission.WRITE_SECURE_SETTINGS',
            ),
            const SizedBox(height: 8),
            _buildCmdBox(
              'PowerShell (ruta directa):',
              r'& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell pm grant com.ftah.notifications_app android.permission.WRITE_SECURE_SETTINGS',
            ),
            const SizedBox(height: 8),
            _buildCmdBox(
              'CMD (ruta directa):',
              r'"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" shell pm grant com.ftah.notifications_app android.permission.WRITE_SECURE_SETTINGS',
            ),

            const SizedBox(height: 14),
            _CyberpunkButton(
              label: 'VERIFICAR_PERMISO',
              color: _amber,
              icon:  Icons.security_outlined,
              full:  true,
              onTap: _loadState,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStep(String num, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$num.',
            style: const TextStyle(
              fontFamily: 'monospace', fontSize: 10,
              color: _amber, fontWeight: FontWeight.bold, letterSpacing: 1,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontFamily: 'monospace', fontSize: 11,
                color: _cyanDim, height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCmdBox(String label, String cmd) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: TextStyle(
            fontFamily: 'monospace', fontSize: 9,
            color: _cyanDim.withOpacity(0.5), letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
          decoration: BoxDecoration(
            color:        Colors.black45,
            border:       Border.all(color: _purple.withOpacity(0.3)),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Row(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Text(
                    cmd,
                    style: const TextStyle(
                      fontFamily: 'monospace', fontSize: 10,
                      color: _amber, letterSpacing: 0.5,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () => _copyToClipboard(cmd),
                child: Container(
                  padding: const EdgeInsets.all(5),
                  decoration: BoxDecoration(
                    color:        _purple.withOpacity(0.15),
                    border:       Border.all(color: _purpleDim),
                    borderRadius: BorderRadius.circular(3),
                  ),
                  child: const Icon(Icons.copy_rounded, color: _purpleDim, size: 13),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Concentration panel ───────────────────────────────────────────────────
  Widget _buildConcentrationPanel() {
    final active = _hasPermission && _isGrayscale;
    final accent = _isGrayscale ? _cyan : _purpleDim;

    return Opacity(
      opacity: _hasPermission ? 1.0 : 0.35,
      child: _panel(
        accent: active ? _cyan : _purple.withOpacity(0.3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title row + switch
            Row(children: [
              Icon(Icons.remove_red_eye_outlined, color: accent, size: 15),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  '// MODO_CONCENTRACIÓN //',
                  style: TextStyle(
                    fontFamily: 'monospace', fontSize: 11,
                    fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 1,
                  ),
                ),
              ),
              Switch.adaptive(
                value:              _isGrayscale,
                onChanged:          _hasPermission ? _toggleGrayscale : null,
                activeColor:        _cyan,
                activeTrackColor:   _cyan.withOpacity(0.25),
                inactiveThumbColor: Colors.grey.shade500,
                inactiveTrackColor: Colors.white12,
              ),
            ]),
            const SizedBox(height: 4),
            Text(
              _isGrayscale ? 'ESCALA_DE_GRISES — sin distracciones' : 'MODO_COLOR — normal',
              style: TextStyle(
                fontFamily: 'monospace', fontSize: 10,
                color: _isGrayscale ? _cyan : _cyanDim.withOpacity(0.4),
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 12),
            // Colour indicator bar
            Container(
              height: 18,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(3),
                gradient: _isGrayscale
                    ? LinearGradient(colors: [Colors.grey.shade800, Colors.grey.shade500, Colors.grey.shade800])
                    : const LinearGradient(colors: [
                        Color(0xFFE91E63), Color(0xFF9C27B0), Color(0xFF2196F3),
                        Color(0xFF4CAF50), Color(0xFFFFEB3B), Color(0xFFFF9800),
                      ]),
              ),
              alignment: Alignment.center,
              child: Text(
                _isGrayscale ? 'ESCALA_DE_GRISES ACTIVA' : 'MODO_NORMAL — TODO_COLOR',
                style: TextStyle(
                  fontFamily: 'monospace', fontSize: 8,
                  fontWeight: FontWeight.w900, letterSpacing: 2,
                  color: _isGrayscale ? Colors.white70 : Colors.black87,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Schedule panel ────────────────────────────────────────────────────────
  Widget _buildSchedulePanel() {
    final active = _hasPermission && _scheduleEnabled;

    return Opacity(
      opacity: _hasPermission ? 1.0 : 0.35,
      child: _panel(
        accent: active ? _orange : _purple.withOpacity(0.3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title row + switch
            Row(children: [
              Icon(Icons.nights_stay_outlined, color: _scheduleEnabled ? _orange : _purpleDim, size: 15),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  '// PROGRAMACIÓN_NOCTURNA //',
                  style: TextStyle(
                    fontFamily: 'monospace', fontSize: 11,
                    fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 1,
                  ),
                ),
              ),
              Switch.adaptive(
                value:              _scheduleEnabled,
                onChanged:          _hasPermission ? _saveSchedule : null,
                activeColor:        _orange,
                activeTrackColor:   _orange.withOpacity(0.25),
                inactiveThumbColor: Colors.grey.shade500,
                inactiveTrackColor: Colors.white12,
              ),
            ]),
            Text(
              _scheduleEnabled ? 'AUTOMÁTICO activo' : 'DESACTIVADO',
              style: TextStyle(
                fontFamily: 'monospace', fontSize: 10,
                color: _scheduleEnabled ? _orange : _cyanDim.withOpacity(0.4),
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 14),
            Container(height: 1, color: _purple.withOpacity(0.18)),
            const SizedBox(height: 14),

            // Time pickers
            Row(children: [
              Expanded(child: _buildTimeTile(
                label: 'INICIO',
                sub:   'NOCHE',
                time:  _startTime,
                icon:  Icons.wb_twilight_outlined,
                color: const Color(0xFFFF7700),
                onTap: () => _selectTime(context, true),
              )),
              const SizedBox(width: 12),
              Expanded(child: _buildTimeTile(
                label: 'FIN',
                sub:   'MAÑANA',
                time:  _endTime,
                icon:  Icons.wb_sunny_outlined,
                color: const Color(0xFFFFCC00),
                onTap: () => _selectTime(context, false),
              )),
            ]),

            if (_scheduleEnabled) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color:        _orange.withOpacity(0.05),
                  border:       Border.all(color: _orange.withOpacity(0.3)),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Row(children: [
                  const Icon(Icons.schedule_outlined, color: _orange, size: 13),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'GRISES → ${_fmt(_startTime)}  |  COLOR → ${_fmt(_endTime)}',
                      style: const TextStyle(
                        fontFamily: 'monospace', fontSize: 10,
                        color: _orange, letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ]),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTimeTile({
    required String label,
    required String sub,
    required TimeOfDay time,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
        decoration: BoxDecoration(
          color:        Colors.black26,
          border:       Border.all(color: color.withOpacity(0.35)),
          borderRadius: BorderRadius.circular(5),
        ),
        child: Column(
          children: [
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(icon, color: color, size: 11),
              const SizedBox(width: 4),
              Text(
                '$label / $sub',
                style: TextStyle(
                  fontFamily: 'monospace', fontSize: 9,
                  color: color.withOpacity(0.7), letterSpacing: 1,
                ),
              ),
            ]),
            const SizedBox(height: 6),
            Text(
              _fmt(time),
              style: const TextStyle(
                fontFamily: 'monospace', fontSize: 22,
                fontWeight: FontWeight.w200, color: Colors.white,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'TOCAR_PARA_CAMBIAR',
              style: TextStyle(
                fontFamily: 'monospace', fontSize: 8,
                color: color.withOpacity(0.45), letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  Widget _buildFooter() {
    return Center(
      child: Text(
        '// CERO_CONSUMO EN SEGUNDO_PLANO — ALARMAS_DEL_SISTEMA //',
        textAlign: TextAlign.center,
        style: TextStyle(
          fontFamily:    'monospace',
          fontSize:      9,
          color:         _cyanDim.withOpacity(0.25),
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  // ── Shared panel wrapper ──────────────────────────────────────────────────
  Widget _panel({required Color accent, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color:        _bgPanel,
        border:       Border.all(color: accent.withOpacity(0.5)),
        borderRadius: BorderRadius.circular(6),
      ),
      child: child,
    );
  }
}

// ── Cyberpunk button ──────────────────────────────────────────────────────────
class _CyberpunkButton extends StatelessWidget {
  const _CyberpunkButton({
    required this.label,
    required this.color,
    required this.icon,
    this.full  = false,
    this.onTap,
  });

  final String       label;
  final Color        color;
  final IconData     icon;
  final bool         full;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final disabled = onTap == null;
    final c        = disabled ? color.withOpacity(0.3) : color;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width:   full ? double.infinity : null,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
        decoration: BoxDecoration(
          color:        c.withOpacity(0.07),
          border:       Border.all(color: c, width: 1),
          borderRadius: BorderRadius.circular(5),
          boxShadow:    disabled ? null : [BoxShadow(color: c.withOpacity(0.18), blurRadius: 8)],
        ),
        child: Row(
          mainAxisSize:     full ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: c, size: 16),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontFamily:    'monospace',
                fontSize:      10,
                color:         c,
                letterSpacing: 1.5,
                fontWeight:    FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
