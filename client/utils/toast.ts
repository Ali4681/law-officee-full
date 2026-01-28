import { Alert } from "react-native";

export type ToastType = "success" | "error" | "info";

export function showToast({
  message,
  type = "info",
}: {
  message: string;
  type?: ToastType;
}) {
  Alert.alert(type === "success" ? "Success" : type === "error" ? "Error" : "Info", message);
}
