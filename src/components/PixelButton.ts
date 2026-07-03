/**
 * PixelButton — a reusable canvas "component" for drawing buttons.
 *
 * Instead of using pre-labeled button images (play.png, menu.png, etc.),
 * this draws the generic `plainbutton.png` frame and overlays a label
 * rendered in the pixel-art font. This keeps all button text consistent,
 * crisp, and easy to re-skin or relabel without needing new art assets.
 *
 * Usage:
 *   drawPixelButton(ctx, imgs, {
 *     x, y, w, h,
 *     label: 'PLAY',
 *     fontFamily: PIXEL_FONT,
 *   });
 *
 *   // returns the hit-zone rect so callers can register it for input
 */

type Ctx = CanvasRenderingContext2D;
type ImgMap = Record<string, HTMLImageElement>;

export interface PixelButtonOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  fontFamily: string;
  fontSize?: number;
  textColor?: string;
  shadowColor?: string;
  pressed?: boolean; // slightly shrinks/darkens for a pressed look
  disabled?: boolean;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface HitZone extends Rect {
  id: string;
}

export function drawPixelButton(
  ctx: Ctx,
  imgs: ImgMap,
  opts: PixelButtonOpts,
): Rect {
  const {
    x,
    y,
    w,
    h,
    label,
    fontFamily,
    fontSize = Math.round(h * 0.32),
    textColor = "#0d2a3a",
    shadowColor = "rgba(0,0,0,0.18)",
    pressed = false,
    disabled = false,
  } = opts;

  const img = imgs["plainbutton.png"];

  ctx.save();

  // Pressed state: shrink slightly + nudge down for tactile feedback
  const dx = pressed ? 1 : 0;
  const dy = pressed ? 2 : 0;
  const dw = pressed ? w - 2 : w;
  const dh = pressed ? h - 2 : h;

  if (disabled) ctx.globalAlpha = 0.5;

  if (img && img.complete) {
    ctx.drawImage(img, x + dx, y + dy, dw, dh);
  } else {
    // Fallback flat button if image hasn't loaded yet
    ctx.fillStyle = "#8fa8c2";
    ctx.strokeStyle = "#3a5a72";
    ctx.lineWidth = 2;
    const r = 8;
    roundRectPath(ctx, x + dx, y + dy, dw, dh, r);
    ctx.fill();
    ctx.stroke();
  }

  // Label — pixel font, centered, subtle drop shadow for legibility
  const cx = x + dx + dw / 2;
  const cy = y + dy + dh / 2;

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = shadowColor;
  ctx.fillText(label, cx + 1, cy + 2);

  ctx.fillStyle = textColor;
  ctx.fillText(label, cx, cy);

  ctx.restore();

  return { x, y, w, h };
}

function roundRectPath(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
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
}
