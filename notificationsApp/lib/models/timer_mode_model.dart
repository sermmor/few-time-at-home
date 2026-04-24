class TimerModeModel {
  final String       name;
  final List<String> chain;

  const TimerModeModel({required this.name, required this.chain});

  factory TimerModeModel.fromJson(Map<String, dynamic> json) => TimerModeModel(
        name:  json['name']  as String,
        chain: (json['chain'] as List<dynamic>).map((e) => e as String).toList(),
      );

  /// Returns true when this mode uses a user-supplied custom countdown.
  bool get isCustomCountdown => chain.length == 1 && chain.first == '0';

  /// Parses a chain entry like "00:25:00" into total seconds.
  /// Returns null for the "0" sentinel.
  static int? parseChainItem(String item) {
    if (item == '0') return null;
    final parts = item.split(':');
    if (parts.length != 3) return null;
    final h = int.tryParse(parts[0]) ?? 0;
    final m = int.tryParse(parts[1]) ?? 0;
    final s = int.tryParse(parts[2]) ?? 0;
    return h * 3600 + m * 60 + s;
  }

  static final List<TimerModeModel> defaults = [
    TimerModeModel(name: 'One Countdown', chain: ['0']),
    TimerModeModel(
      name: 'Pomodoro',
      chain: [
        '00:25:00', '00:05:00',
        '00:25:00', '00:05:00',
        '00:25:00', '00:05:00',
        '00:25:00', '00:05:00',
      ],
    ),
  ];
}
