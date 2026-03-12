import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Alert, Platform } from "react-native";
import "react-native-reanimated";

import { ToastHost } from "@/components/ToastHost";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { showToast } from "@/utils/toast";

// Conditionally import expo-notifications only if not in Expo Go
let Notifications: any = null;
if (Constants.appOwnership !== "expo") {
  Notifications = require("expo-notifications");
}

export const unstable_settings = {
  anchor: "sign-in",
};

const queryClient = new QueryClient();

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function NotificationListeners() {
  const qc = useQueryClient();

  useEffect(() => {
    if (!Notifications) return;

    if (!(Alert as any)._toastPatched) {
      const originalAlert = Alert.alert;
      (Alert as any)._toastPatched = true;
      Alert.alert = (title?: any, message?: any, buttons?: any) => {
        const isDestructive =
          Array.isArray(buttons) &&
          buttons.some((b: any) => b?.style === "destructive");
        const composed = [title, message].filter(Boolean).join(" — ");
        const shortMessage =
          composed.length > 140 ? `${composed.slice(0, 137)}...` : composed;
        showToast({
          message: shortMessage || "Notification",
          type: isDestructive ? "error" : "info",
        });

        // Fire first actionable callback to preserve flows when possible
        const primary =
          (Array.isArray(buttons) && buttons.find((b: any) => b?.onPress)) ||
          null;
        try {
          primary?.onPress?.();
        } catch (err) {
          console.log("Alert callback error", err);
        }

        return { dismiss: () => {} };
      };
    }

    // Ensure Android channel exists
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      }).catch(() => {});
    }

    const receivedSub = Notifications.addNotificationReceivedListener(
      (notif: any) => {
        const content = notif.request?.content || {};
        const title = content.title || "New notification";
        const body = content.body || title;
        showToast({ message: body, type: "info" });

        const data = content.data as any;
        if (data?.caseId) {
          qc.invalidateQueries({ queryKey: ["cases"] });
          qc.invalidateQueries({ queryKey: ["cases", data.caseId] });
        }
      },
    );

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        const data = (response.notification.request.content.data || {}) as any;
        if (data?.caseId) {
          qc.invalidateQueries({ queryKey: ["cases"] });
          qc.invalidateQueries({ queryKey: ["cases", data.caseId] });
        }
      },
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [qc]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack
          initialRouteName="sign-in"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="sign-in"
            options={{
              animation: "slide_from_left",
              fullScreenGestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="sign-up"
            options={{
              animation: "slide_from_right",
              fullScreenGestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="courts"
            options={{
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="(admin)"
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="(lawyer)"
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
        </Stack>
        <NotificationListeners />
        <ToastHost />
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
