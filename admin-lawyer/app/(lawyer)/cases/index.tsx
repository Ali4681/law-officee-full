import { useMyCases } from "@/hooks/useCases";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  light: "#F2F2F2",
  slate: "#566375",
};

export default function CasesTab() {
  const router = useRouter();
  const { data, isLoading, refetch, isError, error, isRefetching } =
    useMyCases();

  useEffect(() => {
    refetch();
  }, [refetch]);

  const getStatusLabel = (status: string) => {
    const normalized = status?.toString().toLowerCase();
    const lookup: Record<string, string> = {
      active: "Active",
      نشط: "Active",
      pending: "Pending",
      fee_proposed: "Fee Proposed",
      client_rejected: "Client Rejected",
      معلق: "Pending",
      closed: "Closed",
      مغلق: "Closed",
    };
    return lookup[normalized] || status || "Pending";
  };

  const getStatusColor = (status: string) => {
    const label = getStatusLabel(status).toLowerCase();
    switch (label) {
      case "active":
        return "#4CAF50";
      case "pending":
      case "fee proposed":
        return palette.gold;
      case "client rejected":
        return "#ff6b6b";
      case "closed":
        return palette.slate;
      default:
        return palette.gold;
    }
  };

  const renderItem = ({ item, index }: any) => {
    const statusColor = getStatusColor(item.status);
    const displayStatus = getStatusLabel(item.status);
    const clientDisplayName =
      item.clientName ||
      item.client?.name ||
      item.client?.fullName ||
      item.client?.username ||
      item.client?.clientDisplayName ||
      (item.clientId?.profile?.firstName || item.clientId?.profile?.lastName
        ? `${item.clientId?.profile?.firstName || ""} ${
            item.clientId?.profile?.lastName || ""
          }`.trim()
        : null) ||
      "Unknown client";

    return (
      <Pressable
        onPress={() => router.push(`/(lawyer)/cases/${item._id}`)}
        style={({ pressed }) => [
          styles.cardContainer,
          pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        ]}
      >
        <View style={styles.card}>
          {/* Accent bar */}
          <View style={[styles.accentBar, { backgroundColor: statusColor }]} />

          {/* Card content */}
          <View style={styles.cardContent}>
            {/* Header section */}
            <View style={styles.cardHeader}>
              <View style={styles.titleContainer}>
                <View style={styles.iconBadge}>
                  <Ionicons name="briefcase" color={palette.gold} size={18} />
                </View>
                <View style={styles.titleTextBlock}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.clientTag} numberOfLines={1}>
                    {clientDisplayName}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: `${statusColor}20` },
                ]}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: statusColor }]}
                />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {displayStatus}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Info section */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="person" color={palette.gold} size={16} />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Client</Text>
                  <Text style={styles.infoValue}>{clientDisplayName}</Text>
                </View>
              </View>

              {item.nextHearingDate && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="calendar" color={palette.gold} size={16} />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Next Hearing Date</Text>
                    <Text style={styles.infoValue}>{item.nextHearingDate}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Footer with arrow */}
            <View style={styles.cardFooter}>
              <Text style={styles.viewDetails}>Show Details</Text>
              <Ionicons name="arrow-forward" color={palette.gold} size={16} />
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[palette.navy, "#142d42", palette.navy]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
          {/* Header with enhanced design */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerIcon}>
                <Ionicons name="folder-open" color={palette.gold} size={28} />
              </View>
              <View>
                <Text style={styles.heading}>My Active Cases</Text>
                <Text style={styles.subheading}>
                  {data?.length || 0} Active Cases
                </Text>
              </View>
            </View>
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={styles.center}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={palette.gold} size="large" />
                <Text style={styles.loadingText}>Loading cases...</Text>
              </View>
            </View>
          ) : isError ? (
            <View style={styles.center}>
              <View style={styles.errorContainer}>
                <View style={styles.errorIcon}>
                  <Ionicons name="alert-circle" color="#ff6b6b" size={48} />
                </View>
                <Text style={styles.errorTitle}>Failed to Load Cases</Text>
                <Text style={styles.errorMessage}>
                  {(error as any)?.response?.data?.message ||
                    (error as Error).message ||
                    "Please try again"}
                </Text>
                <Pressable onPress={() => refetch()} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                  <Ionicons name="refresh" color={palette.navy} size={18} />
                </Pressable>
              </View>
            </View>
          ) : (
            <FlatList
              data={data || []}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              refreshing={isRefetching}
              onRefresh={refetch}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.center}>
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIcon}>
                      <Ionicons
                        name="folder-open-outline"
                        color={palette.slate}
                        size={64}
                      />
                    </View>
                    <Text style={styles.emptyTitle}>No Cases Found</Text>
                    <Text style={styles.emptyMessage}>
                      Your assigned cases will appear here
                    </Text>
                  </View>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(198, 166, 103, 0.2)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(198, 166, 103, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(198, 166, 103, 0.3)",
  },
  heading: {
    color: palette.light,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subheading: {
    color: palette.gold,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(198, 166, 103, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(198, 166, 103, 0.3)",
  },
  list: {
    gap: 16,
    paddingBottom: 16,
  },
  cardContainer: {
    marginHorizontal: 2,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  accentBar: {
    height: 4,
    width: "100%",
  },
  cardContent: {
    padding: 18,
  },
  cardHeader: {
    gap: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(198, 166, 103, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontWeight: "800",
    color: palette.navy,
    fontSize: 17,
    lineHeight: 24,
    marginTop: 0,
  },
  titleTextBlock: {
    flex: 1,
  },
  clientTag: {
    fontSize: 12,
    color: palette.slate,
    marginTop: 4,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontWeight: "700",
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(86, 99, 117, 0.15)",
    marginVertical: 16,
  },
  infoSection: {
    gap: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(198, 166, 103, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    color: palette.slate,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoValue: {
    color: palette.navy,
    fontSize: 15,
    fontWeight: "700",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(86, 99, 117, 0.1)",
  },
  viewDetails: {
    color: palette.gold,
    fontSize: 14,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: "center",
    gap: 16,
    padding: 32,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  loadingText: {
    color: palette.light,
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    alignItems: "center",
    gap: 16,
    padding: 32,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    maxWidth: 340,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    color: palette.light,
    fontWeight: "800",
    fontSize: 20,
    textAlign: "center",
  },
  errorMessage: {
    color: palette.slate,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: palette.gold,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: palette.navy,
    fontWeight: "700",
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: "center",
    gap: 16,
    padding: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    maxWidth: 320,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(86, 99, 117, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: palette.light,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyMessage: {
    color: palette.slate,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
