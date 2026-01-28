import {
  useCourts,
  useCreateCourt,
  useDeleteCourt,
  useUpdateCourt,
} from "@/hooks/useCourts";
import { AuthService } from "@/services/auth.service";
import { UserRole } from "@/types/auth";
import { Court } from "@/types/court";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { showToast } from "@/utils/toast";

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  lightGray: "#F2F2F2",
  slate: "#566375",
  card: "#ffffff",
  navyLight: "#1A3650",
  goldLight: "#D8C190",
};

export default function CourtsScreen() {
  const PAGE_SIZE = 15;

  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [newCourt, setNewCourt] = useState("");
  const [editing, setEditing] = useState<Court | null>(null);
  const [editName, setEditName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Court | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const { data: courts, isLoading, refetch, isRefetching } = useCourts();
  const createCourt = useCreateCourt();
  const updateCourt = useUpdateCourt();
  const deleteCourt = useDeleteCourt();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const isAdmin = role === "admin";

  useEffect(() => {
    (async () => {
      const storedRole = (await AsyncStorage.getItem(
        "role"
      )) as UserRole | null;
      setRole(storedRole);
    })();
  }, []);

  useEffect(() => {
    if (role && role !== "admin" && role !== "lawyer") {
      Alert.alert(
        "Access Restricted",
        "Only admins and lawyers can access courts.",
        [{ text: "OK", onPress: () => router.replace("/sign-in") }]
      );
    }
  }, [role, router]);

  const handleSignOut = async () => {
    setShowLogoutConfirm(true);
  };

  const filteredAndSortedCourts = useMemo(() => {
    if (!courts) return [];

    let filtered = [...courts];

    if (searchQuery.trim()) {
      filtered = filtered.filter((court) =>
        court.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [courts, searchQuery]);

  useEffect(() => {
    // Reset visible items whenever data or search changes
    setVisibleCount(PAGE_SIZE);
  }, [filteredAndSortedCourts, PAGE_SIZE]);

  const paginatedCourts = useMemo(
    () => filteredAndSortedCourts.slice(0, visibleCount),
    [filteredAndSortedCourts, visibleCount]
  );

  const hasMoreCourts = visibleCount < filteredAndSortedCourts.length;

  const handleEndReached = useCallback(() => {
    if (!hasMoreCourts || isLoadingMore) return;

    setIsLoadingMore(true);
    // Simulate loading delay for smooth UX
    setTimeout(() => {
      setVisibleCount((prev) =>
        Math.min(prev + PAGE_SIZE, filteredAndSortedCourts.length)
      );
      setIsLoadingMore(false);
    }, 300);
  }, [hasMoreCourts, isLoadingMore, filteredAndSortedCourts.length, PAGE_SIZE]);

  const handleCreate = () => {
    const trimmed = newCourt.trim();
    if (!trimmed) return;

    createCourt.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setNewCourt("");
          setShowAddModal(false);
          Keyboard.dismiss();
        },
        onError: (err: any) => {
          Alert.alert(
            "Could Not Add Court",
            err?.response?.data?.message || err?.message || "Please try again."
          );
        },
      }
    );
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    const trimmed = editName.trim();
    if (!trimmed) return;

    const id = editing._id || editing.id;
    if (!id) {
      Alert.alert("Missing Identifier", "This court is missing an ID.");
      return;
    }

    updateCourt.mutate(
      { id, dto: { name: trimmed } },
      {
        onSuccess: () => {
          setEditing(null);
          setEditName("");
        },
        onError: (err: any) => {
          Alert.alert(
            "Update Failed",
            err?.response?.data?.message || err?.message || "Please try again."
          );
        },
      }
    );
  };

  const handleDelete = (court: Court) => {
    setDeleteTarget(court);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget._id || deleteTarget.id;
    if (!id) {
      Alert.alert("Missing Identifier", "This court is missing an ID.");
      return;
    }

    setIsDeleting(true);
    deleteCourt.mutate(id, {
      onSuccess: () => {
        setIsDeleting(false);
        setDeleteTarget(null);
        showToast({ message: "Court deleted", type: "info" });
      },
      onError: (err: any) => {
        setIsDeleting(false);
        Alert.alert(
          "Delete Failed",
          err?.response?.data?.message || err?.message || "Please try again."
        );
      },
    });
  };

  const renderItem = ({ item }: { item: Court }) => {
    const courtId = item._id || item.id || "";
    const initials = item.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => Keyboard.dismiss()}
      >
        <View style={styles.cardInner}>
          <View style={styles.cardLeft}>
            <View style={styles.initialsCircle}>
              <Text style={styles.initialsText}>{initials}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.courtName} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={styles.idRow}>
                <Ionicons
                  name="document-text"
                  size={14}
                  color={palette.slate}
                />
                <Text style={styles.courtId}>{courtId || "pending"}</Text>
              </View>
            </View>
          </View>
          {isAdmin && (
            <View style={styles.cardActions}>
              <Pressable
                onPress={() => {
                  setEditing(item);
                  setEditName(item.name);
                  Keyboard.dismiss();
                }}
                style={({ pressed }) => [
                  styles.iconButton,
                  styles.editButton,
                  pressed && styles.iconButtonPressed,
                ]}
              >
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={palette.gold}
                />
              </Pressable>
              <Pressable
                onPress={() => handleDelete(item)}
                style={({ pressed }) => [
                  styles.iconButton,
                  styles.deleteButton,
                  pressed && styles.iconButtonPressed,
                ]}
              >
                <Ionicons name="trash-outline" size={20} color="#ff4757" />
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const showAdminActions = isAdmin;
  const pending = isLoading || isRefetching;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={styles.mainContainer}>
            {/* Floating Header */}
            <View style={styles.floatingHeader}>
              <View style={styles.headerContent}>
                <View style={styles.headerTopRow}>
                  <View style={styles.headerLeft}>
                    <View style={styles.logoCircle}>
                      <Ionicons
                        name="business"
                        size={24}
                        color={palette.navy}
                      />
                    </View>
                    <View>
                      <Text style={styles.headerTitle}>Courts</Text>
                      <Text style={styles.headerSubtitle}>
                        Legal Management
                      </Text>
                    </View>
                  </View>
                  <View style={styles.headerActions}>
                    <Pressable
                      onPress={handleSignOut}
                      style={({ pressed }) => [
                        styles.logoutButton,
                        pressed && styles.logoutButtonPressed,
                      ]}
                    >
                      <Ionicons
                        name="log-out-outline"
                        size={20}
                        color={palette.card}
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Search */}
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={18} color={palette.gold} />
                  <TextInput
                    placeholder="Search courts..."
                    placeholderTextColor={`${palette.card}60`}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchInput}
                    autoCapitalize="none"
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery("")}>
                      <Ionicons name="close" size={18} color={palette.gold} />
                    </Pressable>
                  )}
                </View>
              </View>
            </View>

            {/* Content Area */}
            <View style={styles.contentArea}>
              {/* Stats Bar */}
              <View style={styles.statsBar}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {filteredAndSortedCourts.length}
                  </Text>
                  <Text style={styles.statLabel}>Total Courts</Text>
                  {isAdmin && (
                    <Pressable
                      onPress={() => setShowAddModal(true)}
                      style={({ pressed }) => [
                        styles.addButtonInStats,
                        pressed && styles.addButtonInStatsPressed,
                      ]}
                    >
                      <Ionicons
                        name="add-circle"
                        size={20}
                        color={palette.navy}
                      />
                      <Text style={styles.addButtonText}>Add Court</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Courts List */}
              {pending ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={palette.gold} />
                  <Text style={styles.loadingText}>Loading courts...</Text>
                </View>
              ) : (
                <FlatList
                  data={paginatedCourts}
                  keyExtractor={(item) =>
                    (item._id || item.id || item.name) as string
                  }
                  renderItem={renderItem}
                  contentContainerStyle={[
                    styles.listContent,
                    filteredAndSortedCourts.length === 0 &&
                      styles.emptyListContent,
                  ]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  refreshing={isRefetching}
                  onRefresh={refetch}
                  onEndReached={handleEndReached}
                  onEndReachedThreshold={0.3}
                  maxToRenderPerBatch={10}
                  updateCellsBatchingPeriod={50}
                  initialNumToRender={15}
                  windowSize={10}
                  removeClippedSubviews={true}
                  onScrollBeginDrag={() => Keyboard.dismiss()}
                  ListFooterComponent={
                    hasMoreCourts && isLoadingMore ? (
                      <View style={styles.loadMoreFooter}>
                        <ActivityIndicator color={palette.gold} size="small" />
                        <Text style={styles.loadMoreText}>Loading more...</Text>
                      </View>
                    ) : hasMoreCourts ? (
                      <View style={styles.scrollHintFooter}>
                        <Ionicons
                          name="chevron-down"
                          size={16}
                          color={`${palette.card}60`}
                        />
                        <Text style={styles.scrollHintText}>
                          Scroll for more
                        </Text>
                      </View>
                    ) : paginatedCourts.length > 0 ? (
                      <View style={styles.endReachedFooter}>
                        <View style={styles.endReachedDivider} />
                        <Text style={styles.endReachedText}>
                          You've reached the end
                        </Text>
                        <View style={styles.endReachedDivider} />
                      </View>
                    ) : null
                  }
                  ListEmptyComponent={
                    !pending && filteredAndSortedCourts.length === 0 ? (
                      <View style={styles.emptyState}>
                        <View style={styles.emptyIconBox}>
                          <Ionicons
                            name="folder-open-outline"
                            size={56}
                            color={palette.gold}
                          />
                        </View>
                        <Text style={styles.emptyTitle}>
                          {searchQuery ? "No Results" : "No Courts Yet"}
                        </Text>
                        <Text style={styles.emptyMessage}>
                          {showAdminActions
                            ? searchQuery
                              ? "Try adjusting your search"
                              : "Start by adding your first court"
                            : "Courts will appear once added by admin"}
                        </Text>
                        {searchQuery && (
                          <Pressable
                            onPress={() => setSearchQuery("")}
                            style={styles.clearSearchBtn}
                          >
                            <Text style={styles.clearSearchText}>
                              Clear Search
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    ) : null
                  }
                />
              )}
            </View>
          </View>

          {/* Edit Modal */}
          {editing && (
            <Modal animationType="fade" transparent visible={true}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalTitle}>Edit Court</Text>
                      <Text style={styles.modalSubtitle}>{editing.name}</Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        setEditing(null);
                        setEditName("");
                      }}
                      style={styles.modalCloseBtn}
                    >
                      <Ionicons name="close" size={24} color={palette.slate} />
                    </Pressable>
                  </View>
                  <View style={styles.modalBody}>
                    <TextInput
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Enter new name"
                      placeholderTextColor={`${palette.slate}70`}
                      style={styles.modalInput}
                      autoCapitalize="words"
                      autoFocus
                    />
                    <View style={styles.modalActions}>
                      <Pressable
                        onPress={() => {
                          setEditing(null);
                          setEditName("");
                        }}
                        style={({ pressed }) => [
                          styles.modalCancelBtn,
                          pressed && styles.modalBtnPressed,
                        ]}
                      >
                        <Text style={styles.modalCancelText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleSaveEdit}
                        disabled={updateCourt.isPending || !editName.trim()}
                        style={({ pressed }) => [
                          styles.modalSaveBtn,
                          pressed && styles.modalBtnPressed,
                          (updateCourt.isPending || !editName.trim()) &&
                            styles.modalSaveBtnDisabled,
                        ]}
                      >
                        {updateCourt.isPending ? (
                          <ActivityIndicator color={palette.navy} />
                        ) : (
                          <Text style={styles.modalSaveText}>Save</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* Add Court Modal */}
          <Modal
            animationType="fade"
            transparent
            visible={showAddModal}
            onRequestClose={() => {
              setShowAddModal(false);
              setNewCourt("");
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Add Court</Text>
                    <Text style={styles.modalSubtitle}>
                      Create a new court entry
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setShowAddModal(false);
                      setNewCourt("");
                    }}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={24} color={palette.slate} />
                  </Pressable>
                </View>
                <View style={styles.modalBody}>
                  <TextInput
                    value={newCourt}
                    onChangeText={setNewCourt}
                    placeholder="Enter court name"
                    placeholderTextColor={`${palette.slate}70`}
                    style={styles.modalInput}
                    autoCapitalize="words"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleCreate}
                  />
                  <View style={styles.modalActions}>
                    <Pressable
                      onPress={() => {
                        setShowAddModal(false);
                        setNewCourt("");
                      }}
                      style={({ pressed }) => [
                        styles.modalCancelBtn,
                        pressed && styles.modalBtnPressed,
                      ]}
                    >
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleCreate}
                      disabled={createCourt.isPending || !newCourt.trim()}
                      style={({ pressed }) => [
                        styles.modalSaveBtn,
                        pressed && styles.modalBtnPressed,
                        (createCourt.isPending || !newCourt.trim()) &&
                          styles.modalSaveBtnDisabled,
                      ]}
                    >
                      {createCourt.isPending ? (
                        <ActivityIndicator color={palette.navy} />
                      ) : (
                        <Text style={styles.modalSaveText}>Add Court</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

          {/* Delete Confirmation */}
          <Modal
            animationType="fade"
            transparent
            visible={!!deleteTarget}
            onRequestClose={() => setDeleteTarget(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.confirmContainer}>
                <View style={styles.confirmIconBox}>
                  <Ionicons name="alert-circle" size={48} color="#ff4757" />
                </View>
                <Text style={styles.confirmTitle}>Delete Court?</Text>
                <Text style={styles.confirmMessage}>
                  "{deleteTarget?.name}" will be permanently removed
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.confirmCancelBtn,
                      pressed && styles.modalBtnPressed,
                    ]}
                    onPress={() => setDeleteTarget(null)}
                    disabled={isDeleting}
                  >
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.confirmDeleteBtn,
                      pressed && styles.modalBtnPressed,
                    ]}
                    onPress={confirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.confirmDeleteText}>Delete</Text>
                    )}
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
            <View style={styles.modalOverlay}>
              <View style={styles.confirmContainer}>
                <View style={styles.confirmIconBox}>
                  <Ionicons
                    name="log-out-outline"
                    size={48}
                    color={palette.gold}
                  />
                </View>
                <Text style={styles.confirmTitle}>Sign Out?</Text>
                <Text style={styles.confirmMessage}>
                  You'll need to sign in again to access your account
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.confirmCancelBtn,
                      pressed && styles.modalBtnPressed,
                    ]}
                    onPress={() => setShowLogoutConfirm(false)}
                  >
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.confirmPrimaryBtn,
                      pressed && styles.modalBtnPressed,
                    ]}
                    onPress={async () => {
                      try {
                        await AuthService.logout();
                        showToast({
                          message: "Signed out successfully.",
                          type: "info",
                        });
                      } catch (err) {
                        console.log(
                          "Logout failed, clearing local session",
                          err
                        );
                        await AsyncStorage.clear();
                        showToast({
                          message:
                            "Failed to sign out. Session cleared locally.",
                          type: "error",
                        });
                      } finally {
                        setShowLogoutConfirm(false);
                        router.replace("/sign-in");
                      }
                    }}
                  >
                    <Text style={styles.confirmPrimaryText}>Sign Out</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.navy,
  },
  container: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: palette.navy,
  },
  floatingHeader: {
    backgroundColor: palette.navyLight,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: `${palette.gold}20`,
  },
  headerContent: {
    gap: 16,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addCourtButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  addCourtButtonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.8,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: palette.card,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: `${palette.card}90`,
    marginTop: 2,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${palette.card}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.7,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${palette.card}15`,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: `${palette.card}20`,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: palette.card,
  },
  contentArea: {
    flex: 1,
    paddingTop: 20,
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.navyLight,
    marginHorizontal: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: `${palette.gold}20`,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: palette.gold,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: `${palette.card}80`,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: `${palette.card}20`,
  },
  addButtonInStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: palette.gold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  addButtonInStatsPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.navy,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "500",
    color: palette.card,
    marginTop: 16,
    opacity: 0.8,
  },
  loadMoreFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: "600",
    color: `${palette.card}90`,
  },
  scrollHintFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    opacity: 0.6,
  },
  scrollHintText: {
    fontSize: 12,
    fontWeight: "600",
    color: `${palette.card}60`,
  },
  endReachedFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  endReachedDivider: {
    flex: 1,
    height: 1,
    backgroundColor: `${palette.card}15`,
  },
  endReachedText: {
    fontSize: 12,
    fontWeight: "600",
    color: `${palette.card}50`,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${palette.card}10`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: `${palette.card}20`,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.card,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 15,
    fontWeight: "500",
    color: `${palette.card}80`,
    textAlign: "center",
    lineHeight: 22,
  },
  clearSearchBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: `${palette.gold}25`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${palette.gold}40`,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.gold,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.8,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  initialsCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.navy,
    letterSpacing: 1,
  },
  cardInfo: {
    flex: 1,
  },
  courtName: {
    fontSize: 15,
    fontWeight: "600",
    color: palette.navy,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  courtId: {
    fontSize: 12,
    fontWeight: "500",
    color: palette.slate,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    backgroundColor: `${palette.gold}15`,
  },
  deleteButton: {
    backgroundColor: "#fff5f5",
  },
  iconButtonPressed: {
    transform: [{ scale: 0.92 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 36, 54, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: palette.card,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e8eaed",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.navy,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: palette.slate,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.lightGray,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    padding: 20,
  },
  modalInput: {
    backgroundColor: palette.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: "500",
    color: palette.navy,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: palette.lightGray,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.slate,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: palette.gold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.navy,
  },
  modalSaveBtnDisabled: {
    opacity: 0.5,
  },
  modalBtnPressed: {
    transform: [{ scale: 0.97 }],
  },
  confirmContainer: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.lightGray,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: palette.navy,
    marginBottom: 8,
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: 15,
    fontWeight: "500",
    color: palette.slate,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: palette.lightGray,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.slate,
  },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: "#ff4757",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmDeleteText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  confirmPrimaryBtn: {
    flex: 1,
    backgroundColor: palette.gold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmPrimaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.navy,
  },
});
