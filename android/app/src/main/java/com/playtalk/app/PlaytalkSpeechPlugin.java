package com.playtalk.app;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import androidx.annotation.Nullable;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.Locale;

@CapacitorPlugin(
    name = "PlaytalkSpeech",
    permissions = {
        @Permission(alias = "audio", strings = { Manifest.permission.RECORD_AUDIO })
    }
)
public class PlaytalkSpeechPlugin extends Plugin {
    private static final String AUDIO_PERMISSION_ALIAS = "audio";
    private static final long DEFAULT_MAX_DURATION_MS = 10000L;
    private static final long MIN_MAX_DURATION_MS = 2500L;
    private static final long MAX_MAX_DURATION_MS = 30000L;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Nullable
    private SpeechRecognizer speechRecognizer;

    @Nullable
    private PluginCall activeCall;

    @Nullable
    private Runnable timeoutRunnable;

    private boolean activeCallFinished = false;
    private String bestTranscript = "";
    private final ArrayList<String> bestTranscripts = new ArrayList<>();

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        releaseRecognizer();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", SpeechRecognizer.isRecognitionAvailable(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void ensurePermissions(PluginCall call) {
        if (getPermissionState(AUDIO_PERMISSION_ALIAS) == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias(AUDIO_PERMISSION_ALIAS, call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        boolean granted = getPermissionState(AUDIO_PERMISSION_ALIAS) == PermissionState.GRANTED;
        result.put("granted", granted);
        if (granted) {
            call.resolve(result);
            return;
        }
        call.reject("Permissao de microfone negada.", "PERMISSION_DENIED");
    }

    @PluginMethod
    public void captureOnce(PluginCall call) {
        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            call.unavailable("Reconhecimento de voz indisponivel neste aparelho.");
            return;
        }
        if (getPermissionState(AUDIO_PERMISSION_ALIAS) != PermissionState.GRANTED) {
            requestPermissionForAlias(AUDIO_PERMISSION_ALIAS, call, "capturePermissionCallback");
            return;
        }
        startCapture(call);
    }

    @PermissionCallback
    private void capturePermissionCallback(PluginCall call) {
        if (getPermissionState(AUDIO_PERMISSION_ALIAS) == PermissionState.GRANTED) {
            startCapture(call);
            return;
        }
        call.reject("Permissao de microfone negada.", "PERMISSION_DENIED");
    }

    @PluginMethod
    public void cancelListening(PluginCall call) {
        cancelActiveRecognition("Captura cancelada.", "CANCELLED");
        call.resolve();
    }

