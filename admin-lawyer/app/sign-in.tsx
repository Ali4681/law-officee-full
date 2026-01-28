import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { Link, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthService } from "@/services/auth.service";
import { showToast } from "@/utils/toast";

const { width } = Dimensions.get("window");

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  lightGray: "#F2F2F2",
  slate: "#566375",
};

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const errorAnim = useRef(new Animated.Value(-140)).current;
  const hideErrorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerDevicePushToken = async () => {
    try {
      if (Constants.appOwnership === "expo") {
        console.log(
          "Running in Expo Go; attempting token fetch but remote push may be limited."
        );
      }

      const projectId =
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
        process.env.EXPO_PUBLIC_PROJECT_ID ||
        Constants?.easConfig?.projectId ||
        (Constants?.expoConfig as any)?.extra?.eas?.projectId;
      if (projectId) {
        console.log("Push token projectId resolved:", projectId);
      } else {
        console.log(
          "Expo push token skipped: set EXPO_PUBLIC_EAS_PROJECT_ID or EAS projectId in config."
        );
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      console.log("Push permission status:", existingStatus);
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.log("Push token skipped: permission not granted.");
        return null;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      const deviceToken = await Notifications.getDevicePushTokenAsync();
      if (deviceToken?.data) {
        console.log(
          `Device push token (${deviceToken.type}):`,
          deviceToken.data
        );
      }

      let expoToken: string | null = null;
      if (projectId) {
        try {
          expoToken = (
            await Notifications.getExpoPushTokenAsync({
              projectId,
            })
          ).data;
          console.log("Expo push token:", expoToken);
        } catch (expoTokenError) {
          console.log("Expo push token fetch failed", expoTokenError);
        }
      }

      const finalToken = expoToken ?? deviceToken?.data ?? null;

      if (finalToken) {
        try {
          await AuthService.registerDeviceToken({
            deviceToken: finalToken,
            deviceId: Constants.deviceId,
            platform: Platform.OS,
          });
          console.log("Registered device token with backend");
        } catch (registerErr) {
          console.log("Failed to register device token with backend", registerErr);
        }
      }

      return finalToken;
    } catch (pushError) {
      console.log("Failed to fetch device token", pushError);
      return null;
    }
  };

  const showErrorBanner = (message: string) => {
    setErrorMessage(message);
    if (hideErrorTimeout.current) {
      clearTimeout(hideErrorTimeout.current);
    }

    Animated.timing(errorAnim, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    hideErrorTimeout.current = setTimeout(() => {
      Animated.timing(errorAnim, {
        toValue: -140,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if (hideErrorTimeout.current) {
        clearTimeout(hideErrorTimeout.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      showToast({ message: "Please enter both email and password.", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await AuthService.login({
        email: email.trim(),
        password,
      });

      await registerDevicePushToken();

      if (res.role === "admin") {
        showToast({ message: "Signed in successfully.", type: "success" });
        router.replace("/(admin)/courts");
      } else if (res.role == "lawyer") {
        router.replace("/(lawyer)/cases");
      } else {
        showToast({
          message: "Access restricted: Only admins and lawyers can access this app.",
          type: "error",
        });
        router.replace("/sign-in");
      }
    } catch (error: unknown) {
      const message =
        (error as any)?.response?.data?.message ??
        (error as Error).message ??
        "Unable to sign in. Please try again.";
      showToast({ message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <LinearGradient
          colors={[palette.navy, "#0d2e47", palette.navy]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View
            style={[
              styles.errorBanner,
              { transform: [{ translateY: errorAnim }] },
            ]}
          >
            <View style={styles.errorBadge}>
              <Ionicons name="warning" size={16} color={palette.navy} />
            </View>
            <View style={styles.errorTextWrap}>
              <Text style={styles.errorTitle}>Sign-in issue</Text>
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            </View>
            <Pressable
              hitSlop={10}
              onPress={() => {
                Animated.timing(errorAnim, {
                  toValue: -140,
                  duration: 180,
                  easing: Easing.in(Easing.cubic),
                  useNativeDriver: true,
                }).start();
              }}
            >
              <Ionicons name="close" size={18} color={palette.navy} />
            </Pressable>
          </Animated.View>

          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Decorative elements */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />

            {/* Main Card */}
            <View style={styles.card}>
              <View style={styles.cardGlow} />

              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <View style={styles.logoCircle}>
                    <Text style={styles.logoText}>⚖</Text>
                  </View>
                </View>
                <Text style={styles.heading}>Welcome Back</Text>
                <Text style={styles.subheading}>
                  Sign in to access your legal workspace
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.field}>
                  <Text style={styles.label}>Email Address</Text>
                  <Pressable
                    onPress={() => emailInputRef.current?.focus()}
                    style={({ pressed }) => [
                      styles.inputContainer,
                      emailFocused && styles.inputContainerFocused,
                      pressed && styles.inputContainerPressed,
                    ]}
                  >
                    <Text style={styles.inputIcon}>✉</Text>
                    <TextInput
                      ref={emailInputRef}
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      placeholder="you@lawoffice.com"
                      placeholderTextColor={palette.slate}
                      style={styles.input}
                      editable
                      returnKeyType="next"
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                    />
                  </Pressable>
                </View>

                <View style={styles.field}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Password</Text>
                  </View>
                  <Pressable
                    onPress={() => passwordInputRef.current?.focus()}
                    style={({ pressed }) => [
                      styles.inputContainer,
                      passwordFocused && styles.inputContainerFocused,
                      pressed && styles.inputContainerPressed,
                    ]}
                  >
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      ref={passwordInputRef}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      secureTextEntry={!showPassword}
                      placeholder="Enter your password"
                      placeholderTextColor={palette.slate}
                      style={styles.input}
                      editable
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      style={({ pressed }) => [
                        styles.eyeButton,
                        pressed && styles.eyeButtonPressed,
                      ]}
                      hitSlop={10}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color={palette.slate}
                      />
                    </Pressable>
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleSubmit}
                  style={({ pressed }) => [
                    styles.submitButton,
                    isSubmitting && styles.disabledButton,
                    pressed && styles.buttonPressed,
                  ]}
                  disabled={isSubmitting}
                >
                  <LinearGradient
                    colors={[palette.gold, "#d4b87a", palette.gold]}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={palette.navy} />
                    ) : (
                      <>
                        <Text style={styles.submitButtonText}>Sign In</Text>
                        <Text style={styles.buttonArrow}>→</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Link href="/sign-up" asChild>
                  <Pressable
                    style={({ pressed }) => [
                      styles.signupButton,
                      pressed && styles.signupButtonPressed,
                    ]}
                  >
                    <View style={styles.signupContent}>
                      <View style={styles.signupIconContainer}>
                        <Text style={styles.signupIcon}>✨</Text>
                      </View>
                      <View style={styles.signupTextContainer}>
                        <Text style={styles.signupText}>Sign Up</Text>
                        <Text style={styles.signupSubtext}>
                          Create your account and get started
                        </Text>
                      </View>
                      <Text style={styles.signupArrow}>→</Text>
                    </View>
                  </Pressable>
                </Link>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.navy,
  },
  keyboardAvoid: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingTop: 40,
    minHeight: Dimensions.get("window").height - 100,
  },
  decorativeCircle1: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: palette.gold,
    opacity: 0.05,
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: -150,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: palette.gold,
    opacity: 0.03,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 28,
    padding: 32,
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 10,
    position: "relative",
    overflow: "hidden",
  },
  cardGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: palette.gold,
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    gap: 12,
  },
  logoContainer: {
    marginBottom: 8,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.navy,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    color: palette.navy,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 15,
    color: palette.slate,
    textAlign: "center",
    lineHeight: 22,
  },
  formContainer: {
    gap: 20,
  },
  field: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.navy,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  forgotText: {
    fontSize: 13,
    color: palette.gold,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.lightGray,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  inputContainerFocused: {
    borderColor: palette.gold,
    backgroundColor: "#fff",
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  inputContainerPressed: {
    opacity: 0.95,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: palette.navy,
  },
  eyeButton: {
    paddingHorizontal: 4,
  },
  eyeButtonPressed: {
    opacity: 0.6,
  },
  errorBanner: {
    position: "absolute",
    top: 12,
    left: 20,
    right: 20,
    zIndex: 30,
    backgroundColor: `${palette.gold}F0`,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 1,
    borderColor: `${palette.navy}20`,
  },
  errorBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  errorTextWrap: {
    flex: 1,
    gap: 2,
  },
  errorTitle: {
    color: palette.navy,
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  errorMessage: {
    color: palette.navy,
    fontSize: 12,
  },
  submitButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 8,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  submitButtonText: {
    color: palette.navy,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  buttonArrow: {
    fontSize: 20,
    color: palette.navy,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: `${palette.slate}30`,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.slate,
  },
  signupButton: {
    borderWidth: 2,
    borderColor: palette.navy,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "transparent",
    position: "relative",
  },
  signupButtonPressed: {
    backgroundColor: `${palette.navy}08`,
    transform: [{ scale: 0.98 }],
  },
  signupContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 14,
  },
  signupIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${palette.gold}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  signupIcon: {
    fontSize: 20,
  },
  signupTextContainer: {
    flex: 1,
    gap: 2,
  },
  signupText: {
    color: palette.navy,
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  signupSubtext: {
    color: palette.slate,
    fontSize: 12,
    fontWeight: "500",
  },
  signupArrow: {
    fontSize: 22,
    color: palette.navy,
    fontWeight: "600",
  },
  footerText: {
    fontSize: 12,
    color: palette.slate,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
  },
});
