import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, I18nManager, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../context/Authcontext";

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  light: "#F2F2F2",
  slate: "#566375",
  navyLight: "#1A3650",
  goldLight: "#D8C190",
};

// Custom theme with navy and gold
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: palette.gold,
    background: palette.navy,
    card: palette.navyLight,
    text: palette.light,
    border: palette.slate,
  },
};

const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.gold,
    background: palette.light,
    card: "#FFFFFF",
    text: palette.navy,
    border: "#E5E7EB",
  },
};

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "auth";

    console.log("Navigation check:", {
      isAuthenticated,
      inAuthGroup,
      segments,
    });

    if (!isAuthenticated && !inAuthGroup) {
      console.log("🔒 Redirecting to sign-in");
      router.replace("/auth/sign-in");
    } else if (isAuthenticated && inAuthGroup) {
      console.log("✅ Redirecting to tabs");
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, segments, isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={palette.gold} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  // Force RTL for Arabic
  I18nManager.forceRTL(true);

  const [fontsLoaded] = useFonts({
    "NotoNaskhArabic-Regular": require("../assets/fonts/NotoNaskhArabic-Regular.ttf"),
    "NotoNaskhArabic-Bold": require("../assets/fonts/NotoNaskhArabic-Bold.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider value={CustomDarkTheme}>
            <View style={[styles.container, { backgroundColor: palette.navy }]}>
              <RootLayoutNav />
              <StatusBar style="light" />
            </View>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});
