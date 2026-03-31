package com.playtalk.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlaytalkSpeechPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
