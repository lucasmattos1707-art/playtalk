package com.playtalk.app;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.Context;
import android.os.Build;
import android.os.PowerManager;
import androidx.annotation.Nullable;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PlaytalkBooksSleep")
public class PlaytalkBooksSleepPlugin extends Plugin {
    private static final String WAKE_LOCK_TAG = "PlayTalk:BooksSleep";

    @Nullable
    private PowerManager.WakeLock wakeLock;

    @Override
    protected void handleOnDestroy() {
        releaseWakeLock();
        stopForegroundPlaybackService();
        super.handleOnDestroy();
    }

    @PluginMethod
    public void activate(PluginCall call) {
        boolean active = acquireWakeLock();
        active = startForegroundPlaybackService() && active;
        JSObject result = new JSObject();
        result.put("active", active);
        call.resolve(result);
    }

    @PluginMethod
    public void deactivate(PluginCall call) {
        releaseWakeLock();
        stopForegroundPlaybackService();
        JSObject result = new JSObject();
        result.put("active", false);
        call.resolve(result);
    }

    @PluginMethod
    public void isActive(PluginCall call) {
        JSObject result = new JSObject();
        result.put("active", wakeLock != null && wakeLock.isHeld());
        call.resolve(result);
    }

    @SuppressLint("WakelockTimeout")
    private boolean acquireWakeLock() {
        Context context = getContext();
        if (context == null) return false;
        if (wakeLock != null && wakeLock.isHeld()) return true;

        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (powerManager == null) return false;

        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, WAKE_LOCK_TAG);
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire();
        return wakeLock.isHeld();
    }

    private void releaseWakeLock() {
        if (wakeLock == null) return;
        try {
            if (wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (RuntimeException ignored) {
            // ignore
        } finally {
            wakeLock = null;
        }
    }

    private boolean startForegroundPlaybackService() {
        Context context = getContext();
        if (context == null) return false;
        Intent serviceIntent = new Intent(context, PlaytalkBooksSleepService.class);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            return true;
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    private void stopForegroundPlaybackService() {
        Context context = getContext();
        if (context == null) return;
        Intent serviceIntent = new Intent(context, PlaytalkBooksSleepService.class);
        try {
            context.stopService(serviceIntent);
        } catch (RuntimeException ignored) {
            // ignore
        }
    }
}
