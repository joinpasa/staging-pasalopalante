import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Was 'app.lovable.c21af17852dd4b50954ff73e22d2146a' — a Lovable-namespaced
  // id, not a real bundle id an App Store / Play Store listing can use.
  appId: 'com.pasalopalante.app',
  appName: 'Pásalo Pa\'lante',
  webDir: 'dist',
  server: {
    url: 'https://app.pasalopalante.com',
    cleartext: true,
  },
};

export default config;
