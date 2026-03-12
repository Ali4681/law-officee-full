import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LawyerLayout() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const BASE_HEIGHT =
    Platform.OS === "ios" ? (height < 700 ? 72 : 82) : height < 700 ? 56 : 62;

  const TAB_BAR_HEIGHT = BASE_HEIGHT + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor: "#d6bd82",
        tabBarInactiveTintColor: "#94a3b8",

        // 🔥 الحل هنا
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,

          backgroundColor: "#0A2436",
          borderTopWidth: 0,
          height: TAB_BAR_HEIGHT,
          paddingBottom: insets.bottom,
          paddingTop: 6,

          elevation: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        },

        tabBarLabelStyle: {
          fontWeight: "800",
          letterSpacing: 0.3,
          fontSize: height < 700 ? 10 : 12,
          textTransform: "uppercase",
        },

        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="cases"
        options={{
          title: "Cases",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "briefcase" : "briefcase-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubble" : "chatbubble-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
