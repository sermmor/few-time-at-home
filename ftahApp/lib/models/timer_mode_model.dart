/// A named Pomodoro mode with its chain of step durations.
/// Step values are either "HH:MM:SS" strings or "0" (user-defined input).
class TimerModeModel {
  final String       name;
  final List<String> chain;

  const TimerModeModel({required this.name, required this.chain});

  factory TimerModeModel.fromJson(Map<String, dynamic> j) => TimerModeModel(
    name:  j['name']  as String,
    chain: (j['chain'] as List<dynamic>).cast<String>(),
  );

  /// Parses "HH:MM:SS", "MM:SS" or bare seconds string → total seconds.
  static int? parseChainItem(String item) {
    if (item == '0') return null;
    final parts = item.split(':').map(int.tryParse).toList();
    if (parts.any((p) => p == null)) return null;
    if (parts.length == 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
    if (parts.length == 2) return parts[0]! * 60  + parts[1]!;
    if (parts.length == 1) return parts[0]!;
    return null;
  }

  /// Fallback modes when Supabase is unavailable.
  static List<TimerModeModel> get defaults => [
    const TimerModeModel(name: 'One Countdown', chain: ['0']),
    TimerModeModel(
      name: 'Pomodoro',
      chain: ['00:25:00', '00:05:00', '00:25:00', '00:05:00',
              '00:25:00', '00:05:00', '00:25:00', '00:15:00'],
    ),
  ];
}
