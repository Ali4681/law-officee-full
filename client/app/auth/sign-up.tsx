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
import { useSignup } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFonts } from "expo-font";
// Disable RTL layout but keep text RTL
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

export default function SignUpScreen() {
  const colorScheme = useColorScheme();
  const { mutateAsync, isPending, error } = useSignup();
  const [fontsLoaded] = useFonts({
    NotoNaskhArabic: require("@/assets/fonts/NotoNaskhArabic-Regular.ttf"),
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [signedUp, setSignedUp] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const cardBackground =
    colorScheme === "dark" ? palette.navyLight : palette.light;
  const cardBorder = colorScheme === "dark" ? palette.navy : "#E5E5E5";
  const inputBg = colorScheme === "dark" ? palette.navy : "#FFFFFF";
  const inputBorder = colorScheme === "dark" ? palette.slate : "#D1D5DB";
  const textColor = colorScheme === "dark" ? palette.light : palette.navy;

  const handleSubmit = async () => {
    if (signedUp) {
      router.replace("/auth/sign-in");
      return;
    }

    if (!email || !password) {
      setLocalError("البريد الإلكتروني وكلمة المرور مطلوبان");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError("الرجاء إدخال عنوان بريد إلكتروني صحيح");
      return;
    }

    if (password.length < 8) {
      setLocalError("يجب أن تكون كلمة المرور 8 أحرف على الأقل");
      return;
    }

    setLocalError(null);
    setSuccessMessage(null);
    const profilePayload: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    } = {};
    if (firstName.trim()) profilePayload.firstName = firstName.trim();
    if (lastName.trim()) profilePayload.lastName = lastName.trim();
    if (phone.trim()) profilePayload.phone = phone.trim();
    try {
      await mutateAsync({
        email,
        password,
        role: "client",
        profile: Object.keys(profilePayload).length
          ? profilePayload
          : undefined,
      });
      setSuccessMessage("تم إنشاء الحساب بنجاح. الرجاء تسجيل الدخول للمتابعة.");
      setSignedUp(true);
      router.replace("/cases");
    } catch (err: any) {
      setLocalError(err?.message ?? "تعذر إنشاء الحساب");
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
        {/* Hero Section */}
        <View style={[styles.hero, { backgroundColor: palette.navy }]}>
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
              style={[styles.heroTitle, { fontFamily: "NotoNaskhArabic" }]}
            >
              إنشاء حساب
            </ThemedText>
            <ThemedText
              style={[styles.heroSubtitle, { fontFamily: "NotoNaskhArabic" }]}
            >
              التسجيل كعميل للوصول إلى الخدمات القانونية
            </ThemedText>

            {/* Decorative Elements */}
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
        </View>

        {/* Sign Up Card */}
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
              تسجيل العميل
            </ThemedText>
            <View
              style={[styles.accentLine, { backgroundColor: palette.gold }]}
            />
            <ThemedText
              style={[
                styles.cardSubtitle,
                { color: palette.slate, fontFamily: "NotoNaskhArabic" },
              ]}
            >
              جميع الحقول مطلوبة لإنشاء الحساب
            </ThemedText>
          </View>

          {/* Name Fields Row - First Name on Right, Last Name on Left */}
          <View style={styles.dualRow}>
            <View style={[styles.field, styles.flexItem]}>
              <ThemedText
                style={[
                  styles.label,
                  { color: textColor, fontFamily: "NotoNaskhArabic" },
                ]}
              >
                الاسم الأول
              </ThemedText>
              <View style={styles.inputContainer}>
                <TextInput
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    if (localError) setLocalError(null);
                  }}
                  onFocus={() => setFirstNameFocused(true)}
                  onBlur={() => setFirstNameFocused(false)}
                  placeholder="أحمد"
                  placeholderTextColor={palette.slate}
                  style={getInputStyle(firstNameFocused)}
                />
                {firstNameFocused && (
                  <View
                    style={[
                      styles.focusIndicator,
                      { backgroundColor: palette.gold },
                    ]}
                  />
                )}
              </View>
            </View>

            <View style={[styles.field, styles.flexItem]}>
              <ThemedText
                style={[
                  styles.label,
                  { color: textColor, fontFamily: "NotoNaskhArabic" },
                ]}
              >
                اسم العائلة
              </ThemedText>
              <View style={styles.inputContainer}>
                <TextInput
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text);
                    if (localError) setLocalError(null);
                  }}
                  onFocus={() => setLastNameFocused(true)}
                  onBlur={() => setLastNameFocused(false)}
                  placeholder="محمد"
                  placeholderTextColor={palette.slate}
                  style={getInputStyle(lastNameFocused)}
                />
                {lastNameFocused && (
                  <View
                    style={[
                      styles.focusIndicator,
                      { backgroundColor: palette.gold },
                    ]}
                  />
                )}
              </View>
            </View>
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

          {/* Phone Field */}
          <View style={styles.field}>
            <ThemedText
              style={[
                styles.label,
                { color: textColor, fontFamily: "NotoNaskhArabic" },
              ]}
            >
              رقم الهاتف
            </ThemedText>
            <View style={styles.inputContainer}>
              <TextInput
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (localError) setLocalError(null);
                }}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                keyboardType="phone-pad"
                placeholder="+966 50 123 4567"
                placeholderTextColor={palette.slate}
                style={getInputStyle(phoneFocused)}
              />
              {phoneFocused && (
                <View
                  style={[
                    styles.focusIndicator,
                    { backgroundColor: palette.gold },
                  ]}
                />
              )}
            </View>
            <ThemedText
              style={[
                styles.helperText,
                { color: palette.slate, fontFamily: "NotoNaskhArabic" },
              ]}
            >
              اختياري، لكنه يساعد محاميك في الوصول إليك بسرعة
            </ThemedText>
          </View>

          {/* Password Field */}
          <View style={styles.field}>
            <View style={[styles.labelRow, { direction: "rtl" as any }]}>
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
                placeholder="8 أحرف على الأقل"
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
                <ThemedText style={{ color: palette.slate, fontSize: 16 }}>
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </ThemedText>
              </Pressable>
            </View>
            <ThemedText
              style={[
                styles.helperText,
                { color: palette.slate, fontFamily: "NotoNaskhArabic" },
              ]}
            >
              يجب أن تكون 8 أحرف على الأقل
            </ThemedText>
          </View>

          {/* Success Message */}
          {successMessage && (
            <View
              style={[
                styles.successContainer,
                { backgroundColor: "#D1FAE5", borderColor: "#059669" },
              ]}
            >
              <View
                style={[styles.successIcon, { backgroundColor: "#059669" }]}
              >
                <ThemedText
                  style={{ color: "#FFF", fontSize: 12, fontWeight: "bold" }}
                >
                  ✓
                </ThemedText>
              </View>
              <ThemedText
                style={[styles.successText, { fontFamily: "NotoNaskhArabic" }]}
              >
                {successMessage}
              </ThemedText>
            </View>
          )}

          {/* Error Message */}
          {(localError || error) && (
            <View style={styles.errorContainer}>
              <View style={styles.errorIcon}>
                <ThemedText
                  style={{ color: "#FFF", fontSize: 12, fontWeight: "bold" }}
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
              {signedUp
                ? "الذهاب لتسجيل الدخول"
                : isPending
                  ? "جاري إنشاء الحساب..."
                  : "إنشاء حساب"}
            </ThemedText>
            <ThemedText style={styles.buttonArrow}>
              {signedUp ? "→" : "✓"}
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
              مسجل بالفعل؟
            </ThemedText>
            <View
              style={[styles.dividerLine, { backgroundColor: inputBorder }]}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Link href="/auth/sign-in" asChild>
              <Pressable style={styles.signInButton}>
                <ThemedText
                  style={[
                    styles.signInText,
                    { color: palette.gold, fontFamily: "NotoNaskhArabic" },
                  ]}
                >
                  تسجيل الدخول إلى حساب موجود
                </ThemedText>
              </Pressable>
            </Link>
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
    paddingBottom: 40,
  },
  hero: {
    borderRadius: 24,
    overflow: "hidden",
    minHeight: 240,
  },
  heroContent: {
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  logoContainer: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  heroSubtitle: {
    color: palette.goldLight,
    fontSize: 15,
    opacity: 0.9,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  decorativeDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.3,
  },
  dot1: { top: 30, right: 40 },
  dot2: { bottom: 40, left: 30 },
  dot3: { top: 50, left: 50 },
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
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
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
  dualRow: {
    flexDirection: "row-reverse",
    gap: 12,
  },
  flexItem: {
    flex: 1,
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
  helperText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
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
    top: 12,
    padding: 4,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
  },
  successIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  successText: {
    color: "#047857",
    fontWeight: "600",
    fontSize: 13,
    flex: 1,
    textAlign: "right",
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
    alignItems: "center",
  },
  signInButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  signInText: {
    fontWeight: "700",
    fontSize: 15,
    textAlign: "center",
  },
});
