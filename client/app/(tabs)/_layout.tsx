import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import {
  Dimensions,
  I18nManager,
  Platform,
  Pressable,
  PressableProps,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const palette = {
  gold: "#C6A667",
  goldDark: "#B08D4F",
  goldLight: "#D8C190",
  darkNavy: "#041923",
  navyLight: "#0D1B2A",
  navyDeep: "#0A2436",
  slate: "#8B92A3",
  slateLight: "#A8B3C5",
};

const translations = {
  cases: "القضايا",
  notifications: "الإشعارات",
  chats: "المحادثات",
  profile: "الملف الشخصي",
};

// Custom Tab Bar Button Component with TypeScript interface
interface CustomTabBarButtonProps extends Omit<PressableProps, "style"> {
  children: React.ReactNode;
}

const CustomTabBarButton = ({
  children,
  ...props
}: CustomTabBarButtonProps) => {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        // @ts-ignore - We'll handle the style properly
        props.style,
        {
          backgroundColor: pressed ? `${palette.gold}20` : "transparent",
          opacity: pressed ? 0.8 : 1,
          borderRadius: 16,
          flex: 1,
        },
      ]}
      android_ripple={{
        color: `${palette.gold}20`,
        borderless: false,
        radius: 16,
      }}
    >
      {children}
    </Pressable>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // حساب الأبعاد الديناميكية
  const isSmallScreen = SCREEN_HEIGHT < 700;
  const BASE_HEIGHT = isSmallScreen ? 62 : 68;
  const ICON_SIZE = isSmallScreen ? 24 : 26;
  const FONT_SIZE = isSmallScreen ? 10 : 11;

  const tabBarHeight =
    Platform.OS === "ios"
      ? BASE_HEIGHT + insets.bottom
      : BASE_HEIGHT + Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.gold,
        tabBarInactiveTintColor: palette.slate,
        tabBarButton: (props) => <CustomTabBarButton {...props} />,

        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 0 : Math.max(insets.bottom - 40, -0),
          left: 16,
          right: 16,
          height: tabBarHeight,

          backgroundColor:
            Platform.OS === "ios"
              ? "rgba(13, 27, 42, 0.85)" // شفافية للـ iOS مع blur
              : palette.navyLight,

          borderTopWidth: 0,
          borderWidth: 1.5,
          borderColor: `${palette.gold}30`,

          borderRadius: 24,
          overflow: "hidden",

          paddingBottom: Platform.OS === "ios" ? insets.bottom + 4 : 12,
          paddingTop: 10,
          paddingHorizontal: 8,

          // ظلال متقدمة
          elevation: 20,
          shadowColor: palette.gold,
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
        },

        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : null,

        tabBarLabelStyle: {
          fontSize: FONT_SIZE,
          fontWeight: "800",
          marginTop: 4,
          marginBottom: 2,
          letterSpacing: 0.3,
          fontFamily: "NotoNaskhArabic-Bold",
        },

        tabBarIconStyle: {
          marginTop: 4,
        },

        tabBarItemStyle: {
          paddingVertical: 6,
          paddingHorizontal: 4,
          borderRadius: 16,
          marginHorizontal: 2,
        },
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: translations.profile,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={ICON_SIZE}
              color={focused ? palette.gold : color}
              style={{
                transform: [{ scale: focused ? 1.1 : 1 }],
              }}
            />
          ),
          tabBarLabelStyle: {
            fontSize: FONT_SIZE,
            fontWeight: "800",
            marginTop: 4,
            letterSpacing: 0.3,
            fontFamily: "NotoNaskhArabic-Bold",
          },
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: translations.chats,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={ICON_SIZE}
              color={focused ? palette.gold : color}
              style={{
                transform: [{ scale: focused ? 1.1 : 1 }],
              }}
            />
          ),
          tabBarBadge: undefined, // يمكن إضافة عدد الرسائل هنا
          tabBarLabelStyle: {
            fontSize: FONT_SIZE,
            fontWeight: "800",
            marginTop: 4,
            letterSpacing: 0.3,
            fontFamily: "NotoNaskhArabic-Bold",
          },
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: translations.notifications,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              size={ICON_SIZE}
              color={focused ? palette.gold : color}
              style={{
                transform: [{ scale: focused ? 1.1 : 1 }],
              }}
            />
          ),
          tabBarBadge: undefined, // يمكن إضافة عدد الإشعارات هنا
          tabBarLabelStyle: {
            fontSize: FONT_SIZE,
            fontWeight: "800",
            marginTop: 4,
            letterSpacing: 0.3,
            fontFamily: "NotoNaskhArabic-Bold",
          },
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: translations.cases,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "briefcase" : "briefcase-outline"}
              size={ICON_SIZE}
              color={focused ? palette.gold : color}
              style={{
                transform: [{ scale: focused ? 1.1 : 1 }],
              }}
            />
          ),
          tabBarLabelStyle: {
            fontSize: FONT_SIZE,
            fontWeight: "800",
            marginTop: 4,
            letterSpacing: 0.3,
            fontFamily: "NotoNaskhArabic-Bold",
          },
        }}
      />
    </Tabs>
  );
}
