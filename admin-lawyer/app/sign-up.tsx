import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { SignupDto } from "@/types/auth";
import { showToast } from "@/utils/toast";

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  lightGray: "#F2F2F2",
  slate: "#566375",
};

interface SignupFormState {
  firstName: string;
  lastName: string;
  specialization: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const initialState: SignupFormState = {
  firstName: "",
  lastName: "",
  specialization: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function SignUpScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [form, setForm] = useState<SignupFormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPasswordRequirements, setShowPasswordRequirements] =
    useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [certificate, setCertificate] = useState<{
    uri: string;
    name: string;
    type?: string | null;
  } | null>(null);

  const canSubmit = useMemo(() => {
    return (
      !!form.email.trim() &&
      !!form.password &&
      !!form.confirmPassword &&
      form.password === form.confirmPassword &&
      !!certificate &&
      !emailError &&
      passwordStrength >= 50
    );
  }, [form, emailError, passwordStrength, certificate]);

  const handleInput = (key: keyof SignupFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));

    if (key === "email") {
      validateEmail(value);
    } else if (key === "password") {
      calculatePasswordStrength(value);
      validatePassword(value);
    }
  };

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError("");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError("");
      return;
    }

    const requirements = [];
    if (password.length < 8) requirements.push("at least 8 characters");
    if (!/[a-z]/.test(password)) requirements.push("a lowercase letter");
    if (!/[A-Z]/.test(password)) requirements.push("an uppercase letter");
    if (!/[0-9]/.test(password)) requirements.push("a number");
    if (!/[^a-zA-Z0-9]/.test(password))
      requirements.push("a special character");

    if (requirements.length > 0) {
      setPasswordError(`Password needs: ${requirements.join(", ")}`);
    } else {
      setPasswordError("");
    }
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 20;
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 15;
    setPasswordStrength(strength);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 25) return "#ef4444";
    if (passwordStrength <= 50) return "#f97316";
    if (passwordStrength <= 75) return "#eab308";
    return "#22c55e";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 25) return "Weak";
    if (passwordStrength <= 50) return "Fair";
    if (passwordStrength <= 75) return "Good";
    return "Strong";
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      showToast({
        message:
          form.password !== form.confirmPassword
            ? "Password and confirmation must match."
            : "Email and password are required.",
        type: "error",
      });
      return;
    }

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const profile =
      firstName || lastName
        ? {
            firstName: firstName || undefined,
            lastName: lastName || undefined,
          }
        : undefined;

    const payload: SignupDto = {
      email: form.email.trim(),
      password: form.password,
      role: "lawyer",
      profile,
      specialization: form.specialization.trim() || undefined,
    };

    try {
      setIsSubmitting(true);
      if (!certificate) {
        showToast({
          message:
            "You must upload your accreditation certificate to register.",
          type: "error",
        });
        return;
      }

      await AuthService.signup({
        ...payload,
        certificateFile: certificate,
      });
      showToast({
        message:
          "You have been registered as a lawyer. Please wait for admin approval before signing in.",
        type: "success",
      });
      Alert.alert("Signed Up", "Your account has been created successfully.");
      router.replace("/sign-in");
      setForm(initialState);
      setCertificate(null);
    } catch (error: unknown) {
      const message =
        (error as any)?.response?.data?.message ??
        (error as Error).message ??
        "Unable to complete your registration.";
      showToast({ message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickCertificate = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: "*/*",
      });
      if (res.canceled) return;
      const file = res.assets?.[0];
      if (!file) return;
      setCertificate({
        uri: file.uri,
        name:
          file.name?.includes(".") && file.name.length > 0
            ? file.name
            : `certificate-${Date.now()}.pdf`,
        type: file.mimeType || "application/pdf",
      });
    } catch (err) {
      showToast({
        message: "Could not pick the certificate, please try again.",
        type: "error",
      });
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
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
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
                <Text style={styles.heading}>Join Our Team</Text>
              </View>

              <View style={styles.formContainer}>
                {/* Name Fields */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                  <Text style={styles.sectionSubtitle}>
                    Let us know who you are
                  </Text>
                </View>

                <View style={styles.inlineRow}>
                  <View style={styles.field}>
                    <Text style={styles.label}>First Name</Text>
                    <Pressable
                      onPress={() => {}}
                      style={[
                        styles.inputContainer,
                        focusedField === "firstName" &&
                          styles.inputContainerFocused,
                      ]}
                    >
                      <Text style={styles.inputIcon}>👤</Text>
                      <TextInput
                        placeholder="Nour"
                        value={form.firstName}
                        onChangeText={(value) =>
                          handleInput("firstName", value)
                        }
                        onFocus={(e) => {
                          setFocusedField("firstName");
                          setTimeout(() => {
                            scrollViewRef.current?.scrollTo({
                              y: 100,
                              animated: true,
                            });
                          }, 100);
                        }}
                        onBlur={() => setFocusedField(null)}
                        placeholderTextColor={palette.slate}
                        style={styles.input}
                        editable={true}
                      />
                    </Pressable>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Last Name</Text>
                    <Pressable
                      onPress={() => {}}
                      style={[
                        styles.inputContainer,
                        focusedField === "lastName" &&
                          styles.inputContainerFocused,
                      ]}
                    >
                      <Text style={styles.inputIcon}>👤</Text>
                      <TextInput
                        placeholder="Khalil"
                        value={form.lastName}
                        onChangeText={(value) => handleInput("lastName", value)}
                        onFocus={(e) => {
                          setFocusedField("lastName");
                          setTimeout(() => {
                            scrollViewRef.current?.scrollTo({
                              y: 100,
                              animated: true,
                            });
                          }, 100);
                        }}
                        onBlur={() => setFocusedField(null)}
                        placeholderTextColor={palette.slate}
                        style={styles.input}
                        editable={true}
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Email Field */}
                <View style={styles.field}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Email Address</Text>
                  </View>
                  <Pressable
                    onPress={() => {}}
                    style={[
                      styles.inputContainer,
                      focusedField === "email" && styles.inputContainerFocused,
                      emailError && form.email && styles.inputContainerError,
                    ]}
                  >
                    <Text style={styles.inputIcon}>✉</Text>
                    <TextInput
                      value={form.email}
                      onChangeText={(value) => handleInput("email", value)}
                      onFocus={(e) => {
                        setFocusedField("email");
                        setTimeout(() => {
                          scrollViewRef.current?.scrollTo({
                            y: 200,
                            animated: true,
                          });
                        }, 100);
                      }}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      placeholder="you@lawoffice.com"
                      placeholderTextColor={palette.slate}
                      style={styles.input}
                      editable={true}
                    />
                    {form.email && !emailError && (
                      <Text style={styles.checkIcon}>✓</Text>
                    )}
                  </Pressable>
                  {emailError && form.email && (
                    <Text style={styles.errorText}>⚠ {emailError}</Text>
                  )}
                </View>

                {/* Specialization Field */}
                <View style={styles.field}>
                  <Text style={styles.label}>Practice Areas</Text>
                  <Pressable
                    onPress={() => {}}
                    style={[
                      styles.inputContainer,
                      styles.textAreaContainer,
                      focusedField === "specialization" &&
                        styles.inputContainerFocused,
                    ]}
                  >
                    <Text style={[styles.inputIcon, styles.textAreaIcon]}>
                      ⚖
                    </Text>
                    <TextInput
                      value={form.specialization}
                      onChangeText={(value) =>
                        handleInput("specialization", value)
                      }
                      onFocus={(e) => {
                        setFocusedField("specialization");
                        setTimeout(() => {
                          scrollViewRef.current?.scrollTo({
                            y: 350,
                            animated: true,
                          });
                        }, 100);
                      }}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Family law, Real estate, Corporate"
                      placeholderTextColor={palette.slate}
                      style={[styles.input, styles.textArea]}
                      multiline
                      editable={true}
                    />
                  </Pressable>
                  <Text style={styles.helperText}>
                    Tip: Describe your practice areas however you like
                  </Text>
                </View>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>SECURITY</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Certificate Upload */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Certification Document (Required)
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Upload a PDF or image of your accreditation certificate to
                    complete your registration as a lawyer
                  </Text>
                </View>
                <Pressable
                  onPress={handlePickCertificate}
                  style={({ pressed }) => [
                    styles.uploadBtn,
                    pressed && styles.uploadBtnPressed,
                  ]}
                >
                  <Ionicons
                    name="document-attach"
                    size={18}
                    color={palette.navy}
                  />
                  <Text style={styles.uploadText}>
                    {certificate ? "Change certificate" : "Upload certificate"}
                  </Text>
                </Pressable>
                {certificate && (
                  <View style={styles.certificateRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#22c55e"
                    />
                    <Text style={styles.certificateName} numberOfLines={1}>
                      {certificate.name}
                    </Text>
                    <Pressable
                      onPress={() => setCertificate(null)}
                      style={({ pressed }) => [
                        styles.removeCertBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </Pressable>
                  </View>
                )}

                {/* Password Fields */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Account Security</Text>
                  <Text style={styles.sectionSubtitle}>
                    Choose a strong password
                  </Text>
                </View>

                <View style={styles.field}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Password</Text>
                  </View>
                  <Pressable
                    onPress={() => {}}
                    style={[
                      styles.inputContainer,
                      focusedField === "password" &&
                        styles.inputContainerFocused,
                      passwordError &&
                        form.password &&
                        styles.inputContainerError,
                    ]}
                  >
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      value={form.password}
                      onChangeText={(value) => handleInput("password", value)}
                      onFocus={(e) => {
                        setFocusedField("password");
                        setShowPasswordRequirements(true);
                        setTimeout(() => {
                          scrollViewRef.current?.scrollTo({
                            y: 550,
                            animated: true,
                          });
                        }, 100);
                      }}
                      onBlur={() => {
                        setFocusedField(null);
                        setShowPasswordRequirements(false);
                      }}
                      secureTextEntry={!showPassword}
                      placeholder="Enter strong password"
                      placeholderTextColor={palette.slate}
                      style={styles.input}
                      editable={true}
                    />
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={10}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color={palette.slate}
                      />
                    </Pressable>
                  </Pressable>

                  {/* Password Requirements */}
                  {showPasswordRequirements && (
                    <View style={styles.passwordRequirementsBox}>
                      <Text style={styles.passwordRequirementsTitle}>
                        Password must contain:
                      </Text>
                      <View style={styles.requirementsList}>
                        <View style={styles.requirementItem}>
                          <Text
                            style={[
                              styles.requirementIcon,
                              form.password.length >= 8 &&
                                styles.requirementMet,
                            ]}
                          >
                            {form.password.length >= 8 ? "✓" : "○"}
                          </Text>
                          <Text
                            style={[
                              styles.requirementText,
                              form.password.length >= 8 &&
                                styles.requirementTextMet,
                            ]}
                          >
                            At least 8 characters
                          </Text>
                        </View>
                        <View style={styles.requirementItem}>
                          <Text
                            style={[
                              styles.requirementIcon,
                              /[a-z]/.test(form.password) &&
                                styles.requirementMet,
                            ]}
                          >
                            {/[a-z]/.test(form.password) ? "✓" : "○"}
                          </Text>
                          <Text
                            style={[
                              styles.requirementText,
                              /[a-z]/.test(form.password) &&
                                styles.requirementTextMet,
                            ]}
                          >
                            One lowercase letter
                          </Text>
                        </View>
                        <View style={styles.requirementItem}>
                          <Text
                            style={[
                              styles.requirementIcon,
                              /[A-Z]/.test(form.password) &&
                                styles.requirementMet,
                            ]}
                          >
                            {/[A-Z]/.test(form.password) ? "✓" : "○"}
                          </Text>
                          <Text
                            style={[
                              styles.requirementText,
                              /[A-Z]/.test(form.password) &&
                                styles.requirementTextMet,
                            ]}
                          >
                            One uppercase letter
                          </Text>
                        </View>
                        <View style={styles.requirementItem}>
                          <Text
                            style={[
                              styles.requirementIcon,
                              /[0-9]/.test(form.password) &&
                                styles.requirementMet,
                            ]}
                          >
                            {/[0-9]/.test(form.password) ? "✓" : "○"}
                          </Text>
                          <Text
                            style={[
                              styles.requirementText,
                              /[0-9]/.test(form.password) &&
                                styles.requirementTextMet,
                            ]}
                          >
                            One number
                          </Text>
                        </View>
                        <View style={styles.requirementItem}>
                          <Text
                            style={[
                              styles.requirementIcon,
                              /[^a-zA-Z0-9]/.test(form.password) &&
                                styles.requirementMet,
                            ]}
                          >
                            {/[^a-zA-Z0-9]/.test(form.password) ? "✓" : "○"}
                          </Text>
                          <Text
                            style={[
                              styles.requirementText,
                              /[^a-zA-Z0-9]/.test(form.password) &&
                                styles.requirementTextMet,
                            ]}
                          >
                            One special character (!@#$%...)
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {form.password.length > 0 && (
                    <View style={styles.passwordStrengthContainer}>
                      <View style={styles.passwordStrengthBar}>
                        <View
                          style={[
                            styles.passwordStrengthFill,
                            {
                              width: `${passwordStrength}%`,
                              backgroundColor: getPasswordStrengthColor(),
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.passwordStrengthText,
                          { color: getPasswordStrengthColor() },
                        ]}
                      >
                        {getPasswordStrengthText()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <Pressable
                    onPress={() => {}}
                    style={[
                      styles.inputContainer,
                      focusedField === "confirmPassword" &&
                        styles.inputContainerFocused,
                      form.confirmPassword &&
                        form.password !== form.confirmPassword &&
                        styles.inputContainerError,
                    ]}
                  >
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      value={form.confirmPassword}
                      onChangeText={(value) =>
                        handleInput("confirmPassword", value)
                      }
                      onFocus={(e) => {
                        setFocusedField("confirmPassword");
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToEnd({
                            animated: true,
                          });
                        }, 100);
                      }}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showPassword}
                      placeholder="Re-enter password"
                      placeholderTextColor={palette.slate}
                      style={styles.input}
                      editable={true}
                    />
                    {form.confirmPassword &&
                      form.password === form.confirmPassword && (
                        <Text style={styles.checkIcon}>✓</Text>
                      )}
                  </Pressable>
                  {form.confirmPassword &&
                    form.password !== form.confirmPassword && (
                      <Text style={styles.errorText}>
                        ⚠ Passwords do not match
                      </Text>
                    )}
                </View>

                {/* Submit Button */}
                <Pressable
                  onPress={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  style={({ pressed }) => [
                    styles.submitButton,
                    (!canSubmit || isSubmitting) && styles.disabledButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <LinearGradient
                    colors={
                      canSubmit && !isSubmitting
                        ? [palette.gold, "#d4b87a", palette.gold]
                        : ["#999", "#888", "#999"]
                    }
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={palette.navy} />
                    ) : (
                      <>
                        <Text style={styles.submitButtonText}>
                          Create Account
                        </Text>
                        <Text style={styles.buttonArrow}>→</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>

                {/* Sign In Link */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    Already have an account?
                  </Text>
                  <Link href="/sign-in" asChild>
                    <Pressable>
                      <Text style={styles.footerLink}>Sign In</Text>
                    </Pressable>
                  </Link>
                </View>
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
    paddingBottom: 40,
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
  formContainer: {
    gap: 24,
  },
  sectionHeader: {
    gap: 4,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.navy,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: palette.slate,
  },
  inlineRow: {
    flexDirection: "row",
    gap: 12,
  },
  field: {
    flex: 1,
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
  requiredBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ef4444",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
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
  inputContainerError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  textAreaContainer: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
    opacity: 0.6,
  },
  textAreaIcon: {
    marginTop: 2,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: palette.navy,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  checkIcon: {
    fontSize: 20,
    color: "#22c55e",
    fontWeight: "700",
  },
  helperText: {
    fontSize: 12,
    color: palette.slate,
    marginTop: -4,
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
    marginTop: -4,
  },
  passwordStrengthContainer: {
    gap: 6,
    marginTop: -4,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: palette.lightGray,
    borderRadius: 2,
    overflow: "hidden",
  },
  passwordStrengthFill: {
    height: "100%",
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${palette.gold}20`,
    borderWidth: 1,
    borderColor: `${palette.gold}60`,
    padding: 12,
    borderRadius: 12,
  },
  uploadBtnPressed: {
    backgroundColor: `${palette.gold}35`,
  },
  uploadText: {
    color: palette.navy,
    fontWeight: "800",
  },
  certificateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  certificateName: {
    color: palette.slate,
    flex: 1,
  },
  removeCertBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#c0392b",
    alignItems: "center",
    justifyContent: "center",
  },
  passwordRequirementsBox: {
    backgroundColor: `${palette.navy}05`,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: `${palette.navy}10`,
    marginTop: 4,
  },
  passwordRequirementsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.navy,
    marginBottom: 4,
  },
  requirementsList: {
    gap: 8,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  requirementIcon: {
    fontSize: 14,
    color: palette.slate,
    width: 16,
  },
  requirementMet: {
    color: "#22c55e",
  },
  requirementText: {
    fontSize: 13,
    color: palette.slate,
    flex: 1,
  },
  requirementTextMet: {
    color: palette.navy,
    fontWeight: "600",
  },
  eyeButton: {
    paddingHorizontal: 4,
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
    fontSize: 11,
    fontWeight: "700",
    color: palette.slate,
    letterSpacing: 1,
  },
  infoCard: {
    backgroundColor: `${palette.navy}08`,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: `${palette.navy}15`,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  infoIcon: {
    fontSize: 16,
    color: "#fff",
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.navy,
  },
  infoCardText: {
    fontSize: 13,
    color: palette.slate,
    lineHeight: 20,
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: palette.slate,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.gold,
  },
});
