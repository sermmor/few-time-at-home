package com.ftah.notifications_app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    companion object {
        const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == "android.intent.action.QUICKBOOT_POWERON" ||
            action == "com.htc.intent.action.QUICKBOOT_POWERON"
        ) {
            Log.d(TAG, "Device booted — restoring grayscale schedule if enabled.")
            val prefs           = context.getSharedPreferences("ftah_prefs", Context.MODE_PRIVATE)
            val scheduleEnabled = prefs.getBoolean("schedule_enabled", false)

            if (scheduleEnabled) {
                val startHour   = prefs.getInt("start_hour",   22)
                val startMinute = prefs.getInt("start_minute",  0)
                val endHour     = prefs.getInt("end_hour",       7)
                val endMinute   = prefs.getInt("end_minute",     0)

                AlarmScheduler.scheduleAlarm(context, AlarmScheduler.ACTION_START_NIGHT, startHour,   startMinute)
                AlarmScheduler.scheduleAlarm(context, AlarmScheduler.ACTION_END_NIGHT,   endHour,     endMinute)
                Log.d(TAG, "Alarms restored on boot: $startHour:$startMinute → $endHour:$endMinute")
            } else {
                Log.d(TAG, "Grayscale schedule not enabled. No alarms to restore.")
            }
        }
    }
}
