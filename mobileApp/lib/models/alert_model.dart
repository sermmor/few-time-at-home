class AlertModel {
  final String   id;
  final String   message;
  final DateTime createdAt;
  final bool     isRecurring;
  bool           isRead;

  AlertModel({
    required this.id,
    required this.message,
    required this.createdAt,
    required this.isRecurring,
    required this.isRead,
  });

  factory AlertModel.fromJson(Map<String, dynamic> json) => AlertModel(
        id:          json['id']          as String,
        message:     json['message']     as String,
        createdAt:   DateTime.parse(json['created_at'] as String).toLocal(),
        isRecurring: (json['is_recurring'] as bool?) ?? false,
        isRead:      (json['is_read']      as bool?) ?? false,
      );

  Map<String, dynamic> toJson() => {
        'id':           id,
        'message':      message,
        'created_at':   createdAt.toUtc().toIso8601String(),
        'is_recurring': isRecurring,
        'is_read':      isRead,
      };
}
