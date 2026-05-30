package com.ftah.notifications_app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.Settings
import android.util.Log
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val GRAYSCALE_CHANNEL = "com.ftah.notifications_app/grayscale"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, GRAYSCALE_CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "checkPermission" -> {
                        result.success(hasSecureSettingsPermission())
                    }
                    "isGrayscaleEnabled" -> {
                        result.success(isGrayscaleEnabled())
                    }
                    "setGrayscale" -> {
                        val enabled = call.argument<Boolean>("enabled") ?: false
                        val success = setGrayscale(enabled)
                        if (success) {
                            result.success(true)
                        } else {
                            result.error(
                                "PERMISSION_DENIED",
                                "WRITE_SECURE_SETTINGS permission is not granted or an error occurred",
                                null
                            )
                        }
                    }
                    "setSchedule" -> {
                        val enabled     = call.argument<Boolean>("enabled")     ?: false
                        val startHour   = call.argument<Int>("startHour")       ?: 22
                        val startMinute = call.argument<Int>("startMinute")     ?: 0
                        val endHour     = call.argument<Int>("endHour")         ?: 7
                        val endMinute   = call.argument<Int>("endMinute")       ?: 0
                        setSchedule(enabled, startHour, startMinute, endHour, endMinute)
                        result.success(true)
                    }
                    "getSchedule" -> {
                        result.success(getSchedule())
                    }
                    else -> result.notImplemented()
                }
            }
    }

    // ── Grayscale helpers ─────────────────────────────────────────────────────

    private fun hasSecureSettingsPermission(): Boolean =
        context.checkSelfPermission(Manifest.permission.WRITE_SECURE_SETTINGS) == PackageManager.PERMISSION_GRANTED

    private fun isGrayscaleEnabled(): Boolean {
        return try {
            val enabled = Settings.Secure.getInt(context.contentResolver, "accessibility_display_daltonizer_enabled", 0)
            val mode    = Settings.Secure.getInt(context.contentResolver, "accessibility_display_daltonizer",         -1)
            enabled == 1 && mode == 0
        } catch (e: Exception) {
            Log.e("MainActivity", "Error reading grayscale setting", e)
            false
        }
    }

    private fun setGrayscale(enabled: Boolean): Boolean {
        return try {
            if (enabled) {
                Settings.Secure.putString(context.contentResolver, "accessibility_display_daltonizer",         "0")
                Settings.Secure.putString(context.contentResolver, "accessibility_display_daltonizer_enabled", "1")
            } else {
                Settings.Secure.putString(context.contentResolver, "accessibility_display_daltonizer_enabled", "0")
                Settings.Secure.putString(context.contentResolver, "accessibility_display_daltonizer",         "-1")
            }
            Log.d("MainActivity", "Grayscale toggled to: $enabled")
            true
        } catch (e: SecurityException) {
            Log.e("MainActivity", "WRITE_SECURE_SETTINGS not granted", e)
            false
        } catch (e: Exception) {
            Log.e("MainActivity", "Failed to toggle grayscale", e)
            false
        }
    }

    private fun setSchedule(enabled: Boolean, startHour: Int, startMinute: Int, endHour: Int, endMinute: Int) {
        val prefs = context.getSharedPreferences("ftah_prefs", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putBoolean("schedule_enabled", enabled)
            putInt("start_hour",           startHour)
            putInt("start_minute",         startMinute)
            putInt("end_hour",             endHour)
            putInt("end_minute",           endMinute)
            apply()
        }

        AlarmScheduler.cancelAlarm(context, AlarmScheduler.ACTION_START_NIGHT)
        AlarmScheduler.cancelAlarm(context, AlarmScheduler.ACTION_END_NIGHT)

        if (enabled) {
            AlarmScheduler.scheduleAlarm(context, AlarmScheduler.ACTION_START_NIGHT, startHour,   startMinute)
            AlarmScheduler.scheduleAlarm(context, AlarmScheduler.ACTION_END_NIGHT,   endHour,     endMinute)
            Log.d("MainActivity", "Schedule enabled: $startHour:$startMinute → $endHour:$endMinute")
        } else {
            Log.d("MainActivity", "Schedule disabled")
        }
    }

    private fun getSchedule(): Map<String, Any> {
        val prefs = context.getSharedPreferences("ftah_prefs", Context.MODE_PRIVATE)
        return mapOf(
            "enabled"     to prefs.getBoolean("schedule_enabled", false),
            "startHour"   to prefs.getInt("start_hour",            22),
            "startMinute" to prefs.getInt("start_minute",           0),
            "endHour"     to prefs.getInt("end_hour",                7),
            "endMinute"   to prefs.getInt("end_minute",              0)
        )
    }
}
