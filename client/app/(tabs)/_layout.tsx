import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { I18nManager } from "react-native";

// Enable RTL layout
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const palette = {
  gold: "#C6A667",
  darkNavy: "#041923",
  navyLight: "#0D1B2A",
  slate: "#8B92A3",
};

// Arabic translations
const translations = {
  cases: "القضايا",
  notifications: "الإشعارات",
  chats: "المحادثات",
  profile: "الملف الشخصي",
};

export default function TabLayout() {
  const tabBarHeight = 88;
  const tabBarBottomPadding = 34;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.gold,
        tabBarInactiveTintColor: palette.slate,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: palette.navyLight,
          borderTopWidth: 2,
          borderTopColor: palette.gold + "40",
          height: tabBarHeight,
          paddingBottom: tabBarBottomPadding,
          paddingTop: 8,
          elevation: 10,
          shadowColor: palette.gold,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 4,
          letterSpacing: 0.5,
          fontFamily: "NotoNaskhArabic-Bold",
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: translations.profile,
          href: "/profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: translations.chats,
          href: "/chat",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: translations.notifications,
          href: "/notifications",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: translations.cases,
          href: "/",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "briefcase" : "briefcase-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
