// Post Maker card renderer (docs/4-app-and-website/post-maker.md). Draws a branded post image
// for an LGU announcement on a <canvas>, entirely in the browser: nothing is
// uploaded, and no AI is involved in the picture.

export type PostFormat = "portrait" | "square" | "story" | "landscape";
export type PostTemplate = "announcement" | "advisory" | "emergency" | "event";

export const FORMATS: Record<PostFormat, { label: string; ratio: string; w: number; h: number }> = {
  portrait: { label: "Feed post", ratio: "4:5", w: 1080, h: 1350 },
  square: { label: "Square", ratio: "1:1", w: 1080, h: 1080 },
  story: { label: "Story", ratio: "9:16", w: 1080, h: 1920 },
  landscape: { label: "Landscape", ratio: "16:9", w: 1920, h: 1080 },
};

export const TEMPLATES: Record<PostTemplate, { label: string; kicker: string; band: string; accent: string; text: string }> = {
  announcement: { label: "Announcement", kicker: "ANNOUNCEMENT", band: "", accent: "#FACC15", text: "#FFFFFF" },
  advisory: { label: "Weather advisory", kicker: "WEATHER ADVISORY", band: "#B45309", accent: "#FDE68A", text: "#FFFFFF" },
  emergency: { label: "Emergency", kicker: "EMERGENCY ALERT", band: "#B91C1C", accent: "#FFFFFF", text: "#FFFFFF" },
  event: { label: "Event / schedule", kicker: "EVENT", band: "", accent: "#A7F3D0", text: "#FFFFFF" },
};

export interface PostSpec {
  format: PostFormat;
  template: PostTemplate;
  kicker: string;
  headline: string;
  body: string;
  /** Small line at the bottom, e.g. "Nov 23, 2026 · Source: DOST-PAGASA". */
  footer: string;
  issuerName: string;
  /** LGU colour (#rrggbb); the panel uses a dark shade of it. */
  issuerColor: string;
}

export interface PostAssets {
  seal: CanvasImageSource | null;
  photo: (CanvasImageSource & { width: number; height: number }) | null;
}

/** The minimal canvas surface used here, so layout can be tested with a fake. */
export interface Ctx2D {
  font: string;
  fillStyle: string | CanvasGradient | CanvasPattern;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  measureText(t: string): { width: number };
}

/**
 * Wraps text into at most maxLines lines no wider than maxWidth, shrinking the
 * font from `start` down to `min` until it fits. If it still does not fit at
 * `min`, the last line ends with "…" so nothing overflows the card.
 */
export function fitText(ctx: Ctx2D, text: string, maxWidth: number, maxLines: number,
  start: number, min: number, weight = "700", lineHeight = 1.15, maxHeight = Infinity): { size: number; lines: string[] } {
  const linesFor = (size: number) => Math.max(1, Math.min(maxLines, Math.floor(maxHeight / (size * lineHeight))));
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const wrap = (size: number) => {
    ctx.font = `${weight} ${size}px "Atkinson Hyperlegible Next", system-ui, sans-serif`;
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(next).width <= maxWidth || !cur) cur = next;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  };
  for (let size = start; size >= min; size -= 2) {
    const lines = wrap(size);
    if (lines.length <= linesFor(size) && lines.every((l) => ctx.measureText(l).width <= maxWidth)) return { size, lines };
  }
  maxLines = linesFor(min);
  const lines = wrap(min).slice(0, maxLines);
  if (lines.length) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    const truncated = wrap(min).length > maxLines || last !== lines[lines.length - 1];
    lines[lines.length - 1] = truncated ? `${last.replace(/\s+$/, "")}…` : last;
  }
  return { size: min, lines };
}

