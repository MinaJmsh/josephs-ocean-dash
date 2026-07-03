import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useRef } from "react";
import {
  BAD_SIZE,
  BADS,
  CUTE_MSGS,
  GAME_H,
  GAME_W,
  GameState,
  GOODS,
  ITEM_SIZE,
  JOSEPH_Y,
  LANE_POSITIONS,
  SCROLL_ACCEL,
  SCROLL_BASE,
  SPAWN_INTERVAL_BASE,
  SPAWN_MIN,
  STATE,
  STORAGE_KEY_BEST,
} from "../constants/game";

// ─────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  type: "star" | "sparkle" | "bubble";
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;
}

export interface BgBubble {
  x: number;
  y: number;
  r: number;
  speed: number;
  wobble: number;
  wobbleSpeed: number;
  alpha: number;
}

export interface GameItem {
  x: number;
  y: number;
  lane: number;
  def: (typeof GOODS)[0] | (typeof BADS)[0];
  type: "good" | "bad";
  alive: boolean;
  bobT: number;
}

export interface JosephState {
  lane: number;
  x: number;
  targetX: number;
  y: number;
  animT: number;
  moving: boolean;
  hitFlash: number;
  wobble: number;
}

export interface CuteMsg {
  text: string;
  t: number;
}

export interface GameEngineState {
  state: GameState;
  score: number;
  distance: number;
  hearts: number;
  bestScore: number;
  joseph: JosephState;
  items: GameItem[];
  particles: Particle[];
  floatTexts: FloatText[];
  bubbleBg: BgBubble[];
  cuteMsg: CuteMsg | null;
  bgY: number;
  totalTime: number;
}

