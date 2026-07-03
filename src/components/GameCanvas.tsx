/**
 * GameCanvas
 * Platform router:
 *   - iOS / Android  →  GameWebView (WebView wrapping the full HTML game)
 *   - Web            →  HTMLCanvas  (direct canvas rendering)
 *
 * This solves the "canvas is not a valid React Native component" error in
 * Expo Go, while keeping the smooth direct-canvas path for web.
 */
import { Platform } from "react-native";

// Native: WebView-based renderer (works in Expo Go on iOS & Android)
import GameWebView from "./GameWebView";

// Web: direct HTML canvas renderer
import GameCanvasWeb from "./GameCanvasWeb";

const GameCanvas = Platform.OS === "web" ? GameCanvasWeb : GameWebView;

export default GameCanvas;
