import { useChats, useMessages, useSendMessage } from "@/hooks/use-chat";
import { API_BASE_URL, getCurrentUserId } from "@/services/api";
import type { ChatSummary, Message } from "@/types/chat";
import { showToast } from "@/utils/toast";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  I18nManager,
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

// Force RTL
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  slate: "#566375",
  navyLight: "#1A3650",
  light: "#F2F2F2",
};

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const getInitialsFrom = (value?: string | null) => {
  if (!value) return "؟؟";
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

// Arabic translations
const translations = {
  chats: "المحادثات",
  chat: "محادثة",
  noMessagesYet: "لا توجد رسائل بعد",
  sendMessageToBegin: "أرسل رسالة للبدء",
  typeMessage: "اكتب رسالة...",
  chooseChat: "اختر محادثة",
  selectConversation: "حدد محادثة لبدء المراسلة",
  attach: "إرفاق",
  photoFromLibrary: "صورة من المكتبة",
  fileFromDevice: "ملف من الجهاز",
  cancel: "إلغاء",
  permissionNeeded: "الإذن مطلوب",
  allowPhotoAccess: "السماح بالوصول إلى الصور لإرفاق الصور.",
  unableToSave: "غير قادر على حفظ المرفق.",
  unableToOpen: "غير قادر على فتح المرفق.",
  attachment: "مرفق",
  save: "حفظ",
  close: "إغلاق",
  you: "أنت",
};

export default function ChatTab() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<
    { uri: string; name: string; type?: string | null }[]
  >([]);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [viewerName, setViewerName] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showChatView, setShowChatView] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);

  const router = useRouter();
  const { chatId: paramChatId, receiverId: paramReceiverId } =
    useLocalSearchParams<{
      chatId?: string;
      receiverId?: string;
    }>();

  const {
    data: chats,
    isLoading: loadingChats,
    refetch,
    isRefetching: refreshing,
  } = useChats();

  const { data: messages, isLoading: loadingMessages } = useMessages(
    selectedChat ?? undefined,
  );

  const sendMutation = useSendMessage();

  useEffect(() => {
    setUserId(getCurrentUserId());
  }, []);

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );

    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (paramChatId) {
      setSelectedChat(paramChatId);
      setReceiverId(paramReceiverId ?? null);
      setShowChatView(true);
    }
  }, [paramChatId, paramReceiverId]);

  const keyboardOffset =
    Platform.OS === "ios"
      ? (keyboardVisible ? 0 : tabBarHeight) + insets.bottom
      : 0;
  const composerBottomSpacing = Math.max(tabBarHeight, insets.bottom + 16);

  const selectedChatData = chats?.find((chat) => chat._id === selectedChat);

  const send = () => {
    if (!selectedChat || !receiverId || !userId) return;
    if (!message.trim() && attachments.length === 0) return;

    sendMutation.mutate({
      chatId: selectedChat,
      senderId: userId,
      receiverId,
      content: message.trim() || undefined,
      attachments,
    });

    setMessage("");
    setAttachments([]);
  };

  const resolveAttachmentUrl = (uri: string) => {
    const trimmed = uri.trim();
    if (/^(https?:|file:)/i.test(trimmed)) {
      return trimmed;
    }
    const base = API_BASE_URL.replace(/\/$/, "");
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${base}${path}`;
  };

  const isImageUri = (uri: string) => {
    const clean = uri.split("?")[0].toLowerCase();
    return /\.(png|jpe?g|gif|webp|heic|heif)$/i.test(clean);
  };

  const downloadAttachment = async (uri?: string, name?: string) => {
    if (!uri) return;
    const url = encodeURI(resolveAttachmentUrl(uri));
    const filename =
      name ||
      uri.split("/").pop() ||
      `attachment-${Date.now()}.${isImageUri(uri) ? "jpg" : "bin"}`;
    const destination = `${FileSystem.Paths.document.uri}${filename}`;

    try {
      setDownloading(true);
      const result = await FileSystemLegacy.downloadAsync(url, destination);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri);
      }
    } catch (err) {
      console.error(err);
      showToast({ message: translations.unableToSave, type: "error" });
    } finally {
      setDownloading(false);
    }
  };

  const openAttachment = async (uri?: string) => {
    if (!uri) return;
    const url = encodeURI(resolveAttachmentUrl(uri));
    if (isImageUri(url)) {
      setViewerUri(url);
      setViewerName(uri.split("/").pop() || translations.attachment);
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(url);
      return;
    } catch {
      // ignore and try fallback links
    }
    try {
      await Linking.openURL(url);
      return;
    } catch (err) {
      console.error(err);
    }
    showToast({ message: translations.unableToOpen, type: "error" });
  };

  const pickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled || !result.assets?.length) return;
      setAttachments((prev) =>
        [
          ...prev,
          ...result.assets.map((asset) => ({
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType || undefined,
          })),
        ].slice(0, 5),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const pickPhotoFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(translations.permissionNeeded, translations.allowPhotoAccess);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const name =
      asset.fileName || asset.uri.split("/").pop() || `photo-${Date.now()}.jpg`;
    const type =
      asset.type === "image" ? "image/jpeg" : asset.mimeType || "image/jpeg";
    setAttachments((prev) =>
      [...prev, { uri: asset.uri, name, type }].slice(0, 5),
    );
  };

  const openAttachmentChooser = () => {
    const options = [
      translations.photoFromLibrary,
      translations.fileFromDevice,
      translations.cancel,
    ];
    const cancelButtonIndex = 2;
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, userInterfaceStyle: "dark" },
        (buttonIndex) => {
          if (buttonIndex === 0) pickPhotoFromGallery();
          if (buttonIndex === 1) pickAttachment();
        },
      );
      return;
    }
    Alert.alert(translations.attach, translations.attach, [
      { text: options[0], onPress: pickPhotoFromGallery },
      { text: options[1], onPress: pickAttachment },
      { text: options[2], style: "cancel" },
    ]);
  };

  const handleSelectChat = (chat: ChatSummary) => {
    setSelectedChat(chat._id);
    setReceiverId(chat.otherUser?.id ?? null);
    if (!isTablet) {
      setShowChatView(true);
    }
  };

  const handleBackToList = () => setShowChatView(false);

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const mine = item.senderId === userId;
    const previous = messages?.[index - 1];
    const showAvatar = !previous || previous.senderId !== item.senderId;
    const isImage =
      item.image ||
      (item.attachments &&
        item.attachments.length > 0 &&
        /\.(png|jpe?g|gif|webp|heic|heif)$/i.test(item.attachments[0]));
    const otherName = selectedChatData?.otherUser?.name;
    const initials = mine
      ? translations.you
      : getInitialsFrom(otherName ?? item.senderId);

    return (
      <View
        style={[
          styles.messageRow,
          mine ? styles.messageMine : styles.messageTheirs,
        ]}
      >
        {!mine && showAvatar && (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        <View style={[styles.messageBubble, mine && styles.messageBubbleMine]}>
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
                downloadAttachment(item.image || item.attachments?.[0])
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
              {item.attachments.map((att, idx) => {
                const filename = att.split("/").pop() || `file-${idx + 1}`;
                return (
                  <Pressable
                    style={styles.attachmentRow}
                    key={`${att}-${idx}`}
                    onPress={() => openAttachment(att)}
                    onLongPress={() => downloadAttachment(att, filename)}
                    delayLongPress={500}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={14}
                      color={palette.navy}
                    />
                    <Text style={styles.attachmentLabel} numberOfLines={1}>
                      {filename}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Text style={[styles.timeLabel, mine && styles.timeLabelMine]}>
            {new Date(item.createdAt ?? Date.now()).toLocaleTimeString(
              "ar-SA",
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            )}
          </Text>
        </View>
      </View>
    );
  };

  const renderChatList = () => (
    <View style={styles.listContainer}>
      <View style={styles.listHeaderRow}>
        <Ionicons name="chatbubbles" size={22} color={palette.gold} />
        <Text style={styles.listHeaderText}>{translations.chats}</Text>
      </View>
      {loadingChats ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={palette.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={chats ?? []}
          keyExtractor={(chat) => chat._id}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.chatItem,
                pressed && { opacity: 0.7 },
                selectedChat === item._id && styles.chatItemActive,
              ]}
              onPress={() => handleSelectChat(item)}
            >
              <View style={styles.chatAvatar}>
                <Text style={styles.avatarInitials}>
                  {getInitialsFrom(item.otherUser?.name)}
                </Text>
              </View>
              <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{item.otherUser?.name}</Text>
                <Text style={styles.chatPreview} numberOfLines={1}>
                  {typeof item.lastMessage === "string"
                    ? item.lastMessage
                    : (item.lastMessage?.content ?? translations.noMessagesYet)}
                </Text>
              </View>
              {(item.unreadCount ?? 0) > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
              )}
            </Pressable>
          )}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={refetch}
        />
      )}
    </View>
  );

  const renderChatView = () => (
    <View style={styles.chatPane}>
      <View style={styles.chatHeader}>
        {!isTablet && (
          <Pressable onPress={handleBackToList} style={styles.backButton}>
            <Ionicons name="arrow-forward" size={24} color={palette.light} />
          </Pressable>
        )}
        <Text style={styles.chatTitle}>
          {selectedChatData?.otherUser?.name ?? translations.chat}
        </Text>
      </View>
      <View style={styles.messagesWrapper}>
        {loadingMessages ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={palette.gold} size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages ?? []}
            renderItem={renderMessage}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="mail-outline" size={48} color={palette.slate} />
                <Text style={styles.emptyTitle}>
                  {translations.noMessagesYet}
                </Text>
                <Text style={styles.emptyText}>
                  {translations.sendMessageToBegin}
                </Text>
              </View>
            )}
          />
        )}
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={keyboardOffset}
        style={[
          styles.composerOuter,
          {
            marginBottom: composerBottomSpacing,
            paddingBottom: composerBottomSpacing - 8,
          },
        ]}
      >
        <View style={styles.composerRow}>
          <Pressable
            style={styles.attachButton}
            onPress={openAttachmentChooser}
          >
            <Ionicons name="attach" size={20} color={palette.light} />
          </Pressable>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={translations.typeMessage}
            placeholderTextColor={palette.slate}
            style={styles.input}
            multiline
          />
          <Pressable
            onPress={send}
            style={({ pressed }) => [
              styles.sendButton,
              (!message.trim() && attachments.length === 0) ||
              sendMutation.isPending
                ? styles.sendButtonDisabled
                : pressed
                  ? styles.sendButtonPressed
                  : null,
            ]}
            disabled={
              (!message.trim() && attachments.length === 0) ||
              sendMutation.isPending
            }
          >
            {sendMutation.isPending ? (
              <ActivityIndicator color="#091217" />
            ) : (
              <View style={styles.sendButtonInner}>
                <Ionicons name="send" size={22} color={palette.navy} />
              </View>
            )}
          </Pressable>
        </View>
        {attachments.length > 0 && (
          <View style={styles.attachmentPreview}>
            {attachments.map((item, index) => (
              <View style={styles.attachmentChip} key={`${item.uri}-${index}`}>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Pressable
                  onPress={() =>
                    setAttachments((prev) =>
                      prev.filter((_, idx) => idx !== index),
                    )
                  }
                  style={({ pressed }) => [
                    styles.removeAttachment,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Ionicons name="close" size={12} color="#000" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );

  const renderLargeEmpty = () => (
    <View style={styles.emptyLarge}>
      <Ionicons name="chatbubbles-outline" size={72} color={palette.gold} />
      <Text style={styles.emptyTitle}>{translations.chooseChat}</Text>
      <Text style={styles.emptyText}>{translations.selectConversation}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {isTablet ? (
        <View style={styles.tabletLayout}>
          {renderChatList()}
          {selectedChat ? renderChatView() : renderLargeEmpty()}
        </View>
      ) : showChatView && selectedChat ? (
        renderChatView()
      ) : (
        renderChatList()
      )}
      <Modal visible={!!viewerUri} transparent animationType="fade">
        <Pressable
          style={styles.viewerOverlay}
          onPress={() => setViewerUri(null)}
        >
          <View style={styles.viewerContent}>
            <View style={styles.viewerHeader}>
              <Text style={styles.viewerTitle}>
                {viewerName ?? translations.attachment}
              </Text>
              <Pressable onPress={() => setViewerUri(null)}>
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>
            {viewerUri && (
              <Image
                source={{ uri: viewerUri }}
                style={styles.viewerImage}
                resizeMode="contain"
              />
            )}
            <View style={styles.viewerActions}>
              <Pressable
                style={[styles.viewerButton, downloading && { opacity: 0.6 }]}
                onPress={() =>
                  downloadAttachment(
                    viewerUri || undefined,
                    viewerName || undefined,
                  )
                }
                disabled={downloading}
              >
                <Ionicons name="download" size={16} color={palette.navy} />
                <Text style={styles.viewerButtonText}>{translations.save}</Text>
              </Pressable>
              <Pressable
                style={styles.viewerButton}
                onPress={() => setViewerUri(null)}
              >
                <Text style={styles.viewerButtonText}>
                  {translations.close}
                </Text>
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
    backgroundColor: "transparent",
  },
  tabletLayout: {
    flex: 1,
    flexDirection: "row",
  },
  listContainer: {
    width: isTablet ? 360 : "100%",
    backgroundColor: "transparent",
    borderLeftWidth: isTablet ? 1 : 0,
    borderLeftColor: "#ffffff10",
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff10",
  },
  listHeaderText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  chatList: {
    paddingVertical: 10,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chatItemActive: {
    backgroundColor: "#0f2c45",
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0A2436",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    color: "#fff",
    fontWeight: "700",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  chatPreview: {
    color: "#ffffff80",
    fontSize: 13,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  badge: {
    backgroundColor: palette.gold,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: "#0A2436",
    fontWeight: "700",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  emptyText: {
    color: "#ffffff80",
    fontSize: 13,
    fontFamily: "NotoNaskhArabic-Bold",
    textAlign: "center",
  },
  chatPane: {
    flex: 1,
    backgroundColor: "transparent",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff10",
  },
  backButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#0a1c2f",
  },
  chatTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: "NotoNaskhArabic-Bold",
  },
  messagesWrapper: {
    flex: 1,
    padding: 16,
  },
  messagesList: {
    paddingBottom: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  messageMine: {
    justifyContent: "flex-start",
  },
  messageTheirs: {
    justifyContent: "flex-end",
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#12344b",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  messageBubble: {
    flex: 1,
    backgroundColor: "#102b40",
    borderRadius: 16,
    padding: 12,
  },
  messageBubbleMine: {
    backgroundColor: palette.gold,
  },
  messageText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "NotoNaskhArabic-Bold",
    textAlign: "right",
  },
  messageTextMine: {
    color: "#0A2436",
  },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
    marginTop: 8,
  },
  attachmentsList: {
    marginTop: 8,
    gap: 8,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff10",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  attachmentLabel: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    flex: 1,
    fontFamily: "NotoNaskhArabic-Bold",
    textAlign: "right",
  },
  timeLabel: {
    marginTop: 6,
    fontSize: 11,
    color: "#ffffff70",
    fontFamily: "NotoNaskhArabic-Bold",
    textAlign: "right",
  },
  timeLabelMine: {
    color: "#0A2436",
  },
  composerOuter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#ffffff10",
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#0d2638",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#071525",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#ffffff10",
    fontFamily: "NotoNaskhArabic-Bold",
    textAlign: "right",
  },
  sendButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: palette.gold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.gold,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  sendButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  sendButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  sendButtonDisabled: {
    backgroundColor: "#777",
    shadowOpacity: 0,
    opacity: 0.6,
  },
  attachmentPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#162d42",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  attachmentName: {
    flex: 1,
    color: "#fff",
    fontFamily: "NotoNaskhArabic-Bold",
    textAlign: "right",
  },
  removeAttachment: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyLarge: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f2c45",
    gap: 10,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    padding: 16,
  },
  viewerContent: {
    backgroundColor: "#0b1d2a",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ffffff10",
  },
  viewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  viewerTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "NotoNaskhArabic-Bold",
  },
  viewerImage: {
    width: "100%",
    height: 360,
    borderRadius: 12,
    marginBottom: 12,
  },
  viewerActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  viewerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.gold,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  viewerButtonText: {
    color: palette.navy,
    fontWeight: "700",
    fontFamily: "NotoNaskhArabic-Bold",
  },
});
