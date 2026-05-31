import 'dart:io';
import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../services/supabase_config_service.dart';

/// Settings screen — accessible from the gear icon in HomeScreen.
/// Allows updating Supabase credentials.
/// Because Supabase can only be initialised once per process, credential
/// changes require a full app restart to take effect.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _urlCtrl     = TextEditingController();
  final _anonKeyCtrl = TextEditingController();
  final _formKey     = GlobalKey<FormState>();

  bool _loading    = true;
  bool _saving     = false;
  bool _obscureKey = true;
  bool _changed    = false;

  @override
  void initState() {
    super.initState();
    _loadCurrent();
  }

  Future<void> _loadCurrent() async {
    final creds = await SupabaseConfigService.load();
    if (!mounted) return;
    setState(() {
      _urlCtrl.text     = creds.url;
      _anonKeyCtrl.text = creds.anonKey;
      _loading = false;
    });
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    _anonKeyCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    await SupabaseConfigService.save(
      _urlCtrl.text.trim(),
      _anonKeyCtrl.text.trim(),
    );
    if (!mounted) return;
    setState(() { _saving = false; _changed = true; });
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
      content: Text(
        '// CREDENCIALES GUARDADAS — REINICIA LA APP //',
        style: TextStyle(fontFamily: 'monospace', color: CyberColors.bg),
      ),
      backgroundColor: CyberColors.cyan,
      duration: Duration(seconds: 4),
      behavior: SnackBarBehavior.floating,
    ));
  }

  void _restart() => exit(0);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CyberColors.bg,
      appBar: AppBar(
        backgroundColor: CyberColors.bgPanel,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: CyberColors.cyan),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Row(children: [
          Icon(Icons.settings_outlined, color: CyberColors.cyan, size: 18),
          SizedBox(width: 8),
          Text('// AJUSTES //',
              style: TextStyle(color: CyberColors.cyan, letterSpacing: 3, fontSize: 13)),
        ]),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: CyberColors.cyan))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 480),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const CyberLabel('// SUPABASE //',
                            color: CyberColors.cyan, fontSize: 11),
                        const SizedBox(height: 4),
                        Text(
                          'Las credenciales se almacenan localmente. '
                          'Tras cambiarlas, reinicia la app para que surtan efecto.',
                          style: TextStyle(
                            fontFamily: 'monospace', fontSize: 10,
                            color: CyberColors.gray.withValues(alpha: 0.7),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // ── URL ─────────────────────────────────────────────
                        _label('SUPABASE URL'),
                        const SizedBox(height: 6),
                        _field(
                          controller:   _urlCtrl,
                          hint:         'https://xxxxxxxxxxxx.supabase.co',
                          keyboardType: TextInputType.url,
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) return 'Campo requerido';
                            if (!v.trim().startsWith('https://')) return 'Debe comenzar con https://';
                            return null;
                          },
                        ),
                        const SizedBox(height: 20),

                        // ── Anon Key ────────────────────────────────────────
                        _label('ANON KEY'),
                        const SizedBox(height: 6),
                        _field(
                          controller: _anonKeyCtrl,
                          hint:       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                          obscure:    _obscureKey,
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscureKey
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
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

                        // ── Buttons ─────────────────────────────────────────
                        SizedBox(
                          width: double.infinity,
                          child: CyberButton(
                            label:     _saving ? 'GUARDANDO...' : 'GUARDAR',
                            color:     CyberColors.cyan,
                            icon:      _saving ? null : Icons.save_outlined,
                            fullWidth: true,
                            onPressed: _saving ? null : _save,
                          ),
                        ),
                        if (_changed) ...[
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: CyberButton(
                              label:     'REINICIAR APP',
                              color:     CyberColors.magenta,
                              icon:      Icons.restart_alt,
                              fullWidth: true,
                              onPressed: _restart,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }

  Widget _label(String text) => Text(
    text,
    style: const TextStyle(
        fontFamily: 'monospace', fontSize: 10,
        letterSpacing: 2, color: CyberColors.cyan),
  );

  Widget _field({
    required TextEditingController controller,
    required String hint,
    bool obscure = false,
    Widget? suffixIcon,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
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
        filled:    true,
        fillColor: CyberColors.bgLight,
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
