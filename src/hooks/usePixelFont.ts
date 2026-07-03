import { useEffect, useState } from "react";
import * as Font from "expo-font";

/**
 * Loads "Press Start 2P" — a classic pixel-art font — from Google Fonts.
 * Works on web, iOS, and Android via expo-font.
 *
 * If you'd rather bundle the font locally (recommended for production /
 * offline use), download the .ttf from:
 *   https://fonts.google.com/specimen/Press+Start+2P
 * place it at assets/fonts/PressStart2P-Regular.ttf, and swap the URI
 * below for: require('../assets/fonts/PressStart2P-Regular.ttf')
 */
export const PIXEL_FONT = "PressStart2P";

const FONT_SOURCE = {
  uri: "https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2",
};

export function usePixelFont() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    Font.loadAsync({ [PIXEL_FONT]: FONT_SOURCE })
      .then(() => {
        if (mounted) setLoaded(true);
      })
      .catch((err) => {
        console.warn(
          "[usePixelFont] Failed to load pixel font, falling back to monospace.",
          err,
        );
        if (mounted) setLoaded(true); // proceed anyway with fallback font
      });
    return () => {
      mounted = false;
    };
  }, []);

  return loaded;
}