function shade(hex: string, f: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(15,40,25,${1 - f})`;
  const n = parseInt(m[1], 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
}

function cover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number },
  x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

/** Draws the card onto a canvas already sized FORMATS[spec.format].w x h. */
export function drawPostCard(ctx: CanvasRenderingContext2D, spec: PostSpec, assets: PostAssets) {
  const { w, h } = FORMATS[spec.format];
  const t = TEMPLATES[spec.template];
  const wide = spec.format === "landscape";
  const pad = Math.round(Math.min(w, h) * 0.06);
  const dark = shade(spec.issuerColor, 0.35);
  const mid = shade(spec.issuerColor, 0.6);

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  // Background: the photo (if any) or a solid LGU gradient.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, mid); g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Photo area: top part (left half when landscape).
  // With a photo the top half shows it; without one, a smaller area shows
  // the LGU seal on a white disc, leaving more room for the text.
  const topShare = assets.photo ? (spec.format === "story" ? 0.46 : 0.48) : (spec.format === "story" ? 0.32 : 0.3);
  const photoBox = wide ? { x: 0, y: 0, w: w * (assets.photo ? 0.5 : 0.36), h } : { x: 0, y: 0, w, h: h * topShare };
  if (assets.photo) {
    cover(ctx, assets.photo, photoBox.x, photoBox.y, photoBox.w, photoBox.h);
  }

  // Text panel: lower part (right half when landscape), with the template's band.
  const panel = wide ? { x: photoBox.w, y: 0, w: w - photoBox.w, h } : { x: 0, y: photoBox.h, w, h: h - photoBox.h };
  ctx.fillStyle = dark;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  if (t.band) {
    ctx.fillStyle = t.band;
    ctx.fillRect(panel.x, panel.y, panel.w, Math.round(h * (wide ? 0.012 : 0.014)));
  }

  const unitM = Math.min(w, h);
  ctx.textAlign = "left";
  if (assets.photo) {
    // Issuer header bar over the photo: seal + LGU name.
    const headH = Math.round(unitM * 0.11);
    const barW = Math.min(photoBox.w - pad * 1.2, w * 0.8);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(pad * 0.6, pad * 0.6, barW, headH);
    const sealSize = headH * 0.78;
    if (assets.seal) ctx.drawImage(assets.seal, pad * 0.6 + headH * 0.11, pad * 0.6 + headH * 0.11, sealSize, sealSize);
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "middle";
    const nameFit = fitText(ctx, spec.issuerName, barW - headH * 1.1, 1, Math.round(headH * 0.34), Math.round(headH * 0.2));
    ctx.fillText(nameFit.lines[0] ?? "", pad * 0.6 + headH * 1.0, pad * 0.6 + headH / 2);
  } else {
    // No photo: a masthead with the seal on a white disc and the LGU name.
    const r = wide ? Math.min(photoBox.w * 0.28, h * 0.17) : Math.min(photoBox.h * 0.32, w * 0.13);
    const cx = wide ? photoBox.w / 2 : pad + r;
    const cy = wide ? h * 0.4 : photoBox.h / 2;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath();
    ctx.fillStyle = "#FFFFFF"; ctx.fill();
    if (assets.seal) { ctx.clip(); ctx.drawImage(assets.seal, cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8); }
    ctx.restore();
    ctx.fillStyle = "#FFFFFF";
    if (wide) {
      const name = fitText(ctx, spec.issuerName, photoBox.w - pad * 2, 3, Math.round(unitM * 0.05), Math.round(unitM * 0.03), "800", 1.15);
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.font = `800 ${name.size}px "Atkinson Hyperlegible Next", system-ui, sans-serif`;
      name.lines.forEach((l, i) => ctx.fillText(l, cx, cy + r + pad * 0.6 + i * name.size * 1.15));
      ctx.textAlign = "left";
    } else {
      const nx = cx + r + pad * 0.6;
      const name = fitText(ctx, spec.issuerName, w - nx - pad, 2, Math.round(unitM * 0.055), Math.round(unitM * 0.034), "800", 1.15);
      ctx.textBaseline = "top";
      ctx.font = `800 ${name.size}px "Atkinson Hyperlegible Next", system-ui, sans-serif`;
      const top = cy - (name.lines.length * name.size * 1.15) / 2;
      name.lines.forEach((l, i) => ctx.fillText(l, nx, top + i * name.size * 1.15));
    }
  }

  // Kicker pill, headline, accent rule, body, footer.
  const x = panel.x + pad;
  const maxW = panel.w - pad * 2;
  let y = panel.y + pad * (wide ? 1.4 : 0.9);
  const kSize = Math.round(Math.min(w, h) * 0.03);
  ctx.font = `800 ${kSize}px "Atkinson Hyperlegible Next", system-ui, sans-serif`;
  const kText = (spec.kicker || t.kicker).toUpperCase();
  const kW = ctx.measureText(kText).width + kSize * 1.4;
  ctx.fillStyle = t.accent;
  roundRect(ctx, x, y, kW, kSize * 1.8, kSize * 0.9);
  ctx.fillStyle = "#111827";
  ctx.textBaseline = "middle";
  ctx.fillText(kText, x + kSize * 0.7, y + kSize * 0.92);
  y += kSize * 1.8 + pad * 0.5;

  const unit = Math.min(w, h);
  const footerSize = Math.round(unit * 0.024);
  const bottom = panel.y + panel.h - pad * 0.8 - footerSize * 1.6;
  const hasBody = spec.body.trim().length > 0;
  // The headline gets up to 60% of the space when there is a body, so the
  // body always keeps a few readable lines; it never pushes into the footer.
  const headBudget = (bottom - y) * (hasBody ? 0.6 : 1);
  const head = fitText(ctx, spec.headline || "Headline", maxW, wide ? 5 : 4,
    Math.round(unit * 0.075), Math.round(unit * 0.042), "800", 1.12, headBudget);
  ctx.fillStyle = t.text;
  ctx.textBaseline = "top";
  ctx.font = `800 ${head.size}px "Atkinson Hyperlegible Next", system-ui, sans-serif`;
  head.lines.forEach((l, i) => ctx.fillText(l, x, y + i * head.size * 1.12));
  y += head.lines.length * head.size * 1.12 + pad * 0.35;

  ctx.fillStyle = t.accent;
  ctx.fillRect(x, y, Math.min(maxW, pad * 2.2), Math.max(4, Math.round(h * 0.004)));
  y += pad * 0.5;

  if (hasBody && bottom - y > unit * 0.03) {
    // Readable or not at all: the body is shortened with "…" rather than
    // shrunk below about 32 px on a 1080 px card.
    const body = fitText(ctx, spec.body, maxW, 8, Math.round(unit * 0.036), Math.round(unit * 0.03),
      "400", 1.3, bottom - y);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = `400 ${body.size}px "Atkinson Hyperlegible Next", system-ui, sans-serif`;
    body.lines.forEach((l, i) => ctx.fillText(l, x, y + i * body.size * 1.3));
  }

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.textBaseline = "alphabetic";
  const foot = fitText(ctx, spec.footer, maxW, 1, footerSize, Math.round(footerSize * 0.75), "600");
  ctx.font = `600 ${foot.size}px "Atkinson Hyperlegible Next", system-ui, sans-serif`;
  ctx.fillText(foot.lines[0] ?? "", x, panel.y + panel.h - pad * 0.8);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

/** File name for the exported PNG, e.g. one-vizcaya_bambang_2026-11-23_feed-post.png */
export function postFileName(issuer: string, format: PostFormat, date = new Date()): string {
  const slug = issuer.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `one-vizcaya_${slug}_${date.toISOString().slice(0, 10)}_${FORMATS[format].label.toLowerCase().replace(/\s+/g, "-")}.png`;
}
