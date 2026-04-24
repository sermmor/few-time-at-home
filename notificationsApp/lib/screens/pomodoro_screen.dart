import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import '../models/timer_mode_model.dart';
import '../services/pomodoro_supabase_service.dart';

class PomodoroScreen extends StatefulWidget {
  const PomodoroScreen({super.key});

  @override
  State<PomodoroScreen> createState() => _PomodoroScreenState();
}

class _PomodoroScreenState extends State<PomodoroScreen>
    with TickerProviderStateMixin {
  // ── Palette ──────────────────────────────────────────────────────────────────
  static const _cyan      = Color(0xFF00FFE7);
  static const _cyanDim   = Color(0x9900FFE7);
  static const _magenta   = Color(0xFFFF00CC);
  static const _yellow    = Color(0xFFFFE600);
  static const _bg        = Color(0xFF020C18);
  static const _bgPanel   = Color(0xFF071526);
  static const _bgPanelLt = Color(0xFF0A1E3A);

  // ── State ─────────────────────────────────────────────────────────────────
  List<TimerModeModel> _modes     = [];
  bool                 _loading   = true;
  int                  _modeIndex = 0;
  int                  _chainStep = 0;   // current index in chain[]

  /// Seconds remaining in the current chain step.
  int   _secondsLeft  = 0;
  bool  _running      = false;
  bool  _finished     = false;

  /// When the current step is "0" (custom), the user enters a duration here.
  final _customCtrl = TextEditingController();
  int?  _customSeconds;           // parsed value while editing
  bool  _customValid = true;

  Timer?       _ticker;
  AudioPlayer? _player;

  // Glow animation for the running timer
  late AnimationController _glowCtrl;
  late Animation<double>   _glowAnim;

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    _glowCtrl = AnimationController(
      vsync:    this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _glowAnim = Tween<double>(begin: 4, end: 18).animate(
      CurvedAnimation(parent: _glowCtrl, curve: Curves.easeInOut),
    );

    _player = AudioPlayer();
    _loadModes();
  }

  @override
  void dispose() {
    _stopTimer();
    _glowCtrl.dispose();
    _player?.dispose();
    _customCtrl.dispose();
    WakelockPlus.disable();
    super.dispose();
  }

  // ── Data ────────────────────────────────────────────────────────────────────
  Future<void> _loadModes() async {
    setState(() => _loading = true);
    final modes = await PomodoroSupabaseService.instance.fetchModes();
    if (!mounted) return;
    setState(() {
      _modes     = modes;
      _loading   = false;
      _modeIndex = 0;
      _chainStep = 0;
    });
    _resetToCurrentStep();
  }

  TimerModeModel get _currentMode => _modes[_modeIndex];

  String get _currentChainItem =>
      _currentMode.chain.isNotEmpty ? _currentMode.chain[_chainStep] : '0';

  bool get _stepIsCustom => _currentChainItem == '0';

  /// Seconds for the active step (null when step is custom and no input yet).
  int? get _stepDuration {
    if (_stepIsCustom) return _customSeconds;
    return TimerModeModel.parseChainItem(_currentChainItem);
  }

  // ── Timer control ────────────────────────────────────────────────────────────
  void _resetToCurrentStep() {
    _stopTimer();
    setState(() {
      _finished    = false;
      _running     = false;
      _customSeconds = null;
      _customCtrl.clear();
      _customValid = true;
      final dur = _stepIsCustom ? null : _stepDuration;
      _secondsLeft = dur ?? 0;
    });
  }

  void _startTimer() {
    final dur = _stepDuration;
    if (dur == null || dur <= 0) return;
    WakelockPlus.enable();
    _glowCtrl.repeat(reverse: true);
    setState(() {
      _running  = true;
      _finished = false;
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
    WakelockPlus.disable();
    setState(() => _running = false);
  }

  void _stopTimer() {
    _ticker?.cancel();
    _ticker = null;
  }

  void _resetTimer() {
    _stopTimer();
    WakelockPlus.disable();
    setState(() {
      _chainStep = 0;
      _finished  = false;
      _running   = false;
      _customSeconds = null;
      _customCtrl.clear();
      _customValid = true;
    });
    _resetToCurrentStep();
  }

  void _onStepComplete() {
    _stopTimer();
    _playAlarm();
    final chain = _currentMode.chain;
    if (_chainStep < chain.length - 1) {
      // Advance to next step
      final nextStep = _chainStep + 1;
      final nextItem = chain[nextStep];
      final nextDur  = nextItem == '0'
          ? null
          : TimerModeModel.parseChainItem(nextItem);

      setState(() {
        _chainStep     = nextStep;
        _running       = false;
        _finished      = false;
        _secondsLeft   = nextDur ?? 0;
        _customSeconds = null;
        _customCtrl.clear();
        _customValid   = true;
      });

      // Auto-start the next step if its duration is known (not a custom input).
      // Wakelock stays enabled — we're still mid-sequence.
      if (nextDur != null && nextDur > 0) {
        _startTimer();
      }
    } else {
      // All steps done — release wakelock
      WakelockPlus.disable();
      setState(() {
        _secondsLeft = 0;
        _running     = false;
        _finished    = true;
      });
    }
  }

  Future<void> _playAlarm() async {
    try {
      await _player?.stop();
      await _player?.play(AssetSource('alarm.mp3'));
    } catch (e) {
      print('[Pomodoro] alarm error: $e');
    }
  }

  // ── Mode / step navigation ────────────────────────────────────────────────────
  void _selectMode(int index) {
    if (index == _modeIndex) return;
    _stopTimer();
    WakelockPlus.disable();
    setState(() {
      _modeIndex = index;
      _chainStep = 0;
    });
    _resetToCurrentStep();
  }

  void _jumpToStep(int step) {
    if (_running) return;
    setState(() => _chainStep = step);
    _resetToCurrentStep();
  }

  // ── Custom input ─────────────────────────────────────────────────────────────
  void _onCustomChanged(String value) {
    // Accept formats: mm, mm:ss, hh:mm:ss
    int? secs;
    final parts = value.trim().split(':');
    if (parts.length == 1) {
      final m = int.tryParse(parts[0]);
      if (m != null && m > 0) secs = m * 60;
    } else if (parts.length == 2) {
      final m = int.tryParse(parts[0]);
      final s = int.tryParse(parts[1]);
      if (m != null && s != null && (m > 0 || s > 0)) secs = m * 60 + s;
    } else if (parts.length == 3) {
      final h = int.tryParse(parts[0]);
      final m = int.tryParse(parts[1]);
      final s = int.tryParse(parts[2]);
      if (h != null && m != null && s != null) secs = h * 3600 + m * 60 + s;
    }
    setState(() {
      _customSeconds = secs;
      _customValid   = value.trim().isEmpty || secs != null;
      _secondsLeft   = secs ?? 0;
    });
  }

  // ── Formatting ────────────────────────────────────────────────────────────────
  String _fmt(int totalSeconds) {
    final h = totalSeconds ~/ 3600;
    final m = (totalSeconds % 3600) ~/ 60;
    final s = totalSeconds % 60;
    if (h > 0) {
      return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
    }
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  // ── Build ────────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: _bg,
        body: Center(child: CircularProgressIndicator(color: _cyan)),
      );
    }

    return Scaffold(
      backgroundColor: _bg,
      appBar: _buildAppBar(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildModeSelector(),
            const SizedBox(height: 20),
            _buildChainProgress(),
            const SizedBox(height: 24),
            if (_stepIsCustom) _buildCustomInput(),
            _buildTimerDisplay(),
            const SizedBox(height: 28),
            _buildControls(),
            if (_finished) ...[
              const SizedBox(height: 20),
              _buildFinishedBanner(),
            ],
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() => AppBar(
        backgroundColor: _bg,
        elevation:       0,
        titleSpacing:    16,
        title: const Text(
          'POMODORO',
          style: TextStyle(
            fontFamily:    'monospace',
            fontSize:      12,
            fontWeight:    FontWeight.bold,
            color:         _cyan,
            letterSpacing: 3,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: _cyan.withOpacity(0.28)),
        ),
        actions: [
          IconButton(
            icon:      const Icon(Icons.refresh, size: 20, color: _cyanDim),
            tooltip:   'Recargar modos',
            onPressed: _running ? null : _loadModes,
          ),
        ],
      );

  // ── Mode selector ─────────────────────────────────────────────────────────────
  Widget _buildModeSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: BoxDecoration(
        color:        _bgPanel,
        border:       Border.all(color: _cyan.withOpacity(0.25)),
        borderRadius: BorderRadius.circular(6),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          value:         _modeIndex,
          isExpanded:    true,
          dropdownColor: _bgPanelLt,
          icon: const Icon(Icons.keyboard_arrow_down, color: _cyanDim, size: 20),
          onChanged: _running ? null : (v) => _selectMode(v!),
          items: List.generate(
            _modes.length,
            (i) => DropdownMenuItem(
              value: i,
              child: Text(
                _modes[i].name,
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize:   13,
                  color:      i == _modeIndex ? _cyan : _cyanDim,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── Chain progress dots ───────────────────────────────────────────────────────
  Widget _buildChainProgress() {
    final chain = _currentMode.chain;
    if (chain.length <= 1) return const SizedBox.shrink();

    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount:       chain.length,
        separatorBuilder: (_, __) => const SizedBox(width: 6),
        itemBuilder: (_, i) {
          final isActive = i == _chainStep;
          final isPast   = i < _chainStep;
          final label    = _stepLabel(chain[i], i);

          return GestureDetector(
            onTap: () => _jumpToStep(i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color:        isActive
                    ? _cyan.withOpacity(0.12)
                    : isPast
                        ? _magenta.withOpacity(0.08)
                        : _bgPanel,
                border: Border.all(
                  color: isActive ? _cyan : isPast ? _magenta.withOpacity(0.5) : _cyanDim.withOpacity(0.2),
                  width: isActive ? 1.5 : 1,
                ),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                label,
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize:   10,
                  color:      isActive ? _cyan : isPast ? _magenta.withOpacity(0.7) : _cyanDim.withOpacity(0.4),
                  fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  String _stepLabel(String item, int index) {
    if (item == '0') return '#${index + 1} CUSTOM';
    final secs = TimerModeModel.parseChainItem(item);
    if (secs == null) return '#${index + 1}';
    final m = secs ~/ 60;
    final s = secs % 60;
    if (s == 0) return '${m}m';
    return '${m}m${s}s';
  }

  // ── Custom input ──────────────────────────────────────────────────────────────
  Widget _buildCustomInput() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '// INTRODUCE TIEMPO (mm, mm:ss, hh:mm:ss)',
            style: TextStyle(
              fontFamily: 'monospace',
              fontSize:   9,
              color:      _cyanDim.withOpacity(0.6),
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller:  _customCtrl,
            enabled:     !_running,
            keyboardType: TextInputType.text,
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[\d:]')),
            ],
            style: const TextStyle(
              fontFamily: 'monospace',
              fontSize:   18,
              color:      _cyan,
            ),
            decoration: InputDecoration(
              hintText:     '25:00',
              hintStyle:    TextStyle(color: _cyanDim.withOpacity(0.3), fontFamily: 'monospace'),
              errorText:    _customValid ? null : 'Formato inválido',
              errorStyle:   const TextStyle(color: _magenta, fontFamily: 'monospace', fontSize: 10),
              enabledBorder: OutlineInputBorder(
                borderSide:   BorderSide(color: _cyan.withOpacity(0.3)),
                borderRadius: BorderRadius.circular(6),
              ),
              focusedBorder: const OutlineInputBorder(
                borderSide:   BorderSide(color: _cyan),
                borderRadius: BorderRadius.all(Radius.circular(6)),
              ),
              disabledBorder: OutlineInputBorder(
                borderSide:   BorderSide(color: _cyanDim.withOpacity(0.15)),
                borderRadius: BorderRadius.circular(6),
              ),
              filled:      true,
              fillColor:   _bgPanel,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
            onChanged: _onCustomChanged,
          ),
        ],
      ),
    );
  }

  // ── Big timer display ─────────────────────────────────────────────────────────
  Widget _buildTimerDisplay() {
    final canStart = _stepIsCustom ? (_customSeconds != null && _customSeconds! > 0) : true;
    final ready    = _secondsLeft > 0 || canStart;

    return AnimatedBuilder(
      animation: _glowAnim,
      builder: (_, __) {
        final glow = _running ? _glowAnim.value : 4.0;
        return Container(
          width:  double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 32),
          decoration: BoxDecoration(
            color:        _bgPanel,
            border:       Border.all(
              color: _running ? _cyan : _cyan.withOpacity(0.2),
              width: _running ? 1.5 : 1,
            ),
            borderRadius: BorderRadius.circular(8),
            boxShadow: _running
                ? [BoxShadow(color: _cyan.withOpacity(0.25), blurRadius: glow, spreadRadius: 1)]
                : null,
          ),
          child: Column(
            children: [
              // Step label
              Text(
                _stepLabel(_currentChainItem, _chainStep).toUpperCase(),
                style: TextStyle(
                  fontFamily:    'monospace',
                  fontSize:      10,
                  letterSpacing: 3,
                  color:         _cyanDim.withOpacity(0.5),
                ),
              ),
              const SizedBox(height: 10),
              // Countdown
              Text(
                ready ? _fmt(_secondsLeft) : '--:--',
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize:   64,
                  fontWeight: FontWeight.w200,
                  color:      _running
                      ? _cyan
                      : _finished
                          ? _magenta
                          : _cyanDim.withOpacity(0.7),
                  shadows: _running
                      ? [Shadow(color: _cyan.withOpacity(0.6), blurRadius: glow)]
                      : null,
                ),
              ),
              // Progress bar (only for fixed-duration steps)
              if (!_stepIsCustom) ...[
                const SizedBox(height: 16),
                _buildProgressBar(),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildProgressBar() {
    final total    = _stepDuration ?? 1;
    final progress = total > 0 ? (_secondsLeft / total).clamp(0.0, 1.0) : 0.0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Stack(
        children: [
          Container(
            height:      3,
            decoration:  BoxDecoration(
              color:        _cyanDim.withOpacity(0.1),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          FractionallySizedBox(
            widthFactor: progress,
            child: Container(
              height: 3,
              decoration: BoxDecoration(
                color:        _running ? _cyan : _cyanDim.withOpacity(0.4),
                borderRadius: BorderRadius.circular(2),
                boxShadow: _running
                    ? [BoxShadow(color: _cyan.withOpacity(0.5), blurRadius: 4)]
                    : null,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Controls ─────────────────────────────────────────────────────────────────
  Widget _buildControls() {
    final canStart = !_running &&
        (_stepIsCustom
            ? (_customSeconds != null && _customSeconds! > 0)
            : (_secondsLeft > 0 || (_stepDuration ?? 0) > 0));

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Reset
        _CyberpunkButton(
          label:    'RESET',
          color:    _magenta,
          icon:     Icons.replay,
          onTap:    (_running || _chainStep > 0 || _secondsLeft > 0) ? _resetTimer : null,
        ),
        const SizedBox(width: 16),
        // Start / Pause
        _CyberpunkButton(
          label:    _running ? 'PAUSE' : 'START',
          color:    _running ? _yellow : _cyan,
          icon:     _running ? Icons.pause : Icons.play_arrow,
          large:    true,
          onTap:    _running ? _pauseTimer : (canStart ? _startTimer : null),
        ),
        const SizedBox(width: 16),
        // Skip step
        _CyberpunkButton(
          label:    'SKIP',
          color:    _cyanDim,
          icon:     Icons.skip_next,
          onTap: (_currentMode.chain.length > 1 && !_finished)
              ? () => _onStepComplete()
              : null,
        ),
      ],
    );
  }

  // ── Finished banner ───────────────────────────────────────────────────────────
  Widget _buildFinishedBanner() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
      decoration: BoxDecoration(
        color:        _magenta.withOpacity(0.08),
        border:       Border.all(color: _magenta.withOpacity(0.5)),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.check_circle_outline, color: _magenta, size: 18),
          const SizedBox(width: 10),
          const Text(
            '// SECUENCIA COMPLETADA //',
            style: TextStyle(
              fontFamily:    'monospace',
              fontSize:      11,
              letterSpacing: 2,
              color:         _magenta,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Reusable cyberpunk button ─────────────────────────────────────────────────
class _CyberpunkButton extends StatelessWidget {
  const _CyberpunkButton({
    required this.label,
    required this.color,
    required this.icon,
    this.large  = false,
    this.onTap,
  });

  final String    label;
  final Color     color;
  final IconData  icon;
  final bool      large;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final disabled = onTap == null;
    final c        = disabled ? color.withOpacity(0.25) : color;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: large ? 28 : 18,
          vertical:   large ? 14 : 10,
        ),
        decoration: BoxDecoration(
          color:        c.withOpacity(0.08),
          border:       Border.all(color: c, width: large ? 1.5 : 1),
          borderRadius: BorderRadius.circular(5),
          boxShadow: disabled
              ? null
              : [BoxShadow(color: c.withOpacity(0.2), blurRadius: 8)],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: c, size: large ? 28 : 20),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontFamily:    'monospace',
                fontSize:      large ? 11 : 9,
                color:         c,
                letterSpacing: 1.5,
                fontWeight:    large ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
