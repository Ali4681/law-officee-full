import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCase, useUpdateCaseStatus } from "@/hooks/useCases";
import { DocumentSaveService } from "@/services/document-save.service";
import { DocumentService } from "@/services/document.service";
import { HearingService } from "@/services/hearing.service";
import { OcrService } from "@/services/ocr.service";
import { CaseStatus } from "@/types/case";

const palette = {
  navy: "#0A2436",
  gold: "#C6A667",
  light: "#F2F2F2",
  slate: "#566375",
};

// ============================================================================
// FIXED DATE PARSING - Prevents 2001 year issue
// ============================================================================

const parseFlexibleDate = (input: string): Date | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // First try ISO format (YYYY-MM-DD) - most reliable
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try direct parsing but validate year
  const directDate = new Date(trimmed);
  if (!isNaN(directDate.getTime()) && directDate.getFullYear() >= 2000) {
    return directDate;
  }

  // Handle various separators
  const normalized = trimmed.replace(/\./g, "-").replace(/\//g, "-");

  // Split by separator
  const parts = normalized
    .split(/[\s\-]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length !== 3 || !parts.every((p) => /^\d+$/.test(p))) {
    return null;
  }

  const toDate = (year: number, month: number, day: number): Date | null => {
    // FIXED: Always interpret 2-digit years as 20xx (not 19xx)
    let normalizedYear = year;
    if (year < 100) {
      normalizedYear = 2000 + year; // Force 2000s
    }

    // Validate year is reasonable (2000-2100)
    if (normalizedYear < 2000 || normalizedYear > 2100) {
      return null;
    }

    const date = new Date(normalizedYear, month - 1, day);
    if (
      date.getFullYear() === normalizedYear &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
    return null;
  };

  // Try different date format orders
  const idxOrders: Array<{
    yearIdx: number;
    monthIdx: number;
    dayIdx: number;
  }> = [
    { yearIdx: 0, monthIdx: 1, dayIdx: 2 }, // YYYY-MM-DD (prioritize this)
    { yearIdx: 2, monthIdx: 1, dayIdx: 0 }, // DD-MM-YYYY
    { yearIdx: 2, monthIdx: 0, dayIdx: 1 }, // MM-DD-YYYY
  ];

  for (const order of idxOrders) {
    const year = Number(parts[order.yearIdx]);
    const month = Number(parts[order.monthIdx]);
    const day = Number(parts[order.dayIdx]);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const candidate = toDate(year, month, day);
      if (candidate) return candidate;
    }
  }

  return null;
};

const parseTime = (
  timeStr: string,
): { hours: number; minutes: number } | null => {
  const trimmed = timeStr.trim();
  if (!trimmed) return null;

  // Support English and Arabic time formats
  const timePattern = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|ص|م)?$/i;
  const match = trimmed.match(timePattern);

  if (match) {
    const [, hourStr, minuteStr, , ampm] = match;
    let hours = Number(hourStr);
    const minutes = Number(minuteStr);

    if (ampm) {
      const upper = ampm.toUpperCase();
      if ((upper === "PM" || upper === "م") && hours < 12) hours += 12;
      if ((upper === "AM" || upper === "ص") && hours === 12) hours = 0;
    }

    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return { hours, minutes };
    }
  }

  return null;
};

// Format date as YYYY-MM-DD
const formatDateAsISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// ============================================================================
// Helper Functions
// ============================================================================

const STATUS_OPTIONS: CaseStatus[] = ["declined", "active", "in_progress"];

type ExtractedEntry = { label: string; value: string };

const extractedFieldLabels: Record<string, string> = {
  caseNumber: "Case Number",
  courtName: "Court Name",
  judgementDate: "Judgment Date",
  judgementNumber: "Judgment Number",
  documentDate: "Document Date",
  contractDate: "Contract Date",
  plaintiff: "Plaintiff",
  defendant: "Defendant",
  claimant: "Claimant",
  respondent: "Respondent",
  parties: "Parties",
  amount: "Amount",
  subject: "Case Subject",
  judge: "Judge",
  panel: "Judicial Panel",
  courtCity: "Court City",
};

const getClientDisplayName = (caseData: any): string => {
  if (!caseData) return "Unknown client";
  const profile = caseData.clientId?.profile;
  const fromProfile =
    profile?.firstName || profile?.lastName
      ? `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim()
      : null;

  return (
    caseData.clientName ||
    caseData.client?.name ||
    caseData.client?.fullName ||
    caseData.client?.username ||
    fromProfile ||
    "Unknown client"
  );
};

const formatDisplayValue = (value: any): string => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => formatDisplayValue(item))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, val]) => `${key}: ${formatDisplayValue(val)}`)
      .join(" | ");
  }
  return String(value);
};

const ensureText = (value: any): string => {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  try {
    return String(value);
  } catch {
    return "";
  }
};

const clipText = (value: string, max = 20000): string => {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n...[truncated]`;
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "active":
    case "in_progress":
      return "#4CAF50";
    case "pending":
    case "info_requested":
      return palette.gold;
    case "fee_proposed":
      return palette.gold;
    case "closed":
      return palette.slate;
    case "declined":
      return "#ff6b6b";
    case "client_rejected":
      return "#ff6b6b";
    default:
      return palette.gold;
  }
};

// ============================================================================
// Main Component
// ============================================================================

