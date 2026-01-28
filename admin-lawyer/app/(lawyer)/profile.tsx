import { useLogout, useProfile } from "@/hooks/useAuth";
import { api } from "@/services/api";
import { AuthService } from "@/services/auth.service";
import { showToast } from "@/utils/toast";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  light: "#F2F2F2",
  slate: "#566375",
  darkNavy: "#061823",
  lightGold: "#D4B87D",
};

const statusLabels: Record<string, string> = {
  pending: "Under Review",
  approved: "Verified",
  rejected: "Rejected",
};

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#FFA50030", text: "#FFA500" },
  approved: { bg: "#10B98130", text: "#10B981" },
  rejected: { bg: "#EF444430", text: "#EF4444" },
};

const resolveUrl = (uri: string) => {
  if (/^(https?:|file:)/i.test(uri)) return uri;
  const base = (api.defaults.baseURL || "").replace(/\/$/, "");
  const path = uri.startsWith("/") ? uri : `/${uri}`;
  return `${base}${path}`;
};

export default function ProfileTab() {
  const router = useRouter();
  const { data: profile, refetch } = useProfile();
  const logoutMutation = useLogout();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState(profile?.email || "");
  const [savingEmail, setSavingEmail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      showToast({
        message: "Profile refreshed successfully.",
        type: "success",
      });
    } catch (err) {
      console.log("Refresh failed", err);
    } finally {
      setRefreshing(false);
    }
  };

  const signOut = () => {
    setShowLogoutConfirm(true);
  };

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      showToast({
        message: "Please grant photo library access to change your avatar.",
        type: "error",
      });
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset) return;

    setUploadingAvatar(true);
    try {
      await AuthService.uploadAvatar({
        uri: asset.uri,
        name: asset.fileName || `avatar-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
      showToast({ message: "Avatar updated successfully.", type: "success" });
      refetch();
    } catch (err: any) {
      showToast({
        message:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to update avatar.",
        type: "error",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = () => {
    Alert.alert(
      "Remove Avatar",
      "Are you sure you want to remove your profile picture?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await AuthService.deleteAvatar();
              showToast({
                message: "Avatar removed successfully.",
                type: "info",
              });
              refetch();
            } catch (err: any) {
              showToast({
                message:
                  err?.response?.data?.message ||
                  err?.message ||
                  "Failed to remove avatar.",
                type: "error",
              });
            }
          },
        },
      ]
    );
  };

  const handleSaveEmail = async () => {
    if (!newEmail.trim()) {
      showToast({
        message: "Please enter a valid email address.",
        type: "error",
      });
      return;
    }
    setSavingEmail(true);
    try {
      await AuthService.updateProfile({ email: newEmail.trim() });
      showToast({ message: "Email updated successfully.", type: "success" });
      setEmailModal(false);
      refetch();
    } catch (err: any) {
      showToast({
        message:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to update email.",
        type: "error",
      });
    } finally {
      setSavingEmail(false);
    }
  };

  const verificationStatus = profile?.verificationStatus || "pending";
  const statusColor = statusColors[verificationStatus];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.gold}
            colors={[palette.gold]}
            progressBackgroundColor={palette.navy}
          />
        }
      >
        {/* Header with Gradient Background */}
        <View style={styles.headerSection}>
          <View style={styles.headerGradient}>
            <Text style={styles.title}>Lawyer profile </Text>
            <Text style={styles.subtitle}>
              Manage your account and credentials
            </Text>
          </View>
        </View>

        {/* Profile Card with Avatar */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <Pressable onPress={pickAvatar} style={styles.avatarContainer}>
              <View style={styles.avatarWrapper}>
                {profile?.avatarUrl ? (
                  <Image
                    source={{ uri: resolveUrl(profile.avatarUrl) }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={48} color={palette.gold} />
                  </View>
                )}
                <View style={styles.avatarBadge}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </View>
              {uploadingAvatar && (
                <View style={styles.uploadingOverlay}>
                  <Text style={styles.uploadingText}>Updating...</Text>
                </View>
              )}
            </Pressable>

            <Text style={styles.profileName}>
              {profile?.profile?.firstName || "Attorney"}
            </Text>
            <Text style={styles.profileRole}>
              {profile?.role?.toUpperCase()}
            </Text>
          </View>

          {/* Verification Status Badge */}
          {profile?.role === "lawyer" && (
            <View
              style={[styles.statusCard, { backgroundColor: statusColor.bg }]}
            >
              <View style={styles.statusIconWrapper}>
                <Ionicons
                  name={
                    verificationStatus === "approved"
                      ? "checkmark-circle"
                      : verificationStatus === "rejected"
                      ? "close-circle"
                      : "time"
                  }
                  size={20}
                  color={statusColor.text}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusLabel}>Verification Status</Text>
                <Text style={[styles.statusValue, { color: statusColor.text }]}>
                  {statusLabels[verificationStatus]}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Information Cards */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          {/* Email Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="mail" size={20} color={palette.gold} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{profile?.email}</Text>
            </View>
            <Pressable
              onPress={() => {
                setNewEmail(profile?.email || "");
                setEmailModal(true);
              }}
              style={({ pressed }) => [
                styles.editButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="pencil" size={16} color={palette.gold} />
            </Pressable>
          </View>

          {/* Avatar Actions Card */}
          {profile?.avatarUrl && (
            <View style={styles.infoCard}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="image" size={20} color={palette.gold} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Profile Picture</Text>
                <Text style={styles.infoValue}>Manage your avatar</Text>
              </View>
              <Pressable
                onPress={removeAvatar}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </Pressable>
            </View>
          )}

          {/* Certificate Card */}
          {profile?.certificateUrl && (
            <Pressable
              onPress={() =>
                Linking.openURL(resolveUrl(profile.certificateUrl!))
              }
              style={({ pressed }) => [
                styles.infoCard,
                pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.infoIconWrapper}>
                <Ionicons name="document-text" size={20} color={palette.gold} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Certification Document</Text>
                <Text style={styles.infoValue}>Tap to view certificate</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={palette.slate}
              />
            </Pressable>
          )}
        </View>

        {/* Logout Button */}
        <Pressable
          onPress={signOut}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color={palette.navy} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      {/* Email Edit Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={emailModal}
        onRequestClose={() => setEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Update Email</Text>
                <Text style={styles.modalSubtitle}>
                  Change your email address
                </Text>
              </View>
              <Pressable
                onPress={() => setEmailModal(false)}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons name="close" size={24} color={palette.slate} />
              </Pressable>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>New Email Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={palette.slate} />
                <TextInput
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder="email@example.com"
                  placeholderTextColor={palette.slate}
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setEmailModal(false)}
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveEmail}
                disabled={savingEmail}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && { opacity: 0.8 },
                  savingEmail && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.saveButtonText}>
                  {savingEmail ? "Saving..." : "Save Changes"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation */}
      <Modal
        animationType="fade"
        transparent
        visible={showLogoutConfirm}
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Sign Out</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to sign out of your account?
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.confirmBtnSecondary,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.confirmBtnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.confirmBtnPrimary,
                  (pressed || logoutMutation.isPending) && { opacity: 0.9 },
                ]}
                disabled={logoutMutation.isPending}
                onPress={async () => {
                  try {
                    await logoutMutation.mutateAsync();
                    showToast({
                      message: "Signed out successfully.",
                      type: "info",
                    });
                  } catch (err) {
                    console.log("Logout failed", err);
                    showToast({
                      message: "Failed to sign out. Please try again.",
                      type: "error",
                    });
                  } finally {
                    setShowLogoutConfirm(false);
                    router.replace("/sign-in");
                  }
                }}
              >
                <Text style={styles.confirmBtnPrimaryText}>Sign Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.darkNavy,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 16,
  },
  headerSection: {
    marginBottom: 24,
  },
  headerGradient: {
    gap: 6,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#ffffff80",
    fontSize: 15,
    fontWeight: "500",
  },
  profileCard: {
    backgroundColor: "#0f2c45",
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#ffffff08",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: palette.gold,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1a3a52",
    borderWidth: 4,
    borderColor: palette.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: palette.gold,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#0f2c45",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#00000080",
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  profileName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  profileRole: {
    color: palette.gold,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  statusIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff20",
    alignItems: "center",
    justifyContent: "center",
  },
  statusLabel: {
    color: "#ffffff80",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  infoSection: {
    gap: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f2c45",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#ffffff08",
  },
  infoIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${palette.gold}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    color: "#ffffff60",
    fontSize: 12,
    fontWeight: "600",
  },
  infoValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${palette.gold}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EF444420",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.gold,
    padding: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutText: {
    color: palette.navy,
    fontSize: 17,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000099",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: palette.navy,
  },
  modalSubtitle: {
    fontSize: 14,
    color: palette.slate,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrapper: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.navy,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e5e5",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 10,
  },
  input: {
    flex: 1,
    color: palette.navy,
    fontSize: 16,
    fontWeight: "600",
    paddingVertical: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    color: palette.slate,
    fontSize: 16,
    fontWeight: "700",
  },
  saveButton: {
    flex: 1,
    backgroundColor: palette.gold,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonText: {
    color: palette.navy,
    fontSize: 16,
    fontWeight: "800",
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(6, 24, 35, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#0f2c45",
    borderRadius: 24,
    padding: 28,
    gap: 20,
    borderWidth: 1,
    borderColor: "#ffffff12",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: 15,
    color: "#ffffff80",
    lineHeight: 22,
    textAlign: "center",
    fontWeight: "500",
  },
  confirmButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  confirmBtnSecondary: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#ffffff20",
    backgroundColor: "#ffffff08",
    alignItems: "center",
  },
  confirmBtnSecondaryText: {
    fontWeight: "800",
    fontSize: 15,
    color: "#fff",
  },
  confirmBtnPrimary: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: palette.gold,
    alignItems: "center",
    shadowColor: palette.gold,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  confirmBtnPrimaryText: {
    fontWeight: "900",
    fontSize: 15,
    color: palette.navy,
  },
});
