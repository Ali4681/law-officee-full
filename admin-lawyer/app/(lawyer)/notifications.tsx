import { useIncomingCases, useRespondToCase } from "@/hooks/useCases";
import {
  useMarkAllRead,
  useNotifications,
  useUnreadNotifications,
} from "@/hooks/useNotifications";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
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
};

const getNotificationIcon = (type: string) => {
  const typeMap: Record<string, string> = {
    case_assigned: "briefcase",
    case_updated: "refresh-circle",
    message: "chatbubble",
    reminder: "alarm",
    payment: "card",
    default: "notifications",
  };
  return typeMap[type.toLowerCase()] || typeMap.default;
};

export default function NotificationsTab() {
  const [userId, setUserId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [fees, setFees] = useState<Record<string, string>>({});
  const [declineReasons, setDeclineReasons] = useState<Record<string, string>>(
    {}
  );
  const [activeTab, setActiveTab] = useState<"cases" | "notifications">(
    "cases"
  );

  const {
    data: incoming,
    isLoading: loadingIncoming,
    refetch: refetchIncoming,
    isRefetching: refreshingIncoming,
  } = useIncomingCases();

  const {
    data: notifications,
    refetch,
    isLoading: loadingNotifs,
    isRefetching: refreshingNotifs,
  } = useNotifications(userId || undefined);

  const {
    data: unread,
    refetch: refetchUnread,
    isRefetching: refreshingUnread,
  } = useUnreadNotifications(userId || undefined);

  const respondMutation = useRespondToCase();
  const markAll = useMarkAllRead();

  useEffect(() => {
    AsyncStorage.getItem("user_id").then(setUserId);
  }, []);

  const handleRespond = async (id: string, action: "accept" | "decline") => {
    if (action === "accept") {
      const fee = Number(fees[id]);
      if (!fees[id] || Number.isNaN(fee) || fee <= 0) {
        Alert.alert(
          "Enter Fee",
          "Please set a proposed fee before accepting this case."
        );
        return;
      }
    }

    const payload =
      action === "accept"
        ? { action, fee: Number(fees[id]) }
        : {
            action,
            reason: declineReasons[id] || "Declined from notification",
          };

    try {
      setRespondingId(id);
      await respondMutation.mutateAsync({ id, dto: payload });

      Alert.alert(
        action === "accept" ? "Accepted" : "Declined",
        action === "accept"
          ? "The client has been notified that you accepted the case."
          : "The client has been notified that you declined the case."
      );
      refetch();
      refetchUnread();
      setFees((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setDeclineReasons((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err: any) {
      Alert.alert(
        "Request Failed",
        err?.response?.data?.message || err?.message || "Please try again"
      );
    } finally {
      setRespondingId(null);
    }
  };

  const pendingCount = (unread?.length || 0) + (incoming?.length || 0);
  const refreshingAll =
    refreshingIncoming || refreshingNotifs || refreshingUnread;

  const onRefreshAll = () => {
    refetchIncoming();
    refetch();
    refetchUnread();
  };

  const renderIncoming = ({ item, index }: any) => {
    const getClientName = () => {
      // Check client.profile (firstName + lastName)
      if (item.client?.profile) {
        const { firstName, lastName } = item.client.profile;
        if (firstName || lastName) {
          return `${firstName || ""} ${lastName || ""}`.trim();
        }
      }

      // Check clientId.profile (if populated as object)
      if (typeof item.clientId === "object" && item.clientId?.profile) {
        const { firstName, lastName } = item.clientId.profile;
        if (firstName || lastName) {
          return `${firstName || ""} ${lastName || ""}`.trim();
        }
      }

      // Check client.fullName or client.name
      if (item.client?.fullName) return item.client.fullName;
      if (item.client?.name) return item.client.name;

      // Check clientId fields (if populated as object)
      if (typeof item.clientId === "object") {
        if (item.clientId?.fullName) return item.clientId.fullName;
        if (item.clientId?.name) return item.clientId.name;
      }

      // Check clientName field
      if (item.clientName) return item.clientName;

      // Use email as last resort before "Unknown"
      if (item.client?.email) return item.client.email;
      if (typeof item.clientId === "object" && item.clientId?.email) {
        return item.clientId.email;
      }

      return "Unknown Client";
    };

    return (
      <View style={[styles.incomingCard, { marginTop: index === 0 ? 0 : 12 }]}>
        <View style={styles.incomingHeader}>
          <View style={styles.incomingIconBadge}>
            <Ionicons name="briefcase" color={palette.gold} size={24} />
          </View>
          <View style={styles.incomingHeaderText}>
            <Text style={styles.incomingTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.incomingMetaRow}>
              <Ionicons name="person" size={14} color={palette.slate} />
              <Text style={styles.incomingMeta}>{getClientName()}</Text>
            </View>
          </View>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        </View>

        {item.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionLabel}>Case Description</Text>
            <Text style={styles.descriptionText} numberOfLines={3}>
              {item.description}
            </Text>
          </View>
        )}

        <View style={styles.inputSection}>
          <View style={styles.inputWrapper}>
            <Ionicons name="cash-outline" size={18} color={palette.gold} />
            <TextInput
              placeholder="Proposed fee amount"
              placeholderTextColor={`${palette.slate}80`}
              value={fees[item._id] || ""}
              onChangeText={(val) =>
                setFees((prev) => ({
                  ...prev,
                  [item._id]: val,
                }))
              }
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="chatbox-outline" size={18} color={palette.slate} />
            <TextInput
              placeholder="Decline reason (optional)"
              placeholderTextColor={`${palette.slate}80`}
              value={declineReasons[item._id] || ""}
              onChangeText={(val) =>
                setDeclineReasons((prev) => ({
                  ...prev,
                  [item._id]: val,
                }))
              }
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            onPress={() => handleRespond(item._id, "accept")}
            style={({ pressed }) => [
              styles.acceptButton,
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              respondingId === item._id && styles.buttonDisabled,
            ]}
            disabled={respondingId === item._id}
          >
            {respondingId === item._id && respondMutation.isPending ? (
              <ActivityIndicator color={palette.navy} size="small" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={palette.navy}
                />
                <Text style={styles.acceptText}>Accept Case</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => handleRespond(item._id, "decline")}
            style={({ pressed }) => [
              styles.declineButton,
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              respondingId === item._id && styles.buttonDisabled,
            ]}
            disabled={respondingId === item._id}
          >
            {respondingId === item._id && respondMutation.isPending ? (
              <ActivityIndicator color="#ff6b6b" size="small" />
            ) : (
              <>
                <Ionicons name="close-circle" size={20} color="#ff6b6b" />
                <Text style={styles.declineText}>Decline</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  const renderNotification = ({ item, index }: any) => {
    const icon = getNotificationIcon(item.type);

    return (
      <View
        style={[styles.notificationCard, { marginTop: index === 0 ? 0 : 12 }]}
      >
        <View style={styles.notificationContent}>
          <View
            style={[
              styles.notificationIcon,
              !item.read && styles.notificationIconUnread,
            ]}
          >
            <Ionicons
              name={icon as any}
              size={22}
              color={item.read ? palette.slate : palette.gold}
            />
          </View>

          <View style={styles.notificationText}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationType}>{item.type}</Text>
              {!item.read && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.notificationMessage}>{item.message}</Text>
            {item.caseId && (
              <View style={styles.notificationCaseInfo}>
                <Ionicons
                  name="folder-outline"
                  size={12}
                  color={palette.slate}
                />
                <Text style={styles.notificationCaseId}>
                  Case ID: {item.caseId.slice(-8)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name="notifications-off-outline"
            size={48}
            color={palette.slate}
          />
        </View>
        <Text style={styles.emptyTitle}>No Notifications</Text>
        <Text style={styles.emptyText}>You're all caught up!</Text>
      </View>
    ),
    []
  );

  const incomingEmpty = useMemo(
    () => (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="briefcase-outline" size={48} color={palette.slate} />
        </View>
        <Text style={styles.emptyTitle}>No Incoming Cases</Text>
        <Text style={styles.emptyText}>New case requests will appear here</Text>
      </View>
    ),
    []
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[palette.navy, "#142d42", palette.navy]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="notifications" size={28} color={palette.gold} />
              </View>
              <View>
                <Text style={styles.heading}>Notifications</Text>
                <Text style={styles.subheading}>
                  Stay updated on your cases
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <View style={styles.countBadge}>
                <Ionicons name="ellipse" size={8} color={palette.gold} />
                <Text style={styles.countText}>{pendingCount}</Text>
              </View>
            </View>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabSwitcher}>
            <Pressable
              style={({ pressed }) => [
                styles.tabButton,
                activeTab === "cases" && styles.tabButtonActive,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => setActiveTab("cases")}
            >
              <Ionicons
                name="briefcase"
                size={20}
                color={activeTab === "cases" ? palette.navy : palette.light}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "cases" && styles.tabButtonTextActive,
                ]}
              >
                Incoming Cases
              </Text>
              {(incoming?.length || 0) > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {incoming?.length || 0}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.tabButton,
                activeTab === "notifications" && styles.tabButtonActive,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => setActiveTab("notifications")}
            >
              <Ionicons
                name="notifications"
                size={20}
                color={
                  activeTab === "notifications" ? palette.navy : palette.light
                }
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "notifications" && styles.tabButtonTextActive,
                ]}
              >
                Notifications
              </Text>
              {(unread?.length || 0) > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{unread?.length || 0}</Text>
                </View>
              )}
            </Pressable>
          </View>

          <View style={styles.scrollContainer}>
            <FlatList
              data={[{ key: "content" }]}
              renderItem={() => (
                <>
                  {activeTab === "cases" ? (
                    /* Incoming Cases Section */
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                          <Ionicons
                            name="briefcase"
                            size={20}
                            color={palette.gold}
                          />
                          <Text style={styles.sectionTitle}>
                            Incoming Cases
                          </Text>
                        </View>
                        <View style={styles.sectionBadge}>
                          <Text style={styles.sectionBadgeText}>
                            {incoming?.length || 0}
                          </Text>
                        </View>
                      </View>

                      {loadingIncoming ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator
                            color={palette.gold}
                            size="large"
                          />
                          <Text style={styles.loadingText}>
                            Loading cases...
                          </Text>
                        </View>
                      ) : (incoming || []).length > 0 ? (
                        (incoming || []).map((item, index) => (
                          <View key={item._id}>
                            {renderIncoming({ item, index })}
                          </View>
                        ))
                      ) : (
                        incomingEmpty
                      )}
                    </View>
                  ) : (
                    /* Notifications Section */
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                          <Ionicons
                            name="list"
                            size={20}
                            color={palette.gold}
                          />
                          <Text style={styles.sectionTitle}>
                            All Notifications
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => userId && markAll.mutate(userId)}
                          style={({ pressed }) => [
                            styles.markAllButton,
                            pressed && {
                              opacity: 0.7,
                              transform: [{ scale: 0.97 }],
                            },
                          ]}
                          disabled={markAll.isPending}
                        >
                          {markAll.isPending ? (
                            <ActivityIndicator
                              color={palette.gold}
                              size="small"
                            />
                          ) : (
                            <>
                              <Ionicons
                                name="checkmark-done"
                                size={16}
                                color={palette.gold}
                              />
                              <Text style={styles.markAllText}>
                                Mark all read
                              </Text>
                            </>
                          )}
                        </Pressable>
                      </View>

                      {loadingNotifs ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator
                            color={palette.gold}
                            size="large"
                          />
                          <Text style={styles.loadingText}>
                            Loading notifications...
                          </Text>
                        </View>
                      ) : (notifications || []).length > 0 ? (
                        (notifications || []).map((item, index) => (
                          <View key={item._id}>
                            {renderNotification({ item, index })}
                          </View>
                        ))
                      ) : (
                        listEmpty
                      )}
                    </View>
                  )}
                </>
              )}
              keyExtractor={(item) => item.key}
              refreshing={refreshingAll}
              onRefresh={onRefreshAll}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
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
    paddingTop: 16,
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(198, 166, 103, 0.2)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(198, 166, 103, 0.3)",
  },
  countText: {
    color: palette.gold,
    fontWeight: "800",
    fontSize: 16,
  },
  section: {
    marginBottom: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: palette.light,
    fontWeight: "800",
    fontSize: 16,
  },
  sectionBadge: {
    backgroundColor: "rgba(198, 166, 103, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(198, 166, 103, 0.3)",
  },
  sectionBadgeText: {
    color: palette.gold,
    fontWeight: "700",
    fontSize: 12,
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(198, 166, 103, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(198, 166, 103, 0.3)",
  },
  markAllText: {
    color: palette.gold,
    fontWeight: "700",
    fontSize: 13,
  },
  incomingCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: 16,
  },
  incomingHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  incomingIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(198, 166, 103, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  incomingHeaderText: {
    flex: 1,
    gap: 6,
  },
  incomingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.navy,
    lineHeight: 22,
  },
  incomingMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  incomingMeta: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.slate,
  },
  newBadge: {
    backgroundColor: palette.gold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: palette.navy,
  },
  inputSection: {
    gap: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8f9fb",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#e5e8ed",
  },
  input: {
    flex: 1,
    color: palette.navy,
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: palette.gold,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptText: {
    color: palette.navy,
    fontSize: 15,
    fontWeight: "800",
  },
  declineButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "rgba(255, 107, 107, 0.3)",
  },
  declineText: {
    color: "#ff6b6b",
    fontSize: 15,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  notificationCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  notificationContent: {
    flexDirection: "row",
    gap: 12,
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(86, 99, 117, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationIconUnread: {
    backgroundColor: "rgba(198, 166, 103, 0.15)",
    borderWidth: 2,
    borderColor: "rgba(198, 166, 103, 0.3)",
  },
  notificationText: {
    flex: 1,
    gap: 6,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notificationType: {
    fontSize: 14,
    fontWeight: "800",
    color: palette.navy,
    textTransform: "capitalize",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.gold,
  },
  notificationMessage: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.slate,
    lineHeight: 20,
  },
  notificationCaseInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  notificationCaseId: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.slate,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(86, 99, 117, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    color: palette.light,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    color: palette.slate,
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    color: palette.light,
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 100,
  },
  tabSwitcher: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    padding: 4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  tabButtonActive: {
    backgroundColor: palette.gold,
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.light,
  },
  tabButtonTextActive: {
    color: palette.navy,
    fontWeight: "800",
  },
  tabBadge: {
    backgroundColor: palette.navy,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  tabBadgeText: {
    color: palette.gold,
    fontSize: 11,
    fontWeight: "800",
  },

  descriptionSection: {
    backgroundColor: "#f8f9fb",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e8ed",
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: palette.slate,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.navy,
    lineHeight: 20,
  },
});
