import { useFonts } from "expo-font";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useLogin } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Enable RTL layout
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  light: "#F2F2F2",
  slate: "#566375",
  navyLight: "#1A3650",
  goldLight: "#D8C190",
};

export default function SignInScreen() {
  const colorScheme = useColorScheme();
  const { mutateAsync, isPending, error } = useLogin();
  const [fontsLoaded] = useFonts({
    NotoNaskhArabic: require("@/assets/fonts/NotoNaskhArabic-Regular.ttf"),
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const cardBackground =
    colorScheme === "dark" ? palette.navyLight : palette.light;
  const cardBorder = colorScheme === "dark" ? palette.navy : "#E5E5E5";
  const inputBg = colorScheme === "dark" ? palette.navy : "#FFFFFF";
  const inputBorder = colorScheme === "dark" ? palette.slate : "#D1D5DB";
  const textColor = colorScheme === "dark" ? palette.light : palette.navy;

  const handleSubmit = async () => {
    if (!email || !password) {
      setLocalError("البريد الإلكتروني وكلمة المرور مطلوبان");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError("الرجاء إدخال عنوان بريد إلكتروني صحيح");
      return;
    }

    setLocalError(null);
    try {
      const result = await mutateAsync({ email, password });
      const token =
        (result as any)?.accessToken ??
        (result as any)?.token ??
        (result as any)?.access_token;
      if (token) {
        console.log("Client token:", token);
      }
      const role = (result as any)?.user?.role ?? (result as any)?.role;
      if (role && role !== "client") {
        setLocalError("يمكن لحسابات العملاء فقط تسجيل الدخول هنا.");
        return;
      }
      router.replace("/(tabs)");
    } catch (err: any) {
      setLocalError(err?.message ?? "تعذر تسجيل الدخول");
    }
  };

  const getInputStyle = (isFocused: boolean) => [
    styles.input,
    {
      backgroundColor: inputBg,
      borderColor: isFocused ? palette.gold : inputBorder,
      borderWidth: isFocused ? 2 : 1,
      color: textColor,
      textAlign: "right" as const,
      fontFamily: "NotoNaskhArabic",
    },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Gradient Effect */}
        <View style={[styles.hero, { backgroundColor: palette.navy }]}>
          {/* Decorative Elements - Background Layer */}
          <View style={styles.decorativeBackground}>
            <View
              style={[
                styles.decorativeDot,
                styles.dot1,
                { backgroundColor: palette.gold },
              ]}
            />
            <View
              style={[
                styles.decorativeDot,
                styles.dot2,
                { backgroundColor: palette.goldLight },
              ]}
            />
            <View
              style={[
                styles.decorativeDot,
                styles.dot3,
                { backgroundColor: palette.gold },
              ]}
            />
          </View>

          {/* Content Layer */}
          <View style={styles.heroContent}>
            <View style={styles.logoContainer}>
              <View style={[styles.logoRing, { borderColor: palette.gold }]} />
              <View
                style={[
                  styles.logoRingInner,
                  { borderColor: palette.goldLight },
                ]}
              />
            </View>

            <ThemedText
              type="title"
              style={[styles.heroTitle, { zIndex: 2000 }]}
            >
              مرحباً بعودتك
            </ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              الدخول الآمن لبوابة العملاء
            </ThemedText>
          </View>
        </View>

        {/* Sign In Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: cardBackground,
              borderColor: cardBorder,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <ThemedText
              type="subtitle"
              style={[
                styles.cardTitle,
                { color: textColor, fontFamily: "NotoNaskhArabic" },
              ]}
            >
              تسجيل الدخول
            </ThemedText>
            <View
              style={[styles.accentLine, { backgroundColor: palette.gold }]}
            />
          </View>

          {/* Email Field */}
          <View style={styles.field}>
            <ThemedText
              style={[
                styles.label,
                { color: textColor, fontFamily: "NotoNaskhArabic" },
              ]}
            >
              البريد الإلكتروني
            </ThemedText>
            <View style={styles.inputContainer}>
              <TextInput
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (localError) setLocalError(null);
                }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="example@domain.com"
                placeholderTextColor={palette.slate}
                style={getInputStyle(emailFocused)}
              />
              {emailFocused && (
                <View
                  style={[
                    styles.focusIndicator,
                    { backgroundColor: palette.gold },
                  ]}
                />
              )}
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.field}>
            <View
              style={[
                styles.labelRow,
                {
                  direction: "rtl" as any,
                  zIndex: 1,
                  position: "relative" as any,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.label,
                  { color: textColor, fontFamily: "NotoNaskhArabic" },
                ]}
              >
                كلمة المرور
              </ThemedText>
            </View>
            <View style={[styles.inputContainer, { direction: "rtl" as any }]}>
              <TextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (localError) setLocalError(null);
                }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                placeholder="أدخل كلمة المرور"
                placeholderTextColor={palette.slate}
                style={getInputStyle(passwordFocused)}
              />
              {passwordFocused && (
                <View
                  style={[
                    styles.focusIndicator,
                    { backgroundColor: palette.gold },
                  ]}
                />
              )}
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <ThemedText
                  style={{
                    color: palette.slate,
                    fontSize: 12,
                    fontFamily: "NotoNaskhArabic",
                  }}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Error Message */}
          {(localError || error) && (
            <View style={styles.errorContainer}>
              <View style={styles.errorIcon}>
                <ThemedText
                  style={{
                    color: "#FFF",
                    fontSize: 12,
                    fontWeight: "bold",
                    fontFamily: "NotoNaskhArabic",
                  }}
                >
                  !
                </ThemedText>
              </View>
              <ThemedText
                style={[styles.errorText, { fontFamily: "NotoNaskhArabic" }]}
              >
                {localError ?? (error as Error)?.message ?? "حدث خطأ ما"}
              </ThemedText>
            </View>
          )}

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={isPending}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: palette.gold,
                opacity: pressed ? 0.85 : isPending ? 0.6 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <ThemedText
              style={[styles.buttonText, { fontFamily: "NotoNaskhArabic" }]}
            >
              {isPending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </ThemedText>
            <ThemedText
              style={[styles.buttonArrow, { fontFamily: "NotoNaskhArabic" }]}
            >
              →
            </ThemedText>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View
              style={[styles.dividerLine, { backgroundColor: inputBorder }]}
            />
            <ThemedText
              style={[
                styles.dividerText,
                { color: palette.slate, fontFamily: "NotoNaskhArabic" },
              ]}
            >
              أو
            </ThemedText>
            <View
              style={[styles.dividerLine, { backgroundColor: inputBorder }]}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Link href="/auth/sign-up" asChild>
              <Pressable style={styles.signUpButton}>
                <ThemedText
                  style={[
                    styles.signUpText,
                    { color: palette.gold, fontFamily: "NotoNaskhArabic" },
                  ]}
                >
                  إنشاء حساب
                </ThemedText>
              </Pressable>
            </Link>
            <ThemedText
              style={[{ color: palette.slate, fontFamily: "NotoNaskhArabic" }]}
            >
              جديد على منصتنا؟
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 85,
    gap: 24,
  },
  hero: {
    borderRadius: 24,
    overflow: "hidden",
    minHeight: 220,
    position: "relative" as any,
  },
  decorativeBackground: {
    position: "absolute" as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  heroContent: {
    padding: 10,
    alignItems: "center",
    gap: 12,
    position: "relative" as any,
    zIndex: 999,
  },
  logoContainer: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    zIndex: 1000,
    position: "relative" as any,
  },
  logoRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    opacity: 0.6,
  },
  logoRingInner: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    opacity: 0.8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
    writingDirection: "rtl" as any,
    fontFamily: "NotoNaskhArabic",
    marginTop: 10,
    zIndex: 1000,
    position: "relative" as any,
  },
  heroSubtitle: {
    color: palette.goldLight,
    fontSize: 15,
    opacity: 0.9,
    letterSpacing: 0.3,
    textAlign: "center",
    writingDirection: "rtl" as any,
    fontFamily: "NotoNaskhArabic",
    zIndex: 1000,
    position: "relative" as any,
  },
  decorativeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.3,
  },
  dot1: { top: 30, right: 40, position: "absolute" as any, zIndex: 0 },
  dot2: { bottom: 40, left: 30, position: "absolute" as any, zIndex: 0 },
  dot3: { top: 50, left: 50, position: "absolute" as any, zIndex: 0 },
  card: {
    borderRadius: 24,
    padding: 24,
    gap: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  cardHeader: {
    gap: 8,
    marginBottom: 8,
    alignItems: "flex-end",
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "right",
  },
  accentLine: {
    width: 40,
    height: 3,
    borderRadius: 2,
  },
  field: {
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontWeight: "600",
    fontSize: 14,
    letterSpacing: 0.2,
    textAlign: "right",
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: "600",
  },
  inputContainer: {
    position: "relative",
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "500",
  },
  focusIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  eyeIcon: {
    position: "absolute",
    left: 16,
    top: 14,
    padding: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#DC2626",
  },
  errorIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#991B1B",
    fontWeight: "600",
    fontSize: 13,
    flex: 1,
    textAlign: "right",
  },
  button: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: palette.navy,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  buttonArrow: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
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
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  signUpButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  signUpText: {
    fontWeight: "700",
    fontSize: 15,
    textAlign: "center",
  },
  securityBadge: {
    alignItems: "center",
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  securityText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
