import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  light: "#F2F2F2",
};

export default function AdminTabs() {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();

  // ارتفاع TabBar ديناميكي
  const BASE_HEIGHT = Platform.OS === "ios" ? 80 : 62;
  const TAB_BAR_HEIGHT = BASE_HEIGHT + insets.bottom;

  // حجم الأيقونة والخط
  const ICON_SIZE = Math.min(Math.max(width * 0.065, 22), 30);
  const FONT_SIZE = Math.min(Math.max(width * 0.028, 10), 12);

  // Animation للتاب النشط
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(focusAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(focusAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: palette.gold,
        tabBarInactiveTintColor: `${palette.light}80`,

        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: TAB_BAR_HEIGHT,
          paddingBottom: insets.bottom,
          paddingTop: 14, // رفع التاب بار قليلاً
          borderTopWidth: 0,
          backgroundColor: "transparent",
          elevation: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
        },

        tabBarBackground: () => (
          <LinearGradient
            colors={[palette.navy, "#0f3048", palette.navy]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <LinearGradient
              colors={[`${palette.gold}40`, "transparent"]}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
              }}
            />
          </LinearGradient>
        ),

        tabBarLabelStyle: {
          fontWeight: "700",
          fontSize: FONT_SIZE,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginTop: -2, // رفع الكتابة للأعلى
        },

        tabBarIconStyle: {
          marginTop: -4, // رفع الأيقونات للأعلى
        },

        tabBarItemStyle: { paddingVertical: 2 },

        sceneStyle: { paddingBottom: TAB_BAR_HEIGHT },
      }}
    >
      <Tabs.Screen
        name="courts"
        options={{
          title: "Courts",
          tabBarIcon: ({ focused }) => (
            <>
              {focused && (
                <Animated.View
                  style={{
                    position: "absolute",
                    top: -6,
                    left: -16,
                    right: -16,
                    bottom: -6,
                    borderRadius: 16,
                    backgroundColor: palette.gold + "20",
                    opacity: focusAnim,
                    transform: [
                      {
                        scale: focusAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.95, 1.05],
                        }),
                      },
                    ],
                  }}
                />
              )}
              <Ionicons
                name={focused ? "business" : "business-outline"}
                color={focused ? palette.gold : `${palette.light}80`}
                size={ICON_SIZE}
              />
            </>
          ),
        }}
      />

      <Tabs.Screen
        name="admin-lawyers"
        options={{
          title: "Lawyers",
          tabBarIcon: ({ focused }) => (
            <>
              {focused && (
                <Animated.View
                  style={{
                    position: "absolute",
                    top: -6,
                    left: -16,
                    right: -16,
                    bottom: -6,
                    borderRadius: 16,
                    backgroundColor: palette.gold + "20",
                    opacity: focusAnim,
                    transform: [
                      {
                        scale: focusAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.95, 1.05],
                        }),
                      },
                    ],
                  }}
                />
              )}
              <Ionicons
                name={focused ? "people" : "people-outline"}
                color={focused ? palette.gold : `${palette.light}80`}
                size={ICON_SIZE}
              />
            </>
          ),
        }}
      />
    </Tabs>
  );
}
