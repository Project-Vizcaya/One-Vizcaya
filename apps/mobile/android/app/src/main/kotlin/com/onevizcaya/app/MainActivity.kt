package com.onevizcaya.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.graphics.Color
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterFragmentActivity

class MainActivity : FlutterFragmentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createNotificationChannels()
    }

    // On Android O+ the heads-up pop, sound, vibration and colour of a
    // notification are decided by its CHANNEL, not by the per-message priority
    // FCM sends. FCM only routes a push to a channel by id — it never creates
    // one — so we create them here at launch. Urgent broadcasts / announcements
    // are routed (by the Cloud Functions) to `one_vizcaya_urgent`, a
    // high-importance channel that pops a heads-up banner, plays a sound and
    // vibrates, so an urgent alert is unmistakably different from a routine one.
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java) ?: return

        // Urgent — maximum attention: heads-up banner, sound, vibration, red light.
        val urgent = NotificationChannel(
            "one_vizcaya_urgent",
            "Urgent Alerts",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Time-critical emergency broadcasts and announcements"
            enableLights(true)
            lightColor = Color.RED
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 400, 200, 400, 200, 600)
            setBypassDnd(true)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            val sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val attrs = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .build()
            setSound(sound, attrs)
        }

        // Routine broadcasts — normal importance (no heads-up interruption).
        val broadcasts = NotificationChannel(
            "one_vizcaya_broadcasts",
            "Broadcasts",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply { description = "Provincial and municipal broadcast messages" }

        // Announcements — normal importance.
        val announcements = NotificationChannel(
            "one_vizcaya_announcements",
            "Announcements",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply { description = "News and announcements from your LGU" }

        // Report status updates — normal importance.
        val reports = NotificationChannel(
            "one_vizcaya_reports",
            "Report Updates",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply { description = "Updates on the status of your reports" }

        manager.createNotificationChannel(urgent)
        manager.createNotificationChannel(broadcasts)
        manager.createNotificationChannel(announcements)
        manager.createNotificationChannel(reports)
    }
}
