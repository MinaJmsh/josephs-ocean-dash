// ─────────────────────────────────────────────
//  GAME CONSTANTS
// ─────────────────────────────────────────────

export const GAME_W = 390;
export const GAME_H = 844;

export const LANE_POSITIONS = [GAME_W * 0.23, GAME_W * 0.5, GAME_W * 0.77];

export const JOSEPH_Y = GAME_H * 0.72;
export const JOSEPH_W = 80;
export const JOSEPH_H = 135;
export const ITEM_SIZE = 70;
export const BAD_SIZE = 90;

export const SCROLL_BASE = 180; // px/s
export const SCROLL_ACCEL = 10; // px/s per second
export const SPAWN_INTERVAL_BASE = 1.4; // seconds
export const SPAWN_MIN = 0.55; // seconds
export const SWIPE_THRESHOLD = 40; // px

export const STORAGE_KEY_BEST = "joseph_best";

export const STATE = {
  MENU: 0,
  HOW: 1,
  PLAYING: 2,
  PAUSED: 3,
  DEAD: 4,
} as const;
export type GameState = (typeof STATE)[keyof typeof STATE];

// ─────────────────────────────────────────────
//  ITEM DEFINITIONS
// ─────────────────────────────────────────────
export interface ItemDef {
  key: string;
  name: string;
  score?: number;
  color: string;
}

export const GOODS: ItemDef[] = [
  { key: "good_1.png", name: "Cucumber", score: 10, color: "#7ec850" },
  { key: "good_2.png", name: "Cucumber", score: 10, color: "#7ec850" },
  { key: "good_3.png", name: "Cucumber", score: 10, color: "#7ec850" },
  { key: "good_4.png", name: "Cucumber", score: 12, color: "#7ec850" },
  // { key: "good_5.png", name: "Algae Wafer", score: 15, color: "#4caf50" },
  { key: "good_6.png", name: "Algae", score: 12, color: "#2e7d32" },
  // { key: "good_7.png", name: "Bubble", score: 8, color: "#80deea" },
  { key: "good_8.png", name: "Algae wafer", score: 8, color: "#80deea" },
  // { key: "good_9.png", name: "Bubble", score: 8, color: "#80deea" },
  { key: "good_10.png", name: "Bubble", score: 20, color: "#fff176" },
  { key: "good_11.png", name: "Bubble", score: 25, color: "#e0f7fa" },
  // { key: "good_12.png", name: "Seaweed", score: 10, color: "#388e3c" },
];

export const BADS: ItemDef[] = [
  { key: "bad_1.png", name: "Trash Bag", color: "#b0bec5" },
  { key: "bad_2.png", name: "Can", color: "#78909c" },
  { key: "bad_3.png", name: "Bottle", color: "#90a4ae" },
  { key: "bad_4.png", name: "Dark Fish", color: "#546e7a" },
  { key: "bad_5.png", name: "Shark", color: "#37474f" },
  { key: "bad_6.png", name: "Piranha", color: "#c62828" },
  { key: "bad_7.png", name: "Rock", color: "#607d8b" },
  { key: "bad_8.png", name: "Rock", color: "#546e7a" },
  { key: "bad_9.png", name: "Rock", color: "#455a64" },
];

export const CUTE_MSGS = [
  "Mina smiled",
  "Pleco power!",
  "Best fish ever!",
  "Keep swimming, Joseph!",
  "So cozy down here",
  "Joseph is the champion!",
  "Go, Joseph, go!",
  "Joseph is unstoppable!",
  "Joseph is making waves!",
  "Joseph the mighty pleco!",
];
