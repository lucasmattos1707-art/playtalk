import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.playtalk.app',
  appName: 'Fluent LevelUp',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    hostname: 'localhost',
    androidScheme: 'https',
    allowNavigation: ['www.fluentlevelup.com', 'fluentlevelup.com']
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#07111f',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#07111f',
      overlaysWebView: false
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  }
};

export default config;
