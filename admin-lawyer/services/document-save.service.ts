import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

export interface SaveExtractedPayload {
  caseId: string;
  fileUrl: string;
  fileType: string;
  fileName?: string;
  originalName?: string;
  extractedData: any;
  documentType: "court_decision" | "contract";
}

export const DocumentSaveService = {
  async saveExtracted(payload: SaveExtractedPayload): Promise<any> {
    const token = await AsyncStorage.getItem("access_token");

    // Ensure we never send undefined fields
    const cleanPayload = removeUndefined({
      caseId: payload.caseId,
      fileUrl: payload.fileUrl,
      fileType: payload.fileType,
      fileName: payload.fileName || payload.originalName, // fallback
      originalName: payload.originalName || payload.fileName, // fallback
      extractedData: payload.extractedData ?? {},
      documentType: payload.documentType,
    });

    const res = await api.post("/documents/save-extracted", cleanPayload, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.data;
  },
};

// Remove undefined values before sending to the API
function removeUndefined(obj: any) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
}
