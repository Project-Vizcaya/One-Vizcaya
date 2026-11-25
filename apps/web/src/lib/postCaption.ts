// Captions for Post Maker (docs/4-app-and-website/post-maker.md): built from fixed phrases, no AI.
// The Tagalog and Ilocano phrases are in docs/2-fill-in/translation-review.md (C1) for a
// native speaker to check.

export type CaptionLang = "en" | "tl" | "il";

export const CAPTION_LANGS: Record<CaptionLang, string> = { en: "English", tl: "Tagalog", il: "Ilocano" };

const PHRASES: Record<CaptionLang, { details: string; hotline: string; share: string; source: string }> = {
  en: { details: "For details, contact", hotline: "In an emergency, call", share: "Please share with your family and neighbours.", source: "Source" },
  tl: { details: "Para sa detalye, makipag-ugnayan sa", hotline: "Sa emergency, tumawag sa", share: "Pakibahagi sa inyong pamilya at mga kapitbahay.", source: "Pinagmulan" },
  il: { details: "Para kadagiti detalye, kontaken ti", hotline: "No adda emergency, tawagan ti", share: "Pangngaasiyo ta ibingayyo iti pamiliayo ken kaarrubayo.", source: "Naggapuan" },
};

const tag = (s: string) => `#${s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "")}`;

export interface CaptionInput {
  lang: CaptionLang;
  headline: string;
  body: string;
  issuerName: string;
  /** Town name for the hashtag; null for province-wide posts. */
  municipality: string | null;
  contact?: string;
  hotline?: string;
  source?: string;
  urgent?: boolean;
}

export function buildCaption(i: CaptionInput): string {
  const p = PHRASES[i.lang];
  const lines: string[] = [];
  lines.push(`${i.urgent ? "URGENT: " : ""}${i.headline.trim()}`);
  if (i.body.trim()) lines.push("", i.body.trim());
  const contact = i.contact?.trim();
  if (contact) lines.push("", `${p.details} ${contact}.`);
  if (i.hotline?.trim()) lines.push(`${p.hotline} ${i.hotline.trim()}.`);
  if (i.source?.trim()) lines.push("", `${p.source}: ${i.source.trim()}`);
  if (i.urgent) lines.push("", p.share);
  lines.push("", `— ${i.issuerName}`);
  const tags = ["#NuevaVizcaya", i.municipality && tag(i.municipality), "#OneVizcaya"].filter(Boolean);
  lines.push("", tags.join(" "));
  return lines.join("\n");
}

/** Alt text for the image, for screen-reader users of the post. */
export function buildAltText(headline: string, issuerName: string, kicker: string): string {
  return `${kicker} from ${issuerName}: ${headline.trim()}`.slice(0, 250);
}
