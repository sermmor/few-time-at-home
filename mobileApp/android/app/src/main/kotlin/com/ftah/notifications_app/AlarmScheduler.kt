package com.ftah.notifications_app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import java.util.Calendar

object AlarmScheduler {
    const val TAG = "AlarmScheduler"
    const val ACTION_START_NIGHT = "com.ftah.notifications_app.START_NIGHT"
    const val ACTION_END_NIGHT   = "com.ftah.notifications_app.END_NIGHT"

    fun scheduleAlarm(context: Context, action: String, hour: Int, minute: Int) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, GrayscaleAlarmReceiver::class.java).apply { this.action = action }

        val requestCode = if (action == ACTION_START_NIGHT) 1001 else 1002
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent, flags)
        val triggerTime   = getNextAlarmTimeInMillis(hour, minute)

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (alarmManager.canScheduleExactAlarms()) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                    } else {
                        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                    }
                } else {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                }
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
            }
            Log.d(TAG, "Alarm $action scheduled for: ${java.util.Date(triggerTime)}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule alarm $action", e)
        }
    }

    fun cancelAlarm(context: Context, action: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, GrayscaleAlarmReceiver::class.java).apply { this.action = action }
        val requestCode = if (action == ACTION_START_NIGHT) 1001 else 1002
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent, flags)
        try {
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
            Log.d(TAG, "Alarm $action cancelled")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to cancel alarm $action", e)
        }
    }

    private fun getNextAlarmTimeInMillis(hour: Int, minute: Int): Long {
        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE,      minute)
            set(Calendar.SECOND,      0)
            set(Calendar.MILLISECOND, 0)
        }
        if (calendar.timeInMillis <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_YEAR, 1)
        }
        return calendar.timeInMillis
    }
}
