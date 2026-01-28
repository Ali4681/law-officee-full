import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { subscribeToast, ToastMessage } from "@/utils/toast";

const palette = {
  navy: "#0A2436",
  darkNavy: "#061823",
  gold: "#C6A667",
  lightGold: "#D4B87D",
  error: "#ef4444",
  errorDark: "#dc2626",
  success: "#10b981",
  successDark: "#059669",
  info: "#0A2436",
  infoDark: "#061823",
  warning: "#f59e0b",
  warningDark: "#d97706",
};

export function ToastHost() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const progressWidth = useRef(new Animated.Value(100)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const dismissToast = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 280,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.85,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  };

  useEffect(() => {
    const unsubscribe = subscribeToast((t) => {
      setToast(t);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      progressWidth.setValue(100);
      iconScale.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.spring(iconScale, {
        toValue: 1,
        tension: 120,
        friction: 7,
        delay: 100,
        useNativeDriver: true,
      }).start();

      Animated.timing(progressWidth, {
        toValue: 0,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      timeoutRef.current = setTimeout(dismissToast, 3000);
    });
    return () => {
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [translateY, opacity, scale, progressWidth, iconScale]);

  if (!toast) return null;

  const getColors = () => {
    switch (toast.type) {
      case "error":
        return { bg: palette.error, bgDark: palette.errorDark };
      case "success":
        return { bg: palette.success, bgDark: palette.successDark };
      case "info":
        return { bg: palette.info, bgDark: palette.infoDark };
      default:
        return { bg: palette.info, bgDark: palette.infoDark };
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case "error":
        return "close-circle";
      case "success":
        return "checkmark-circle";
      case "info":
        return "information-circle";
      default:
        return "information-circle";
    }
  };

  const colors = getColors();
  const icon = getIcon();

  const progressInterpolation = progressWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }, { scale }],
          paddingTop: 12 + insets.top,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={dismissToast}
        style={[styles.toastCard, { backgroundColor: colors.bg }]}
      >
        <View style={styles.glassOverlay} />

        <View style={styles.content}>
          <Animated.View
            style={[
              styles.iconContainer,
              {
                backgroundColor: colors.bgDark,
                transform: [{ scale: iconScale }],
              },
            ]}
          >
            <Ionicons name={icon as any} size={24} color="#fff" />
          </Animated.View>

          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
              {toast.message}
            </Text>
          </View>

          <Pressable
            onPress={dismissToast}
            style={styles.closeButton}
            hitSlop={8}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.bgDark,
                width: progressInterpolation,
              },
            ]}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 12,
  },
  toastCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  progressBar: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  progressFill: {
    height: "100%",
  },
});
