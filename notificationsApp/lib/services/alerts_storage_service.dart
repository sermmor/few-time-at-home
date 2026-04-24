import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/alert_model.dart';

/// Persists the alert list locally on the device using SharedPreferences.
/// This is the single source of truth for the alerts screen.
class AlertsStorageService {
  AlertsStorageService._();
  static final AlertsStorageService instance = AlertsStorageService._();

  static const _key = 'ftah_alerts';

  Future<List<AlertModel>> loadAlerts() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw   = prefs.getString(_key);
      if (raw == null || raw.isEmpty) return [];
      final list  = jsonDecode(raw) as List<dynamic>;
      return list
          .map((e) => AlertModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> saveAlerts(List<AlertModel> alerts) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_key, jsonEncode(alerts.map((a) => a.toJson()).toList()));
    } catch (_) {}
  }

  Future<List<AlertModel>> addAlert(AlertModel alert) async {
    final alerts = await loadAlerts();
    // Avoid duplicates (e.g. background handler + foreground handler both fire).
    if (alerts.any((a) => a.id == alert.id)) return alerts;
    alerts.insert(0, alert);
    await saveAlerts(alerts);
    return alerts;
  }

  Future<List<AlertModel>> markAsRead(String id) async {
    final alerts = await loadAlerts();
    for (final a in alerts) {
      if (a.id == id) a.isRead = true;
    }
    await saveAlerts(alerts);
    return alerts;
  }

  Future<List<AlertModel>> markAllAsRead() async {
    final alerts = await loadAlerts();
    for (final a in alerts) {
      a.isRead = true;
    }
    await saveAlerts(alerts);
    return alerts;
  }

  Future<List<AlertModel>> deleteAlert(String id) async {
    final alerts = await loadAlerts();
    alerts.removeWhere((a) => a.id == id);
    await saveAlerts(alerts);
    return alerts;
  }
}
