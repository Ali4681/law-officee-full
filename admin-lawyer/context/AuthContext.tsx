import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useEffect, useState } from "react";
import { UserRole } from "../types/auth";

interface AuthState {
  isLoggedIn: boolean;
  role: UserRole | null;
}

export const AuthContext = createContext<AuthState>({
  isLoggedIn: false,
  role: null,
});

export const AuthProvider = ({ children }: any) => {
  const [state, setState] = useState<AuthState>({
    isLoggedIn: false,
    role: null,
  });

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem("access_token");
      const role = (await AsyncStorage.getItem("role")) as UserRole | null;

      setState({
        isLoggedIn: !!token,
        role,
      });
    })();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};
