import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from "@/hooks/use-notifications";
import { ApiError, getAuthToken } from "@/services/api";
import { respondToFee } from "@/services/cases";
import type { NotificationItem } from "@/types/notification";
import { showToast } from "@/utils/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Enable RTL layout
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  slate: "#8B92A3",
  navyLight: "#0D1B2A",
  goldLight: "#D8C190",
};

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 65;

// Arabic translations
const translations = {
  notifications: "الإشعارات",
  markAllRead: "تعليم الكل كمقروء",
  marking: "جاري التعليم...",
  loadingNotifications: "جاري تحميل الإشعارات...",
  unableToLoad: "تعذر التحميل",
  somethingWrong: "حدث خطأ ما",
  tryAgain: "حاول مرة أخرى",
  alert: "تنبيه",
  unknownTime: "وقت غير معروف",
  nothingNew: "لا توجد إشعارات جديدة",
  nothingNewDescription: "سنرسل لك إشعارًا عند حدوث شيء مهم في قضاياك.",
  feeConfirmation: "تأكيد الرسوم",
  feeProposedMessage: "أكد الرسوم المقترحة من المحامي للمتابعة.",
  proposedFee: "الرسوم المقترحة:",
  feeFromLawyer: "مبلغ الرسوم قادم من محاميك.",
  reject: "رفض",
  confirm: "تأكيد",
  notifiedLawyer: "شكرًا! لقد أبلغنا محاميك بالرد.",
  unableToRespond: "تعذر إرسال ردك الآن.",
  rejectedViaModal: "تم الرفض عبر النافذة",
};

