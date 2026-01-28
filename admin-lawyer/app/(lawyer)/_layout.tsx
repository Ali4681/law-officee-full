import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

const tabBarOptions = {
  headerShown: false,
  tabBarHideOnKeyboard: true,
  tabBarActiveTintColor: "#d6bd82",
  tabBarInactiveTintColor: "#94a3b8",
  tabBarLabelStyle: {
    fontWeight: "800" as const,
    letterSpacing: 0.3,
    fontSize: 12,
    textTransform: "uppercase" as const,
  },
  tabBarStyle: {
    backgroundColor: "#0A2436",
    borderTopColor: "transparent",
    height: 64,

    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
};

export default function LawyerLayout() {
  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen
        name="cases"
        options={{
          title: "Cases",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
