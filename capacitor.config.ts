import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.oneapp.partner',
  appName: 'Pintu Partner',
  webDir: 'www',
  plugins: {
    Keyboard: {
      resize: 'body' // 🔥 THIS MAKES INPUT MOVE UP
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      showSpinner: false,
      backgroundColor: "#000000ff"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    OtaKit: {
      appId: 'io.oneapp.partner',
      cdnUrl: 'https://pintu-api.democompany.in.net/ota',
      allowInsecureUrls: true
    },
    Cordova: {}
  },
  // server: {
  //   url: 'https://pintu-api.democompany.in.net/',
  //   cleartext: true,
  //   errorPath: 'offline.html'
  // }
};

export default config;
