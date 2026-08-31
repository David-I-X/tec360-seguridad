const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyD5VuK1MncGyFNIXUUUHi0qCKljHSaRXjA";

export default {
  expo: {
    name: "Tec360 Seguridad",
    slug: "tec360-seguridad",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "tec360",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.tec360.seguridad",
      config: {
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      },
    },
    android: {
      package: "com.tec360.seguridad",
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: "#0f172a",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      config: {
        googleMaps: {
          apiKey: GOOGLE_MAPS_API_KEY,
        },
      },
      permissions: [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.CAMERA",
      ],
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#0f172a",
          dark: {
            backgroundColor: "#0f172a",
          },
        },
      ],
      "expo-secure-store",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Tec360 necesita acceso a tu ubicación para mostrar técnicos cercanos y realizar tracking.",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "Tec360 necesita acceso a tus fotos para subir evidencias de servicio.",
          cameraPermission:
            "Tec360 necesita acceso a tu cámara para tomar fotos de evidencia.",
        },
      ],
      "expo-font",
      "expo-web-browser",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "337df422-89e1-4aa7-8ef4-63e8606cf70c",
      },
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: "https://u.expo.dev/337df422-89e1-4aa7-8ef4-63e8606cf70c",
    },
  },
};
