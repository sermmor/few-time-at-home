import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../services/supabase_config_service.dart';
import 'home_screen.dart';

/// Shown on first launch when no Supabase credentials are stored.
/// After a successful save + init, replaces itself with HomeScreen.
class SetupScreen extends StatefulWidget {
  const SetupScreen({super.key});
  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  final _urlCtrl     = TextEditingController();
  final _anonKeyCtrl = TextEditingController();
  final _formKey     = GlobalKey<FormState>();

  bool _saving      = false;
  bool _obscureKey  = true;

  @override
  void dispose() {
    _urlCtrl.dispose();
    _anonKeyCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    try {
      await SupabaseConfigService.saveAndInit(
        _urlCtrl.text.trim(),
        _anonKeyCtrl.text.trim(),
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Error: $e',
            style: const TextStyle(fontFamily: 'monospace', fontSize: 11,
                color: CyberColors.bg)),
        backgroundColor: CyberColors.magenta,
        duration: const Duration(seconds: 4),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CyberColors.bg,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Header ────────────────────────────────────────────────
                  const Row(children: [
                    Icon(Icons.home_outlined, color: CyberColors.cyan, size: 32),
                    SizedBox(width: 12),
                    Text(
                      'FT@HOME',
                      style: TextStyle(
                        fontFamily:    'monospace',
                        fontSize:       28,
                        fontWeight:     FontWeight.bold,
                        letterSpacing:  4,
                        color:          CyberColors.cyan,
                      ),
                    ),
                  ]),
                  const SizedBox(height: 8),
                  const CyberLabel('// CONFIGURACIÓN INICIAL //',
                      color: CyberColors.gray, fontSize: 11),
                  const SizedBox(height: 32),

                  // ── Supabase URL ──────────────────────────────────────────
                  _FieldLabel('SUPABASE URL'),
                  const SizedBox(height: 6),
                  _CyberTextField(
                    controller:  _urlCtrl,
                    hint:        'https://xxxxxxxxxxxx.supabase.co',
                    keyboardType: TextInputType.url,
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'Campo requerido';
                      if (!v.trim().startsWith('https://')) return 'Debe comenzar con https://';
                      return null;
                    },
                  ),
                  const SizedBox(height: 20),

                  // ── Anon Key ──────────────────────────────────────────────
                  _FieldLabel('ANON KEY'),
                  const SizedBox(height: 6),
                  _CyberTextField(
                    controller:  _anonKeyCtrl,
                    hint:        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    obscure:     _obscureKey,
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureKey ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                        color: CyberColors.gray, size: 18,
                      ),
                      onPressed: () => setState(() => _obscureKey = !_obscureKey),
                    ),
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'Campo requerido';
                      if (v.trim().length < 20) return 'Clave demasiado corta';
                      return null;
                    },
                  ),
                  const SizedBox(height: 32),

                  // ── Connect button ────────────────────────────────────────
                  SizedBox(
                    width: double.infinity,
                    child: CyberButton(
                      label:     _saving ? 'CONECTANDO...' : 'CONECTAR',
                      color:     CyberColors.cyan,
                      icon:      _saving ? null : Icons.power_settings_new,
                      fullWidth: true,
                      onPressed: _saving ? null : _save,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Center(
                    child: Text(
                      'Las credenciales se guardan localmente en el dispositivo.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: 'monospace', fontSize: 10,
                        color: CyberColors.gray.withValues(alpha: 0.6),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);
  @override
  Widget build(BuildContext context) => Text(
    text,
    style: const TextStyle(
      fontFamily: 'monospace', fontSize: 10, letterSpacing: 2,
      color: CyberColors.cyan,
    ),
  );
}

class _CyberTextField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final bool obscure;
  final Widget? suffixIcon;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;

  const _CyberTextField({
    required this.controller,
    required this.hint,
    this.obscure     = false,
    this.suffixIcon,
    this.keyboardType,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller:   controller,
      obscureText:  obscure,
      keyboardType: keyboardType,
      validator:    validator,
      style: const TextStyle(
          fontFamily: 'monospace', fontSize: 13, color: CyberColors.white),
      decoration: InputDecoration(
        hintText:  hint,
        hintStyle: const TextStyle(
            fontFamily: 'monospace', fontSize: 11, color: CyberColors.gray),
        suffixIcon: suffixIcon,
        filled:     true,
        fillColor:  CyberColors.bgLight,
        errorStyle: const TextStyle(fontFamily: 'monospace', fontSize: 10,
            color: CyberColors.magenta),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide:   const BorderSide(color: CyberColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide:   const BorderSide(color: CyberColors.cyan, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide:   const BorderSide(color: CyberColors.magenta),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide:   const BorderSide(color: CyberColors.magenta, width: 1.5),
        ),
      ),
    );
  }
}
