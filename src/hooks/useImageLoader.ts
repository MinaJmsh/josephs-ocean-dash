import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────
//  All images required directly — put PNGs in assets/images/
// ─────────────────────────────────────────────
const RAW_ASSETS: Record<string, any> = {
  "background with 3 lanes.png": require("../../assets/images/background with 3 lanes.png"),
  "bad_1.png": require("../../assets/images/bad_1.png"),
  "bad_2.png": require("../../assets/images/bad_2.png"),
  "bad_3.png": require("../../assets/images/bad_3.png"),
  "bad_4.png": require("../../assets/images/bad_4.png"),
  "bad_5.png": require("../../assets/images/bad_5.png"),
  "bad_6.png": require("../../assets/images/bad_6.png"),
  "bad_7.png": require("../../assets/images/bad_7.png"),
  "bad_8.png": require("../../assets/images/bad_8.png"),
  "bad_9.png": require("../../assets/images/bad_9.png"),
  "good_1.png": require("../../assets/images/good_1.png"),
  "good_2.png": require("../../assets/images/good_2.png"),
  "good_3.png": require("../../assets/images/good_3.png"),
  "good_4.png": require("../../assets/images/good_4.png"),
  "good_5.png": require("../../assets/images/good_5.png"),
  "good_6.png": require("../../assets/images/good_6.png"),
  "good_7.png": require("../../assets/images/good_7.png"),
  "good_8.png": require("../../assets/images/good_8.png"),
  "good_9.png": require("../../assets/images/good_9.png"),
  "good_10.png": require("../../assets/images/good_10.png"),
  "good_11.png": require("../../assets/images/good_11.png"),
  "good_12.png": require("../../assets/images/good_12.png"),
  "d1.png": require("../../assets/images/d1.png"),
  "d2.png": require("../../assets/images/d2.png"),
  "d3.png": require("../../assets/images/d3.png"),
  "how to play.png": require("../../assets/images/how to play.png"),
  "joseph.png": require("../../assets/images/joseph.png"),
  "menu.png": require("../../assets/images/menu.png"),
  "pause.png": require("../../assets/images/pause.png"),
  "play.png": require("../../assets/images/play.png"),
  "reset.png": require("../../assets/images/reset.png"),
  "plainbutton.png": require("../../assets/images/plainbutton.png"),
  "full-heart.png": require("../../assets/images/full-heart.png"),
  "empty-heart.png": require("../../assets/images/empty-heart.png"),
};

// ─────────────────────────────────────────────
//  Resolve a require() result to a URI string.
//
//  On web:    require() returns the URL string directly (e.g. '/assets/joseph.png')
//  On native: require() returns a number (asset ID); we use
//             Image.resolveAssetSource() to get the { uri } object.
// ─────────────────────────────────────────────
function resolveURI(asset: any): string {
  if (asset == null) return "";

  // Web bundler (Expo/Metro on web): require() can return:
  //   - a plain string URL  e.g. '/assets/joseph.png'
  //   - an object           e.g. { uri: '/assets/joseph.png', width, height }
  //   - a number (asset ID) — shouldn't happen on web but guard anyway
  if (typeof asset === "string") return asset;
  if (typeof asset === "object" && typeof asset.uri === "string")
    return asset.uri;

  // Native: require() returns a number (Metro asset ID)
  if (typeof asset === "number") {
    try {
      const { Image: RNImage } = require("react-native");
      const source = RNImage.resolveAssetSource(asset);
      return source?.uri ?? "";
    } catch {
      return "";
    }
  }

  return "";
}

export type ImgMap = Record<string, HTMLImageElement>;

// ─────────────────────────────────────────────
//  Hook — used by GameCanvasWeb (direct canvas on web)
// ─────────────────────────────────────────────
export function useImageLoader() {
  const imgs = useRef<ImgMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const entries = Object.entries(RAW_ASSETS);
    let loaded = 0;

    function onDone() {
      loaded++;
      if (loaded === entries.length) setReady(true);
    }

    entries.forEach(([key, asset]) => {
      const uri = resolveURI(asset);
      const img = new Image() as HTMLImageElement;
      img.onload = onDone;
      img.onerror = () => {
        console.warn(`[ImageLoader] failed: ${key}`);
        onDone();
      };
      img.src = uri;
      imgs.current[key] = img;
    });
  }, []);

  return { imgs: imgs.current, ready };
}

// ─────────────────────────────────────────────
//  URI map — used by GameWebView to inject image
//  URIs into the WebView HTML string on native.
// ─────────────────────────────────────────────
export function getAssetURIs(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, asset] of Object.entries(RAW_ASSETS)) {
    result[key] = resolveURI(asset);
  }
  return result;
}
