import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cft.formtracker",
  appName: "CFT",
  webDir: "out",
  ios: {
    contentInset: "never",
    allowsLinkPreview: false,
    backgroundColor: "#0b1512",
    preferredContentMode: "mobile",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: "#0b1512",
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
    },
  },
};

export default config;
