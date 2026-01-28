import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCourtLawyers } from "@/hooks/use-court-lawyers";
import { ApiError, getCurrentUserId } from "@/services/api";
import { RequestCaseDto, requestCase } from "@/services/cases";
import { ChatService } from "@/services/chat.service";
import type { Lawyer } from "@/types/lawyer";
import { showToast } from "@/utils/toast";

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  light: "#F2F2F2",
  slate: "#566375",
  navyLight: "#1A3650",
  goldLight: "#D8C190",
};

const getLawyerName = (lawyer: Lawyer) => {
  const first = lawyer.profile?.firstName?.trim();
  const last = lawyer.profile?.lastName?.trim();
  if (first || last) return `${first ?? ""} ${last ?? ""}`.trim();
  if (lawyer.email) return lawyer.email;
  return "محامي";
};

type CourtLawyersParams = {
  courtId?: string;
  courtName?: string;
};

export default function CourtLawyersScreen() {
  const colorScheme = useColorScheme();
  const { courtId, courtName } = useLocalSearchParams<CourtLawyersParams>();
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [requestingLawyerId, setRequestingLawyerId] = useState<string | null>(
    null,
  );
  const [requestSentLawyer, setRequestSentLawyer] = useState<Lawyer | null>(
    null,
  );
  const [creatingChatFor, setCreatingChatFor] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: lawyers,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useCourtLawyers(courtId);

  // Fix: Ensure lawyerList is always an array
  const lawyerList: Lawyer[] = Array.isArray(lawyers) ? lawyers : [];

  const authError = error instanceof ApiError && error.status === 401;

  useEffect(() => {
    if (authError) {
      router.replace("/auth/sign-in");
    }
  }, [authError]);

  const requestMutation = useMutation({
    mutationFn: (payload: RequestCaseDto) => requestCase(payload),
  });

  const closeModal = () => {
    setSelectedLawyer(null);
    setRequestTitle("");
    setRequestDescription("");
    requestMutation.reset();
    setFormError(null);
  };

  const handleSubmitRequest = async () => {
    if (!selectedLawyer || !courtId) return;
    const trimmedTitle = requestTitle.trim();
    const trimmedDescription = requestDescription.trim();
    if (!trimmedTitle) {
      setFormError("الرجاء إدخال عنوان القضية.");
      return;
    }
    if (!trimmedDescription) {
      setFormError("الرجاء وصف موضوعك القانوني.");
      return;
    }

    setFormError(null);
    setRequestingLawyerId(selectedLawyer._id);
    try {
      await requestMutation.mutateAsync({
        title: trimmedTitle,
        description: trimmedDescription,
        court: courtId,
        preferredLawyerId: selectedLawyer._id,
      });
      setRequestSentLawyer(selectedLawyer);
      closeModal();
    } finally {
      setRequestingLawyerId(null);
    }
  };

  const openRequestModal = (lawyer: Lawyer) => {
    setRequestTitle("");
    setRequestDescription("");
    requestMutation.reset();
    setRequestSentLawyer(null);
    setFormError(null);
    setSelectedLawyer(lawyer);
  };

  const requestErrorMessage =
    requestMutation.isError && requestMutation.error instanceof Error
      ? requestMutation.error.message
      : requestMutation.isError
        ? "تعذر إرسال هذا الطلب."
        : undefined;

  const navigateToChat = (chatId: string, receiverId: string) => {
    router.push({
      pathname: "/(tabs)/chat",
      params: { chatId, receiverId },
    });
  };

  const handleMessagePress = async (lawyer: Lawyer) => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      router.replace("/auth/sign-in");
      return;
    }

    if (creatingChatFor) return;

    try {
      setCreatingChatFor(lawyer._id);
      const chat = await ChatService.create(currentUserId, lawyer._id);

      if (!chat || !chat._id) {
        showToast({
          message: "تعذر فتح المحادثة مع هذا المحامي في الوقت الحالي.",
          type: "error",
        });
        return;
      }

      navigateToChat(chat._id, lawyer._id);
    } catch (err) {
      console.error(err);
      showToast({
        message:
          err instanceof Error
            ? err.message
            : "تعذر فتح المحادثة في الوقت الحالي.",
        type: "error",
      });
    } finally {
      setCreatingChatFor(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.navy }]}>
      {/* زر العودة */}
      <Pressable
        style={({ pressed }) => [
          styles.backButton,
          {
            backgroundColor: palette.gold + "20",
            borderColor: palette.gold,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        onPress={() => router.back()}
      >
        <ThemedText style={[styles.backArrow, { color: palette.gold }]}>
          →
        </ThemedText>
      </Pressable>

      {/* قسم الهيدر */}
      <View style={styles.headerSection}>
        <View style={styles.headerContent}>
          <View
            style={[
              styles.headerIcon,
              {
                backgroundColor: palette.gold + "20",
                borderColor: palette.gold,
              },
            ]}
          >
            <ThemedText style={{ fontSize: 32 }}>👨‍⚖️</ThemedText>
          </View>

          <View style={styles.headerText}>
            <ThemedText
              type="title"
              style={[styles.heading, { color: palette.light }]}
            >
              {courtName ?? "المحامون المتاحون"}
            </ThemedText>
            <ThemedText
              style={[styles.subheading, { color: palette.goldLight }]}
            >
              اختر محامياً لإرسال طلب قضيتك
            </ThemedText>
          </View>
        </View>

        {/* شارة الإحصائيات */}
        <View
          style={[
            styles.statsBadge,
            {
              backgroundColor: palette.gold + "15",
              borderColor: palette.gold + "30",
            },
          ]}
        >
          <ThemedText style={[styles.statsNumber, { color: palette.gold }]}>
            {lawyerList.length}
          </ThemedText>
          <ThemedText style={[styles.statsLabel, { color: palette.light }]}>
            محامي
          </ThemedText>
        </View>
      </View>

      {/* لافتة النجاح */}
      {requestSentLawyer ? (
        <View
          style={[
            styles.successBanner,
            {
              backgroundColor: palette.gold + "15",
              borderColor: palette.gold,
            },
          ]}
        >
          <View style={styles.successIconContainer}>
            <ThemedText style={{ fontSize: 24 }}>✓</ThemedText>
          </View>
          <View style={styles.successContent}>
            <ThemedText style={[styles.successTitle, { color: palette.gold }]}>
              تم إرسال الطلب بنجاح
            </ThemedText>
            <ThemedText style={[styles.successText, { color: palette.light }]}>
              سيقوم {getLawyerName(requestSentLawyer)} بمراجعة طلبك وسيتصل بك
              قريباً.
            </ThemedText>
          </View>
        </View>
      ) : null}

      {/* رسالة الخطأ */}
      {requestErrorMessage ? (
        <View style={styles.errorBox}>
          <View style={styles.errorIconContainer}>
            <ThemedText style={{ fontSize: 20 }}>⚠️</ThemedText>
          </View>
          <View style={styles.errorContent}>
            <ThemedText style={styles.errorTitle}>فشل إرسال الطلب</ThemedText>
            <ThemedText style={styles.errorText}>
              {requestErrorMessage}
            </ThemedText>
          </View>
        </View>
      ) : null}

      {/* المحتوى */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.gold} />
          <ThemedText
            style={[styles.loadingText, { color: palette.goldLight }]}
          >
            جاري تحميل المحامين...
          </ThemedText>
        </View>
      ) : isError ? (
        <View style={[styles.errorBox, styles.networkError]}>
          <View style={styles.errorIconContainer}>
            <ThemedText style={{ fontSize: 24 }}>⚠️</ThemedText>
          </View>
          <View style={styles.errorContent}>
            <ThemedText style={styles.errorTitle}>
              تعذر تحميل المحامين
            </ThemedText>
            <ThemedText style={styles.errorText}>
              {(error as Error)?.message ??
                "حدثت مشكلة في تحميل قائمة المحامين."}
            </ThemedText>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: palette.gold, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => refetch()}
          >
            <ThemedText style={styles.retryText}>إعادة المحاولة</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={lawyerList}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={palette.gold}
              colors={[palette.gold]}
            />
          }
          renderItem={({ item }) => {
            const disabled =
              Boolean(requestingLawyerId) && requestingLawyerId !== item._id;
            const isLoadingLawyer =
              requestingLawyerId === item._id && requestMutation.isPending;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.lawyerCard,
                  {
                    backgroundColor:
                      colorScheme === "dark" ? palette.navyLight : "#FFFFFF",
                    borderColor: palette.gold + "40",
                    opacity: pressed ? 0.95 : disabled ? 0.5 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
                onPress={() => openRequestModal(item)}
                disabled={disabled}
              >
                {/* الشريط الذهبي */}
                <View
                  style={[styles.accentBar, { backgroundColor: palette.gold }]}
                />

                <View style={styles.cardContent}>
                  {/* هيدر المحامي */}
                  <View style={styles.lawyerHeader}>
                    <View
                      style={[
                        styles.lawyerAvatar,
                        {
                          backgroundColor: palette.gold + "20",
                          borderColor: palette.gold + "30",
                        },
                      ]}
                    >
                      <ThemedText style={{ fontSize: 28 }}>👨‍💼</ThemedText>
                    </View>

                    <View style={styles.lawyerDetails}>
                      <ThemedText
                        style={[styles.lawyerName, { color: palette.light }]}
                        numberOfLines={1}
                      >
                        {getLawyerName(item)}
                      </ThemedText>
                      {item.profile?.title && (
                        <View
                          style={[
                            styles.titleBadge,
                            {
                              backgroundColor: palette.goldLight + "20",
                              borderColor: palette.goldLight + "40",
                            },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.titleText,
                              { color: palette.goldLight },
                            ]}
                          >
                            {item.profile.title}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        styles.messageButton,
                        pressed && { opacity: 0.8 },
                        creatingChatFor === item._id && { opacity: 0.6 },
                      ]}
                      onPress={() => handleMessagePress(item)}
                      disabled={creatingChatFor === item._id}
                    >
                      {creatingChatFor === item._id ? (
                        <ActivityIndicator size="small" color={palette.navy} />
                      ) : (
                        <ThemedText style={styles.messageButtonText}>
                          محادثة
                        </ThemedText>
                      )}
                    </Pressable>
                  </View>

                  {/* معلومات التواصل */}
                  {(item.email || item.profile?.phone) && (
                    <View style={styles.contactSection}>
                      {item.email && (
                        <View style={styles.contactRow}>
                          <ThemedText style={{ fontSize: 14 }}>📧</ThemedText>
                          <ThemedText
                            style={[
                              styles.contactText,
                              { color: palette.goldLight },
                            ]}
                            numberOfLines={1}
                          >
                            {item.email}
                          </ThemedText>
                        </View>
                      )}
                      {item.profile?.phone && (
                        <View style={styles.contactRow}>
                          <ThemedText style={{ fontSize: 14 }}>📞</ThemedText>
                          <ThemedText
                            style={[
                              styles.contactText,
                              { color: palette.goldLight },
                            ]}
                          >
                            {item.profile.phone}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  )}

                  {/* زر الإجراء */}
                  <View
                    style={[
                      styles.cardFooter,
                      { borderTopColor: palette.gold + "20" },
                    ]}
                  >
                    <View
                      style={[styles.cta, { backgroundColor: palette.gold }]}
                    >
                      {isLoadingLawyer ? (
                        <ActivityIndicator size="small" color={palette.navy} />
                      ) : (
                        <>
                          <ThemedText style={styles.ctaText}>
                            إرسال الطلب
                          </ThemedText>
                          <ThemedText
                            style={[styles.ctaArrow, { color: palette.navy }]}
                          >
                            →
                          </ThemedText>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
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
                <ThemedText style={{ fontSize: 48 }}>👨‍⚖️</ThemedText>
              </View>
              <ThemedText style={[styles.emptyTitle, { color: palette.light }]}>
                لا يوجد محامون متاحون
              </ThemedText>
              <ThemedText
                style={[styles.emptyText, { color: palette.goldLight }]}
              >
                لا يوجد حالياً محامون معتمدون في هذه المحكمة. يرجى التحقق
                لاحقاً.
              </ThemedText>
            </View>
          }
        />
      )}

      {/* نافذة الطلب */}
      <Modal
        visible={Boolean(selectedLawyer)}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalWrapper}
        >
          <Pressable style={styles.modalOverlay} onPress={closeModal}>
            <Pressable
              style={[
                styles.modalContent,
                {
                  backgroundColor:
                    colorScheme === "dark" ? palette.navyLight : "#FFFFFF",
                  borderColor: palette.gold + "40",
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* هيدر النافذة */}
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: palette.gold + "20" },
                ]}
              >
                <View
                  style={[
                    styles.modalIconContainer,
                    {
                      backgroundColor: palette.gold + "20",
                      borderColor: palette.gold + "30",
                    },
                  ]}
                >
                  <ThemedText style={{ fontSize: 24 }}>⚖️</ThemedText>
                </View>
                <View style={styles.modalHeaderText}>
                  <ThemedText
                    style={[styles.modalTitle, { color: palette.light }]}
                    numberOfLines={2}
                  >
                    طلب إلى{" "}
                    {selectedLawyer ? getLawyerName(selectedLawyer) : "محامي"}
                  </ThemedText>
                  <ThemedText
                    style={[styles.modalSubtitle, { color: palette.goldLight }]}
                  >
                    {courtName ?? "وصف الموضوع القانوني"}
                  </ThemedText>
                </View>
              </View>

              {/* حقول النموذج */}
              <View style={styles.modalForm}>
                <View style={styles.inputGroup}>
                  <ThemedText
                    style={[styles.inputLabel, { color: palette.light }]}
                  >
                    عنوان القضية *
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor:
                          colorScheme === "dark" ? palette.navy : "#F7F7F8",
                        color: palette.light,
                        borderColor: palette.gold + "30",
                        textAlign: "right",
                      },
                    ]}
                    placeholder="أدخل عنوان القضية"
                    placeholderTextColor={palette.slate}
                    value={requestTitle}
                    onChangeText={setRequestTitle}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText
                    style={[styles.inputLabel, { color: palette.light }]}
                  >
                    الوصف *
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.modalInput,
                      styles.modalDescription,
                      {
                        backgroundColor:
                          colorScheme === "dark" ? palette.navy : "#F7F7F8",
                        color: palette.light,
                        borderColor: palette.gold + "30",
                        textAlign: "right",
                        writingDirection: "rtl",
                      },
                    ]}
                    placeholder="وصف الموضوع القانوني..."
                    placeholderTextColor={palette.slate}
                    value={requestDescription}
                    onChangeText={setRequestDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* رسالة الخطأ */}
              {requestMutation.isError && (
                <View style={styles.modalError}>
                  <ThemedText style={styles.modalErrorText}>
                    {requestMutation.error instanceof Error
                      ? requestMutation.error.message
                      : "تعذر إرسال الطلب."}
                  </ThemedText>
                </View>
              )}
              {formError ? (
                <View style={styles.modalError}>
                  <ThemedText style={styles.modalErrorText}>
                    {formError}
                  </ThemedText>
                </View>
              ) : null}

              {/* أزرار النافذة */}
              <View style={styles.modalActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalSecondaryButton,
                    {
                      borderColor: palette.gold + "40",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={closeModal}
                  disabled={requestMutation.isPending}
                >
                  <ThemedText
                    style={[styles.modalButtonText, { color: palette.light }]}
                  >
                    إلغاء
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalPrimaryButton,
                    {
                      backgroundColor: palette.gold,
                      opacity: pressed || requestMutation.isPending ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleSubmitRequest}
                  disabled={
                    requestMutation.isPending ||
                    !requestTitle.trim() ||
                    !requestDescription.trim()
                  }
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {requestMutation.isPending && (
                      <ActivityIndicator size="small" color={palette.navy} />
                    )}
                    <ThemedText
                      style={[styles.modalButtonText, { color: palette.navy }]}
                    >
                      {requestMutation.isPending
                        ? "جاري الإرسال..."
                        : "إرسال الطلب"}
                    </ThemedText>
                  </View>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 100,
  },
  backButton: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowColor: palette.gold,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 10,
  },
  backArrow: {
    fontSize: 24,
    fontWeight: "800",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  headerSection: {
    marginBottom: 24,
    marginTop: 20,
    gap: 16,
  },
  headerContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 16,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowColor: palette.gold,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  headerText: {
    flex: 1,
    gap: 6,
    alignItems: "flex-end",
  },
  heading: {
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "NotoNaskhArabic-Bold",
    textAlign: "right",
  },
  subheading: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    fontFamily: "NotoNaskhArabic-Bold",
    textAlign: "right",
  },
  statsBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  statsNumber: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  statsLabel: {
    fontSize: 16,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  list: {
    paddingBottom: 40,
  },
  lawyerCard: {
    borderRadius: 24,
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
  cardContent: {
    padding: 18,
    gap: 14,
  },
  lawyerHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 14,
  },
  lawyerAvatar: {
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
  lawyerDetails: {
    flex: 1,
    gap: 8,
    alignItems: "flex-end",
  },
  lawyerName: {
    fontSize: 18,
    fontWeight: "800",
    fontFamily: "NotoNaskhArabic-Bold",
    textAlign: "right",
  },
  titleBadge: {
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  titleText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  contactSection: {
    gap: 8,
    paddingTop: 4,
  },
  contactRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  contactText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "NotoNaskhArabic-Regular",
    textAlign: "right",
  },
  cardFooter: {
    paddingTop: 14,
    borderTopWidth: 1.5,
  },
  cta: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "800",
    color: palette.navy,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  ctaArrow: {
    fontSize: 18,
    fontWeight: "800",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  messageButton: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: palette.gold,
    padding: 10,
  },
  messageButtonText: {
    color: palette.gold,
    fontWeight: "700",
    fontFamily: "NotoNaskhArabic-Bold",
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
    fontFamily: "NotoNaskhArabic-Regular",
  },
  errorBox: {
    marginTop: 16,
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEE2E2",
    gap: 12,
    flexDirection: "row-reverse",
  },
  networkError: {
    flexDirection: "column",
    alignItems: "center",
  },
  errorIconContainer: {
    alignSelf: "flex-start",
  },
  errorContent: {
    flex: 1,
    gap: 6,
    alignItems: "flex-end",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#991B1B",
    fontFamily: "NotoNaskhArabic-Bold",
    textAlign: "right",
  },
  errorText: {
    fontSize: 14,
    color: "#B91C1C",
    lineHeight: 20,
    fontFamily: "NotoNaskhArabic-Regular",
    textAlign: "right",
  },
  retryButton: {
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  emptyContainer: {
    marginTop: 40,
    padding: 32,
    borderRadius: 20,
    borderWidth: 2,
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
    fontFamily: "NotoNaskhArabic-Bold",
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    lineHeight: 22,
    fontSize: 15,
    fontFamily: "NotoNaskhArabic-Regular",
  },
  successBanner: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: "row-reverse",
    gap: 12,
  },
  successIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  successContent: {
    flex: 1,
    gap: 4,
    alignItems: "flex-end",
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "NotoNaskhArabic-Bold",
    textAlign: "right",
  },
  successText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "NotoNaskhArabic-Regular",
    textAlign: "right",
  },
  modalWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 2,
    gap: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 14,
    paddingBottom: 20,
    borderBottomWidth: 1.5,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  modalHeaderText: {
    flex: 1,
    gap: 4,
    alignItems: "flex-end",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "NotoNaskhArabic-Bold",
    textAlign: "right",
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "NotoNaskhArabic-Regular",
    textAlign: "right",
  },
  modalForm: {
    gap: 18,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "NotoNaskhArabic-Bold",
    textAlign: "right",
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: "500",
    fontFamily: "NotoNaskhArabic-Regular",
    writingDirection: "rtl",
  },
  modalDescription: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalError: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  modalErrorText: {
    fontSize: 13,
    color: "#B91C1C",
    fontWeight: "600",
    fontFamily: "NotoNaskhArabic-Regular",
    textAlign: "right",
  },
  modalActions: {
    flexDirection: "row-reverse",
    gap: 12,
  },
  modalSecondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "NotoNaskhArabic-Bold",
  },
});