// ─────────────────────────────────────────────
//  ENGINE HOOK
// ─────────────────────────────────────────────
export function useGameEngine() {
  // All mutable game state lives in a ref so canvas draws are always current
  const gs = useRef<GameEngineState>({
    state: STATE.MENU,
    score: 0,
    distance: 0,
    hearts: 3,
    bestScore: 0,
    joseph: {
      lane: 1,
      x: LANE_POSITIONS[1],
      targetX: LANE_POSITIONS[1],
      y: JOSEPH_Y,
      animT: 0,
      moving: false,
      hitFlash: 0,
      wobble: 0,
    },
    items: [],
    particles: [],
    floatTexts: [],
    bubbleBg: [],
    cuteMsg: null,
    bgY: 0,
    totalTime: 0,
  });

  const scrollSpeed = useRef(SCROLL_BASE);
  const spawnTimer = useRef(0);
  const spawnInterval = useRef(SPAWN_INTERVAL_BASE);
  const elapsed = useRef(0);
  const invincible = useRef(0);
  const lastTime = useRef<number | null>(null);

  // ── Best score (async, loads on mount) ────────────────────────────────────
  const loadBestScore = useCallback(async () => {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEY_BEST);
      gs.current.bestScore = val ? parseInt(val) : 0;
    } catch {}
  }, []);

  const saveBestScore = useCallback(async (s: number) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_BEST, String(s));
    } catch {}
  }, []);

  // ── Bubble init ────────────────────────────────────────────────────────────
  const initBgBubbles = useCallback(() => {
    gs.current.bubbleBg = Array.from({ length: 20 }, () => ({
      x: Math.random() * GAME_W,
      y: Math.random() * GAME_H,
      r: 3 + Math.random() * 10,
      speed: 15 + Math.random() * 35,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.5 + Math.random(),
      alpha: 0.1 + Math.random() * 0.25,
    }));
  }, []);

  // ── Particle spawners ──────────────────────────────────────────────────────
  const spawnSplash = useCallback((x: number, y: number) => {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      gs.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color: `hsl(${190 + Math.random() * 20},70%,${60 + Math.random() * 20}%)`,
        type: "bubble",
      });
    }
  }, []);

  const spawnCollectParticles = useCallback(
    (x: number, y: number, color: string) => {
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
        const speed = 40 + Math.random() * 80;
        gs.current.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 30,
          size: 3 + Math.random() * 5,
          life: 0.7 + Math.random() * 0.4,
          maxLife: 1.1,
          color,
          type: "star",
        });
      }
      for (let i = 0; i < 6; i++) {
        gs.current.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          size: 6 + Math.random() * 4,
          life: 0.4,
          maxLife: 0.4,
          color: "#fff",
          type: "sparkle",
        });
      }
    },
    [],
  );

  const spawnHitParticles = useCallback((x: number, y: number) => {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      gs.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 6,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        color: `hsl(${Math.random() * 30 + 340},80%,60%)`,
        type: "bubble",
      });
    }
  }, []);

  const spawnDeathParticles = useCallback(() => {
    const { x, y } = gs.current.joseph;
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      gs.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 8,
        life: 1 + Math.random() * 0.5,
        maxLife: 1.5,
        color: `hsl(${Math.random() * 60 + 180},60%,60%)`,
        type: "bubble",
      });
    }
  }, []);

  // ── Item spawner ───────────────────────────────────────────────────────────
  const spawnItem = useCallback(() => {
    const isGood = Math.random() < 0.55;
    const lane = Math.floor(Math.random() * 3);
    if (gs.current.items.some((i) => i.lane === lane && i.y < 100)) return;
    const pool = isGood ? GOODS : BADS;
    const def = pool[Math.floor(Math.random() * pool.length)];
    gs.current.items.push({
      x: LANE_POSITIONS[lane],
      y: -ITEM_SIZE,
      lane,
      def,
      type: isGood ? "good" : "bad",
      alive: true,
      bobT: Math.random() * Math.PI * 2,
    });
  }, []);

  // ── Game flow ──────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const g = gs.current;
    g.state = STATE.PLAYING;
    g.score = 0;
    g.distance = 0;
    g.hearts = 3;
    g.items = [];
    g.particles = [];
    g.floatTexts = [];
    g.cuteMsg = null;
    g.bgY = 0;
    g.joseph = {
      lane: 1,
      x: LANE_POSITIONS[1],
      targetX: LANE_POSITIONS[1],
      y: JOSEPH_Y,
      animT: 0,
      moving: false,
      hitFlash: 0,
      wobble: 0,
    };
    scrollSpeed.current = SCROLL_BASE;
    spawnTimer.current = 0;
    spawnInterval.current = SPAWN_INTERVAL_BASE;
    elapsed.current = 0;
    invincible.current = 0;
    lastTime.current = null;
    initBgBubbles();
  }, [initBgBubbles]);

  const pauseGame = useCallback(() => {
    if (gs.current.state === STATE.PLAYING) gs.current.state = STATE.PAUSED;
  }, []);

  const resumeGame = useCallback(() => {
    if (gs.current.state === STATE.PAUSED) {
      gs.current.state = STATE.PLAYING;
      lastTime.current = null;
    }
  }, []);

  const goMenu = useCallback(() => {
    gs.current.state = STATE.MENU;
    initBgBubbles();
  }, [initBgBubbles]);

  const showHow = useCallback(() => {
    gs.current.state = STATE.HOW;
  }, []);

  const triggerGameOver = useCallback(async () => {
    const g = gs.current;
    g.state = STATE.DEAD;
    if (g.score > g.bestScore) {
      g.bestScore = g.score;
      await saveBestScore(g.score);
    }
    spawnDeathParticles();
  }, [saveBestScore, spawnDeathParticles]);

  // ── Move Joseph ────────────────────────────────────────────────────────────
  const moveJoseph = useCallback(
    (dir: -1 | 1) => {
      const j = gs.current.joseph;
      const newLane = Math.max(0, Math.min(2, j.lane + dir));
      if (newLane !== j.lane) {
        j.lane = newLane;
        j.targetX = LANE_POSITIONS[newLane];
        j.moving = true;
        j.wobble = 0.3;
        spawnSplash(j.x, j.y);
      }
    },
    [spawnSplash],
  );

  // ── Main update tick ───────────────────────────────────────────────────────
  const update = useCallback(
    (dt: number) => {
      const g = gs.current;

      // Always update Joseph smooth movement & animation
      const j = g.joseph;
      const dxJ = j.targetX - j.x;
      j.x += dxJ * Math.min(1, 10 * dt);
      if (Math.abs(dxJ) < 1) {
        j.x = j.targetX;
        j.moving = false;
      }
      j.animT += dt * 2;
      j.wobble = Math.max(0, j.wobble - dt * 2);
      j.hitFlash = Math.max(0, j.hitFlash - dt * 3);

      // Always animate ambient bubbles
      g.bubbleBg.forEach((b) => {
        b.y -= b.speed * dt;
        b.wobble += b.wobbleSpeed * dt;
        if (b.y + b.r < 0) {
          b.y = GAME_H + b.r;
          b.x = Math.random() * GAME_W;
        }
      });

      if (g.state !== STATE.PLAYING) return;

      // Time & speed
      elapsed.current += dt;
      invincible.current = Math.max(0, invincible.current - dt);
      scrollSpeed.current = SCROLL_BASE + elapsed.current * SCROLL_ACCEL;
      spawnInterval.current = Math.max(
        SPAWN_MIN,
        SPAWN_INTERVAL_BASE - elapsed.current * 0.02,
      );
      g.distance += (scrollSpeed.current * dt) / 100;

      // Scroll background
      g.bgY += scrollSpeed.current * dt;
      if (g.bgY >= GAME_H) g.bgY -= GAME_H;

      // Spawn
      spawnTimer.current += dt;
      if (spawnTimer.current >= spawnInterval.current) {
        spawnTimer.current = 0;
        spawnItem();
        if (Math.random() < 0.3 && elapsed.current > 5) {
          setTimeout(() => {
            if (g.state === STATE.PLAYING) spawnItem();
          }, 300);
        }
      }

      // Update items
      g.items.forEach((item) => {
        if (!item.alive) return;
        item.y += scrollSpeed.current * dt;
        item.bobT += dt * 2;

        const dist = Math.hypot(item.x - j.x, item.y - j.y);
        const threshold =
          item.type === "good" ? ITEM_SIZE * 0.6 : BAD_SIZE * 0.5;

        if (dist < threshold) {
          item.alive = false;
          if (item.type === "good") {
            const score = (item.def as (typeof GOODS)[0]).score ?? 10;
            g.score += score;
            spawnCollectParticles(item.x, item.y, item.def.color);
            g.floatTexts.push({
              x: item.x,
              y: item.y - 20,
              text: `+${score} ${item.def.name}!`,
              color: item.def.color,
              life: 1.2,
              vy: -60,
            });
            if (Math.random() < 0.25) {
              g.cuteMsg = {
                text: CUTE_MSGS[Math.floor(Math.random() * CUTE_MSGS.length)],
                t: 2.5,
              };
            }
          } else {
            if (invincible.current <= 0) {
              g.hearts--;
              invincible.current = 2;
              j.hitFlash = 1;
              spawnHitParticles(item.x, item.y);
              g.floatTexts.push({
                x: item.x,
                y: item.y - 20,
                text: "Ouch!",
                color: "#ff5252",
                life: 1.2,
                vy: -60,
              });
              if (g.hearts <= 0) {
                triggerGameOver();
                return;
              }
            }
          }
        }
        if (item.y > GAME_H + 80) item.alive = false;
      });
      g.items = g.items.filter((i) => i.alive);

      // Particles
      g.particles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 40 * dt;
        p.life -= dt;
      });
      g.particles = g.particles.filter((p) => p.life > 0);

      // Float texts
      g.floatTexts.forEach((f) => {
        f.y += f.vy * dt;
        f.vy *= 0.95;
        f.life -= dt;
      });
      g.floatTexts = g.floatTexts.filter((f) => f.life > 0);

      // Cute message timeout
      if (g.cuteMsg) {
        g.cuteMsg.t -= dt;
        if (g.cuteMsg.t <= 0) g.cuteMsg = null;
      }
    },
    [spawnItem, spawnCollectParticles, spawnHitParticles, triggerGameOver],
  );

  // ── Tick — called every animation frame ───────────────────────────────────
  const tick = useCallback(
    (timestamp: number) => {
      if (lastTime.current === null) lastTime.current = timestamp;
      const dt = Math.min((timestamp - lastTime.current) / 1000, 0.05);
      lastTime.current = timestamp;
      gs.current.totalTime += dt;
      update(dt);
    },
    [update],
  );

  return {
    gs, // ref to full game state
    tick, // call every frame
    startGame,
    pauseGame,
    resumeGame,
    goMenu,
    showHow,
    moveJoseph,
    loadBestScore,
    initBgBubbles,
  };
}
