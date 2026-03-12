import { useChats, useMessages, useSendMessage } from "@/hooks/useChat";
import { api } from "@/services/api";
import { ChatSummary } from "@/types/chat";
import { showToast } from "@/utils/toast";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// Declare module properties that TypeScript doesn't recognize
declare module "expo-file-system" {
  export const documentDirectory: string | null;
  export const cacheDirectory: string | null;
  export function downloadAsync(
    uri: string,
    fileUri: string,
  ): Promise<{ uri: string }>;
}

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  light: "#F2F2F2",
  slate: "#566375",
  darkBlue: "#081b28",
  deepBlue: "#0c2132",
  accentBlue: "#1a3a52",
};

const { width } = Dimensions.get("window");
const isTablet = width > 768;

const getInitialsFrom = (val?: string | null) => {
  if (!val) return "?";
  return val
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

export default function ChatTab() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [receiver, setReceiver] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [showChatView, setShowChatView] = useState(false);
  const [attachments, setAttachments] = useState<
    Array<{ uri: string; name: string; type?: string | null }>
  >([]);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [viewerName, setViewerName] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Animation values
  const composerScale = useRef(new Animated.Value(1)).current;
  const inputBorderAnim = useRef(new Animated.Value(0)).current;
  const sendButtonScale = useRef(new Animated.Value(0.9)).current;
  const attachButtonRotate = useRef(new Animated.Value(0)).current;

  const {
    data: chats,
    isLoading: loadingChats,
    refetch,
    isRefetching: refreshingChats,
  } = useChats();
  const { data: messages, isLoading: loadingMessages } = useMessages(
    selectedChat || undefined,
  );
  const sendMutation = useSendMessage();

  useEffect(() => {
    AsyncStorage.getItem("user_id").then(setUserId);
  }, []);

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
      Animated.spring(composerScale, {
        toValue: 1.02,
        useNativeDriver: true,
        friction: 8,
      }).start();
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
      Animated.spring(composerScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Animate input border on focus
  useEffect(() => {
    Animated.timing(inputBorderAnim, {
      toValue: inputFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [inputFocused]);

  // Animate send button based on message content
  useEffect(() => {
    const hasContent = message.trim().length > 0 || attachments.length > 0;
    Animated.spring(sendButtonScale, {
      toValue: hasContent ? 1 : 0.9,
      useNativeDriver: true,
      friction: 6,
    }).start();
  }, [message, attachments]);

  const keyboardOffset =
    Platform.OS === "ios"
      ? (keyboardVisible ? 0 : tabBarHeight) + insets.bottom
      : 0;

  const send = () => {
    if (!selectedChat || !receiver || !userId) return;
    if (!message.trim() && attachments.length === 0) return;

    // Animate send button
    Animated.sequence([
      Animated.timing(sendButtonScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(sendButtonScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }),
    ]).start();

    sendMutation.mutate({
      chatId: selectedChat,
      senderId: userId,
      receiverId: receiver,
      content: message.trim() || undefined,
      attachments,
    });
    setMessage("");
    setAttachments([]);
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const resolveAttachmentUrl = (uri: string) => {
    const trimmed = uri.trim();
    if (/^(https?:|file:)/i.test(trimmed)) return trimmed;
    const base = (api.defaults.baseURL || "").replace(/\/$/, "");
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${base}${path}`;
  };

  const isImageUri = (uri: string) => {
    const clean = uri.split("?")[0].toLowerCase();
    return /\.(png|jpe?g|gif|webp|heic|heif)$/.test(clean);
  };

  const downloadAttachment = async (uri?: string, suggestedName?: string) => {
    if (!uri) return;
    const url = encodeURI(resolveAttachmentUrl(uri));
    const filename =
      suggestedName ||
      uri.split("/").pop() ||
      `attachment-${Date.now()}.${isImageUri(uri) ? "jpg" : "bin"}`;

    const docDir =
      FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "";
    const destination = `${docDir}${filename}`;

    try {
      setDownloading(true);
      const result = await FileSystem.downloadAsync(url, destination);
      const localUri = result.uri;

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri);
      } else {
        showToast({
          message: `Saved to ${localUri}`,
          type: "success",
        });
      }
    } catch (err) {
      console.log("Download error", err);
      showToast({
        message: "Unable to save attachment right now.",
        type: "error",
      });
    } finally {
      setDownloading(false);
    }
  };

  const openAttachment = async (uri?: string) => {
    if (!uri) return;
    const url = encodeURI(resolveAttachmentUrl(uri));

    if (isImageUri(url)) {
      setViewerUri(url);
      setViewerName(uri.split("/").pop() || "Image");
      return;
    }

    try {
      await WebBrowser.openBrowserAsync(url);
      return;
    } catch (_) {}

    try {
      await Linking.openURL(url);
      return;
    } catch (err) {
      console.log("Attachment open failed", err);
    }

    showToast({
      message: "Unable to open attachment right now.",
      type: "error",
    });
  };

  const pickAttachment = async () => {
    // Rotate animation for attach button
    Animated.sequence([
      Animated.timing(attachButtonRotate, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(attachButtonRotate, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
        type: "*/*",
      });
      if (result.canceled) return;
      const selected = result.assets || [];
      setAttachments((prev) =>
        [...prev, ...selected].slice(0, 5).map((file) => ({
          uri: file.uri,
          name: file.name || "file",
          type:
            "mimeType" in file
              ? file.mimeType || undefined
              : (file as any).type,
        })),
      );
    } catch (err) {
      console.log("Attachment pick error", err);
    }
  };

  const pickPhotoFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo access to attach.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset) return;
    const name =
      asset.fileName || asset.uri.split("/").pop() || `photo-${Date.now()}.jpg`;
    setAttachments((prev) =>
      [
        ...prev,
        {
          uri: asset.uri,
          name,
          type:
            asset.type === "image"
              ? "image/jpeg"
              : asset.mimeType || "image/jpeg",
        },
      ].slice(0, 5),
    );
  };

  const openAttachChooser = () => {
    const options = ["Photo from library", "File from device", "Cancel"];
    const cancelButtonIndex = 2;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          userInterfaceStyle: "dark",
        },
        (buttonIndex) => {
          if (buttonIndex === 0) pickPhotoFromGallery();
          if (buttonIndex === 1) pickAttachment();
        },
      );
    } else {
      Alert.alert("Attach", "Choose attachment type", [
        { text: options[0], onPress: pickPhotoFromGallery },
        { text: options[1], onPress: pickAttachment },
        { text: options[2], style: "cancel" },
      ]);
    }
  };

  const handleChatSelect = (chatId: string, otherUserId: string) => {
    setSelectedChat(chatId);
    setReceiver(otherUserId);
    if (!isTablet) {
      setShowChatView(true);
    }
  };

  const handleBackToList = () => {
    setShowChatView(false);
  };

  const renderChat = ({ item }: { item: ChatSummary }) => {
    const isActive = selectedChat === item._id;
    const displayName = item.otherUser?.name || "Unknown";
    const otherId =
      item.otherUser?.id ||
      (item.user1Id === userId ? item.user2Id : item.user1Id);
    const preview =
      typeof item.lastMessage === "string"
        ? item.lastMessage
        : item.lastMessage?.content || "No messages yet";
    const initials = displayName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    return (
      <Pressable
        onPress={() => handleChatSelect(item._id, otherId || "")}
        style={({ pressed }) => [
          styles.chatItem,
          isActive && isTablet && styles.chatItemActive,
          pressed && styles.chatItemPressed,
        ]}
      >
        <View style={styles.chatAvatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.chatInfo}>
          <Text style={styles.chatTitle} numberOfLines={1}>
            {displayName}
          </Text>

          <Text style={styles.chatMeta} numberOfLines={1}>
            {preview}
          </Text>
        </View>

        {(item.unreadCount ?? 0) > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const renderMessage = ({ item, index }: any) => {
    const mine = item.senderId === userId;
    const prevItem = messages?.[index - 1];
    const showAvatar = !prevItem || prevItem.senderId !== item.senderId;
    const otherUserName = selectedChatData?.otherUser?.name || "";
    const avatarInitials = mine
      ? "YOU"
      : getInitialsFrom(otherUserName || item.senderId);
    const isImage =
      item.image ||
      (item.attachments &&
        item.attachments.length > 0 &&
        /\.(png|jpg|jpeg)$/i.test(item.attachments[0]));

    return (
      <View
        style={[
          styles.messageContainer,
          mine ? styles.messageContainerMine : styles.messageContainerTheirs,
        ]}
      >
        {!mine && showAvatar && (
          <View style={styles.messageAvatar}>
            <Text style={styles.messageAvatarText}>{avatarInitials}</Text>
          </View>
        )}
        {!mine && !showAvatar && <View style={styles.messageAvatarSpacer} />}

        <View
          style={[
            styles.messageBubble,
            mine ? styles.bubbleMine : styles.bubbleTheirs,
          ]}
        >
          {item.content ? (
            <Text style={[styles.messageText, mine && styles.messageTextMine]}>
              {item.content}
            </Text>
          ) : null}

          {isImage && (
            <Pressable
              onPress={() =>
                openAttachment(item.image || item.attachments?.[0])
              }
              onLongPress={() =>
                downloadAttachment(
                  item.image || item.attachments?.[0],
                  (item.image || item.attachments?.[0])?.split("/")?.pop(),
                )
              }
              delayLongPress={500}
            >
              <Image
                source={{ uri: item.image || item.attachments?.[0] }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            </Pressable>
          )}

          {item.attachments && item.attachments.length > 0 && (
            <View style={styles.attachmentsList}>
              {item.attachments.map((att: string, i: number) => (
                <Pressable
                  style={styles.attachmentRow}
                  key={`${att}-${i}`}
                  onPress={() => openAttachment(att)}
                  onLongPress={() =>
                    downloadAttachment(att, att.split("/").pop())
                  }
                  delayLongPress={500}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={14}
                    color={palette.navy}
                  />
                  <Text style={styles.attachmentLabel} numberOfLines={1}>
                    {att.split("/").pop()}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  const selectedChatData = chats?.find((c) => c._id === selectedChat);
  const isUser1 = selectedChatData
    ? selectedChatData.user1Id === userId
    : false;
  const otherUserId = selectedChatData
    ? isUser1
      ? selectedChatData.user2Id
      : selectedChatData.user1Id
    : null;

  const borderColor = inputBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#ffffff20", palette.gold],
  });

  const rotateInterpolate = attachButtonRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  // Chat List View
  const renderChatList = () => (
    <View style={styles.listContainer}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="chatbubbles" size={24} color={palette.gold} />
          <Text style={styles.heading}>Chats</Text>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Messages</Text>
      </View>

      {loadingChats ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={palette.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={chats || []}
          keyExtractor={(item) => item._id}
          renderItem={renderChat}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          refreshing={refreshingChats}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="chatbubbles-outline"
                size={64}
                color={palette.slate}
              />
              <Text style={styles.emptyTitle}>No chats</Text>
              <Text style={styles.emptyText}>Start a new conversation</Text>
            </View>
          }
        />
      )}
    </View>
  );

  // Chat View
  const renderChatView = () => (
    <View style={styles.chatViewContainer}>
      <KeyboardAvoidingView
        style={styles.chatContent}
        contentContainerStyle={styles.chatContentContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={keyboardOffset}
      >
        <View style={styles.chatBody}>
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            {!isTablet && (
              <Pressable
                onPress={handleBackToList}
                style={({ pressed }) => [
                  styles.backBtn,
                  pressed && styles.backBtnPressed,
                ]}
              >
                <Ionicons name="arrow-back" size={24} color={palette.light} />
              </Pressable>
            )}
            <View style={styles.chatHeaderAvatar}>
              <Text style={styles.chatHeaderAvatarText}>
                {getInitialsFrom(
                  selectedChatData?.otherUser?.name || otherUserId,
                )}
              </Text>
            </View>
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderName}>
                {selectedChatData?.otherUser?.name || "Unknown"}
              </Text>
            </View>
          </View>

          {/* Messages */}
          <View style={styles.messagesWrapper}>
            {loadingMessages ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={palette.gold} size="large" />
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages || []}
                keyExtractor={(item) => item._id}
                renderItem={renderMessage}
                style={styles.messagesListContainer}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="mail-outline"
                      size={64}
                      color={palette.slate}
                    />
                    <Text style={styles.emptyTitle}>No messages yet</Text>
                    <Text style={styles.emptyText}>
                      Send your first message
                    </Text>
                  </View>
                }
              />
            )}
          </View>

          {/* Enhanced Composer */}
          <Animated.View
            style={[
              styles.composerSection,
              {
                paddingBottom: Math.max(
                  insets.bottom,
                  keyboardVisible ? 8 : 12,
                ),
                transform: [{ scale: composerScale }],
              },
            ]}
          >
            {/* Character Counter & Attachments Preview */}
            {(attachments.length > 0 || message.length > 400) && (
              <View style={styles.composerHeader}>
                {attachments.length > 0 && (
                  <View style={styles.attachmentsPreview}>
                    {attachments.map((file, idx) => (
                      <View
                        style={styles.attachmentChip}
                        key={`${file.uri}-${idx}`}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={14}
                          color={palette.navy}
                        />
                        <Text style={styles.attachmentText} numberOfLines={1}>
                          {file.name}
                        </Text>
                        <Pressable
                          onPress={() =>
                            setAttachments((prev) =>
                              prev.filter((_, index) => index !== idx),
                            )
                          }
                          style={({ pressed }) => [
                            styles.removeAttachment,
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          <Ionicons name="close" size={12} color="#fff" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                {message.length > 400 && (
                  <View style={styles.charCounter}>
                    <Text
                      style={[
                        styles.charCountText,
                        message.length > 480 && styles.charCountWarning,
                      ]}
                    >
                      {message.length}/500
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Input Row */}
            <View style={styles.composer}>
              <Animated.View
                style={{
                  transform: [{ rotate: rotateInterpolate }],
                }}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.attachBtn,
                    pressed && styles.attachBtnPressed,
                  ]}
                  onPress={openAttachChooser}
                >
                  <Ionicons name="attach" size={24} color={palette.light} />
                </Pressable>
              </Animated.View>

              <Animated.View
                style={[
                  styles.inputWrapper,
                  {
                    borderColor: borderColor,
                  },
                ]}
              >
                <TextInput
                  placeholder="Type a message..."
                  placeholderTextColor={palette.slate}
                  value={message}
                  onChangeText={setMessage}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  style={styles.input}
                  multiline
                  maxLength={500}
                />

                {/* Typing indicator dot */}
                {inputFocused && (
                  <View style={styles.typingIndicator}>
                    <View style={styles.typingDot} />
                  </View>
                )}
              </Animated.View>

              <Animated.View
                style={{
                  transform: [{ scale: sendButtonScale }],
                }}
              >
                <Pressable
                  onPress={send}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    pressed && styles.sendBtnPressed,
                    (!message.trim() && attachments.length === 0) ||
                    sendMutation.isPending
                      ? styles.sendBtnDisabled
                      : null,
                  ]}
                  disabled={
                    (!message.trim() && attachments.length === 0) ||
                    sendMutation.isPending
                  }
                >
                  {sendMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </Pressable>
              </Animated.View>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  // Empty state for tablet
  const renderEmptyChat = () => (
    <View style={styles.emptyChat}>
      <View style={styles.emptyChatIcon}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={64}
          color={palette.gold}
        />
      </View>
      <Text style={styles.emptyChatTitle}>Select a chat</Text>
      <Text style={styles.emptyChatSubtitle}>
        Pick a conversation from the list to start messaging.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {isTablet ? (
        // Tablet layout - side by side
        <View style={styles.tabletLayout}>
          <View style={styles.sidebar}>{renderChatList()}</View>
          <View style={styles.chatArea}>
            {selectedChat ? renderChatView() : renderEmptyChat()}
          </View>
        </View>
      ) : // Mobile layout - full screen toggle
      showChatView && selectedChat ? (
        renderChatView()
      ) : (
        renderChatList()
      )}

      <Modal
        visible={!!viewerUri}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUri(null)}
      >
        <Pressable
          style={styles.viewerOverlay}
          onPress={() => setViewerUri(null)}
        >
          <View style={styles.viewerContent}>
            <View style={styles.viewerHeader}>
              <Text style={styles.viewerTitle}>
                {viewerName || "Attachment"}
              </Text>
              <Pressable onPress={() => setViewerUri(null)}>
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>
            {viewerUri ? (
              <Image
                source={{ uri: viewerUri }}
                style={styles.viewerImage}
                resizeMode="contain"
              />
            ) : null}
            <View style={styles.viewerActions}>
              <Pressable
                style={[
                  styles.viewerButton,
                  downloading && styles.viewerButtonDisabled,
                ]}
                onPress={() =>
                  !downloading &&
                  downloadAttachment(
                    viewerUri || undefined,
                    viewerName || undefined,
                  )
                }
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator color={palette.navy} size="small" />
                ) : (
                  <>
                    <Ionicons name="download" size={16} color={palette.navy} />
                    <Text style={styles.viewerButtonText}>Save</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={styles.viewerButtonSecondary}
                onPress={() => {
                  setViewerUri(null);
                  setViewerName(null);
                }}
              >
                <Text style={styles.viewerButtonSecondaryText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#061823",
  },
  tabletLayout: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 380,
    backgroundColor: "#0A2436",
    borderRightWidth: 1,
    borderRightColor: "#ffffff08",
  },
  chatArea: {
    flex: 1,
    backgroundColor: "#0f2c45",
  },
  listContainer: {
    flex: 1,
    backgroundColor: "#081b28",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#061823",
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff10",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heading: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#0A2436",
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#e8edf5",
    letterSpacing: 0.4,
  },
  chatList: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: "#0f2c45",
    borderWidth: 1,
    borderColor: "#ffffff10",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  chatItemActive: {
    backgroundColor: "#12344b",
    borderColor: `${palette.gold}90`,
    borderWidth: 1.5,
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  chatItemPressed: {
    backgroundColor: "#12344b",
    transform: [{ scale: 0.98 }],
  },
  chatAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.gold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarText: {
    color: "#0A2436",
    fontWeight: "800",
    fontSize: 20,
  },
  chatInfo: {
    flex: 1,
    gap: 6,
  },
  chatTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 17,
    letterSpacing: -0.2,
  },
  chatMeta: {
    color: "#ffffff70",
    fontSize: 13,
    fontWeight: "600",
  },
  unreadBadge: {
    backgroundColor: palette.gold,
    borderRadius: 12,
    minWidth: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  unreadText: {
    color: "#0A2436",
    fontWeight: "800",
    fontSize: 12,
  },
  chatViewContainer: {
    flex: 1,
    backgroundColor: "#081b28",
  },
  chatContent: {
    flex: 1,
  },
  chatContentContainer: {
    flexGrow: 1,
  },
  chatBody: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff10",
    backgroundColor: "#0c2132",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#ffffff10",
  },
  backBtnPressed: {
    backgroundColor: "#ffffff20",
    transform: [{ scale: 0.95 }],
  },
  chatHeaderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff20",
  },
  chatHeaderAvatarText: {
    color: "#0A2436",
    fontWeight: "800",
    fontSize: 18,
  },
  chatHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  chatHeaderName: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: -0.2,
  },
  messagesWrapper: {
    flex: 1,
  },
  messagesList: {
    padding: 20,
    gap: 12,
  },
  messagesListContainer: {
    flex: 1,
  },
  messageContainer: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 3,
    alignItems: "flex-end",
  },
  messageContainerMine: {
    justifyContent: "flex-end",
  },
  messageContainerTheirs: {
    justifyContent: "flex-start",
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#12344b",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff20",
  },
  messageAvatarText: {
    color: palette.gold,
    fontWeight: "800",
    fontSize: 12,
  },
  messageAvatarSpacer: {
    width: 36,
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bubbleMine: {
    backgroundColor: "#d6bd82",
    borderBottomRightRadius: 6,
    borderWidth: 1,
    borderColor: "#ffffff30",
  },
  bubbleTheirs: {
    backgroundColor: "#102b40",
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: "#ffffff12",
  },
  messageText: {
    color: "#e9edf4",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  messageTextMine: {
    color: "#0A2436",
    fontWeight: "600",
  },
  messageImage: {
    width: 240,
    height: 180,
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#ffffff25",
  },
  attachmentsList: {
    marginTop: 8,
    gap: 8,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff15",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  attachmentLabel: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  messageTime: {
    color: "#ffffff80",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  messageTimeMine: {
    color: "#0A243680",
  },
  composerSection: {
    backgroundColor: "#0A2436",
    borderTopWidth: 2,
    borderTopColor: "#ffffff08",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  composerHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
  },
  attachBtn: {
    padding: 12,
    borderRadius: 24,
    backgroundColor: `${palette.accentBlue}`,
    borderWidth: 1.5,
    borderColor: `${palette.gold}30`,
    marginBottom: 4,
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  attachBtnPressed: {
    backgroundColor: `${palette.accentBlue}dd`,
    transform: [{ scale: 0.95 }],
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 24,
    backgroundColor: "#0f2c45",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  input: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 15,
    maxHeight: 120,
    fontWeight: "500",
    lineHeight: 22,
  },
  typingIndicator: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.gold,
    opacity: 0.6,
  },
  sendBtn: {
    backgroundColor: palette.gold,
    borderRadius: 28,
    padding: 16,
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: "#ffffff20",
  },
  sendBtnPressed: {
    backgroundColor: "#D4B87D",
    transform: [{ scale: 0.94 }],
  },
  sendBtnDisabled: {
    backgroundColor: "#ffffff15",
    opacity: 0.5,
    shadowOpacity: 0,
  },
  attachmentsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1a3a52",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: `${palette.gold}30`,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  attachmentText: {
    maxWidth: 160,
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  removeAttachment: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  charCounter: {
    alignItems: "flex-end",
    paddingTop: 4,
  },
  charCountText: {
    color: "#ffffff60",
    fontSize: 12,
    fontWeight: "600",
  },
  charCountWarning: {
    color: palette.gold,
    fontWeight: "800",
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  quickActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#ffffff08",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${palette.gold}20`,
  },
  quickActionText: {
    color: palette.gold,
    fontSize: 13,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f2c45",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 16,
  },
  emptyTitle: {
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
    fontSize: 22,
  },
  emptyText: {
    color: "#ffffff70",
    fontSize: 15,
    fontWeight: "500",
  },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    backgroundColor: "#0f2c45",
  },
  emptyChatIcon: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: `${palette.gold}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: `${palette.gold}30`,
  },
  emptyChatTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  emptyChatSubtitle: {
    fontSize: 15,
    color: "#ffffff70",
    textAlign: "center",
    fontWeight: "500",
    maxWidth: 280,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  viewerContent: {
    width: "100%",
    maxWidth: 900,
    backgroundColor: "#0b1d2a",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ffffff20",
  },
  viewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  viewerTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  viewerImage: {
    width: "100%",
    height: 520,
    borderRadius: 12,
    backgroundColor: "#000",
  },
  viewerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
  },
  viewerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.gold,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  viewerButtonDisabled: {
    opacity: 0.7,
  },
  viewerButtonText: {
    color: palette.navy,
    fontWeight: "800",
    fontSize: 14,
  },
  viewerButtonSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffffff40",
  },
  viewerButtonSecondaryText: {
    color: "#fff",
    fontWeight: "700",
  },
});
