type ToastType = "success" | "error" | "info";

export type ToastMessage = {
  message: string;
  type?: ToastType;
};

type Listener = (toast: ToastMessage) => void;

let listeners: Listener[] = [];

export const showToast = (toast: ToastMessage) => {
  listeners.forEach((l) => l(toast));
};

export const subscribeToast = (listener: Listener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};
