import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { api } from "./api";

export interface UploadDocumentPayload {
  caseId: string;
  fileUri: string;
  fileName?: string;
  fileType?: string;
  originalName?: string;
}

export const DocumentService = {
  async listByCase(caseId: string): Promise<any[]> {
    const res = await api.get(`/documents/case/${caseId}`);
    return res.data;
  },

  async update(
    documentId: string,
    payload: Partial<{
      originalName: string;
      extractedData: Record<string, any>;
      documentType: string;
    }>
  ): Promise<any> {
    const token = await AsyncStorage.getItem("access_token");
    const res = await api.patch(`/documents/${documentId}`, payload, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.data;
  },

  async upload(payload: UploadDocumentPayload): Promise<any> {
    const token = await AsyncStorage.getItem("access_token");

    // Use REAL name from picker
    const finalFileName =
      payload.originalName || payload.fileName || `document-${Date.now()}.pdf`;

    let fileUri = payload.fileUri;

    // ---- FIX #1: Convert Android content:// → file:// ----
    if (fileUri.startsWith("content://")) {
      const tempPath = `${FileSystem.cacheDirectory}${finalFileName}`;
      await FileSystem.copyAsync({
        from: fileUri,
        to: tempPath,
      });
      fileUri = tempPath;
    }

    // Ensure prefix
    if (!fileUri.startsWith("file://")) {
      fileUri = `file://${fileUri}`;
    }

    // Final upload URL
    const uploadUrl = `${(api.defaults.baseURL || "").replace(
      /\/$/,
      ""
    )}/documents/upload`;

    // ------------------ UPLOAD ---------------------
    const result = await LegacyFileSystem.uploadAsync(uploadUrl, fileUri, {
      fieldName: "file",
      httpMethod: "POST",
      uploadType: LegacyFileSystem.FileSystemUploadType.MULTIPART,
      mimeType: payload.fileType || "application/pdf",

      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },

      parameters: {
        caseId: payload.caseId,
        fileType: payload.fileType || "application/pdf",
        fileName: finalFileName,
        originalName: finalFileName,
      },
    });

    // ------------------ ERROR HANDLING ---------------------
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
  },
};
