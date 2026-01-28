import {
  useApproveLawyer,
  usePendingLawyers,
  useRejectLawyer,
} from "@/hooks/useUsers";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { api } from "@/services/api";
import { showToast } from "@/utils/toast";
import { SafeAreaView } from "react-native-safe-area-context";

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  light: "#F2F2F2",
  slate: "#566375",
  navyLight: "#1A3650",
  goldLight: "#D8C190",
};

const resolveUrl = (uri: string) => {
  if (/^(https?:|file:)/i.test(uri)) return uri;
  const base = (api.defaults.baseURL || "").replace(/\/$/, "");
  const path = uri.startsWith("/") ? uri : `/${uri}`;
  return `${base}${path}`;
};

export default function AdminLawyersScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = usePendingLawyers();
  const approve = useApproveLawyer();
  const reject = useRejectLawyer();

  const handleApprove = (id: string) => {
    approve.mutate(id, {
      onSuccess: () => {
        showToast({ message: "Lawyer approved successfully.", type: "success" });
      },
      onError: (err: any) => {
        showToast({
          message:
            err?.response?.data?.message || err?.message || "Please try again.",
          type: "error",
        });
      },
    });
  };

  const handleReject = (id: string) => {
    reject.mutate(id, {
      onSuccess: () => {
        showToast({
          message: "Lawyer request and certificate were rejected.",
          type: "info",
        });
      },
      onError: (err: any) => {
        showToast({
          message:
            err?.response?.data?.message || err?.message || "Please try again.",
          type: "error",
        });
      },
    });
  };

  const handleOpenCertificate = async (url: string) => {
    const resolved = resolveUrl(url);
    try {
      await WebBrowser.openBrowserAsync(resolved);
    } catch (err) {
      Linking.openURL(resolved);
    }
  };

  const renderItem = ({ item }: any) => {
    const fullName = `${item.profile?.firstName || ""} ${
      item.profile?.lastName || ""
    }`.trim();
    const initials =
      fullName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "LA";

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[palette.navyLight, palette.navy]}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.name}>{fullName || "Not provided"}</Text>
              <Text style={styles.email}>{item.email}</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>
                  {item.verificationStatus === "pending"
                    ? "Pending review"
                    : item.verificationStatus}
                </Text>
              </View>
            </View>
          </View>

          {item.certificateUrl && (
            <Pressable
              onPress={() => handleOpenCertificate(item.certificateUrl)}
              style={({ pressed }) => [
                styles.certificateBtn,
                pressed && styles.certificateBtnPressed,
              ]}
            >
              <Ionicons name="document-text" size={20} color={palette.gold} />
              <Text style={styles.certificateText}>View certificate</Text>
              <Ionicons name="open-outline" size={16} color={palette.slate} />
            </Pressable>
          )}

          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => handleApprove(item._id)}
              disabled={approve.isPending || reject.isPending}
              style={({ pressed }) => [
                styles.approveBtn,
                pressed && styles.approveBtnPressed,
                (approve.isPending || reject.isPending) && styles.btnDisabled,
              ]}
            >
              {approve.isPending ? (
                <ActivityIndicator color={palette.navy} size="small" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={palette.navy}
                  />
                  <Text style={styles.approveBtnText}>Approve Lawyer</Text>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={() => handleReject(item._id)}
              disabled={approve.isPending || reject.isPending}
              style={({ pressed }) => [
                styles.rejectBtn,
                pressed && styles.rejectBtnPressed,
                (approve.isPending || reject.isPending) && styles.btnDisabled,
              ]}
            >
              {reject.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.rejectBtnText}>Reject Request</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  const pending = isLoading || isRefetching;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <LinearGradient
        colors={[palette.navy, "#0f3048", "#0A2436"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View>
              <Text style={styles.kicker}>ADMIN PANEL</Text>
              <Text style={styles.title}>Lawyer Requests</Text>
              <Text style={styles.subtitle}>
                Review and approve new lawyer registrations
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={[`${palette.goldLight}20`, `${palette.gold}15`]}
            style={styles.statCard}
          >
            <Ionicons name="hourglass-outline" size={24} color={palette.gold} />
            <View>
              <Text style={styles.statValue}>{data?.length || 0}</Text>
              <Text style={styles.statLabel}>Pending requests</Text>
            </View>
          </LinearGradient>
        </View>

        {/* List Header */}
        <View style={styles.listHeader}>
          <View>
            <Text style={styles.listTitle}>
              {pending ? "Loading requests..." : "Lawyer Requests"}
            </Text>
            <Text style={styles.listSubtitle}>
              {data?.length || 0} lawyers awaiting review
            </Text>
          </View>
        </View>

        {/* Loading State */}
        {pending ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={palette.gold} />
            <Text style={styles.loaderText}>Loading lawyer requests...</Text>
          </View>
        ) : (
          /* Lawyers List */
          <FlatList
            data={data || []}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.list,
              (!data || data.length === 0) && styles.emptyList,
            ]}
            showsVerticalScrollIndicator={false}
            refreshing={isRefetching}
            onRefresh={refetch}
            ListEmptyComponent={
              !pending && (!data || data.length === 0) ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="checkmark-done-circle-outline"
                    size={64}
                    color={palette.slate}
                  />
                  <Text style={styles.emptyTitle}>No pending requests</Text>
                  <Text style={styles.emptySubtitle}>
                    All lawyer applications have been reviewed
                  </Text>
                  <Pressable
                    onPress={() => refetch()}
                    style={styles.refreshEmptyButton}
                  >
                    <Text style={styles.refreshEmptyText}>Refresh list</Text>
                  </Pressable>
                </View>
              ) : null
            }
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.navy,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  kicker: {
    color: palette.gold,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontSize: 11,
    opacity: 0.9,
  },
  title: {
    color: palette.light,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 2,
  },
  subtitle: {
    color: `${palette.light}cc`,
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${palette.gold}30`,
  },
  statValue: {
    color: palette.gold,
    fontSize: 24,
    fontWeight: "800",
  },
  statLabel: {
    color: `${palette.light}cc`,
    fontSize: 13,
    fontWeight: "600",
  },
  listHeader: {
    marginBottom: 20,
  },
  listTitle: {
    color: palette.light,
    fontWeight: "800",
    fontSize: 22,
  },
  listSubtitle: {
    color: `${palette.light}cc`,
    fontSize: 14,
    marginTop: 4,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loaderText: {
    color: palette.light,
    marginTop: 16,
    fontSize: 16,
    opacity: 0.8,
  },
  list: {
    paddingBottom: 30,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: `${palette.light}08`,
    borderRadius: 24,
    marginVertical: 20,
  },
  emptyTitle: {
    color: palette.light,
    fontWeight: "800",
    fontSize: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: `${palette.light}cc`,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },
  refreshEmptyButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: `${palette.gold}30`,
    borderRadius: 12,
  },
  refreshEmptyText: {
    color: palette.gold,
    fontWeight: "700",
  },
  card: {
    backgroundColor: palette.light,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9,
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: palette.light,
    fontWeight: "800",
    fontSize: 18,
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    color: palette.navy,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  email: {
    color: palette.slate,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: `${palette.gold}20`,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.gold,
  },
  statusText: {
    color: palette.gold,
    fontSize: 12,
    fontWeight: "700",
  },
  certificateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    backgroundColor: `${palette.gold}15`,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${palette.gold}30`,
  },
  certificateBtnPressed: {
    opacity: 0.7,
  },
  certificateText: {
    color: palette.gold,
    fontWeight: "700",
    fontSize: 15,
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: palette.gold,
    paddingVertical: 16,
    borderRadius: 14,
  },
  approveBtnPressed: {
    transform: [{ scale: 0.98 }],
  },
  approveBtnText: {
    color: palette.navy,
    fontWeight: "800",
    fontSize: 15,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E74C3C",
    paddingVertical: 16,
    borderRadius: 14,
  },
  rejectBtnPressed: {
    transform: [{ scale: 0.98 }],
  },
  rejectBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
