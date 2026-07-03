/**
 * GameRenderer
 * Pure drawing functions for the canvas — exact port of all draw* functions
 * from the HTML version. No React, no state — just ctx + game state.
 */

import {
  BAD_SIZE,
  GAME_H,
  GAME_W,
  ITEM_SIZE,
  JOSEPH_H,
  JOSEPH_W,
  LANE_POSITIONS,
  STATE,
} from "../constants/game";
import {
  BgBubble,
  FloatText,
  GameEngineState,
  GameItem,
  Particle,
} from "../hooks/useGameEngine";
import { PIXEL_FONT } from "../hooks/usePixelFont";
import { drawPixelButton, HitZone } from "./PixelButton";

type Ctx = CanvasRenderingContext2D;
type ImgMap = Record<string, HTMLImageElement>;

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function drawImgAt(
  ctx: Ctx,
  imgs: ImgMap,
  key: string,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 1,
) {
  const img = imgs[key];
  if (!img || !img.complete) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

function drawImgCentered(
  ctx: Ctx,
  imgs: ImgMap,
  key: string,
  cx: number,
  cy: number,
  w: number,
  h: number,
  alpha = 1,
  rotation = 0,
) {
  const img = imgs[key];
  if (!img || !img.complete) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  opts: {
    size?: number;
    color?: string;
    align?: CanvasTextAlign;
    shadow?: boolean;
    weight?: string;
    outline?: boolean;
    font?: string;
  } = {},
) {
  const {
    size = 16,
    color = "#fff",
    align = "left",
    shadow = true,
    weight = "bold",
    outline = false,
    font,
  } = opts;
  ctx.save();
  ctx.font = font
    ? `${size}px ${font}`
    : `${weight} ${size}px 'Courier New', monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  if (shadow) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillText(text, x + 2, y + 2);
  }
  if (outline) {
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawRoundRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill?: string,
  stroke?: string,
  strokeW = 2,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    ctx.stroke();
  }
}

function drawHeart(
  ctx: Ctx,
  cx: number,
  cy: number,
  size: number,
  color: string,
  filled: boolean,
) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 1.2, -s * 0.5, -s * 1.2, -s * 1.3, 0, -s * 0.5);
  ctx.bezierCurveTo(s * 1.2, -s * 1.3, s * 1.2, -s * 0.5, 0, s * 0.35);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.ellipse(-s * 0.2, -s * 0.4, s * 0.25, s * 0.15, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────
//  DRAW: BACKGROUND BUBBLES
// ─────────────────────────────────────────────
function drawBgBubbles(ctx: Ctx, bubbles: BgBubble[]) {
  bubbles.forEach((b) => {
    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.strokeStyle = "rgba(150,220,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(b.x + Math.sin(b.wobble) * 4, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = b.alpha * 0.3;
    ctx.fillStyle = "rgba(150,220,255,0.5)";
    ctx.fill();
    ctx.restore();
  });
}

// ─────────────────────────────────────────────
//  DRAW: PARTICLES
// ─────────────────────────────────────────────
function drawParticles(ctx: Ctx, particles: Particle[]) {
  particles.forEach((p) => {
    const pct = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = pct;
    if (p.type === "star") {
      // translate THEN beginPath — transform must be set before drawing
      ctx.translate(p.x, p.y);
      ctx.rotate(p.life * 5);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      const s = p.size * pct;
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.3, -s * 0.3);
      ctx.lineTo(s, 0);
      ctx.lineTo(s * 0.3, s * 0.3);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.3, s * 0.3);
      ctx.lineTo(-s, 0);
      ctx.lineTo(-s * 0.3, -s * 0.3);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === "sparkle") {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * pct, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * pct, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  });
}

// ─────────────────────────────────────────────
//  DRAW: FLOAT TEXTS
// ─────────────────────────────────────────────
function drawFloatTexts(ctx: Ctx, texts: FloatText[]) {
  texts.forEach((f) => {
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.life * 2);
    drawText(ctx, f.text, f.x, f.y, {
      size: 15,
      color: f.color,
      align: "center",
      outline: true,
    });
    ctx.restore();
  });
}

// ─────────────────────────────────────────────
//  DRAW: ITEMS
// ─────────────────────────────────────────────
function drawItems(ctx: Ctx, imgs: ImgMap, items: GameItem[]) {
  items.forEach((item) => {
    if (!item.alive) return;
    const bob = Math.sin(item.bobT) * 4;
    const s = item.type === "good" ? ITEM_SIZE : BAD_SIZE;
    drawImgCentered(ctx, imgs, item.def.key, item.x, item.y + bob, s, s);
    if (item.type === "good") {
      ctx.save();
      ctx.globalAlpha = 0.15 + Math.sin(item.bobT) * 0.07;
      ctx.fillStyle = item.def.color;
      ctx.beginPath();
      ctx.arc(item.x, item.y + bob, s * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
}

// ─────────────────────────────────────────────
//  DRAW: JOSEPH
// ─────────────────────────────────────────────
function drawJoseph(
  ctx: Ctx,
  imgs: ImgMap,
  g: GameEngineState,
  invincible: number,
) {
  const j = g.joseph;
  const bob = Math.sin(j.animT * 1.5) * 3;
  const wobbleRot = Math.sin(j.wobble * 10) * 0.08 * j.wobble;
  if (invincible > 0 && Math.floor(invincible * 8) % 2 === 0) return;
  if (j.hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = j.hitFlash * 0.6;
    ctx.fillStyle = "#ff4444";
    ctx.beginPath();
    ctx.arc(j.x, j.y + bob, JOSEPH_W * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(j.x, j.y + JOSEPH_H * 0.4, JOSEPH_W * 0.4, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawImgCentered(
    ctx,
    imgs,
    "joseph.png",
    j.x,
    j.y + bob,
    JOSEPH_W,
    JOSEPH_H,
    1,
    wobbleRot,
  );
}

// ─────────────────────────────────────────────
//  DRAW: HUD
// ─────────────────────────────────────────────
function drawHUD(
  ctx: Ctx,
  imgs: ImgMap,
  g: GameEngineState,
  onPause: () => void,
) {
  // Safe area — clears notch / dynamic island / front camera on all phones
  const TOP = 48;
  const PAUSE_S = 36;
  const PAUSE_X = GAME_W - PAUSE_S - 12;
  const PAUSE_Y = TOP + 4;

  // Row centres
  const row1 = TOP + 20; // icon / number row
  const row2 = TOP + 38; // label row

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, TOP + 60);
  grad.addColorStop(0, "rgba(0,15,40,0.92)");
  grad.addColorStop(1, "rgba(0,15,40,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GAME_W, TOP + 60);

  // ── Hearts — left zone ──
  const heartSize = 26;
  const heartGap = 4;
  const blinkOn =
    g.joseph.hitFlash > 0 && Math.floor(g.joseph.hitFlash * 8) % 2 === 0;
  for (let i = 0; i < 3; i++) {
    const hx = 12 + i * (heartSize + heartGap);
    const hy = row1 - heartSize / 2;
    const full = i < g.hearts;
    ctx.save();
    // Blink: dim the whole heart row rapidly when hit
    if (blinkOn) ctx.globalAlpha = 0.2;
    drawImgAt(
      ctx,
      imgs,
      full ? "full-heart.png" : "empty-heart.png",
      hx,
      hy,
      heartSize,
      heartSize,
    );
    ctx.restore();
    // Red flash overlay on filled hearts during blink-on frames
    if (full && blinkOn) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#ff2222";
      ctx.fillRect(hx, hy, heartSize, heartSize);
      ctx.restore();
    }
  }

  // ── Score — center zone (well away from pause button) ──
  drawText(ctx, `${g.score}`, GAME_W / 2, row1, {
    size: 24,
    color: "#fff176",
    align: "center",
    outline: true,
  });
  drawText(ctx, "SCORE", GAME_W / 2, row2, {
    size: 11,
    color: "rgba(255,255,200,0.85)",
    align: "center",
    shadow: false,
  });

  // ── Distance — right of center, left of pause button ──
  // Right-align to pauseX - 10 so it never touches the pause icon
  const distX = PAUSE_X - 10;
  drawText(ctx, `${Math.floor(g.distance)}m`, distX, row1, {
    size: 18,
    color: "#80deea",
    align: "right",
    outline: true,
  });
  drawText(ctx, "DIST", distX, row2, {
    size: 11,
    color: "rgba(128,220,234,0.85)",
    align: "right",
    shadow: false,
  });

  // ── Pause button — far right ──
  drawImgAt(ctx, imgs, "pause.png", PAUSE_X, PAUSE_Y, PAUSE_S, PAUSE_S);
}

// ─────────────────────────────────────────────
//  DRAW: LANE GUIDES
// ─────────────────────────────────────────────
function drawLaneGuides(ctx: Ctx, t: number) {
  LANE_POSITIONS.forEach((lx) => {
    ctx.save();
    ctx.globalAlpha = 0.06 + Math.sin(t * 0.8) * 0.02;
    ctx.strokeStyle = "#80deea";
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 16]);
    ctx.lineDashOffset = -(t * 40) % 24;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx, GAME_H);
    ctx.stroke();
    ctx.restore();
  });
}

// ─────────────────────────────────────────────
//  DRAW: CUTE MSG
// ─────────────────────────────────────────────
function drawCuteMsg(ctx: Ctx, cuteMsg: { text: string; t: number } | null) {
  if (!cuteMsg || cuteMsg.t <= 0) return;
  const alpha =
    Math.min(1, cuteMsg.t) * Math.min(1, cuteMsg.t > 2 ? 1 : cuteMsg.t);
  ctx.save();
  ctx.globalAlpha = alpha;
  // No box — just bold pixel text with a strong drop shadow for visibility
  ctx.font = `bold 22px 'Courier New', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Multi-layer shadow for extra legibility over any background
  const tx = GAME_W / 2,
    ty = GAME_H * 0.18;
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillText(cuteMsg.text, tx + 2, ty + 3);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillText(cuteMsg.text, tx - 1, ty + 1);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(cuteMsg.text, tx, ty);
  ctx.restore();
}

// ─────────────────────────────────────────────
//  DRAW: SCROLLING BACKGROUND
// ─────────────────────────────────────────────
function drawScrollingBg(ctx: Ctx, imgs: ImgMap, bgY: number, alpha = 1) {
  const img = imgs["background with 3 lanes.png"];
  if (!img || !img.complete) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const by0 = (bgY % GAME_H) - GAME_H;
  ctx.drawImage(img, 0, by0, GAME_W, GAME_H);
  ctx.drawImage(img, 0, by0 + GAME_H, GAME_W, GAME_H);
  ctx.drawImage(img, 0, by0 + GAME_H * 2, GAME_W, GAME_H);
  ctx.restore();
}

// ─────────────────────────────────────────────
//  Shared menu dialog measurements — also reused by the pause screen
//  so its buttons can match the main menu's button size exactly.
// ─────────────────────────────────────────────
const MENU_DH = GAME_H * 0.66;
const MENU_DW = MENU_DH * 0.66;
const MENU_BTN_W = MENU_DW * 0.42;
const MENU_BTN_H = MENU_BTN_W * 0.285;

// ─────────────────────────────────────────────
//  SCREEN: MENU
// ─────────────────────────────────────────────
export function renderMenu(
  ctx: Ctx,
  imgs: ImgMap,
  g: GameEngineState,
): HitZone[] {
  const t = g.totalTime;
  const mScrollY = (t * 60) % GAME_H;
  drawScrollingBg(ctx, imgs, mScrollY);
  ctx.fillStyle = "rgba(0,12,35,0.40)";
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  drawBgBubbles(ctx, g.bubbleBg);

  // ── d3.png — tall portrait dialog, kept at its native aspect ratio ──
  const dh = MENU_DH;
  const dw = MENU_DW;
  const dx = GAME_W / 2 - dw / 2;
  const dy = GAME_H * 0.16;
  drawImgAt(ctx, imgs, "d3.png", dx, dy, dw, dh);

  // ── Title block — vertically centered as a group inside the dialog's
  //     content area (below the anchor decoration) ──
  const contentTop = dy + dh * 0.16;
  const contentBottom = dy + dh * 0.92;
  const contentH = contentBottom - contentTop;
  const contentCY = contentTop + contentH / 2;

  // Total stacked block height (title x2 + best + gap + buttons x2)
  const blockH = dh * 0.4;
  let cursorY = contentCY - blockH / 2;

  drawText(ctx, "joseph's", GAME_W / 2, cursorY, {
    size: dw * 0.05,
    color: "#1a4a6a",
    align: "center",
    shadow: false,
    font: PIXEL_FONT,
  });
  cursorY += dh * 0.045;
  drawText(ctx, "ocean dash", GAME_W / 2, cursorY, {
    size: dw * 0.058,
    color: "#0d3352",
    align: "center",
    shadow: false,
    font: PIXEL_FONT,
  });

  // ── Best score ──
  cursorY += dh * 0.06;
  const bestText = g.bestScore > 0 ? `best: ${g.bestScore}` : "best: ---";
  drawText(ctx, bestText, GAME_W / 2, cursorY, {
    size: dw * 0.04,
    color: "#2a5c8a",
    align: "center",
    shadow: false,
    font: PIXEL_FONT,
  });

  // ── Buttons — sized to dialog interior width, evenly centered, bigger labels ──
  const btnW = MENU_BTN_W,
    btnH = MENU_BTN_H,
    btnX = GAME_W / 2 - btnW / 2;
  cursorY += dh * 0.075;
  const playY = cursorY;
  const quitY = playY + btnH + dh * 0.03;

  const playRect = drawPixelButton(ctx, imgs, {
    x: btnX,
    y: playY,
    w: btnW,
    h: btnH,
    label: "play",
    fontFamily: PIXEL_FONT,
    fontSize: btnH * 0.32,
  });
  const quitRect = drawPixelButton(ctx, imgs, {
    x: btnX,
    y: quitY,
    w: btnW,
    h: btnH,
    label: "quit",
    fontFamily: PIXEL_FONT,
    fontSize: btnH * 0.32,
  });

  // ── Ambient sparkles ──
  for (let i = 0; i < 6; i++) {
    const sx = 20 + Math.sin(t * 0.7 + i * 1.1) * 30 + i * 58;
    const sy = GAME_H * 0.06 + Math.cos(t * 0.9 + i * 0.8) * 16;
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(t * 1.3 + i) * 0.25;
    ctx.fillStyle = i % 2 === 0 ? "#fff176" : "#80deea";
    ctx.beginPath();
    ctx.arc(sx, sy, 2 + Math.sin(t + i) * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return [
    { ...playRect, id: "play" },
    { ...quitRect, id: "quit" },
  ];
}

// ─────────────────────────────────────────────
//  SCREEN: HOW TO PLAY
//  (kept in code in case you wire a button to it elsewhere — the menu's
//   second button now opens quit instead of this screen)
// ─────────────────────────────────────────────
export function renderHowToPlay(
  ctx: Ctx,
  imgs: ImgMap,
  g: GameEngineState,
): HitZone[] {
  const img = imgs["background with 3 lanes.png"];
  if (img && img.complete) ctx.drawImage(img, 0, 0, GAME_W, GAME_H);
  ctx.fillStyle = "rgba(0,10,30,0.58)";
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  drawBgBubbles(ctx, g.bubbleBg);

  const dw = 286,
    dh = 500,
    dx = GAME_W / 2 - dw / 2,
    dy = GAME_H / 2 - dh / 2 - 20;
  drawImgAt(ctx, imgs, "d3.png", dx, dy, dw, dh);
  drawText(ctx, "how to play", GAME_W / 2, dy + 62, {
    size: 15,
    color: "#0d3352",
    align: "center",
    shadow: false,
    font: PIXEL_FONT,
  });
  drawImgCentered(ctx, imgs, "joseph.png", GAME_W / 2, dy + 118, 62, 62);

  const ins = [
    { icon: "< >", text: "Swipe left/right to switch lanes" },
    { icon: "veg", text: "Collect food for points" },
    { icon: "( )", text: "Grab bubbles for bonus" },
    { icon: "!!!", text: "Avoid sharks & trash" },
    { icon: "<3", text: "3 hearts - guard them!" },
    { icon: ">>>", text: "Speed increases over time" },
  ];
  ins.forEach((item, i) => {
    const iy = dy + 168 + i * 46;
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = "#0d4080";
    ctx.fillRect(dx + 24, iy - 14, dw - 48, 36);
    ctx.restore();
    drawText(ctx, item.icon, dx + 44, iy + 4, {
      size: 15,
      align: "center",
      shadow: false,
    });
    drawText(ctx, item.text, dx + 68, iy + 4, {
      size: 11,
      color: "#0d2a3a",
      align: "left",
      shadow: false,
      weight: "bold",
    });
  });

  const btnW = 160,
    btnH = 48,
    btnX = GAME_W / 2 - btnW / 2,
    btnY = dy + dh - 68;
  const backRect = drawPixelButton(ctx, imgs, {
    x: btnX,
    y: btnY,
    w: btnW,
    h: btnH,
    label: "back",
    fontFamily: PIXEL_FONT,
    fontSize: 15,
  });

  return [{ ...backRect, id: "back" }];
}

// ─────────────────────────────────────────────
//  SCREEN: PAUSE OVERLAY
// ─────────────────────────────────────────────
export function renderPause(
  ctx: Ctx,
  imgs: ImgMap,
  g: GameEngineState,
): HitZone[] {
  ctx.fillStyle = "rgba(0,10,30,0.62)";
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  const dw = 350,
    dh = 350;

  // ── Buttons match the main menu's button size exactly ──
  const btnW = MENU_BTN_W,
    btnH = MENU_BTN_H;

  // ── Spacing between stacked elements inside the dialog ──
  const gapTitleToScore = 35;
  const gapScoreToDist = 22;
  const gapDistToBtn = 38;
  const gapBtnToBtn = dh * 0.04;

  // Height of the full content block, used to center it vertically
  // within the dialog frame (title -> score -> distance -> 2 buttons)
  const blockH =
    gapTitleToScore + gapScoreToDist + gapDistToBtn + btnH * 2 + gapBtnToBtn;

  // Center the dialog frame itself in the viewport
  const dx = GAME_W / 2 - dw / 2;
  const dy = GAME_H / 2 - dh / 2;
  drawImgAt(ctx, imgs, "d2.png", dx, dy, dw, dh);

  // Center the content block within the frame's vertical span
  const frameContentCY = dy + dh / 2;
  let cursorY = frameContentCY - blockH / 2;

  drawText(ctx, "paused", GAME_W / 2, cursorY, {
    size: 19,
    color: "#0d3352",
    align: "center",
    shadow: false,
    font: PIXEL_FONT,
  });

  cursorY += gapTitleToScore;
  drawText(ctx, "Score: " + g.score, GAME_W / 2, cursorY, {
    size: 15,
    color: "#0d3352",
    align: "center",
    shadow: false,
  });

  cursorY += gapScoreToDist;
  drawText(
    ctx,
    "Distance: " + Math.floor(g.distance) + "m",
    GAME_W / 2,
    cursorY,
    { size: 12, color: "#2a5c8a", align: "center", shadow: false },
  );

  cursorY += gapDistToBtn;
  const bx = GAME_W / 2 - btnW / 2;
  const by1 = cursorY;
  const by2 = by1 + btnH + gapBtnToBtn;

  const resumeRect = drawPixelButton(ctx, imgs, {
    x: bx,
    y: by1,
    w: btnW,
    h: btnH,
    label: "resume",
    fontFamily: PIXEL_FONT,
    fontSize: btnH * 0.32,
  });
  const menuRect = drawPixelButton(ctx, imgs, {
    x: bx,
    y: by2,
    w: btnW,
    h: btnH,
    label: "menu",
    fontFamily: PIXEL_FONT,
    fontSize: btnH * 0.32,
  });

  return [
    { ...resumeRect, id: "resume" },
    { ...menuRect, id: "menu" },
  ];
}

// ─────────────────────────────────────────────
//  SCREEN: GAME OVER
// ─────────────────────────────────────────────
export function renderGameOver(
  ctx: Ctx,
  imgs: ImgMap,
  g: GameEngineState,
): HitZone[] {
  const t = g.totalTime;
  ctx.fillStyle = "rgba(0,8,25,0.72)";
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  drawParticles(ctx, g.particles);
  drawBgBubbles(ctx, g.bubbleBg);

  // ── Same dialog dimensions as pause ──
  const dw = 350,
    dh = 350;
  const dx = GAME_W / 2 - dw / 2;
  const dy = GAME_H / 2 - dh / 2;
  drawImgAt(ctx, imgs, "d2.png", dx, dy, dw, dh);

  // ── Same button dimensions as pause ──
  const btnW = MENU_BTN_W,
    btnH = MENU_BTN_H;

  // ── Same gap constants as pause, plus extra rows for best score ──
  const gapTitleToNewBest = 28;
  const gapNewBestToScore = 24;
  const gapScoreToDist = 20;
  const gapDistToBest = 16;
  const gapBestToBtn = 30;
  const gapBtnToBtn = dh * 0.04;

  const newBest = g.score >= g.bestScore && g.score > 0;

  // Total content block height — same calculation pattern as pause
  const blockH =
    (newBest ? gapTitleToNewBest + gapNewBestToScore : gapTitleToNewBest) +
    gapScoreToDist +
    gapDistToBest +
    gapBestToBtn +
    btnH * 2 +
    gapBtnToBtn;

  const frameContentCY = dy + dh / 2;
  let cursorY = frameContentCY - blockH / 2;

  // Title
  drawText(ctx, "game over", GAME_W / 2, cursorY, {
    size: 19,
    color: "#6b1515",
    align: "center",
    shadow: false,
    font: PIXEL_FONT,
  });

  // New best (optional)
  if (newBest) {
    cursorY += gapTitleToNewBest;
    ctx.save();
    ctx.globalAlpha = 0.75 + Math.sin(t * 3) * 0.25;
    drawText(ctx, "** NEW BEST! **", GAME_W / 2, cursorY, {
      size: 13,
      color: "#9a6800",
      align: "center",
      shadow: false,
    });
    ctx.restore();
    cursorY += gapNewBestToScore;
  } else {
    cursorY += gapTitleToNewBest;
  }

  // Score
  drawText(ctx, "Score: " + g.score, GAME_W / 2, cursorY, {
    size: 15,
    color: "#0d3352",
    align: "center",
    shadow: false,
  });

  // Distance
  cursorY += gapScoreToDist;
  drawText(
    ctx,
    "Distance: " + Math.floor(g.distance) + "m",
    GAME_W / 2,
    cursorY,
    {
      size: 12,
      color: "#2a5c8a",
      align: "center",
      shadow: false,
    },
  );

  // Best score
  cursorY += gapDistToBest;
  drawText(ctx, "Best: " + g.bestScore, GAME_W / 2, cursorY, {
    size: 12,
    color: "#7a5800",
    align: "center",
    shadow: false,
  });

  // Buttons — identical to pause
  cursorY += gapBestToBtn;
  const bx = GAME_W / 2 - btnW / 2;
  const by1 = cursorY;
  const by2 = by1 + btnH + gapBtnToBtn;

  const playRect = drawPixelButton(ctx, imgs, {
    x: bx,
    y: by1,
    w: btnW,
    h: btnH,
    label: "play again",
    fontFamily: PIXEL_FONT,
    fontSize: btnH * 0.28,
  });
  const menuRect = drawPixelButton(ctx, imgs, {
    x: bx,
    y: by2,
    w: btnW,
    h: btnH,
    label: "menu",
    fontFamily: PIXEL_FONT,
    fontSize: btnH * 0.32,
  });

  return [
    { ...playRect, id: "play" },
    { ...menuRect, id: "menu" },
  ];
}

// ─────────────────────────────────────────────
//  MASTER RENDER — called every frame
// ─────────────────────────────────────────────
export function renderFrame(
  ctx: Ctx,
  imgs: ImgMap,
  g: GameEngineState,
  invincible: number,
  callbacks: {
    onPause: () => void;
    onResume: () => void;
    onMenu: () => void;
    onPlay: () => void;
    onHow: () => void;
    onBack: () => void;
    onQuit?: () => void;
  },
): HitZone[] {
  ctx.clearRect(0, 0, GAME_W, GAME_H);

  if (g.state === STATE.MENU) return renderMenu(ctx, imgs, g);
  if (g.state === STATE.HOW) return renderHowToPlay(ctx, imgs, g);

  // ── Playing / Paused / Dead world ──────────────────────────────────────
  drawScrollingBg(ctx, imgs, g.bgY);
  ctx.fillStyle = "rgba(0,15,40,0.18)";
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  drawLaneGuides(ctx, g.totalTime);
  drawBgBubbles(ctx, g.bubbleBg);
  drawItems(ctx, imgs, g.items);
  drawJoseph(ctx, imgs, g, invincible);
  drawParticles(ctx, g.particles);
  drawFloatTexts(ctx, g.floatTexts);
  drawCuteMsg(ctx, g.cuteMsg);
  drawHUD(ctx, imgs, g, callbacks.onPause);

  // HUD pause button hit zone — must match drawHUD's PAUSE_X/PAUSE_Y/PAUSE_S
  const pbSize = 36,
    pbX = GAME_W - pbSize - 12,
    pbY = 48 + 4;
  const zones: HitZone[] = [
    { x: pbX, y: pbY, w: pbSize, h: pbSize, id: "pause" },
  ];

  if (g.state === STATE.PAUSED) {
    return [...zones, ...renderPause(ctx, imgs, g)];
  }
  if (g.state === STATE.DEAD) {
    return [...zones, ...renderGameOver(ctx, imgs, g)];
  }
  return zones;
}
