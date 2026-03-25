package com.playtalk.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int PLAYTALK_RECORD_AUDIO_REQUEST_CODE = 1407;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ensureRecordAudioPermission();
    }

    private void ensureRecordAudioPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED) {
            return;
        }

        ActivityCompat.requestPermissions(
            this,
            new String[]{ Manifest.permission.RECORD_AUDIO },
            PLAYTALK_RECORD_AUDIO_REQUEST_CODE
        );
    }
}
