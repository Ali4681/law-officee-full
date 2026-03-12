import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  I18nManager,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useCases } from "@/hooks/use-cases";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCourts } from "@/hooks/use-courts";
import { ApiError, getAuthToken, getCurrentUserId } from "@/services/api";
import { respondToFee } from "@/services/cases";
import { ChatService } from "@/services/chat.service";
import type { CaseSummary } from "@/types/case";
import { showToast } from "@/utils/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Enable RTL layout
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  light: "#F2F2F2",
  slate: "#566375",
  navyLight: "#1A3650",
  goldLight: "#D8C190",
};

// Arabic translations
const translations = {
  title: "قضاياك",
  casesInProgress: "قضية قيد التنفيذ",
  loadingCases: "جاري تحميل قضاياك...",
  unableToLoad: "تعذر تحميل القضايا",
  sessionExpired: "انتهت صلاحية جلستك. الرجاء تسجيل الدخول مرة أخرى.",
  somethingWrong: "حدث خطأ ما",
  signInAgain: "تسجيل الدخول مرة أخرى",
  noCases: "لا توجد قضايا بعد",
  noCasesDescription:
    "ليس لديك أي قضايا معينة بعد. سيقوم محاميك بإنشاء قضايا لك.",
  unknown: "غير معروف",
  court: "المحكمة",
  noDate: "لا يوجد تاريخ",
  confirm: "تأكيد",
  reject: "رفض",
  messageLawyer: "مراسلة المحامي",
  rejectFeeProposal: "رفض مقترح الرسوم",
  rejectConfirmation: "هل أنت متأكد من رفض هذه الرسوم؟",
  cancel: "إلغاء",
  sentFeeResponse: "تم إرسال ردك على الرسوم إلى المحامي.",
  unableToRespond: "تعذر الرد على الرسوم الآن.",
  unableToOpenChat: "تعذر فتح الدردشة لهذه القضية الآن.",
  rejectedViaApp: "تم الرفض عبر التطبيق",
};

