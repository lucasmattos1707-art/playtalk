(function initPlaytalkApkConfig() {
  // Preencha esta URL apenas para builds nativos do APK.
  // Exemplo:
  // window.PLAYTALK_NATIVE_API_BASE_URL = 'https://SEU-SERVICO.onrender.com';
  if (typeof window.PLAYTALK_NATIVE_API_BASE_URL !== 'string') {
    window.PLAYTALK_NATIVE_API_BASE_URL = '';
  }
})();
