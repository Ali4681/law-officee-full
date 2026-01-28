import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  light: "#F2F2F2",
  slate: "#566375",
};

export default function AdminTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.gold,
        tabBarInactiveTintColor: `${palette.light}80`,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === "ios" ? 88 : 68,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          paddingBottom: Platform.OS === "ios" ? 24 : 12,
          paddingTop: 12,
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={[palette.navy, "#0f3048", "#0A2436"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Top border glow */}
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
          fontSize: 11,
          marginTop: 4,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="courts"
        options={{
          title: "Courts",
          tabBarIcon: ({ color, focused }) => (
            <>
              {focused && (
                <LinearGradient
                  colors={[`${palette.gold}20`, "transparent"]}
                  style={{
                    position: "absolute",
                    top: -8,
                    left: -20,
                    right: -20,
                    bottom: -8,
                    borderRadius: 16,
                  }}
                />
              )}
              <Ionicons
                name={focused ? "business" : "business-outline"}
                color={focused ? palette.gold : `${palette.light}80`}
                size={28}
              />
            </>
          ),
        }}
      />
      <Tabs.Screen
        name="admin-lawyers"
        options={{
          title: "Lawyers",
          tabBarIcon: ({ color, focused }) => (
            <>
              {focused && (
                <LinearGradient
                  colors={[`${palette.gold}20`, "transparent"]}
                  style={{
                    position: "absolute",
                    top: -8,
                    left: -20,
                    right: -20,
                    bottom: -8,
                    borderRadius: 16,
                  }}
                />
              )}
              <Ionicons
                name={focused ? "people" : "people-outline"}
                color={focused ? palette.gold : `${palette.light}80`}
                size={28}
              />
            </>
          ),
        }}
      />
    </Tabs>
  );
}