export default function CasesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const authToken = getAuthToken();
  const hasToken = Boolean(authToken);
  const currentUserId = getCurrentUserId();
  const [creatingChatForCase, setCreatingChatForCase] = useState<string | null>(
    null,
  );
  const { data, isFetching, refetch, isLoading, isError, error } = useCases();
  const { data: courts } = useCourts({ enabled: hasToken });
  const unauthorized = error instanceof ApiError && error.status === 401;
  const queryClient = useQueryClient();
  const respondMutation = useMutation({
    mutationFn: ({
      caseId,
      payload,
    }: {
      caseId: string;
      payload: { accept: boolean; note?: string };
    }) => respondToFee(caseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === "cases",
      });
      showToast({
        message: translations.sentFeeResponse,
        type: "success",
      });
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : translations.unableToRespond;
      showToast({ message, type: "error" });
    },
  });

  const cases = useMemo(() => data ?? [], [data]);
  const courtLookup = useMemo(() => {
    const map: Record<string, string> = {};
    (courts ?? []).forEach((court) => {
      if (court?._id && court?.name) {
        map[court._id] = court.name;
      }
    });
    return map;
  }, [courts]);

  const textColor = palette.light;
  const metaColor = palette.goldLight;

  useEffect(() => {
    if (unauthorized || !hasToken) {
      const timer = setTimeout(() => {
        router.replace("/auth/sign-in");
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [router, unauthorized, hasToken]);

  const getStatusColor = (status?: string) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower.includes("active") || statusLower.includes("open"))
      return "#059669";
    if (statusLower.includes("closed") || statusLower.includes("complete"))
      return "#6B7280";
    if (
      statusLower.includes("client_rejected") ||
      statusLower.includes("rejected")
    )
      return "#DC2626";
    if (
      statusLower.includes("pending") ||
      statusLower.includes("fee_proposed") ||
      statusLower.includes("info_requested")
    )
      return "#D97706";
    return palette.slate;
  };

  const resolveCourtName = (court?: CaseSummary["court"]) => {
    if (!court) return null;
    if (typeof court === "object") {
      if (court.name) return court.name;
      if (court._id) return courtLookup[court._id] ?? null;
      return null;
    }
    return courtLookup[court] ?? court;
  };

  const navigateToChat = (chatId: string, receiverId: string) => {
    router.push({
      pathname: "/(tabs)/chat",
      params: { chatId, receiverId },
    });
  };

  const resolveReceiverId = (chat?: CaseSummary["chat"]) => {
    if (!chat) return undefined;
    if (chat.otherUser?.id) return chat.otherUser.id;
    if (chat.user1Id === currentUserId) return chat.user2Id;
    if (chat.user2Id === currentUserId) return chat.user1Id;
    return undefined;
  };

  const extractLawyerId = (item: CaseSummary) =>
    item.lawyerId ??
    item.lawyer?._id ??
    item.preferredLawyerId ??
    item.assignedLawyerId ??
    item.chat?.otherUser?.id;

  const handleMessageCase = async (item: CaseSummary) => {
    if (!currentUserId) {
      router.replace("/auth/sign-in");
      return;
    }

    setCreatingChatForCase(item._id);
    try {
      let chatId = item.chatId ?? item.chat?._id;
      let receiverId = resolveReceiverId(item.chat);

      if (!chatId || !receiverId) {
        const lawyerId = extractLawyerId(item);
        if (!lawyerId) {
          showToast({
            message: translations.unableToOpenChat,
            type: "error",
          });
          return;
        }

        const chat = await ChatService.create(currentUserId, lawyerId);
        chatId = chat._id;
        receiverId = lawyerId;
      }

      navigateToChat(chatId, receiverId);
    } catch (err) {
      console.error(err);
      showToast({
        message:
          err instanceof Error ? err.message : translations.unableToOpenChat,
        type: "error",
      });
    } finally {
      setCreatingChatForCase(null);
    }
  };

  const renderItem = ({ item }: { item: CaseSummary }) => {
    const statusLower = (item.status ?? "").toLowerCase();
    const isFeeProposed = statusLower === "fee_proposed";
    const courtLabel = resolveCourtName(item.court);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor:
              colorScheme === "dark" ? palette.navyLight : "#FFFFFF",
            borderColor: palette.gold + "40",
            opacity: pressed ? 0.95 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        onPress={() => {
          // Navigate to case details
        }}
      >
        {/* Gold accent bar */}
        <View style={[styles.accentBar, { backgroundColor: palette.gold }]} />

        {/* Case Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.caseIconContainer,
                {
                  backgroundColor: palette.gold + "15",
                  borderColor: palette.gold + "30",
                },
              ]}
            >
              <ThemedText style={styles.caseIconText}>⚖️</ThemedText>
            </View>
            <View style={styles.headerTextContainer}>
              <ThemedText
                type="subtitle"
                style={[styles.title, { color: textColor }]}
              >
                {item.title}
              </ThemedText>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getStatusColor(item.status) + "20",
                    borderColor: getStatusColor(item.status),
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(item.status) },
                  ]}
                />
                <ThemedText style={[styles.statusText, { color: textColor }]}>
                  {item.status ?? translations.unknown}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Description */}
        {item.description ? (
          <View style={styles.descriptionContainer}>
            <ThemedText
              style={[styles.body, { color: metaColor }]}
              numberOfLines={2}
            >
              {item.description}
            </ThemedText>
          </View>
        ) : null}

        {/* Meta Information Grid */}
        {courtLabel ? (
          <View style={styles.metaGrid}>
            <View
              style={[
                styles.metaCard,
                {
                  backgroundColor: palette.gold + "10",
                  borderColor: palette.gold + "20",
                },
              ]}
            >
              <View style={styles.metaCardHeader}>
                <View
                  style={[
                    styles.metaIconCircle,
                    { backgroundColor: palette.gold + "25" },
                  ]}
                >
                  <ThemedText style={{ fontSize: 16 }}>🏛️</ThemedText>
                </View>
                <ThemedText
                  style={[styles.metaCardLabel, { color: palette.gold }]}
                >
                  {translations.court}
                </ThemedText>
              </View>
              <ThemedText
                style={[styles.metaCardValue, { color: textColor }]}
                numberOfLines={1}
              >
                {courtLabel}
              </ThemedText>
            </View>
          </View>
        ) : null}

        {/* Footer with date/time */}
        <View
          style={[styles.cardFooter, { borderTopColor: palette.gold + "20" }]}
        >
          <View style={styles.footerItem}>
            <ThemedText style={[styles.footerText, { color: metaColor }]}>
              تاريخ الإنشاء
            </ThemedText>
          </View>
          <View style={[styles.footerItem, { justifyContent: "flex-start" }]}>
            <ThemedText style={[styles.footerText, { color: metaColor }]}>
              {item.createdAt
                ? new Date(item.createdAt).toLocaleDateString("ar-EG")
                : translations.noDate}
            </ThemedText>
          </View>
        </View>
        <View style={styles.cardActions}>
          {isFeeProposed ? (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.confirmButton,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() =>
                  respondMutation.mutate({
                    caseId: item._id,
                    payload: { accept: true },
                  })
                }
                disabled={respondMutation.isPending}
              >
                <ThemedText style={styles.actionText}>
                  {translations.confirm}
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.rejectButton,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => {
                  Alert.alert(
                    translations.rejectFeeProposal,
                    translations.rejectConfirmation,
                    [
                      { text: translations.cancel, style: "cancel" },
                      {
                        text: translations.reject,
                        style: "destructive",
                        onPress: () =>
                          respondMutation.mutate({
                            caseId: item._id,
                            payload: {
                              accept: false,
                              note: translations.rejectedViaApp,
                            },
                          }),
                      },
                    ],
                  );
                }}
                disabled={respondMutation.isPending}
              >
                <ThemedText style={styles.actionText}>
                  {translations.reject}
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.chatButton,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => handleMessageCase(item)}
              disabled={creatingChatForCase === item._id}
            >
              {creatingChatForCase === item._id ? (
                <ActivityIndicator size="small" color={palette.gold} />
              ) : (
                <ThemedText style={[styles.actionText, styles.chatText]}>
                  {translations.messageLawyer}
                </ThemedText>
              )}
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.navy }]}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View>
          <ThemedText
            type="title"
            style={[styles.heading, { color: textColor }]}
          >
            {translations.title}
          </ThemedText>
          <ThemedText style={[styles.subheading, { color: metaColor }]}>
            {cases.length}{" "}
            {translations.casesInProgress}
          </ThemedText>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.gold} />
          <ThemedText style={[styles.loadingText, { color: metaColor }]}>
            {translations.loadingCases}
          </ThemedText>
        </View>
      ) : isError ? (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" },
          ]}
        >
          <View style={styles.errorIcon}>
            <ThemedText style={{ fontSize: 24 }}>⚠️</ThemedText>
          </View>
          <View style={styles.errorContent}>
            <ThemedText style={styles.errorTitle}>
              {translations.unableToLoad}
            </ThemedText>
            <ThemedText style={styles.errorText}>
              {unauthorized
                ? translations.sessionExpired
                : ((error as Error)?.message ?? translations.somethingWrong)}
            </ThemedText>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: palette.navy, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.replace("/auth/sign-in")}
          >
            <ThemedText style={styles.retryText}>
              {translations.signInAgain}
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={palette.gold}
              colors={[palette.gold]}
            />
          }
          ListEmptyComponent={
            <View
              style={[
                styles.emptyContainer,
                {
                  backgroundColor:
                    colorScheme === "dark" ? palette.navyLight : "#FFFFFF",
                  borderColor: palette.gold + "40",
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: palette.gold + "20" },
                ]}
              >
                <ThemedText style={{ fontSize: 48 }}>📂</ThemedText>
              </View>
              <ThemedText style={[styles.emptyTitle, { color: textColor }]}>
                {translations.noCases}
              </ThemedText>
              <ThemedText style={[styles.emptyText, { color: metaColor }]}>
                {translations.noCasesDescription}
              </ThemedText>
            </View>
          }
        />
      )}

      {/* Floating Action Button */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: palette.gold,
            opacity: pressed || isFetching ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
        onPress={() => router.push("/courts")}
      >
        <ThemedText style={styles.fabText}>+</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    padding: 20,
    paddingTop: 56,
  },
  headerSection: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 12,
  },
  heading: {
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: 0.3,
    textAlign: "right",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  subheading: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: "600",
    textAlign: "right",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  statsCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 70,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: "800",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  list: {
    paddingBottom: 100,
  },
  card: {
    borderRadius: 24,
    padding: 0,
    borderWidth: 2,
    shadowColor: palette.gold,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    overflow: "hidden",
  },
  accentBar: {
    height: 5,
    width: "100%",
  },
  cardHeader: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 18,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 14,
    flex: 1,
  },
  caseIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowColor: palette.gold,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  caseIconText: {
    fontSize: 26,
  },
  headerTextContainer: {
    flex: 1,
    gap: 10,
    alignItems: "flex-end",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.3,
    lineHeight: 24,
    textAlign: "right",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  statusBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1.5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  descriptionContainer: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  body: {
    lineHeight: 22,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  metaGrid: {
    flexDirection: "row-reverse",
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  metaCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  metaCardHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  metaIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  metaCardLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  metaCardValue: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "right",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  cardFooter: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1.5,
  },
  footerItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  footerIcon: {
    fontSize: 14,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  footerDivider: {
    width: 2,
    height: 20,
    borderRadius: 1,
  },
  cardActions: {
    flexDirection: "row-reverse",
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButton: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  rejectButton: {
    borderColor: "#EF4444",
  },
  chatButton: {
    backgroundColor: palette.goldLight + "15",
    borderColor: palette.goldLight + "40",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  chatText: {
    color: palette.goldLight,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  errorBox: {
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  errorIcon: {
    alignSelf: "center",
  },
  errorContent: {
    gap: 6,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#991B1B",
    textAlign: "center",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  errorText: {
    fontSize: 14,
    color: "#B91C1C",
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  retryButton: {
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  emptyContainer: {
    marginTop: 40,
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    gap: 16,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  emptyText: {
    textAlign: "center",
    lineHeight: 22,
    fontSize: 15,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  fab: {
    position: "absolute",
    left: 24,
    bottom: 150,
    zIndex: 10,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 50,
    fontFamily: "NotoNaskhArabic-Bold",
  },
});
