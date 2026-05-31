import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import '../core/theme.dart';
import '../models/timer_mode_model.dart';
import '../services/pomodoro_service.dart';

class PomodoroScreen extends StatefulWidget {
  const PomodoroScreen({super.key});
  @override
  State<PomodoroScreen> createState() => _PomodoroScreenState();
}

class _PomodoroScreenState extends State<PomodoroScreen>
    with TickerProviderStateMixin {
  // ── State ─────────────────────────────────────────────────────────────────
  List<TimerModeModel> _modes     = [];
  bool                 _loading   = true;
  int                  _modeIndex = 0;
  int                  _chainStep = 0;
  int                  _secondsLeft = 0;
  bool                 _running   = false;
  bool                 _finished  = false;

  final _customCtrl   = TextEditingController();
  int?  _customSeconds;
  bool  _customValid  = true;

  Timer?       _ticker;
  AudioPlayer? _player;

  late AnimationController _glowCtrl;
  late Animation<double>   _glowAnim;

  @override
  void initState() {
    super.initState();
    _glowCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))
      ..repeat(reverse: true);
    _glowAnim = Tween<double>(begin: 4, end: 18)
        .animate(CurvedAnimation(parent: _glowCtrl, curve: Curves.easeInOut));
    _player = AudioPlayer();
    _loadModes();
  }

  @override
  void dispose() {
    _stopTimer();
    _glowCtrl.dispose();
    _player?.dispose();
    _customCtrl.dispose();
    _tryDisableWakelock();
    super.dispose();
  }

  void _tryDisableWakelock() {
    try { WakelockPlus.disable(); } catch (_) {}
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  Future<void> _loadModes() async {
    setState(() => _loading = true);
    final modes = await PomodoroService.instance.fetchModes();
    if (!mounted) return;
    setState(() { _modes = modes; _loading = false; });
    _resetToCurrentStep();
  }

  TimerModeModel get _currentMode => _modes[_modeIndex];
  String get _currentChainItem =>
      _currentMode.chain.isNotEmpty ? _currentMode.chain[_chainStep] : '0';
  bool get _stepIsCustom => _currentChainItem == '0';
  int? get _stepDuration {
    if (_stepIsCustom) return _customSeconds;
    return TimerModeModel.parseChainItem(_currentChainItem);
  }

  // ── Timer control ─────────────────────────────────────────────────────────
  void _resetToCurrentStep() {
    _stopTimer();
    setState(() {
      _finished      = false;
      _running       = false;
      _customSeconds = null;
      _customCtrl.clear();
      _customValid   = true;
      _secondsLeft   = _stepIsCustom ? 0 : (_stepDuration ?? 0);
    });
  }

  void _startTimer() {
    final dur = _stepDuration;
    if (dur == null || dur <= 0) return;
    try { WakelockPlus.enable(); } catch (_) {}
    setState(() { _running = true; _finished = false;
      if (_secondsLeft == 0) _secondsLeft = dur;
    });
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        if (_secondsLeft > 0) {
          _secondsLeft--;
        } else {
          _onStepComplete();
        }
      });
    });
  }

  void _pauseTimer() {
    _stopTimer();
    _tryDisableWakelock();
    setState(() => _running = false);
  }

  void _stopTimer() { _ticker?.cancel(); _ticker = null; }

  void _resetTimer() {
    _stopTimer();
    _tryDisableWakelock();
    setState(() { _running = false; _finished = false;
      _secondsLeft = _stepIsCustom ? (_customSeconds ?? 0) : (_stepDuration ?? 0);
    });
  }

  void _skipStep() {
    _stopTimer();
    _tryDisableWakelock();
    setState(() { _running = false; _finished = false; });
    _advanceStep();
  }

  void _onStepComplete() {
    _stopTimer();
    _tryDisableWakelock();
    _player?.play(AssetSource('alarm.mp3')).catchError((_) {});
    if (_chainStep < _currentMode.chain.length - 1) {
      _advanceStep();
    } else {
      setState(() { _running = false; _finished = true; });
    }
  }

  void _advanceStep() {
    final next = (_chainStep + 1) % _currentMode.chain.length;
    setState(() { _chainStep = next; });
    _resetToCurrentStep();
    final dur = _stepDuration;
    if (dur != null && dur > 0) _startTimer();
  }

  void _jumpToStep(int i) {
    _stopTimer();
    _tryDisableWakelock();
    setState(() { _chainStep = i; _running = false; _finished = false; });
    _resetToCurrentStep();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  String _format(int s) {
    final h = s ~/ 3600;
    final m = (s % 3600) ~/ 60;
    final sec = s % 60;
    if (h > 0) return '${h.toString().padLeft(2,'0')}:${m.toString().padLeft(2,'0')}:${sec.toString().padLeft(2,'0')}';
    return '${m.toString().padLeft(2,'0')}:${sec.toString().padLeft(2,'0')}';
  }

  void _onCustomInput(String val) {
    final trimmed = val.trim();
    if (trimmed.isEmpty) { setState(() { _customSeconds = null; _customValid = true; }); return; }
    final parts = trimmed.split(':');
    int? total;
    if (parts.length == 1) { total = int.tryParse(parts[0]); if (total != null) total *= 60; }
    else if (parts.length == 2) {
      final m = int.tryParse(parts[0]); final s = int.tryParse(parts[1]);
      if (m != null && s != null) total = m * 60 + s;
    } else if (parts.length == 3) {
      final h = int.tryParse(parts[0]); final m = int.tryParse(parts[1]); final s = int.tryParse(parts[2]);
      if (h != null && m != null && s != null) total = h * 3600 + m * 60 + s;
    }
    setState(() { _customSeconds = total; _customValid = total != null && total > 0;
      if (total != null && total > 0) _secondsLeft = total;
    });
  }

  // ── Build ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: CyberColors.magenta));
    final isDesktop = MediaQuery.of(context).size.width >= 600;
    return isDesktop ? _buildDesktop() : _buildMobile();
  }

  // Desktop: timer centred, controls at right
  Widget _buildDesktop() {
    return Container(
      color: CyberColors.bg,
      child: Row(
        children: [
          // ── Left: mode selector + chain ──────────────────────────────────
          SizedBox(
            width: 280,
            child: Container(
              color: CyberColors.bgPanel,
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const CyberLabel('// MODO //', color: CyberColors.magenta),
                  const SizedBox(height: 12),
                  _buildModeDropdown(),
                  const SizedBox(height: 24),
                  const CyberLabel('// CADENA //', color: CyberColors.magenta),
                  const SizedBox(height: 12),
                  _buildChainSteps(),
                ],
              ),
            ),
          ),
          // ── Right: timer + controls ──────────────────────────────────────
          Expanded(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildTimerDisplay(large: true),
                  const SizedBox(height: 32),
                  if (_stepIsCustom) ...[_buildCustomInput(), const SizedBox(height: 24)],
                  _buildProgressBar(),
                  const SizedBox(height: 32),
                  _buildControls(),
                  if (_finished) ...[const SizedBox(height: 24), _buildFinishedBanner()],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Mobile: vertical stack
  Widget _buildMobile() {
    return Container(
      color: CyberColors.bg,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const CyberLabel('// MODO //', color: CyberColors.magenta),
            const SizedBox(height: 8),
            _buildModeDropdown(),
            const SizedBox(height: 16),
            _buildChainSteps(),
            const SizedBox(height: 24),
            Center(child: _buildTimerDisplay(large: false)),
            const SizedBox(height: 16),
            if (_stepIsCustom) ...[_buildCustomInput(), const SizedBox(height: 16)],
            _buildProgressBar(),
            const SizedBox(height: 24),
            _buildControls(),
            if (_finished) ...[const SizedBox(height: 16), _buildFinishedBanner()],
          ],
        ),
      ),
    );
  }

  Widget _buildModeDropdown() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color:  CyberColors.bgLight,
        border: Border.all(color: CyberColors.magenta.withOpacity(0.4)),
        borderRadius: BorderRadius.circular(4),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          value:        _modeIndex,
          dropdownColor: CyberColors.bgPanel,
          isExpanded:   true,
          style:        const TextStyle(fontFamily: 'monospace', fontSize: 13, color: CyberColors.white),
          icon:         const Icon(Icons.expand_more, color: CyberColors.magenta),
          onChanged:    (i) {
            if (i == null) return;
            setState(() { _modeIndex = i; _chainStep = 0; });
            _resetToCurrentStep();
          },
          items: _modes.asMap().entries.map((e) => DropdownMenuItem(
            value: e.key,
            child: Text(e.value.name),
          )).toList(),
        ),
      ),
    );
  }

  Widget _buildChainSteps() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: _currentMode.chain.asMap().entries.map((e) {
          final selected = e.key == _chainStep;
          final dur      = TimerModeModel.parseChainItem(e.value);
          final label    = e.value == '0' ? '?' : (dur != null ? _format(dur) : e.value);
          return GestureDetector(
            onTap: () => _jumpToStep(e.key),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              margin:  const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color:  selected ? CyberColors.magenta.withOpacity(0.2) : CyberColors.bgLight,
                border: Border.all(color: selected ? CyberColors.magenta : CyberColors.border),
                borderRadius: BorderRadius.circular(3),
                boxShadow: selected
                    ? [BoxShadow(color: CyberColors.magenta.withOpacity(0.4), blurRadius: 6)]
                    : null,
              ),
              child: Text(
                label,
                style: TextStyle(
                  fontFamily:   'monospace',
                  fontSize:      11,
                  letterSpacing: 0.5,
                  color:         selected ? CyberColors.magenta : CyberColors.gray,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTimerDisplay({required bool large}) {
    final size = large ? 80.0 : 64.0;
    return AnimatedBuilder(
      animation: _glowAnim,
      builder: (_, __) {
        final glow = _running ? _glowAnim.value : 4.0;
        return Text(
          _format(_secondsLeft),
          style: TextStyle(
            fontFamily:    'monospace',
            fontSize:      size,
            fontWeight:    FontWeight.w200,
            letterSpacing: 4,
            color:         CyberColors.cyan,
            shadows: [Shadow(color: CyberColors.cyan.withOpacity(0.8), blurRadius: glow)],
          ),
        );
      },
    );
  }

  Widget _buildCustomInput() {
    return TextField(
      controller:   _customCtrl,
      keyboardType: TextInputType.text,
      onChanged:    _onCustomInput,
      style: const TextStyle(fontFamily: 'monospace', color: CyberColors.white),
      decoration: InputDecoration(
        hintText:    'mm  /  mm:ss  /  hh:mm:ss',
        hintStyle:   const TextStyle(color: CyberColors.gray, fontFamily: 'monospace', fontSize: 12),
        labelText:   'DURACIÓN',
        labelStyle:  const TextStyle(color: CyberColors.cyan, fontFamily: 'monospace', fontSize: 11, letterSpacing: 2),
        errorText:   _customValid ? null : 'Formato inválido',
        border:      const OutlineInputBorder(),
        focusedBorder: const OutlineInputBorder(
            borderSide: BorderSide(color: CyberColors.cyan)),
        enabledBorder: OutlineInputBorder(
            borderSide: BorderSide(color: CyberColors.border)),
      ),
    );
  }

  Widget _buildProgressBar() {
    final dur = _stepDuration;
    if (_stepIsCustom || dur == null || dur == 0) return const SizedBox.shrink();
    final progress = 1 - (_secondsLeft / dur).clamp(0.0, 1.0);
    return Container(
      height:       4,
      decoration:   BoxDecoration(
        color:        CyberColors.bgLight,
        borderRadius: BorderRadius.circular(2),
      ),
      child: FractionallySizedBox(
        alignment:    Alignment.centerLeft,
        widthFactor:  progress,
        child: Container(
          decoration: BoxDecoration(
            color:        CyberColors.cyan,
            borderRadius: BorderRadius.circular(2),
            boxShadow:    [BoxShadow(color: CyberColors.cyan.withOpacity(0.6), blurRadius: 6)],
          ),
        ),
      ),
    );
  }

  Widget _buildControls() {
    final canStart = _stepDuration != null && _stepDuration! > 0 && !_finished;
    return Wrap(
      alignment: WrapAlignment.center,
      spacing: 12,
      runSpacing: 12,
      children: [
        CyberButton(
          label:     'RESET',
          color:     CyberColors.magenta,
          icon:      Icons.refresh,
          onPressed: _resetTimer,
        ),
        CyberButton(
          label:     _running ? 'PAUSAR' : 'INICIAR',
          color:     _running ? CyberColors.amber : CyberColors.cyan,
          icon:      _running ? Icons.pause : Icons.play_arrow,
          onPressed: canStart ? (_running ? _pauseTimer : _startTimer) : null,
        ),
        CyberButton(
          label:     'SALTAR',
          color:     CyberColors.cyanDim,
          icon:      Icons.skip_next,
          onPressed: _skipStep,
        ),
      ],
    );
  }

  Widget _buildFinishedBanner() {
    return Container(
      padding:    const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color:  CyberColors.cyan.withOpacity(0.08),
        border: Border.all(color: CyberColors.cyan),
        borderRadius: BorderRadius.circular(6),
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.check_circle_outline, color: CyberColors.cyan),
          SizedBox(width: 10),
          Text(
            '// SECUENCIA COMPLETADA //',
            style: TextStyle(
              fontFamily:    'monospace',
              fontSize:       13,
              letterSpacing:  2,
              color:          CyberColors.cyan,
            ),
          ),
        ],
      ),
    );
  }
}
