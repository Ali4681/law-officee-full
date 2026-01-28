import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { api } from "./api";

export type OcrExtractOptions = {
  caseId?: string;
  hearingDate?: string;
  hearingLocation?: string;
  hearingNotes?: string;
};

export const OcrService = {
  // ---------------------------------------------
  // Sync OCR (returns result immediately)
  // ---------------------------------------------
  async extract(
    fileUri: string,
    fileName?: string,
    fileType: string = "application/pdf",
    options: OcrExtractOptions = {}
  ): Promise<any> {
    const finalName = fileName || `ocr-${Date.now()}.pdf`;

    // Convert content:// URIs into local files
    let localUri = await ensureLocalFile(fileUri, finalName);

    const token = await AsyncStorage.getItem("access_token");
    const uploadUrl = `${(api.defaults.baseURL || "").replace(
      /\/$/,
      ""
    )}/ocr/extract`;

    const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
      fieldName: "file",
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      mimeType: fileType,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      parameters: buildParameters(fileType, options),
    });

    return parseUploadResult(result);
  },

  // ---------------------------------------------
  // Async OCR (background extraction)
  // ---------------------------------------------
  async extractAsync(
    fileUri: string,
    fileName?: string,
    fileType: string = "application/pdf",
    options: OcrExtractOptions = {}
  ): Promise<any> {
    const finalName = fileName || `ocr-${Date.now()}.pdf`;

    // Convert content:// URIs into local files
    let localUri = await ensureLocalFile(fileUri, finalName);

    const token = await AsyncStorage.getItem("access_token");
    const uploadUrl = `${(api.defaults.baseURL || "").replace(
      /\/$/,
      ""
    )}/ocr/extract/async`;

    const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
      fieldName: "file",
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      mimeType: fileType,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      parameters: buildParameters(fileType, options),
    });

    return parseUploadResult(result);
  },
};

// ---------------------------------------------------
// Helper: convert content:// into an actual file
// ---------------------------------------------------
async function ensureLocalFile(
  fileUri: string,
  finalName: string
): Promise<string> {
  let uri = fileUri;

  // Android picked document: content://xxxxx
  if (uri.startsWith("content://")) {
    const dest = `${FileSystem.cacheDirectory}${finalName}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    uri = dest;
  }

  // ensure prefix
  if (!uri.startsWith("file://")) uri = `file://${uri}`;

  return uri;
}

// ---------------------------------------------------
// Helper: parse upload response or throw clean errors
// ---------------------------------------------------
function parseUploadResult(result: FileSystem.FileSystemUploadResult) {
  if (result.status < 200 || result.status >= 300) {
    let message = result.body;
    try {
      const json = JSON.parse(result.body);
      message = json.message || message;
    } catch (_) {}

    const error: any = new Error(message);
    error.response = { status: result.status, data: { message } };
    throw error;
  }

  try {
    return JSON.parse(result.body);
  } catch {
    return result.body;
  }
}

function buildParameters(fileType: string, options: OcrExtractOptions) {
  const params: Record<string, string> = { fileType };

  if (options.caseId) params.caseId = options.caseId;
  if (options.hearingDate) params.hearingDate = options.hearingDate;
  if (options.hearingLocation) params.hearingLocation = options.hearingLocation;
  if (options.hearingNotes) params.hearingNotes = options.hearingNotes;

  return params;
}
