// utils/dimensions.ts
import { Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export const TAB_BAR_HEIGHT = Platform.select({
  ios: 60,
  android: 60,
  default: 60,
});

export const TAB_BAR_HEIGHT_TABLET = Platform.select({
  ios: 80,
  android: 80,
  default: 80,
});

export const isTablet = width >= 768;

export function useTabBarHeight() {
  const isLargeDevice = isTablet;
  return isLargeDevice ? TAB_BAR_HEIGHT_TABLET : TAB_BAR_HEIGHT;
}

export function useComposerPadding() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();

  return {
    paddingBottom: tabBarHeight + insets.bottom,
    tabBarHeight,
    safeAreaBottom: insets.bottom,
  };
}
