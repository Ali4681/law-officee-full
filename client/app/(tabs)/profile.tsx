import {
  ActivityIndicator,
  Alert,
  Image,
  I18nManager,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useProfile } from "@/hooks/use-profile";
import { API_BASE_URL, getAuthToken } from "@/services/api";
import { signOut } from "@/services/auth";
import { getInitials } from "@/utils/string";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { useState } from "react";

// Enable RTL layout
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  slate: "#566375",
  navyLight: "#1A3650",
  light: "#F2F2F2",
};

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 65;

// Arabic translations
const translations = {
  loadingProfile: "جاري تحميل الملف الشخصي…",
  unableToLoad: "تعذر تحميل الملف الشخصي",
  checkConnection: "تحقق من اتصالك",
  email: "البريد الإلكتروني",
  phone: "الهاتف",
  notProvided: "غير متوفر",
  unknown: "غير معروف",
  client: "عميل",
  lawyer: "محامي",
  admin: "مسؤول",
  signOut: "تسجيل الخروج",
  confirmSignOut: "تأكيد تسجيل الخروج",
  signOutMessage: "هل أنت متأكد من تسجيل الخروج من هذا الجهاز؟ ستحتاج إلى تسجيل الدخول مرة أخرى للوصول إلى حسابك.",
  cancel: "إلغاء",
  updateAvatar: "تحديث الصورة الشخصية",
  chooseOption: "اختر خيارًا",
  chooseFromLibrary: "اختر من المكتبة",
  removeAvatar: "إزالة الصورة الشخصية",
  permissionDenied: "تم رفض الإذن",
  permissionMessage: "نحتاج إلى إذن الوصول إلى معرض الصور لتحميل صورة شخصية.",
  success: "نجح",
  avatarUpdated: "تم تحديث الصورة الشخصية بنجاح!",
  avatarRemoved: "تم إزالة الصورة الشخصية بنجاح!",
  error: "خطأ",
  avatarUpdateFailed: "فشل تحديث الصورة الشخصية. يرجى المحاولة مرة أخرى.",
  avatarRemoveFailed: "فشل إزالة الصورة الشخصية.",
};

