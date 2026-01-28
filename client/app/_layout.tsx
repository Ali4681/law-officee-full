import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { I18nManager, StyleSheet, View } from "react-native";

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

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  // Force RTL for Arabic
  I18nManager.forceRTL(true);

  const [fontsLoaded] = useFonts({
    "NotoNaskhArabic-Regular": require("../assets/fonts/NotoNaskhArabic-Regular.ttf"),
    "NotoNaskhArabic-Bold": require("../assets/fonts/NotoNaskhArabic-Bold.ttf"),
  });

  if (!fontsLoaded) {
    return null; // Or a loading screen
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={CustomDarkTheme}>
        <View style={[styles.container, { backgroundColor: palette.navy }]}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "transparent" },
              animation: "fade_from_bottom",
              animationDuration: 250,
            }}
          >
            <Stack.Screen
              name="(tabs)"
              options={{
                animation: "fade",
              }}
            />
          </Stack>

          <StatusBar style="light" />
        </View>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