    private void startCapture(PluginCall call) {
        if (getActivity() == null) {
            call.unavailable("Atividade Android indisponivel.");
            return;
        }

        getActivity().runOnUiThread(() -> {
            cancelActiveRecognition("Captura substituida.", "CANCELLED");
            resetRecognitionState();
            activeCall = call;

            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(getActivity());
            speechRecognizer.setRecognitionListener(new RecognitionListener() {
                @Override
                public void onReadyForSpeech(Bundle params) {}

                @Override
                public void onBeginningOfSpeech() {}

                @Override
                public void onRmsChanged(float rmsdB) {}

                @Override
                public void onBufferReceived(byte[] buffer) {}

                @Override
                public void onEndOfSpeech() {}

                @Override
                public void onError(int error) {
                    if (activeCallFinished) return;
                    if ((error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) && !bestTranscript.isEmpty()) {
                        resolveActiveCall();
                        return;
                    }
                    rejectActiveCall(mapErrorMessage(error), mapErrorCode(error));
                }

                @Override
                public void onResults(Bundle results) {
                    collectResults(results);
                    resolveActiveCall();
                }

                @Override
                public void onPartialResults(Bundle partialResults) {
                    collectResults(partialResults);
                }

                @Override
                public void onEvent(int eventType, Bundle params) {}
            });

            final Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            final String language = normalizeLanguage(call.getString("language", "en-US"));
            final int maxResults = normalizeMaxResults(call.getInt("maxResults", 5));
            final long maxDurationMs = normalizeMaxDuration(call.getLong("maxDurationMs", DEFAULT_MAX_DURATION_MS));

            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, maxResults);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, false);

            timeoutRunnable = () -> {
                if (speechRecognizer == null || activeCallFinished) return;
                try {
                    speechRecognizer.stopListening();
                } catch (Exception ignored) {
                    rejectActiveCall("Tempo do microfone esgotado.", "TIMEOUT");
                }
            };
            mainHandler.postDelayed(timeoutRunnable, maxDurationMs);

            try {
                speechRecognizer.startListening(intent);
            } catch (Exception error) {
                rejectActiveCall("Nao foi possivel iniciar o reconhecimento.", "START_FAILED");
            }
        });
    }

    private void collectResults(@Nullable Bundle results) {
        if (results == null) return;
        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches == null || matches.isEmpty()) return;
        LinkedHashSet<String> unique = new LinkedHashSet<>();
        unique.addAll(bestTranscripts);
        for (String match : matches) {
            String normalized = normalizeTranscript(match);
            if (!normalized.isEmpty()) {
                unique.add(normalized);
                if (normalized.length() > bestTranscript.length()) {
                    bestTranscript = normalized;
                }
            }
        }
        bestTranscripts.clear();
        bestTranscripts.addAll(unique);
    }

    private void resolveActiveCall() {
        PluginCall call = activeCall;
        if (call == null || activeCallFinished) {
            releaseRecognizer();
            return;
        }

        activeCallFinished = true;
        clearTimeout();

        JSObject result = new JSObject();
        result.put("transcript", bestTranscript);
        JSArray transcripts = new JSArray();
        for (String transcript : bestTranscripts) {
            transcripts.put(transcript);
        }
        result.put("transcripts", transcripts);
        result.put("language", Locale.getDefault().toLanguageTag());
        call.resolve(result);
        activeCall = null;
        releaseRecognizer();
    }

    private void rejectActiveCall(String message, String code) {
        PluginCall call = activeCall;
        if (call == null || activeCallFinished) {
            releaseRecognizer();
            return;
        }

        activeCallFinished = true;
        clearTimeout();
        call.reject(message, code);
        activeCall = null;
        releaseRecognizer();
    }

    private void cancelActiveRecognition(String message, String code) {
        if (speechRecognizer != null) {
            try {
                speechRecognizer.cancel();
            } catch (Exception ignored) {
                // ignore
            }
        }
        if (activeCall != null && !activeCallFinished) {
            rejectActiveCall(message, code);
            return;
        }
        releaseRecognizer();
    }

    private void releaseRecognizer() {
        clearTimeout();
        if (speechRecognizer != null) {
            try {
                speechRecognizer.destroy();
            } catch (Exception ignored) {
                // ignore
            }
            speechRecognizer = null;
        }
        activeCallFinished = false;
        bestTranscript = "";
        bestTranscripts.clear();
    }

    private void resetRecognitionState() {
        activeCallFinished = false;
        bestTranscript = "";
        bestTranscripts.clear();
    }

    private void clearTimeout() {
        if (timeoutRunnable != null) {
            mainHandler.removeCallbacks(timeoutRunnable);
            timeoutRunnable = null;
        }
    }

    private String normalizeLanguage(@Nullable String value) {
        String language = value == null ? "" : value.trim();
        return language.isEmpty() ? "en-US" : language;
    }

    private int normalizeMaxResults(@Nullable Integer value) {
        int normalized = value == null ? 5 : value;
        return Math.max(1, Math.min(normalized, 10));
    }

    private long normalizeMaxDuration(@Nullable Long value) {
        long normalized = value == null ? DEFAULT_MAX_DURATION_MS : value;
        return Math.max(MIN_MAX_DURATION_MS, Math.min(normalized, MAX_MAX_DURATION_MS));
    }

    private String normalizeTranscript(@Nullable String value) {
        return value == null ? "" : value.trim();
    }

    private String mapErrorCode(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO:
                return "AUDIO";
            case SpeechRecognizer.ERROR_CLIENT:
                return "CLIENT";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "PERMISSION_DENIED";
            case SpeechRecognizer.ERROR_NETWORK:
                return "NETWORK";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "NETWORK_TIMEOUT";
            case SpeechRecognizer.ERROR_NO_MATCH:
                return "NO_MATCH";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "BUSY";
            case SpeechRecognizer.ERROR_SERVER:
                return "SERVER";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "SPEECH_TIMEOUT";
            default:
                return "UNKNOWN";
        }
    }

    private String mapErrorMessage(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO:
                return "Falha ao capturar audio.";
            case SpeechRecognizer.ERROR_CLIENT:
                return "Cliente de reconhecimento indisponivel.";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "Permissao de microfone negada.";
            case SpeechRecognizer.ERROR_NETWORK:
                return "Falha de rede no reconhecimento.";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "Tempo de rede esgotado no reconhecimento.";
            case SpeechRecognizer.ERROR_NO_MATCH:
                return "Nenhuma fala reconhecida.";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "Reconhecimento ocupado no momento.";
            case SpeechRecognizer.ERROR_SERVER:
                return "Servidor de voz indisponivel.";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "Nenhuma fala detectada a tempo.";
            default:
                return "Falha ao reconhecer a fala.";
        }
    }
}