const detailRows = ([name, value]: [string, string]) => ({ name, value });

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const { data, isLoading, isError, error, refetch, isFetching } = useProfile();
  const [showSignOut, setShowSignOut] = useState(false);

  const isDark = colorScheme === "dark";

  const profile = data?.profile;
  const displayName =
    profile?.firstName || profile?.lastName
      ? `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim()
      : data?.email ?? translations.unknown;
  const initials = getInitials(displayName);
  
  const getRoleLabel = (role?: string) => {
    const roleKey = (role ?? "client").toLowerCase();
    if (roleKey === "client") return translations.client;
    if (roleKey === "lawyer") return translations.lawyer;
    if (roleKey === "admin") return translations.admin;
    return role?.replace(/^[a-z]/, (c) => c.toUpperCase()) ?? translations.client;
  };
  
  const roleLabel = getRoleLabel(data?.role);

  const avatarUri = data?.avatarUrl
    ? data.avatarUrl.startsWith("http")
      ? data.avatarUrl
      : `${API_BASE_URL}${data.avatarUrl}`
    : undefined;

  const rows = [
    detailRows([translations.email, data?.email ?? "?"]),
    detailRows([translations.phone, profile?.phone ?? translations.notProvided]),
  ];

  const openSignOut = () => setShowSignOut(true);
  const confirmSignOut = () => {
    setShowSignOut(false);
    signOut();
    router.replace("/auth/sign-in");
  };
  const handleUpdateAvatar = async () => {
    Alert.alert(translations.updateAvatar, translations.chooseOption, [
      {
        text: translations.cancel,
        style: "cancel",
      },
      {
        text: translations.chooseFromLibrary,
        onPress: async () => {
          try {
            const {
              launchImageLibraryAsync,
              requestMediaLibraryPermissionsAsync,
            } = await import("expo-image-picker");

            const { status } = await requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
              Alert.alert(
                translations.permissionDenied,
                translations.permissionMessage
              );
              return;
            }

            const result = await launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              const uri = result.assets[0].uri;

              const formData = new FormData();
              const filename = uri.split("/").pop() || "avatar.jpg";
              const match = /\.(\w+)$/.exec(filename);
              const type = match ? `image/${match[1]}` : "image/jpeg";

              formData.append("avatar", {
                uri,
                name: filename,
                type,
              } as any);

              const token = getAuthToken();
              if (!token) throw new Error("No auth token");

              const decoded = jwtDecode<{ sub: string }>(token);
              const userId = decoded.sub;

              const response = await fetch(
                `${API_BASE_URL}/users/${userId}/avatar`,
                {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                  body: formData,
                }
              );

              if (!response.ok) {
                throw new Error("Failed to upload avatar");
              }

              await refetch();
              Alert.alert(translations.success, translations.avatarUpdated);
            }
          } catch (error) {
            console.error("Avatar upload error:", error);
            Alert.alert(translations.error, translations.avatarUpdateFailed);
          }
        },
      },
      {
        text: translations.removeAvatar,
        style: "destructive",
        onPress: async () => {
          try {
            const token = getAuthToken();
            if (!token) throw new Error("No auth token");

            const decoded = jwtDecode<{ sub: string }>(token);
            const userId = decoded.sub;

            const response = await fetch(
              `${API_BASE_URL}/users/${userId}/avatar`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (!response.ok) {
              throw new Error("Failed to delete avatar");
            }

            await refetch();
            Alert.alert(translations.success, translations.avatarRemoved);
          } catch (error) {
            console.error("Avatar delete error:", error);
            Alert.alert(translations.error, translations.avatarRemoveFailed);
          }
        },
      },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? palette.navy : palette.light },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => refetch()}
            tintColor={palette.gold}
            colors={[palette.gold]}
          />
        }
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? palette.navyLight : "#FFFFFF",
            },
          ]}
        >
          {isLoading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={palette.gold} />
              <ThemedText style={styles.loaderText}>
                {translations.loadingProfile}
              </ThemedText>
            </View>
          ) : isError ? (
            <View style={styles.errorBox}>
              <ThemedText style={styles.errorTitle}>
                {translations.unableToLoad}
              </ThemedText>
              <ThemedText style={styles.errorText}>
                {(error as Error)?.message ?? translations.checkConnection}
              </ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.headerSection}>
                <View style={styles.avatarWrapper}>
                  <View style={styles.avatarContainer}>
                    {avatarUri ? (
                      <Image
                        source={{ uri: avatarUri }}
                        style={styles.avatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.initialsCircle,
                          {
                            backgroundColor: palette.gold,
                          },
                        ]}
                      >
                        <ThemedText style={styles.initialsText}>
                          {initials}
                        </ThemedText>
                      </View>
                    )}
                    <Pressable
                      onPress={handleUpdateAvatar}
                      style={({ pressed }) => [
                        styles.editButton,
                        {
                          backgroundColor: palette.gold,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <ThemedText style={styles.editIcon}>✎</ThemedText>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.nameSection}>
                  <ThemedText
                    style={[
                      styles.name,
                      { color: isDark ? "#FFFFFF" : palette.navy },
                    ]}
                  >
                    {displayName}
                  </ThemedText>
                  <View
                    style={[
                      styles.roleBadge,
                      {
                        backgroundColor: isDark
                          ? "rgba(198, 166, 103, 0.15)"
                          : "rgba(198, 166, 103, 0.12)",
                      },
                    ]}
                  >
                    <ThemedText
                      style={[styles.roleText, { color: palette.gold }]}
                    >
                      {roleLabel}
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.detailsSection,
                  {
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.03)"
                      : "rgba(10, 36, 54, 0.02)",
                  },
                ]}
              >
                {rows.map((row, idx) => (
                  <View
                    key={row.name}
                    style={[
                      styles.detailRow,
                      idx !== rows.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: isDark
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(10, 36, 54, 0.05)",
                      },
                    ]}
                  >
                    <ThemedText
                      style={[styles.detailLabel, { color: palette.slate }]}
                    >
                      {row.name}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.detailValue,
                        { color: isDark ? "#FFFFFF" : palette.navy },
                      ]}
                    >
                      {row.value}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.signOutSection}>
          <Pressable
            style={({ pressed }) => [
              styles.signOutButton,
              {
                backgroundColor: isDark
                  ? "rgba(239, 68, 68, 0.12)"
                  : "rgba(239, 68, 68, 0.08)",
                borderColor: "#EF4444",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={openSignOut}
          >
            <ThemedText style={styles.signOutText}>{translations.signOut}</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={showSignOut}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOut(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSignOut(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? palette.navyLight : "#FFFFFF",
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalIconContainer,
                  { backgroundColor: "rgba(239, 68, 68, 0.12)" },
                ]}
              >
                <ThemedText style={styles.modalIcon}>⚠️</ThemedText>
              </View>
            </View>
            <ThemedText
              style={[
                styles.modalTitle,
                { color: isDark ? "#FFFFFF" : palette.navy },
              ]}
            >
              {translations.confirmSignOut}
            </ThemedText>
            <ThemedText style={[styles.modalMessage, { color: palette.slate }]}>
              {translations.signOutMessage}
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalSecondary,
                  {
                    borderColor: isDark
                      ? "rgba(255, 255, 255, 0.2)"
                      : "rgba(10, 36, 54, 0.2)",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => setShowSignOut(false)}
              >
                <ThemedText
                  style={[
                    styles.modalSecondaryText,
                    { color: isDark ? "#FFFFFF" : palette.navy },
                  ]}
                >
                  {translations.cancel}
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalPrimary,
                  { backgroundColor: "#EF4444", opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={confirmSignOut}
              >
                <ThemedText style={styles.modalPrimaryText}>
                  {translations.signOut}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: TAB_BAR_HEIGHT,
    marginTop: 50,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 32,
    padding: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  loader: {
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loaderText: {
    color: palette.gold,
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  errorBox: {
    minHeight: 300,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorTitle: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 20,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  errorText: {
    color: palette.slate,
    textAlign: "center",
    fontSize: 15,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  headerSection: {
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatarWrapper: {
    marginBottom: 24,
  },
  avatarContainer: {
    position: "relative",
    width: 120,
    height: 120,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  initialsCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  initialsText: {
    fontSize: 42,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1.5,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  editButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  editIcon: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  nameSection: {
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
    textAlign: "center",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    letterSpacing: 1.5,
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: 11,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  detailsSection: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  detailRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
  },
  detailLabel: {
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.3,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  detailValue: {
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.2,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  signOutSection: {
    marginTop: 24,
  },
  signOutButton: {
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  signOutText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 36, 54, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 32,
    padding: 32,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  modalIcon: {
    fontSize: 36,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 12,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  modalMessage: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 24,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  modalButtons: {
    flexDirection: "row-reverse",
    gap: 12,
  },
  modalSecondary: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
  },
  modalSecondaryText: {
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  modalPrimary: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  modalPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
    fontFamily: "NotoNaskhArabic-Bold",
  },
});