import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/timer_mode_model.dart';

/// Reads the Pomodoro modes stored in the `pomodoro_config` table (single row,
/// id = 1).  Falls back to [TimerModeModel.defaults] when the table is empty,
/// unavailable, or the JSON can't be parsed.
class PomodoroSupabaseService {
  static final PomodoroSupabaseService instance = PomodoroSupabaseService._();
  PomodoroSupabaseService._();

  final _client = Supabase.instance.client;

  Future<List<TimerModeModel>> fetchModes() async {
    try {
      final data = await _client
          .from('pomodoro_config')
          .select('modes')
          .eq('id', 1)
          .maybeSingle();

      if (data == null) return TimerModeModel.defaults;

      final raw = data['modes'];
      if (raw == null) return TimerModeModel.defaults;

      final list = (raw as List<dynamic>)
          .map((e) => TimerModeModel.fromJson(e as Map<String, dynamic>))
          .toList();

      return list.isEmpty ? TimerModeModel.defaults : list;
    } catch (e) {
      print('[PomodoroSupabase] fetchModes error: $e');
      return TimerModeModel.defaults;
    }
  }
}
