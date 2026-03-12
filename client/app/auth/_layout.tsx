import { useColorScheme } from "@/hooks/use-color-scheme";
import { loadAuthToken } from "@/services/api";
import { Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { StatusBar, StyleSheet, View } from "react-native";

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  light: "#F2F2F2",
  slate: "#566375",
  navyLight: "#1A3650",
  goldLight: "#D8C190",
};

export default function AuthLayout() {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === "dark" ? palette.navy : palette.light;
  const hasLoadedToken = useRef(false);

  // Load auth token only once when the layout first mounts
  useEffect(() => {
    if (!hasLoadedToken.current) {
      hasLoadedToken.current = true;
      loadAuthToken()
        .then((token) => {
          if (token) {
            console.log("✅ Auth token loaded in AuthLayout");
          }
        })
        .catch((error) => {
          console.error("❌ Error loading token:", error);
        });
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={backgroundColor}
      />

      {/* Decorative Background Elements */}
      <View style={styles.decorativeBackground}>
        {/* Top Left Accent */}
        <View
          style={[
            styles.accentCircle,
            styles.topLeft,
            {
              backgroundColor: palette.gold,
              opacity: colorScheme === "dark" ? 0.1 : 0.05,
            },
          ]}
        />

        {/* Top Right Accent */}
        <View
          style={[
            styles.accentCircle,
            styles.topRight,
            {
              backgroundColor: palette.goldLight,
              opacity: colorScheme === "dark" ? 0.08 : 0.04,
            },
          ]}
        />

        {/* Bottom Left Small */}
        <View
          style={[
            styles.accentCircleSmall,
            styles.bottomLeft,
            {
              backgroundColor: palette.gold,
              opacity: colorScheme === "dark" ? 0.12 : 0.06,
            },
          ]}
        />

        {/* Bottom Right Accent */}
        <View
          style={[
            styles.accentCircle,
            styles.bottomRight,
            {
              backgroundColor: palette.goldLight,
              opacity: colorScheme === "dark" ? 0.1 : 0.05,
            },
          ]}
        />

        {/* Center Accent Lines */}
        <View
          style={[
            styles.accentLine,
            styles.lineTop,
            {
              backgroundColor: palette.gold,
              opacity: colorScheme === "dark" ? 0.08 : 0.04,
            },
          ]}
        />
        <View
          style={[
            styles.accentLine,
            styles.lineBottom,
            {
              backgroundColor: palette.goldLight,
              opacity: colorScheme === "dark" ? 0.08 : 0.04,
            },
          ]}
        />
      </View>

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
          animation: "fade",
          animationDuration: 200,
        }}
      >
        <Stack.Screen
          name="sign-in"
          options={{
            title: "Sign In",
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="sign-up"
          options={{
            title: "Sign Up",
            animation: "slide_from_right",
          }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorativeBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  accentCircle: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  accentCircleSmall: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  topLeft: {
    top: -100,
    left: -100,
  },
  topRight: {
    top: -50,
    right: -120,
  },
  bottomLeft: {
    bottom: 100,
    left: -50,
  },
  bottomRight: {
    bottom: -100,
    right: -80,
  },
  accentLine: {
    position: "absolute",
    height: 2,
    width: "60%",
  },
  lineTop: {
    top: "25%",
    right: -100,
    transform: [{ rotate: "-15deg" }],
  },
  lineBottom: {
    bottom: "30%",
    left: -100,
    transform: [{ rotate: "20deg" }],
  },
});
