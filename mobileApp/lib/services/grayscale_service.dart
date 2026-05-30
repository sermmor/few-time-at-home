// ignore_for_file: avoid_print

import 'package:flutter/services.dart';

class GrayscaleService {
  static const MethodChannel _channel =
      MethodChannel('com.ftah.notifications_app/grayscale');

  /// Checks if the application has been granted the WRITE_SECURE_SETTINGS permission via ADB.
  static Future<bool> checkPermission() async {
    try {
      final bool hasPermission = await _channel.invokeMethod('checkPermission');
      return hasPermission;
    } on PlatformException catch (e) {
      print("Error checking permission: ${e.message}");
      return false;
    }
  }

  /// Checks if system-wide grayscale mode is currently enabled.
  static Future<bool> isGrayscaleEnabled() async {
    try {
      final bool isEnabled = await _channel.invokeMethod('isGrayscaleEnabled');
      return isEnabled;
    } on PlatformException catch (e) {
      print("Error checking grayscale state: ${e.message}");
      return false;
    }
  }

  /// Toggles system-wide grayscale mode.
  /// Throws a PlatformException if permission is not granted.
  static Future<bool> setGrayscale(bool enabled) async {
    try {
      final bool success = await _channel.invokeMethod(
        'setGrayscale',
        {'enabled': enabled},
      );
      return success;
    } on PlatformException catch (e) {
      print("Error toggling grayscale: ${e.message}");
      rethrow;
    }
  }

  /// Schedules or disables night-time automatic grayscale mode.
  static Future<bool> setSchedule({
    required bool enabled,
    required int startHour,
    required int startMinute,
    required int endHour,
    required int endMinute,
  }) async {
    try {
      final bool success = await _channel.invokeMethod(
        'setSchedule',
        {
          'enabled': enabled,
          'startHour': startHour,
          'startMinute': startMinute,
          'endHour': endHour,
          'endMinute': endMinute,
        },
      );
      return success;
    } on PlatformException catch (e) {
      print("Error setting schedule: ${e.message}");
      return false;
    }
  }

  /// Retrieves the saved schedule preferences from SharedPreferences.
  static Future<Map<String, dynamic>> getSchedule() async {
    try {
      final Map<dynamic, dynamic>? schedule =
          await _channel.invokeMethod('getSchedule');
      if (schedule != null) {
        return Map<String, dynamic>.from(schedule);
      }
    } on PlatformException catch (e) {
      print("Error getting schedule: ${e.message}");
    }
    return {
      'enabled': false,
      'startHour': 22,
      'startMinute': 0,
      'endHour': 7,
      'endMinute': 0,
    };
  }
}