export default function CaseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const caseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data, isLoading, isError, error, refetch } = useCase(caseId);
  const updateStatus = useUpdateCaseStatus();

  const clientDisplayName = useMemo(() => getClientDisplayName(data), [data]);

  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<any | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [hearingDate, setHearingDate] = useState("");
  const [hearingTime, setHearingTime] = useState("");
  const [hearingLocation, setHearingLocation] = useState("");
  const [hearingNotes, setHearingNotes] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sendingHearing, setSendingHearing] = useState(false);
  const [editingExtractedJson, setEditingExtractedJson] = useState("");
  const [editingDocumentType, setEditingDocumentType] = useState("");
  const [editingOriginalName, setEditingOriginalName] = useState("");
  const [updatingExtracted, setUpdatingExtracted] = useState(false);
  const [isEditingExtracted, setIsEditingExtracted] = useState(false);

  const isAssigned = useMemo(() => {
    if (!data || !userId) return false;
    const lawyers = data.lawyerIds || [];
    return lawyers.some((l: any) => {
      if (typeof l === "string") return l === userId;
      return l?._id === userId;
    });
  }, [data, userId]);

  const caseClientId = useMemo(() => {
    const clientId = (data as any)?.clientId;
    if (!clientId) return null;
    if (typeof clientId === "string") return clientId;
    if (typeof clientId === "object" && clientId._id) return clientId._id;
    return null;
  }, [data]);

  const storageKey = useMemo(
    () => (caseId ? `case_ocr_${caseId}` : null),
    [caseId],
  );

  const toPrettyJson = useCallback((value: any) => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return typeof value === "string" ? value : "";
    }
  }, []);

  const safeSerialize = useCallback((value: any) => {
    try {
      const seen = new WeakSet();
      return JSON.stringify(value, (_key, current) => {
        if (typeof current === "object" && current !== null) {
          if (seen.has(current)) return "[Circular]";
          seen.add(current);
        }
        return current;
      });
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("user_id").then(setUserId);
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!value) return;
        try {
          const parsed = JSON.parse(value);
          setOcrResult(parsed);
        } catch (_) {}
      })
      .catch(() => {});
  }, [storageKey]);

  const persistOcrResult = useCallback(
    (value: any | null) => {
      setOcrResult(value);
      if (!storageKey) return;
      try {
        if (value) {
          const serialized = safeSerialize(value);
          if (!serialized) {
            console.log("Skipping OCR cache write: failed to serialize value.");
            return;
          }
          // Keep cache reasonably small to avoid memory pressure on mobile.
          if (serialized.length > 900_000) {
            console.log("Skipping OCR cache write: payload too large.");
            return;
          }
          AsyncStorage.setItem(storageKey, serialized).catch(() => {});
        } else {
          AsyncStorage.removeItem(storageKey).catch(() => {});
        }
      } catch (cacheErr) {
        console.log("Failed to persist OCR cache", cacheErr);
      }
    },
    [storageKey, safeSerialize],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // ============================================================================
  // FIXED: Handle Send Hearing with proper date formatting
  // ============================================================================

  const handleSendHearing = useCallback(async () => {
    if (!caseId) {
      Alert.alert("Error", "Missing case ID.");
      return;
    }

    if (!isAssigned) {
      Alert.alert(
        "Not Allowed",
        "Only assigned lawyers can schedule hearings.",
      );
      return;
    }

    const dateInput = hearingDate.trim();
    const timeInput = hearingTime.trim();
    const location = hearingLocation.trim() || undefined;
    const notes = hearingNotes.trim() || undefined;

    if (!dateInput) {
      Alert.alert(
        "Missing Date",
        "Please enter the hearing date (e.g., 2025-12-05 or 05/12/2025).",
      );
      return;
    }

    // Parse the date
    const parsedDate = parseFlexibleDate(dateInput);
    if (!parsedDate) {
      Alert.alert(
        "Invalid Date",
        "The provided date could not be interpreted. Try format like: 2025-12-05 or 05/12/2025",
      );
      return;
    }

    // FIXED: Validate the year is reasonable
    const year = parsedDate.getFullYear();
    if (year < 2024 || year > 2100) {
      Alert.alert(
        "Invalid Year",
        `The date appears to be in year ${year}. Please check the date format.\n\nExample: 2025-12-05`,
      );
      return;
    }

    // Validate time if provided
    if (timeInput) {
      const parsedTime = parseTime(timeInput);
      if (!parsedTime) {
        Alert.alert(
          "Invalid Time",
          "The provided time could not be interpreted. Use format like 2:00 PM, 2:00 م, or 14:00.",
        );
        return;
      }
    }

    // FIXED: Format date as YYYY-MM-DD properly
    const isoDate = formatDateAsISO(parsedDate);

    // Debug logging
    console.log("📅 Sending hearing request:");
    console.log("  Input date:", dateInput);
    console.log("  Parsed date:", parsedDate);
    console.log("  ISO date:", isoDate);
    console.log("  Time:", timeInput || "not provided");

    try {
      setSendingHearing(true);

      const payload: any = {
        caseId,
        date: isoDate,
        location,
        notes,
      };

      // Add time separately if provided
      if (timeInput) {
        payload.time = timeInput;
      }

      // Add clientId if available
      if (caseClientId) {
        payload.clientId = caseClientId;
      }

      console.log("📤 Payload:", JSON.stringify(payload, null, 2));

      const res = await HearingService.create(payload);

      const hearingId = res?.hearingId || res?.hearing?._id || res?._id || null;

      Alert.alert(
        "Success",
        `Hearing Scheduled${hearingId ? " (#" + hearingId + ")" : ""}`,
      );

      // Clear form
      setHearingDate("");
      setHearingTime("");
      setHearingLocation("");
      setHearingNotes("");

      await refetch();
    } catch (err: any) {
      console.error("Hearing Error:", err);
      Alert.alert(
        "Failed",
        err?.response?.data?.message || err?.message || "Unexpected error",
      );
    } finally {
      setSendingHearing(false);
    }
  }, [
    caseId,
    hearingDate,
    hearingTime,
    hearingLocation,
    hearingNotes,
    isAssigned,
    refetch,
    caseClientId,
  ]);

  // ============================================================================
  // OCR and other handlers
  // ============================================================================

  const extractedData = useMemo<Record<string, any> | null>(() => {
    const resp: any = ocrResult?.response;
    const raw =
      resp?.data?.extractedData ||
      resp?.data ||
      resp?.extractedData ||
      (ocrResult as any)?.extractedData ||
      null;

    if (!raw) return null;
    if (typeof raw === "object" && !Array.isArray(raw))
      return raw as Record<string, any>;
    if (Array.isArray(raw)) return { items: raw };
    return { rawText: ensureText(raw) };
  }, [ocrResult]);

  const documentId = useMemo(() => {
    const resp: any = ocrResult?.response || ocrResult;
    return (
      resp?.data?.documentId ||
      resp?.documentId ||
      resp?._id ||
      extractedData?.documentId ||
      extractedData?._id ||
      null
    );
  }, [ocrResult, extractedData]);

  const extractedJson = useMemo(
    () => (extractedData ? toPrettyJson(extractedData) : null),
    [extractedData, toPrettyJson],
  );

  const extractedJsonPreview = useMemo(
    () => (extractedJson ? clipText(extractedJson) : null),
    [extractedJson],
  );

  useEffect(() => {
    if (!extractedData) {
      setEditingExtractedJson("");
      setEditingDocumentType("");
      setEditingOriginalName("");
      return;
    }

    setEditingExtractedJson(clipText(toPrettyJson(extractedData), 100000));
    setEditingDocumentType(
      ensureText(extractedData.documentType || extractedData.documentCategory),
    );

    const originalFromResponse =
      (ocrResult as any)?.response?.data?.originalName ||
      (ocrResult as any)?.response?.originalName;

    setEditingOriginalName(
      ensureText(
        originalFromResponse ||
          (extractedData as any)?.originalName ||
          ocrResult?.fileName,
      ),
    );
    setIsEditingExtracted(false);
  }, [extractedData, ocrResult, toPrettyJson]);

  const fetchAndPersistExtraction = useCallback(
    async (
      documentCaseId: string,
      fallback: { uri: string; name?: string; mimeType?: string },
    ) => {
      const previousResponse =
        (ocrResult as any)?.response &&
        typeof (ocrResult as any)?.response === "object"
          ? (ocrResult as any)?.response
          : typeof ocrResult === "object"
            ? (ocrResult as any)
            : {};
      const hearingRequest = (ocrResult as any)?.hearingRequest;
      const maxAttempts = 6;
      const delayMs = 2000;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const docs = await DocumentService.listByCase(documentCaseId);
          const withExtraction = (docs || []).find((d: any) => d.extractedData);
          if (withExtraction) {
            persistOcrResult({
              response: {
                ...(previousResponse || {}),
                data: {
                  ...((previousResponse as any)?.data || {}),
                  ...withExtraction.extractedData,
                  documentId: withExtraction._id,
                  caseId: withExtraction.caseId,
                  documentType: withExtraction.documentType,
                },
                fileUrl: withExtraction.fileUrl,
              },
              fileUri: withExtraction.fileUrl || fallback.uri,
              fileType:
                withExtraction.fileType ||
                fallback.mimeType ||
                "application/pdf",
              fileName:
                (withExtraction as any).originalName ||
                withExtraction.fileName ||
                fallback.name ||
                "ocr.pdf",
              ...(hearingRequest ? { hearingRequest } : {}),
            });
            return;
          }
        } catch (fetchErr: any) {
          if (fetchErr?.response?.status === 403) {
            console.log(
              "Access denied while refreshing documents after OCR",
              fetchErr,
            );
            Alert.alert(
              "Access Denied",
              "You don't have permission to refresh documents for this case.",
            );
            return;
          }
          console.log("Failed to refresh documents after OCR", fetchErr);
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    },
    [persistOcrResult, ocrResult],
  );

  const extractedEntries = useMemo<ExtractedEntry[]>(() => {
    const raw = extractedData;
    if (!raw) return [];

    const entries: ExtractedEntry[] = [];
    Object.entries(extractedFieldLabels).forEach(([key, label]) => {
      const value = (raw as any)[key];
      if (value !== undefined && value !== null && `${value}`.trim() !== "") {
        entries.push({ label, value: formatDisplayValue(value) });
      }
    });

    const skipKeys = new Set([
      "documentCategory",
      "extractionQuality",
      "fileUrl",
      "fileType",
      "fileName",
      ...Object.keys(extractedFieldLabels),
    ]);

    Object.entries(raw).forEach(([key, value]) => {
      if (skipKeys.has(key)) return;
      if (value === undefined || value === null || `${value}`.trim() === "")
        return;
      entries.push({ label: key, value: formatDisplayValue(value) });
    });

    return entries;
  }, [extractedData]);

  const handleStatusChange = () => {
    if (!caseId) return;
    setShowStatusModal(true);
  };

  const selectStatus = (status: CaseStatus) => {
    setShowStatusModal(false);
    updateStatus.mutate(
      { id: caseId, status },
      {
        onSuccess: () => {
          refetch();
        },
        onError: (err: any) => {
          Alert.alert(
            "Status Update Failed",
            err?.response?.data?.message ||
              err?.message ||
              "An error occurred, please try again.",
          );
        },
      },
    );
  };

  const getStatusInfo = (status: CaseStatus) => {
    const statusMap: Record<
      CaseStatus,
      { icon: string; label: string; description: string }
    > = {
      declined: {
        icon: "close-circle",
        label: "Declined",
        description: "Case has been declined",
      },
      active: {
        icon: "checkmark-circle",
        label: "Active",
        description: "Case is currently active",
      },
      in_progress: {
        icon: "play-circle",
        label: "In Progress",
        description: "Work is being done on case",
      },
    };
    return (
      statusMap[status] || { icon: "ellipse", label: status, description: "" }
    );
  };

  // FIXED: Upload OCR with proper date formatting
  const uploadOcr = async () => {
    if (!caseId) {
      Alert.alert("Error", "Cannot upload file without case ID.");
      return;
    }

    const normalizedHearingDate = hearingDate.trim();
    const normalizedHearingTime = hearingTime.trim();
    const normalizedHearingLocation = hearingLocation.trim();
    const normalizedHearingNotes = hearingNotes.trim();

    if (!isAssigned) {
      Alert.alert(
        "Not Authorized",
        "Only assigned lawyers can upload files to this case.",
      );
      return;
    }

    try {
      const pick = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (pick.canceled) return;

      const asset = pick.assets[0];
      setUploading(true);

      try {
        const ocrOptions: any = {
          caseId,
        };

        // FIXED: Add date if provided with proper formatting
        if (normalizedHearingDate) {
          const parsedDate = parseFlexibleDate(normalizedHearingDate);
          if (parsedDate) {
            const isoDate = formatDateAsISO(parsedDate);
            ocrOptions.hearingDate = isoDate;
            console.log("📅 OCR hearing date:", isoDate);
          }
        }

        // Add time separately if provided
        if (normalizedHearingTime) {
          ocrOptions.hearingTime = normalizedHearingTime;
        }

        // Add location and notes
        if (normalizedHearingLocation) {
          ocrOptions.hearingLocation = normalizedHearingLocation;
        }
        if (normalizedHearingNotes) {
          ocrOptions.hearingNotes = normalizedHearingNotes;
        }

        console.log("📤 OCR options:", JSON.stringify(ocrOptions, null, 2));

        const res = await OcrService.extractAsync(
          asset.uri,
          asset.name,
          asset.mimeType || "application/pdf",
          ocrOptions,
        );

        const responsePayload = res?.response ? res.response : res;
        const payload: any =
          responsePayload?.data?.extractedData ||
          responsePayload?.data ||
          responsePayload;

        if (payload?.success === false) {
          Alert.alert(
            "OCR Request Failed",
            payload?.message || "Unknown error occurred.",
          );
          return;
        }

        const hearingRequest =
          normalizedHearingDate ||
          normalizedHearingTime ||
          normalizedHearingLocation ||
          normalizedHearingNotes
            ? {
                hearingDate: ocrOptions.hearingDate,
                hearingTime: normalizedHearingTime,
                hearingLocation: normalizedHearingLocation,
                hearingNotes: normalizedHearingNotes,
              }
            : undefined;

        persistOcrResult({
          response: responsePayload,
          fileUri: asset.uri,
          fileType: asset.mimeType || "application/pdf",
          fileName: asset.name,
          ...(hearingRequest ? { hearingRequest } : {}),
        });

        fetchAndPersistExtraction(caseId, {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
        }).catch((pollErr) =>
          console.log("OCR poll for extracted data failed", pollErr),
        );

        const scheduledHearingId =
          responsePayload?.scheduledHearingId ||
          responsePayload?.data?.scheduledHearingId;
        const hearingNotificationId =
          responsePayload?.hearingNotificationId ||
          responsePayload?.data?.hearingNotificationId;
        const schedulingMessage =
          responsePayload?.schedulingMessage ||
          responsePayload?.data?.schedulingMessage;

        const successMessage =
          schedulingMessage ||
          (scheduledHearingId || hearingNotificationId
            ? "Hearing scheduled and client notified. OCR extraction will continue in the background."
            : "The file will be processed in the background. You'll receive a notification when complete.");

        Alert.alert("OCR Request Submitted", successMessage);
      } catch (err: any) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to submit OCR request, please try again.";
        Alert.alert("OCR Request Failed", message);
      }
    } catch (error: any) {
      console.log("OCR upload failed", error);
      if (!error?.handled) {
        Alert.alert(
          "Upload Failed",
          error?.response?.data?.message ||
            error?.message ||
            "An unexpected error occurred, please try again.",
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSaveExtracted = async () => {
    if (!ocrResult || !extractedData || !caseId) return;
    try {
      const documentType: "court_decision" | "contract" =
        extractedData?.documentCategory === "court_decision"
          ? "court_decision"
          : "contract";

      const payload = {
        caseId,
        fileUrl:
          ocrResult.response?.fileUrl ||
          extractedData?.fileUrl ||
          ocrResult.fileUri,
        fileType: ocrResult.fileType || "application/pdf",
        extractedData,
        documentType,
      };
      await DocumentSaveService.saveExtracted(payload);
      Alert.alert(
        "Saved Successfully",
        "Extracted data has been saved to the case file.",
      );
      refetch();
    } catch (err: any) {
      Alert.alert(
        "Save Failed",
        err?.response?.data?.message ||
          err?.message ||
          "An error occurred while saving.",
      );
    }
  };

  const handleUpdateExtracted = async () => {
    if (!documentId) {
      Alert.alert(
        "Missing Document",
        "No document is linked to this extraction yet. Upload and process a file first.",
      );
      return;
    }

    let parsedExtracted: Record<string, any> = {};
    const rawExtracted = editingExtractedJson.trim();

    if (rawExtracted) {
      try {
        const parsed = JSON.parse(rawExtracted);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          parsedExtracted = parsed;
        } else if (Array.isArray(parsed)) {
          parsedExtracted = { items: parsed };
        } else {
          parsedExtracted = { rawText: editingExtractedJson };
        }
      } catch {
        // Allow free text input when it's not valid JSON.
        parsedExtracted = { rawText: editingExtractedJson };
      }
    }

    const payload: any = {};
    if (parsedExtracted && Object.keys(parsedExtracted).length > 0) {
      payload.extractedData = parsedExtracted;
    }
    if (editingDocumentType.trim()) {
      payload.documentType = editingDocumentType.trim();
    }
    if (editingOriginalName.trim()) {
      payload.originalName = editingOriginalName.trim();
    }

    if (!Object.keys(payload).length) {
      Alert.alert(
        "Nothing to Update",
        "Edit the extracted JSON, document type, or file name before saving.",
      );
      return;
    }

    try {
      setUpdatingExtracted(true);
      const updatedDocument = await DocumentService.update(documentId, payload);

      const updatedExtracted =
        updatedDocument?.extractedData &&
        typeof updatedDocument.extractedData === "object"
          ? updatedDocument.extractedData
          : parsedExtracted;

      const previousResponse =
        (ocrResult as any)?.response &&
        typeof (ocrResult as any)?.response === "object"
          ? (ocrResult as any)?.response
          : typeof ocrResult === "object"
            ? (ocrResult as any)
            : {};

      persistOcrResult({
        ...(ocrResult && typeof ocrResult === "object" ? ocrResult : {}),
        response: {
          ...(previousResponse || {}),
          ...(updatedDocument?.fileUrl
            ? { fileUrl: updatedDocument.fileUrl }
            : {}),
          ...(updatedDocument?.originalName
            ? { originalName: updatedDocument.originalName }
            : {}),
          data: {
            ...((previousResponse as any)?.data || {}),
            ...updatedExtracted,
            documentId: updatedDocument?._id || documentId,
            caseId: updatedDocument?.caseId || caseId,
            documentType:
              updatedDocument?.documentType ||
              payload.documentType ||
              editingDocumentType.trim() ||
              extractedData?.documentType ||
              extractedData?.documentCategory,
            ...(updatedDocument?.originalName
              ? { originalName: updatedDocument.originalName }
              : {}),
          },
        },
        fileUri:
          updatedDocument?.fileUrl ||
          ocrResult?.fileUri ||
          (ocrResult as any)?.response?.fileUrl,
        fileName:
          updatedDocument?.originalName ||
          updatedDocument?.fileName ||
          editingOriginalName.trim() ||
          ocrResult?.fileName,
        fileType: updatedDocument?.fileType || ocrResult?.fileType,
      });

      setIsEditingExtracted(false);
      await refetch();

      Alert.alert("Updated", "Document details were updated successfully.");
    } catch (err: any) {
      Alert.alert(
        "Update Failed",
        err?.response?.data?.message ||
          err?.message ||
          "Could not update extracted data.",
      );
    } finally {
      setUpdatingExtracted(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[palette.navy, "#142d42", palette.navy]}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safe}>
            <View style={styles.centerContent}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={palette.gold} size="large" />
                <Text style={styles.loadingText}>Loading case details...</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[palette.navy, "#142d42", palette.navy]}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safe}>
            <View style={styles.centerContent}>
              <View style={styles.errorContainer}>
                <View style={styles.errorIcon}>
                  <Ionicons name="alert-circle" color="#ff6b6b" size={48} />
                </View>
                <Text style={styles.errorTitle}>Failed to Load Case</Text>
                <Text style={styles.errorMessage}>
                  {(error as any)?.response?.data?.message ||
                    (error as Error)?.message ||
                    "An error occurred."}
                </Text>
                <Pressable style={styles.retryButton} onPress={() => refetch()}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                  <Ionicons name="refresh" color={palette.navy} size={18} />
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  const statusColor = getStatusColor(data.status);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[palette.navy, "#142d42", palette.navy]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safe}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={palette.gold}
                colors={[palette.gold]}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={palette.gold} />
              </Pressable>
              <View style={styles.headerTextContainer}>
                <Text style={styles.heading} numberOfLines={2}>
                  {data.title}
                </Text>
              </View>
            </View>

            {/* Status Card */}
            <View style={styles.statusCard}>
              <LinearGradient
                colors={[
                  "rgba(198, 166, 103, 0.15)",
                  "rgba(198, 166, 103, 0.05)",
                ]}
                style={styles.statusGradient}
              >
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${statusColor}20` },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: statusColor },
                      ]}
                    />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {data.status}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.statusChangeBtn,
                      pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                      (updateStatus.isPending || !isAssigned) &&
                        styles.disabledBtn,
                    ]}
                    disabled={updateStatus.isPending || !isAssigned}
                    onPress={handleStatusChange}
                  >
                    {updateStatus.isPending ? (
                      <ActivityIndicator color={palette.navy} size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name="swap-horizontal"
                          size={18}
                          color={palette.navy}
                        />
                        <Text style={styles.statusChangeText}>
                          Change Status
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </LinearGradient>
            </View>

            {/* Case Details Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBadge}>
                  <Ionicons
                    name="information-circle"
                    color={palette.gold}
                    size={20}
                  />
                </View>
                <Text style={styles.cardTitle}>Case Information</Text>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="person" color={palette.gold} size={16} />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Client Name</Text>
                    <Text style={styles.infoValue}>{clientDisplayName}</Text>
                  </View>
                </View>

                {data.nextHearingDate && (
                  <View style={styles.infoItem}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons
                        name="calendar"
                        color={palette.gold}
                        size={16}
                      />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Next Hearing</Text>
                      <Text style={styles.infoValue}>
                        {data.nextHearingDate}
                      </Text>
                    </View>
                  </View>
                )}

                {data.courtName && (
                  <View style={styles.infoItem}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons
                        name="business"
                        color={palette.gold}
                        size={16}
                      />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Court</Text>
                      <Text style={styles.infoValue}>{data.courtName}</Text>
                    </View>
                  </View>
                )}

                {data.description && (
                  <View style={styles.descriptionItem}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons
                        name="document-text"
                        color={palette.gold}
                        size={16}
                      />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Description</Text>
                      <Text style={styles.infoValue}>{data.description}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Schedule Hearing Card */}
            {isAssigned && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconBadge}>
                    <Ionicons name="calendar" color={palette.gold} size={20} />
                  </View>
                  <Text style={styles.cardTitle}>Schedule Hearing</Text>
                </View>

                <Text style={styles.helperText}>
                  Schedule a hearing for this case. You can do this before or
                  after uploading documents.
                </Text>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Hearing Date *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2025-12-05 or 05/12/2025"
                    placeholderTextColor={`${palette.slate}80`}
                    value={hearingDate}
                    onChangeText={setHearingDate}
                    autoCapitalize="none"
                    keyboardType="default"
                  />
                  <Text style={styles.inputHint}>
                    Required. Use YYYY-MM-DD format (e.g., 2025-12-05)
                  </Text>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Hearing Time (optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2:00 PM or 14:00"
                    placeholderTextColor={`${palette.slate}80`}
                    value={hearingTime}
                    onChangeText={setHearingTime}
                    autoCapitalize="none"
                    keyboardType="default"
                  />
                  <Text style={styles.inputHint}>
                    Optional. Use 12-hour (2:00 PM) or 24-hour (14:00) format.
                  </Text>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Location (optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Courtroom 2A"
                    placeholderTextColor={`${palette.slate}80`}
                    value={hearingLocation}
                    onChangeText={setHearingLocation}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Notes (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    placeholder="Extra notes for the client or internal follow-up"
                    placeholderTextColor={`${palette.slate}80`}
                    value={hearingNotes}
                    onChangeText={setHearingNotes}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <Pressable
                  style={[
                    styles.primaryButton,
                    styles.scheduleButton,
                    sendingHearing && styles.disabledBtn,
                  ]}
                  onPress={() => {
                    if (sendingHearing) return;
                    handleSendHearing().catch((err) => {
                      console.error("Unexpected hearing send error", err);
                      Alert.alert(
                        "Scheduling Failed",
                        "An unexpected error occurred. Please try again.",
                      );
                    });
                  }}
                  disabled={sendingHearing}
                >
                  {sendingHearing ? (
                    <ActivityIndicator color={palette.navy} size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color={palette.navy} />
                      <Text style={styles.primaryButtonText}>
                        Schedule Hearing
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}

            {/* OCR Upload Card */}
            <Pressable
              style={({ pressed }) => [
                styles.uploadCard,
                !isAssigned && styles.uploadCardDisabled,
                pressed &&
                  isAssigned && { transform: [{ scale: 0.99 }], opacity: 0.9 },
              ]}
              onPress={() => !uploading && uploadOcr()}
              disabled={!isAssigned || uploading}
            >
              <LinearGradient
                colors={
                  isAssigned ? [palette.gold, "#b89050"] : ["#999", "#777"]
                }
                style={styles.uploadGradient}
              >
                <View style={styles.uploadContent}>
                  <View style={styles.uploadIcon}>
                    <Ionicons
                      name={uploading ? "hourglass" : "cloud-upload"}
                      size={32}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.uploadTextContainer}>
                    <Text style={styles.uploadTitle}>
                      {uploading ? "Uploading..." : "Upload OCR Document"}
                    </Text>
                    <Text style={styles.uploadDescription}>
                      {isAssigned
                        ? "Upload a PDF file for OCR processing"
                        : "Only assigned lawyers can upload files"}
                    </Text>
                  </View>
                  {isAssigned && !uploading && (
                    <Ionicons
                      name="arrow-forward-circle"
                      size={32}
                      color="#fff"
                    />
                  )}
                </View>
              </LinearGradient>
            </Pressable>

            {/* OCR Result Card */}
            {ocrResult && extractedData && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconBadge}>
                    <Ionicons name="analytics" color={palette.gold} size={20} />
                  </View>
                  <Text style={styles.cardTitle}>OCR Results</Text>
                </View>

                <View style={styles.ocrMetaContainer}>
                  <View style={styles.ocrMetaItem}>
                    <Text style={styles.ocrMetaLabel}>Document Type</Text>
                    <Text style={styles.ocrMetaValue}>
                      {extractedData.documentCategory || "Unknown"}
                    </Text>
                  </View>
                  {extractedData.extractionQuality && (
                    <View style={styles.ocrMetaItem}>
                      <Text style={styles.ocrMetaLabel}>Quality Score</Text>
                      <Text style={styles.ocrMetaValue}>
                        {extractedData?.extractionQuality?.score ?? "N/A"}%
                      </Text>
                    </View>
                  )}
                  <View style={styles.ocrMetaItem}>
                    <Text style={styles.ocrMetaLabel}>File Name</Text>
                    <Text style={styles.ocrMetaValue} numberOfLines={1}>
                      {ocrResult.fileName || "PDF"}
                    </Text>
                  </View>
                </View>

                <View style={styles.extractedSection}>
                  <View style={styles.extractedHeader}>
                    <Ionicons name="list" size={18} color={palette.navy} />
                    <Text style={styles.extractedTitle}>Extracted Fields</Text>
                  </View>
                  <Text style={styles.extractedHint}>
                    Review the extracted fields before saving to the case file
                  </Text>

                  {extractedEntries.length > 0 ? (
                    <View style={styles.extractedGrid}>
                      {extractedEntries.map((item, idx) => (
                        <View
                          style={styles.extractedItem}
                          key={`${item.label}-${idx}`}
                        >
                          <Text style={styles.extractedLabel}>
                            {item.label}
                          </Text>
                          <Text style={styles.extractedValue}>
                            {item.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <>
                      <Text style={styles.extractedEmpty}>
                        No specific fields returned from OCR. Raw data will be
                        displayed instead.
                      </Text>
                      {extractedJsonPreview && (
                        <View style={styles.rawBlock}>
                          <Text style={styles.rawText}>
                            {extractedJsonPreview}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>

                {documentId && (
                  <View style={styles.editExtractedContainer}>
                    <View style={styles.editHeaderRow}>
                      <View style={styles.extractedHeader}>
                        <Ionicons
                          name="create"
                          size={18}
                          color={palette.navy}
                        />
                        <Text style={styles.extractedTitle}>
                          Edit Extracted Data
                        </Text>
                      </View>
                      <Pressable
                        style={({ pressed }) => [
                          styles.editToggle,
                          pressed && { opacity: 0.8 },
                        ]}
                        onPress={() => setIsEditingExtracted((prev) => !prev)}
                      >
                        <Ionicons
                          name={isEditingExtracted ? "close" : "pencil"}
                          size={16}
                          color={palette.navy}
                        />
                        <Text style={styles.editToggleText}>
                          {isEditingExtracted ? "Cancel" : "Edit"}
                        </Text>
                      </Pressable>
                    </View>

                    {isEditingExtracted ? (
                      <>
                        <View style={styles.formField}>
                          <Text style={styles.inputLabel}>Document Type</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="court_decision or contract"
                            placeholderTextColor={`${palette.slate}80`}
                            value={editingDocumentType}
                            onChangeText={setEditingDocumentType}
                            autoCapitalize="none"
                          />
                        </View>

                        <View style={styles.formField}>
                          <Text style={styles.inputLabel}>File Name</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="Original file name"
                            placeholderTextColor={`${palette.slate}80`}
                            value={editingOriginalName}
                            onChangeText={setEditingOriginalName}
                          />
                        </View>

                        <View style={styles.formField}>
                          <Text style={styles.inputLabel}>Extracted JSON</Text>
                          <TextInput
                            style={[styles.input, styles.jsonInput]}
                            multiline
                            textAlignVertical="top"
                            placeholder={'{ "caseNumber": "123" }'}
                            placeholderTextColor={`${palette.slate}80`}
                            value={editingExtractedJson}
                            onChangeText={setEditingExtractedJson}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                          <Text style={styles.inputHint}>
                            You can write JSON or plain text.
                          </Text>
                        </View>

                        <Pressable
                          style={[
                            styles.primaryButton,
                            updatingExtracted && styles.disabledBtn,
                          ]}
                          onPress={() => {
                            handleUpdateExtracted().catch((err: any) => {
                              console.log(
                                "Unhandled error in Save Corrections",
                                err,
                              );
                              Alert.alert(
                                "Update Failed",
                                err?.response?.data?.message ||
                                  err?.message ||
                                  "Unexpected error while saving corrections.",
                              );
                            });
                          }}
                          disabled={updatingExtracted}
                        >
                          {updatingExtracted ? (
                            <ActivityIndicator
                              color={palette.navy}
                              size="small"
                            />
                          ) : (
                            <>
                              <Ionicons
                                name="save"
                                size={18}
                                color={palette.navy}
                              />
                              <Text style={styles.primaryButtonText}>
                                Save Corrections
                              </Text>
                            </>
                          )}
                        </Pressable>
                      </>
                    ) : (
                      <Text style={styles.inputHint}>
                        Tap Edit to adjust the extracted data inline.
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.ocrActions}>
                  <Pressable
                    style={[styles.primaryButton, { flex: 1 }]}
                    onPress={handleSaveExtracted}
                  >
                    <Ionicons name="save" size={18} color={palette.navy} />
                    <Text style={styles.primaryButtonText}>Save to Case</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.secondaryButton, { flex: 1 }]}
                    onPress={() => persistOcrResult(null)}
                  >
                    <Ionicons name="trash" size={18} color={palette.slate} />
                    <Text style={styles.secondaryText}>Clear Data</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Status Change Modal */}
          <Modal
            visible={showStatusModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowStatusModal(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setShowStatusModal(false)}
            >
              <View style={styles.modalContainer}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <View style={styles.modalIconBadge}>
                        <Ionicons
                          name="swap-horizontal"
                          size={24}
                          color={palette.gold}
                        />
                      </View>
                      <Text style={styles.modalTitle}>Change Case Status</Text>
                      <Text style={styles.modalSubtitle}>
                        Select a new status for this case
                      </Text>
                    </View>

                    <View style={styles.statusOptions}>
                      {STATUS_OPTIONS.map((status) => {
                        const info = getStatusInfo(status);
                        const color = getStatusColor(status);
                        const isCurrentStatus = data?.status === status;

                        return (
                          <Pressable
                            key={status}
                            style={({ pressed }) => [
                              styles.statusOption,
                              isCurrentStatus && styles.statusOptionCurrent,
                              pressed && {
                                opacity: 0.7,
                                transform: [{ scale: 0.98 }],
                              },
                            ]}
                            onPress={() => selectStatus(status)}
                            disabled={updateStatus.isPending}
                          >
                            <View
                              style={[
                                styles.statusOptionIcon,
                                { backgroundColor: `${color}20` },
                              ]}
                            >
                              <Ionicons
                                name={info.icon as any}
                                size={24}
                                color={color}
                              />
                            </View>
                            <View style={styles.statusOptionText}>
                              <Text style={styles.statusOptionLabel}>
                                {info.label}
                              </Text>
                              <Text style={styles.statusOptionDescription}>
                                {info.description}
                              </Text>
                            </View>
                            {isCurrentStatus && (
                              <View style={styles.currentBadge}>
                                <Text style={styles.currentBadgeText}>
                                  Current
                                </Text>
                              </View>
                            )}
                            <Ionicons
                              name="chevron-forward"
                              size={20}
                              color={palette.slate}
                            />
                          </Pressable>
                        );
                      })}
                    </View>

                    <Pressable
                      style={styles.modalCancelButton}
                      onPress={() => setShowStatusModal(false)}
                    >
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </View>
            </Pressable>
          </Modal>
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
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 100,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
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
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(198, 166, 103, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(198, 166, 103, 0.3)",
  },
  headerTextContainer: {
    flex: 1,
    gap: 4,
  },
  heading: {
    color: palette.light,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 5,
  },
  caseId: {
    color: palette.gold,
    fontSize: 14,
    fontWeight: "600",
  },
  statusCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  statusGradient: {
    padding: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontWeight: "700",
    fontSize: 14,
    textTransform: "capitalize",
  },
  statusChangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: palette.gold,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  statusChangeText: {
    color: palette.navy,
    fontWeight: "700",
    fontSize: 14,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(198, 166, 103, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.navy,
    letterSpacing: -0.3,
  },
  helperText: {
    color: palette.slate,
    fontSize: 13,
    lineHeight: 18,
  },
  formField: {
    gap: 6,
  },
  inputLabel: {
    color: palette.navy,
    fontWeight: "700",
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e8ed",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#f8f9fb",
    color: palette.navy,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 96,
  },
  inputHint: {
    color: palette.slate,
    fontSize: 12,
  },
  helperPill: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(198, 166, 103, 0.15)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(198, 166, 103, 0.3)",
  },
  helperPillText: {
    color: palette.navy,
    fontWeight: "700",
    fontSize: 13,
    flex: 1,
  },
  scheduleButton: {
    marginTop: 12,
    alignSelf: "stretch",
  },
  infoGrid: {
    gap: 14,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  descriptionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(86, 99, 117, 0.15)",
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
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    color: palette.navy,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  documentsGrid: {
    gap: 12,
  },
  documentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "#f8f9fb",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e8ed",
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(198, 166, 103, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  documentInfo: {
    flex: 1,
    gap: 4,
  },
  documentName: {
    color: palette.navy,
    fontSize: 15,
    fontWeight: "700",
  },
  documentMeta: {
    color: palette.slate,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    color: palette.slate,
    fontSize: 15,
    fontWeight: "600",
  },
  uploadCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  uploadCardDisabled: {
    opacity: 0.6,
  },
  uploadGradient: {
    padding: 20,
  },
  uploadContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  uploadIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTextContainer: {
    flex: 1,
    gap: 4,
  },
  uploadTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  uploadDescription: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    fontWeight: "600",
  },
  ocrMetaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  ocrMetaItem: {
    flex: 1,
    minWidth: "45%",
    padding: 12,
    backgroundColor: "#f8f9fb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e8ed",
  },
  ocrMetaLabel: {
    color: palette.slate,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ocrMetaValue: {
    color: palette.navy,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
    writingDirection: "rtl",
  },
  schedulingBanner: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    backgroundColor: "#f8f9fb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e8ed",
  },
  schedulingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(198, 166, 103, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  schedulingText: {
    flex: 1,
    gap: 2,
  },
  schedulingTitle: {
    color: palette.navy,
    fontWeight: "800",
    fontSize: 15,
  },
  schedulingMessage: {
    color: palette.slate,
    fontWeight: "600",
    fontSize: 13,
  },
  schedulingMeta: {
    color: palette.navy,
    fontWeight: "600",
    fontSize: 13,
  },
  extractedSection: {
    gap: 12,
    padding: 16,
    backgroundColor: "#f8f9fb",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e8ed",
  },
  extractedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  extractedTitle: {
    color: palette.navy,
    fontWeight: "800",
    fontSize: 16,
  },
  extractedHint: {
    color: palette.slate,
    fontSize: 13,
    lineHeight: 18,
  },
  extractedGrid: {
    gap: 10,
  },
  extractedItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e8ed",
    padding: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  extractedLabel: {
    color: palette.slate,
    fontWeight: "700",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  extractedValue: {
    color: palette.navy,
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "right",
    writingDirection: "rtl",
  },
  extractedEmpty: {
    color: palette.slate,
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "right",
    writingDirection: "rtl",
  },
  editExtractedContainer: {
    gap: 12,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e8ed",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  editHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  editToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(86, 99, 117, 0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(86, 99, 117, 0.25)",
  },
  editToggleText: {
    color: palette.navy,
    fontWeight: "700",
    fontSize: 13,
  },
  jsonInput: {
    minHeight: 140,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    lineHeight: 18,
  },
  rawBlock: {
    marginTop: 10,
    backgroundColor: palette.navy,
    padding: 14,
    borderRadius: 12,
  },
  rawText: {
    color: palette.light,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "right",
    writingDirection: "rtl",
  },
  ocrActions: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: palette.gold,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: palette.navy,
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: `${palette.slate}40`,
    backgroundColor: "rgba(86, 99, 117, 0.08)",
  },
  secondaryText: {
    color: palette.slate,
    fontWeight: "700",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 36, 54, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 500,
  },
  modalContent: {
    backgroundColor: palette.light,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  modalIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(198, 166, 103, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: palette.navy,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.slate,
    textAlign: "center",
  },
  statusOptions: {
    gap: 12,
    marginBottom: 20,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    backgroundColor: "#f8f9fb",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  statusOptionCurrent: {
    backgroundColor: "rgba(198, 166, 103, 0.1)",
    borderColor: palette.gold,
  },
  statusOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statusOptionText: {
    flex: 1,
    gap: 4,
  },
  statusOptionLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.navy,
  },
  statusOptionDescription: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.slate,
  },
  currentBadge: {
    backgroundColor: palette.gold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.navy,
    textTransform: "uppercase",
  },
  modalCancelButton: {
    backgroundColor: "rgba(86, 99, 117, 0.1)",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(86, 99, 117, 0.2)",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.slate,
  },
});
