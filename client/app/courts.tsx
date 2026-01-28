import { router } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCourts } from "@/hooks/use-courts";
import { ApiError, getAuthToken } from "@/services/api";

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
  courtsDirectory: "دليل المحاكم",
  selectCourt: "اختر المحكمة لقضيتك القانونية",
  courtsAvailable: "المحاكم المتاحة",
  loadingCourts: "جاري تحميل المحاكم...",
  unableToLoad: "تعذر تحميل المحاكم",
  somethingWrong: "حدث خطأ ما",
  retry: "إعادة المحاولة",
  selectCourtButton: "اختر المحكمة",
  noCourts: "لا توجد محاكم متاحة",
  noCourtsDescription: "لا توجد محاكم في النظام حاليًا. يرجى التحقق لاحقًا.",
};

export default function CourtsScreen() {
  const colorScheme = useColorScheme();
  const { data, refetch, isFetching, isError, error, isLoading } = useCourts();
  const hasToken = Boolean(getAuthToken());

  const textColor = palette.light;
  const metaColor = palette.goldLight;

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!hasToken || (error instanceof ApiError && error.status === 401)) {
      router.replace("/auth/sign-in");
    }
  }, [hasToken, error]);

  return (
    <View style={[styles.container, { backgroundColor: palette.navy }]}>
      {/* Back Button */}
      <Pressable
        style={({ pressed }) => [
          styles.backButton,
          {
            backgroundColor: palette.gold + "20",
            borderColor: palette.gold + "40",
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        onPress={() => router.back()}
      >
        <ThemedText style={[styles.backArrow, { color: palette.gold }]}>
          →
        </ThemedText>
      </Pressable>

      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.headerContent}>
          <View
            style={[
              styles.headerIcon,
              {
                backgroundColor: palette.gold + "25",
                borderColor: palette.gold,
              },
            ]}
          >
            <ThemedText style={{ fontSize: 36 }}>🏛️</ThemedText>
          </View>
          <View style={styles.headerText}>
            <ThemedText
              type="title"
              style={[styles.heading, { color: textColor }]}
            >
              {translations.courtsDirectory}
            </ThemedText>
            <ThemedText style={[styles.subheading, { color: metaColor }]}>
              {translations.selectCourt}
            </ThemedText>
          </View>
        </View>

        {/* Stats Badge */}
        <View
          style={[
            styles.statsBadge,
            {
              backgroundColor: palette.gold + "20",
              borderColor: palette.gold + "40",
            },
          ]}
        >
          <ThemedText style={[styles.statsNumber, { color: palette.gold }]}>
            {data?.length || 0}
          </ThemedText>
          <ThemedText style={[styles.statsLabel, { color: textColor }]}>
            {translations.courtsAvailable}
          </ThemedText>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.gold} />
          <ThemedText style={[styles.loadingText, { color: metaColor }]}>
            {translations.loadingCourts}
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
            <ThemedText style={{ fontSize: 28 }}>⚠️</ThemedText>
          </View>
          <View style={styles.errorContent}>
            <ThemedText style={styles.errorTitle}>
              {translations.unableToLoad}
            </ThemedText>
            <ThemedText style={styles.errorText}>
              {(error as Error)?.message ?? translations.somethingWrong}
            </ThemedText>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: palette.navy, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => refetch()}
          >
            <ThemedText style={styles.retryText}>
              {translations.retry}
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
          refreshing={isFetching}
          onRefresh={() => refetch()}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor:
                    colorScheme === "dark" ? palette.navyLight : "#FFFFFF",
                  borderColor: palette.gold + "50",
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/courts/[courtId]/lawyers",
                  params: { courtId: item._id, courtName: item.name },
                })
              }
            >
              {/* Gold accent bar with gradient effect */}
              <View
                style={[styles.accentBar, { backgroundColor: palette.gold }]}
              />

              {/* Card Content */}
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.courtIcon,
                      {
                        backgroundColor: palette.gold + "20",
                        borderColor: palette.gold + "40",
                      },
                    ]}
                  >
                    <ThemedText style={{ fontSize: 28 }}>⚖️</ThemedText>
                  </View>

                  <View style={styles.cardTextContainer}>
                    <ThemedText
                      style={[styles.cardTitle, { color: textColor }]}
                    >
                      {item.name}
                    </ThemedText>

                    <View style={styles.selectBadge}>
                      <ThemedText
                        style={[styles.selectText, { color: palette.gold }]}
                      >
                        {translations.selectCourtButton}
                      </ThemedText>
                      <ThemedText
                        style={[styles.arrow, { color: palette.gold }]}
                      >
                        ←
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          )}
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
                  { backgroundColor: palette.gold + "25" },
                ]}
              >
                <ThemedText style={{ fontSize: 56 }}>🏛️</ThemedText>
              </View>
              <ThemedText style={[styles.emptyTitle, { color: textColor }]}>
                {translations.noCourts}
              </ThemedText>
              <ThemedText style={[styles.emptyText, { color: metaColor }]}>
                {translations.noCourtsDescription}
              </ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
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
    shadowOpacity: 0.25,
    shadowRadius: 8,
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
    marginBottom: 28,
    marginTop: 60,
    gap: 20,
  },
  headerContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 18,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    shadowColor: palette.gold,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  headerText: {
    flex: 1,
    gap: 8,
    alignItems: "flex-end",
  },
  heading: {
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "right",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  subheading: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    opacity: 0.95,
    textAlign: "right",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  statsBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    alignSelf: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    gap: 10,
    shadowColor: palette.gold,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  statsNumber: {
    fontSize: 17,
    fontWeight: "800",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  statsLabel: {
    fontSize: 17,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  list: {
    paddingBottom: 40,
  },
  card: {
    borderRadius: 28,
    borderWidth: 2.5,
    shadowColor: palette.gold,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    overflow: "hidden",
  },
  accentBar: {
    height: 6,
    width: "100%",
  },
  cardContent: {
    padding: 22,
  },
  cardHeader: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 16,
  },
  courtIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    shadowColor: palette.gold,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardTextContainer: {
    flex: 1,
    gap: 14,
    alignItems: "flex-end",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.4,
    lineHeight: 28,
    textAlign: "right",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  selectBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-end",
  },
  selectText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  arrow: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  errorBox: {
    marginTop: 20,
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    gap: 16,
  },
  errorIcon: {
    alignSelf: "center",
  },
  errorContent: {
    gap: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#991B1B",
    textAlign: "center",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  errorText: {
    fontSize: 15,
    color: "#B91C1C",
    lineHeight: 22,
    textAlign: "center",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  retryButton: {
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  emptyContainer: {
    marginTop: 60,
    padding: 40,
    borderRadius: 24,
    borderWidth: 2.5,
    alignItems: "center",
    gap: 20,
  },
  emptyIcon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.gold,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  emptyText: {
    textAlign: "center",
    lineHeight: 24,
    fontSize: 16,
    fontFamily: "NotoNaskhArabic-Bold",
  },
});