export default function NotificationsScreen() {
  const hasToken = Boolean(getAuthToken());
  const {
    data: notifications,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAll = useMarkAllNotificationsAsRead();
  const [activeNotification, setActiveNotification] =
    useState<NotificationItem | null>(null);

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
        message: translations.notifiedLawyer,
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

  useEffect(() => {
    if (respondMutation.isSuccess) {
      setActiveNotification(null);
    }
  }, [respondMutation.isSuccess]);
  const unauthorized = error instanceof ApiError && error.status === 401;

  useEffect(() => {
    if (unauthorized || !hasToken) {
      router.replace("/auth/sign-in");
    }
  }, [hasToken, unauthorized]);

  const notificationList = notifications ?? [];
  const hasUnread = notificationList.some((item) => !item.read);

  const handleNotificationPress = (item: NotificationItem) => {
    if (!item.read && !markAsRead.isPending) {
      markAsRead.mutate(item._id);
    }

    if (
      item.type === "CASE_FEE_PROPOSED" &&
      typeof item.data?.caseId === "string"
    ) {
      setActiveNotification(item);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const timestamp = item.createdAt
      ? new Date(item.createdAt).toLocaleString("ar-EG")
      : translations.unknownTime;

    return (
      <Pressable
        onPress={() => handleNotificationPress(item)}
        style={({ pressed }) => [
          styles.card,
          !item.read && styles.cardUnread,
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={styles.cardRow}>
          <ThemedText style={styles.cardType}>
            {item.type ?? translations.alert}
          </ThemedText>
          {!item.read ? <View style={styles.unreadDot} /> : null}
        </View>
        <ThemedText style={styles.cardMessage}>{item.message}</ThemedText>
        <ThemedText style={styles.cardTimestamp}>{timestamp}</ThemedText>
      </Pressable>
    );
  };

  const ListEmpty = () => (
    <View style={styles.emptyState}>
      <ThemedText style={styles.emptyTitle}>
        {translations.nothingNew}
      </ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        {translations.nothingNewDescription}
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: palette.navy }]}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <ThemedText type="title" style={styles.title}>
            {translations.notifications}
          </ThemedText>
          {hasUnread ? (
            <Pressable
              onPress={() => markAll.mutate()}
              style={({ pressed }) => [
                styles.markAllButton,
                pressed && { opacity: 0.8 },
              ]}
              disabled={markAll.isPending}
            >
              <ThemedText style={styles.markAllText}>
                {markAll.isPending
                  ? translations.marking
                  : translations.markAllRead}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={palette.gold} />
            <ThemedText style={styles.loaderText}>
              {translations.loadingNotifications}
            </ThemedText>
          </View>
        ) : isError ? (
          <View style={styles.errorBox}>
            <ThemedText style={styles.errorTitle}>
              {translations.unableToLoad}
            </ThemedText>
            <ThemedText style={styles.errorText}>
              {(error as Error)?.message ?? translations.somethingWrong}
            </ThemedText>
            <Pressable onPress={() => refetch()} style={styles.retryButton}>
              <ThemedText style={styles.retryText}>
                {translations.tryAgain}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={notificationList}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            contentContainerStyle={
              notificationList.length === 0 ? styles.emptyList : undefined
            }
            refreshControl={
              <RefreshControl
                refreshing={isFetching}
                onRefresh={() => refetch()}
                tintColor={palette.gold}
                colors={[palette.gold]}
              />
            }
            ListEmptyComponent={ListEmpty}
          />
        )}
      </View>
      <Modal
        visible={Boolean(activeNotification)}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveNotification(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActiveNotification(null)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  Platform.OS === "ios" ? palette.navyLight : "#111827",
                borderColor: palette.gold + "40",
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalBadge}>
              <View style={styles.modalDot} />
              <ThemedText style={styles.modalBadgeText}>
                {translations.feeConfirmation}
              </ThemedText>
            </View>
            <ThemedText style={styles.modalTitle}>
              {activeNotification?.message || translations.feeProposedMessage}
            </ThemedText>
            <ThemedText style={styles.modalDescription}>
              {activeNotification?.data?.fee
                ? `${translations.proposedFee} ${activeNotification?.data?.fee}$`
                : translations.feeFromLawyer}
            </ThemedText>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalSecondaryButton,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {
                  if (!activeNotification?.data?.caseId) return;
                  respondMutation.mutate({
                    caseId: activeNotification.data.caseId,
                    payload: {
                      accept: false,
                      note: translations.rejectedViaModal,
                    },
                  });
                }}
                disabled={respondMutation.isPending}
              >
                <ThemedText style={styles.modalActionText}>
                  {translations.reject}
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalPrimaryButton,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => {
                  if (!activeNotification?.data?.caseId) return;
                  respondMutation.mutate({
                    caseId: activeNotification.data.caseId,
                    payload: { accept: true },
                  });
                }}
                disabled={respondMutation.isPending}
              >
                {respondMutation.isPending ? (
                  <ActivityIndicator size="small" color={palette.navy} />
                ) : null}
                <ThemedText style={styles.modalActionText}>
                  {translations.confirm}
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
    marginTop: 50,
    paddingBottom: TAB_BAR_HEIGHT,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    color: palette.gold,
    fontSize: 25,
    fontWeight: "800",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  markAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.gold,
  },
  markAllText: {
    color: palette.gold,
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loaderText: {
    color: palette.goldLight,
    fontWeight: "600",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  errorBox: {
    flex: 1,
    backgroundColor: "#1F2937",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.gold,
    alignItems: "center",
    gap: 12,
  },
  errorTitle: {
    color: "#F87171",
    fontWeight: "700",
    fontSize: 18,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  errorText: {
    color: palette.slate,
    textAlign: "center",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: palette.gold,
  },
  retryText: {
    color: "#0A2436",
    fontWeight: "800",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: palette.navyLight,
    borderWidth: 1,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cardUnread: {
    borderColor: palette.gold,
    backgroundColor: palette.goldLight + "10",
  },
  cardRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardType: {
    color: palette.gold,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  cardMessage: {
    color: "#F8FAFC",
    lineHeight: 22,
    marginBottom: 8,
    fontWeight: "600",
    textAlign: "right",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  cardTimestamp: {
    color: palette.slate,
    fontSize: 11,
    letterSpacing: 0.2,
    textAlign: "right",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.gold,
  },
  emptyList: {
    paddingTop: 32,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 40,
  },
  emptyTitle: {
    color: palette.gold,
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  emptySubtitle: {
    color: palette.slate,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 15, 32, 0.75)",
    justifyContent: "flex-end",
    padding: 24,
  },
  modalCard: {
    borderRadius: 28,
    borderWidth: 2,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 20,
  },
  modalBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  modalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.gold,
  },
  modalBadgeText: {
    color: palette.goldLight,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
    textAlign: "right",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  modalDescription: {
    color: "#E0E7FF",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "right",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  modalActions: {
    flexDirection: "row-reverse",
    gap: 12,
    justifyContent: "space-between",
  },
  modalSecondaryButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: palette.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  modalActionText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: "NotoNaskhArabic-Bold",
  },
});
