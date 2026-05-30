package com.ftah.notifications_app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.util.Log

class GrayscaleAlarmReceiver : BroadcastReceiver() {
    companion object {
        const val TAG              = "GrayscaleReceiver"
        const val ACTION_START_NIGHT = "com.ftah.notifications_app.START_NIGHT"
        const val ACTION_END_NIGHT   = "com.ftah.notifications_app.END_NIGHT"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.d(TAG, "Alarm triggered: $action")

        val prefs           = context.getSharedPreferences("ftah_prefs", Context.MODE_PRIVATE)
        val scheduleEnabled = prefs.getBoolean("schedule_enabled", false)

        if (!scheduleEnabled) {
            Log.d(TAG, "Schedule is disabled. Skipping.")
            return
        }

        try {
            if (action == ACTION_START_NIGHT) {
                Settings.Secure.putString(context.contentResolver, "accessibility_display_daltonizer",         "0")
                Settings.Secure.putString(context.contentResolver, "accessibility_display_daltonizer_enabled", "1")
                Log.d(TAG, "Grayscale enabled by schedule.")
            } else if (action == ACTION_END_NIGHT) {
                Settings.Secure.putString(context.contentResolver, "accessibility_display_daltonizer_enabled", "0")
                Settings.Secure.putString(context.contentResolver, "accessibility_display_daltonizer",         "-1")
                Log.d(TAG, "Grayscale disabled by schedule.")
            }
            // Reschedule for tomorrow
            rescheduleAlarm(context, action, prefs)
        } catch (e: SecurityException) {
            Log.e(TAG, "WRITE_SECURE_SETTINGS not granted!", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error changing grayscale setting", e)
        }
    }

    private fun rescheduleAlarm(context: Context, action: String, prefs: android.content.SharedPreferences) {
        val startHour   = prefs.getInt("start_hour",   22)
        val startMinute = prefs.getInt("start_minute",  0)
        val endHour     = prefs.getInt("end_hour",       7)
        val endMinute   = prefs.getInt("end_minute",     0)

        val targetHour   = if (action == ACTION_START_NIGHT) startHour   else endHour
        val targetMinute = if (action == ACTION_START_NIGHT) startMinute else endMinute

        AlarmScheduler.scheduleAlarm(context, action, targetHour, targetMinute)
        Log.d(TAG, "Rescheduled $action for tomorrow at $targetHour:$targetMinute")
    }
}
