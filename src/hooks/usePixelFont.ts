import {
  PressStart2P_400Regular,
  useFonts,
} from "@expo-google-fonts/press-start-2p";

export const PIXEL_FONT = "PressStart2P_400Regular";

export function usePixelFont() {
  const [loaded] = useFonts({ PressStart2P_400Regular });
  return loaded;
}
