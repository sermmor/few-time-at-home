import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/timer_mode_model.dart';

class PomodoroService {
  PomodoroService._();
  static final instance = PomodoroService._();

  Future<List<TimerModeModel>> fetchModes() async {
    try {
      final data = await Supabase.instance.client
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
      return TimerModeModel.defaults;
    }
  }
}
