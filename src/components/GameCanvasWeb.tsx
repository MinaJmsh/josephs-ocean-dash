/**
 * GameCanvasWeb — web-only direct HTML canvas renderer.
 * Used only on Platform.OS === 'web'. On native, GameWebView is used instead.
 */
import React, { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { GAME_H, GAME_W, STATE, SWIPE_THRESHOLD } from "../constants/game";
import { useGameEngine } from "../hooks/useGameEngine";
import { useImageLoader } from "../hooks/useImageLoader";
import { usePixelFont } from "../hooks/usePixelFont";
import { renderFrame } from "./GameRenderer";

interface HitZone {
  x: number;
  y: number;
  w: number;
  h: number;
  id: string;
}

export default function GameCanvasWeb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const zonesRef = useRef<HitZone[]>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const invRef = useRef(0);

  const { imgs, ready } = useImageLoader();
  const fontReady = usePixelFont();
  const engine = useGameEngine();
  const {
    gs,
    tick,
    startGame,
    pauseGame,
    resumeGame,
    goMenu,
    showHow,
    moveJoseph,
    loadBestScore,
    initBgBubbles,
  } = engine;

  // Inject @font-face so canvas ctx.font can find PressStart2P on web
  useEffect(() => {
    const styleId = "pixel-font-face";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @font-face {
        font-family: 'PressStart2P';
        src: url('https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2') format('woff2');
        font-weight: normal; font-style: normal; font-display: block;
      }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    loadBestScore();
    initBgBubbles();
  }, [loadBestScore, initBgBubbles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = GAME_W;
    canvas.height = GAME_H;
    fitCanvas(canvas);
    const onResize = () => fitCanvas(canvas);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function fitCanvas(canvas: HTMLCanvasElement) {
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    canvas.style.position = "absolute";
    canvas.style.left = "0px";
    canvas.style.top = "0px";
    canvas.style.imageRendering = "pixelated";
  }

  const callbacks = {
    onPause: pauseGame,
    onResume: resumeGame,
    onMenu: goMenu,
    onPlay: startGame,
    onHow: showHow,
    onBack: goMenu,
  };

  useEffect(() => {
    if (!ready || !fontReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    function loop(ts: number) {
      tick(ts);
      zonesRef.current = renderFrame(
        ctx!,
        imgs,
        gs.current,
        invRef.current,
        callbacks,
      );
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, fontReady, tick, imgs, gs]);

  function toGameCoords(clientX: number, clientY: number) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (GAME_W / rect.width),
      y: (clientY - rect.top) * (GAME_H / rect.height),
    };
  }

  function handleZoneTap(gx: number, gy: number) {
    const g = gs.current;
    for (const zone of zonesRef.current) {
      if (
        gx >= zone.x &&
        gx <= zone.x + zone.w &&
        gy >= zone.y &&
        gy <= zone.y + zone.h
      ) {
        switch (zone.id) {
          case "play":
            startGame();
            break;
          case "how":
            showHow();
            break;
          case "back":
            goMenu();
            break;
          case "pause":
            pauseGame();
            break;
          case "resume":
            resumeGame();
            break;
          case "menu":
            goMenu();
            break;
          case "quit":
            /* web: no-op */ break;
        }
        return;
      }
    }
  }

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const t = e.touches[0];
    touchStart.current = toGameCoords(t.clientX, t.clientY);
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const pos = toGameCoords(t.clientX, t.clientY);
      const dx = pos.x - touchStart.current.x,
        dy = pos.y - touchStart.current.y;
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        if (gs.current.state === STATE.PLAYING) moveJoseph(dx > 0 ? 1 : -1);
      } else {
        handleZoneTap(pos.x, pos.y);
      }
      touchStart.current = null;
    },
    [moveJoseph],
  );

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    touchStart.current = toGameCoords(e.clientX, e.clientY);
  }, []);

  const onMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!touchStart.current) return;
      const pos = toGameCoords(e.clientX, e.clientY);
      const dx = pos.x - touchStart.current.x;
      if (Math.abs(dx) > 4 && gs.current.state === STATE.PLAYING)
        moveJoseph(dx > 0 ? 1 : -1);
      else handleZoneTap(pos.x, pos.y);
      touchStart.current = null;
    },
    [moveJoseph],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (gs.current.state === STATE.PLAYING) {
        if (e.key === "ArrowLeft" || e.key === "a") moveJoseph(-1);
        if (e.key === "ArrowRight" || e.key === "d") moveJoseph(1);
        if (e.key === "Escape" || e.key === "p") pauseGame();
      } else if (gs.current.state === STATE.PAUSED) {
        if (e.key === "Escape") resumeGame();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [moveJoseph, pauseGame, resumeGame]);

  return (
    <View style={styles.container}>
      <canvas
        ref={canvasRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        style={styles.canvas as any}
      />
      {(!ready || !fontReady) && <View style={styles.loading} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  canvas: {},
  loading: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0a1628" },
});
