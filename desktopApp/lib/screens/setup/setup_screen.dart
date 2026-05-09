import 'package:flutter/material.dart';
import '../../core/services/auth_service.dart';
import '../profile_selection/profile_selection_screen.dart';

/// First-run screen where the user enters their Google OAuth2 credentials.
/// These are stored securely and never asked again until the user clears them.
///
/// The user needs:
///   - A Google Cloud project with Drive API enabled
///   - An OAuth 2.0 Client ID of type "Desktop app"
///   - The resulting Client ID and Client Secret
class SetupScreen extends StatefulWidget {
  const SetupScreen({super.key});

  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  final _formKey      = GlobalKey<FormState>();
  final _clientIdCtrl = TextEditingController();
  final _secretCtrl   = TextEditingController();
  bool _saving        = false;

  @override
  void dispose() {
    _clientIdCtrl.dispose();
    _secretCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    await AuthService.instance.saveCredentials(
      _clientIdCtrl.text.trim(),
      _secretCtrl.text.trim(),
    );
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const ProfileSelectionScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Card(
            color: const Color(0xFF1E1E1E),
            elevation: 8,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      const Icon(Icons.cloud_sync, color: Colors.tealAccent, size: 32),
                      const SizedBox(width: 12),
                      Text('FT@Home Desktop',
                          style: theme.textTheme.headlineSmall?.copyWith(color: Colors.white)),
                    ]),
                    const SizedBox(height: 8),
                    Text(
                      'Connect your Google Drive to access remote desktop profiles.',
                      style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white54),
                    ),
                    const SizedBox(height: 28),

                    // Help box
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.tealAccent.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.tealAccent.withOpacity(0.3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('How to get credentials:', style: TextStyle(color: Colors.tealAccent, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          _helpLine('1. Go to console.cloud.google.com'),
                          _helpLine('2. Enable the Google Drive API'),
                          _helpLine('3. Create OAuth 2.0 credentials → Desktop app'),
                          _helpLine('4. Copy the Client ID and Client Secret below'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    _field(
                      controller: _clientIdCtrl,
                      label:       'Client ID',
                      hint:        '123456789-xxx.apps.googleusercontent.com',
                      validator:   (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                    ),
                    const SizedBox(height: 16),
                    _field(
                      controller: _secretCtrl,
                      label:      'Client Secret',
                      hint:       'GOCSPX-…',
                      obscure:    true,
                      validator:  (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                    ),
                    const SizedBox(height: 28),

                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _saving ? null : _save,
                        icon: _saving
                            ? const SizedBox(width: 18, height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                            : const Icon(Icons.login),
                        label: Text(_saving ? 'Connecting…' : 'Connect'),
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.tealAccent,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    required String hint,
    bool obscure = false,
    String? Function(String?)? validator,
  }) =>
      TextFormField(
        controller: controller,
        obscureText: obscure,
        validator:   validator,
        style:        const TextStyle(color: Colors.white),
        decoration: InputDecoration(
          labelText: label,
          hintText:  hint,
          labelStyle: const TextStyle(color: Colors.white54),
          hintStyle:  const TextStyle(color: Colors.white24),
          filled:     true,
          fillColor:  Colors.white.withOpacity(0.05),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: Colors.white24),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: Colors.white24),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Colors.tealAccent),
          ),
        ),
      );

  Widget _helpLine(String text) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 2),
    child: Text(text, style: const TextStyle(color: Colors.white60, fontSize: 12)),
  );
}
