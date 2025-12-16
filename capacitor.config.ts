import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.oneapp.partner',
  appName: 'oneapp_partner',
  webDir: 'www',
  plugins: {
    Keyboard: {
      resize: 'body' // 🔥 THIS MAKES INPUT MOVE UP
    }
  }
};

export default config;
