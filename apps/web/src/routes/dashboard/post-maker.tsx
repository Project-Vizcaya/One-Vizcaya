import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { collection, limit, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { Copy, Download, ImagePlus, Trash2, RefreshCw, Check } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { usePagasaProduct } from "@/hooks/usePagasaProduct";
import { MUNICIPALITIES } from "@/data/municipalities";
import { drawPostCard, FORMATS, TEMPLATES, postFileName, type PostFormat, type PostTemplate } from "@/lib/postCard";
import { buildAltText, buildCaption, CAPTION_LANGS, type CaptionLang } from "@/lib/postCaption";
import { PostAssistButton } from "@/components/posts/PostAssistButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/post-maker")({ component: PostMakerPage });

// Post Maker (docs/4-app-and-website/post-maker.md): branded images and captions for LGU
// announcements, made in the browser. Nothing is posted anywhere: the admin
// downloads the image and copies the caption into the LGU's own page.

const PROVINCE = "Province of Nueva Vizcaya";
const sealFor = (issuer: string) => issuer === PROVINCE
  ? "/img/seals/nueva-vizcaya.png"
  : `/img/seals/${issuer.replace(/^Municipality of /, "").toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}.png`;

interface Source { id: string; label: string; template: PostTemplate; headline: string; body: string; source?: string; urgent?: boolean }

function useRecentBroadcasts() {
  const [rows, setRows] = useState<Source[]>([]);
  useEffect(() => onSnapshot(query(collection(db, "broadcasts"), orderBy("timestamp", "desc"), limit(10)), (snap) =>
    setRows(snap.docs.map((d) => {
      const x = d.data();
      const when = x.timestamp instanceof Timestamp ? x.timestamp.toDate().toLocaleDateString("en-PH") : "";
      return { id: `b_${d.id}`, label: `Broadcast · ${when} · ${x.title ?? ""}`, template: x.urgent ? "emergency" : "announcement",
        headline: String(x.title ?? ""), body: String(x.body ?? ""), urgent: x.urgent === true };
    })), () => setRows([])), []);
  return rows;
}

function PostMakerPage() {
  const user = useAuthStore((s) => s.user);
  const lockedTown = user?.role === "municipal_admin" || user?.role === "barangay_admin" ? user.municipality ?? null : null;
  const issuers = lockedTown ? [`Municipality of ${lockedTown}`] : [PROVINCE, ...MUNICIPALITIES.map((m) => `Municipality of ${m.name}`)];

  const [format, setFormat] = useState<PostFormat>("portrait");
  const [template, setTemplate] = useState<PostTemplate>("announcement");
  const [issuer, setIssuer] = useState(issuers[0]);
  const [kicker, setKicker] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [hotline, setHotline] = useState("");
  const [source, setSource] = useState("");
  const [lang, setLang] = useState<CaptionLang>("en");
  const [caption, setCaption] = useState("");
  const [captionEdited, setCaptionEdited] = useState(false);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [seal, setSeal] = useState<HTMLImageElement | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const town = issuer === PROVINCE ? null : issuer.replace(/^Municipality of /, "");
  const color = (town && MUNICIPALITIES.find((m) => m.name === town)?.color) || "#1B5E20";
  const footer = [new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }), issuer,
    hotline.trim() && `Hotline ${hotline.trim()}`, source.trim() && `Source: ${source.trim()}`].filter(Boolean).join(" · ");
  const urgent = template === "emergency";

  // Sources to start from.
  const { announcements } = useAnnouncements();
  const broadcasts = useRecentBroadcasts();
  const { product: pagasa } = usePagasaProduct();
  const sources: Source[] = useMemo(() => {
    const out: Source[] = [];
    if (pagasa?.rainfall && pagasa.rainfall.noneIssued === false && pagasa.rainfall.text) {
      out.push({ id: "pagasa_rain", label: "PAGASA · Heavy rainfall warning", template: "advisory",
        headline: "Heavy rainfall warning", body: pagasa.rainfall.text, source: "DOST-PAGASA" });
    }
    (pagasa?.thunderstorms?.items ?? []).filter((t) => t.mentionsNuevaVizcaya).forEach((t, i) =>
      out.push({ id: `pagasa_ts_${i}`, label: `PAGASA · ${t.title ?? "Thunderstorm information"}`, template: "advisory",
        headline: t.title ?? "Thunderstorm advisory", body: t.text, source: "DOST-PAGASA" }));
    announcements.filter((a) => !lockedTown || a.municipality === lockedTown).slice(0, 10).forEach((a) =>
      out.push({ id: `a_${a.id}`, label: `Announcement · ${a.title}`, template: a.urgent ? "emergency" : "announcement",
        headline: a.title, body: a.body, urgent: a.urgent }));
    return [...out, ...broadcasts];
  }, [pagasa, announcements, broadcasts, lockedTown]);

  const startFrom = (id: string) => {
    const s = sources.find((x) => x.id === id);
    if (!s) return;
    setTemplate(s.template); setHeadline(s.headline); setBody(s.body); setSource(s.source ?? ""); setKicker("");
    setCaptionEdited(false);
  };

  // Assets: the issuer's seal, and the fonts the card uses.
  useEffect(() => {
    const img = new Image();
    img.onload = () => setSeal(img);
    img.onerror = () => setSeal(null);
    img.src = sealFor(issuer);
  }, [issuer]);
  useEffect(() => {
    Promise.all(["800 40px \"Atkinson Hyperlegible Next\"", "400 40px \"Atkinson Hyperlegible Next\"", "600 40px \"Atkinson Hyperlegible Next\""]
      .map((f) => document.fonts.load(f))).finally(() => setFontsReady(true));
  }, []);

  // Draw the card on every change.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = FORMATS[format].w; c.height = FORMATS[format].h;
    const ctx = c.getContext("2d");
    if (ctx) drawPostCard(ctx, { format, template, kicker, headline, body, footer, issuerName: issuer, issuerColor: color }, { seal, photo });
  }, [format, template, kicker, headline, body, footer, issuer, color, seal, photo, fontsReady]);

  // Caption follows the fields until the admin edits it by hand.
  const generated = buildCaption({ lang, headline, body, issuerName: issuer, municipality: town, contact, hotline, source, urgent });
  useEffect(() => { if (!captionEdited) setCaption(generated); }, [generated, captionEdited]);
  const alt = buildAltText(headline, issuer, kicker || TEMPLATES[template].label);

  const onPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 15 * 1024 * 1024) {
      toast({ title: "Use a JPEG, PNG or WebP image under 15 MB.", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setPhoto((old) => { if (old?.src.startsWith("blob:")) URL.revokeObjectURL(old.src); return img; });
    };
    img.src = url;
  };

  const blob = () => new Promise<Blob | null>((r) => canvasRef.current?.toBlob(r, "image/png") ?? r(null));
  const download = async () => {
    const b = await blob();
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = postFileName(issuer, format);
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const copyImage = async () => {
    try {
      const b = await blob();
      if (!b || !("ClipboardItem" in window)) throw new Error("unsupported");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": b })]);
      flash("image");
    } catch {
      toast({ title: "This browser cannot copy images. Use Download instead.", variant: "destructive" });
    }
  };
  const copyText = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); flash(what); } catch { toast({ title: "Could not copy", variant: "destructive" }); }
  };
  const flash = (what: string) => { setCopied(what); setTimeout(() => setCopied(null), 1500); };

  const ready = headline.trim().length > 0;

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="pb-3 border-b">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="h-1 w-4 rounded bg-[hsl(var(--gov-green-800))]" />
          <h1 className="text-lg font-bold tracking-tight">Post Maker</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Make an image and caption for the LGU's social media page. Nothing is posted from here: download the image and copy the caption.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr_360px] lg:grid-cols-[1fr_1fr]">
        {/* Left: content */}
        <Card><CardContent className="pt-5 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Start from (optional)</Label>
            <Select onValueChange={startFrom}>
              <SelectTrigger className="text-sm" aria-label="Start from an existing alert or announcement"><SelectValue placeholder="An announcement, broadcast or PAGASA advisory…" /></SelectTrigger>
              <SelectContent>
                {sources.length === 0 && <div className="p-2 text-xs text-muted-foreground">Nothing recent to start from.</div>}
                {sources.map((s) => <SelectItem key={s.id} value={s.id} className="text-sm">{s.label.slice(0, 80)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Template</Label>
              <Select value={template} onValueChange={(v) => setTemplate(v as PostTemplate)}>
                <SelectTrigger className="text-sm" aria-label="Template"><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(TEMPLATES) as PostTemplate[]).map((k) => <SelectItem key={k} value={k}>{TEMPLATES[k].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Select value={issuer} onValueChange={setIssuer} disabled={issuers.length === 1}>
                <SelectTrigger className="text-sm" aria-label="Issuing LGU"><SelectValue /></SelectTrigger>
                <SelectContent>{issuers.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pm-kicker" className="text-xs">Label (optional)</Label>
            <Input id="pm-kicker" maxLength={28} value={kicker} onChange={(e) => setKicker(e.target.value)} placeholder={`${TEMPLATES[template].kicker}…`} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pm-head" className="text-xs">Headline *</Label>
            <Textarea id="pm-head" rows={2} maxLength={140} value={headline} onChange={(e) => setHeadline(e.target.value)} className="resize-none" />
            <p className="text-xs text-muted-foreground tabular-nums text-right">{headline.length}/140</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pm-body" className="text-xs">Details</Label>
            <Textarea id="pm-body" rows={4} maxLength={600} value={body} onChange={(e) => setBody(e.target.value)} className="resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="pm-hotline" className="text-xs">Hotline (optional)</Label>
              <Input id="pm-hotline" maxLength={40} value={hotline} onChange={(e) => setHotline(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pm-source" className="text-xs">Source (optional)</Label>
              <Input id="pm-source" maxLength={40} value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. DOST-PAGASA…" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Photo (optional)</Label>
            <div className="flex gap-2">
              <label className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm cursor-pointer hover:bg-accent focus-within:ring-2 focus-within:ring-ring">
                <ImagePlus aria-hidden="true" className="h-4 w-4" /> {photo ? "Change photo" : "Add photo"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
              </label>
              {photo && <Button variant="ghost" size="sm" className="h-9" onClick={() => setPhoto(null)}><Trash2 aria-hidden="true" className="h-4 w-4 mr-1" />Remove</Button>}
            </div>
            <p className="text-xs text-muted-foreground">Use photos the LGU owns or has permission to use. The photo stays on this computer.</p>
          </div>
        </CardContent></Card>

        {/* Middle: preview */}
        <Card><CardContent className="pt-5 space-y-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Image size">
            {(Object.keys(FORMATS) as PostFormat[]).map((f) => (
              <button key={f} role="tab" aria-selected={format === f} onClick={() => setFormat(f)}
                className={cn("h-9 rounded-md border px-3 text-sm", format === f ? "bg-[hsl(var(--gov-green-800))] text-white border-transparent" : "hover:bg-accent")}>
                {FORMATS[f].label} <span className="text-xs opacity-80">{FORMATS[f].ratio}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-center bg-muted/40 rounded-lg p-3">
            <canvas ref={canvasRef} role="img" aria-label={alt}
              className="max-w-full h-auto rounded shadow" style={{ maxHeight: "62vh", width: "auto" }} />
          </div>
          <p className="text-xs text-muted-foreground text-center tabular-nums">{FORMATS[format].w} × {FORMATS[format].h} px</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={download} disabled={!ready}><Download aria-hidden="true" className="h-4 w-4 mr-1.5" />Download PNG</Button>
            <Button variant="outline" onClick={copyImage} disabled={!ready}>
              {copied === "image" ? <Check aria-hidden="true" className="h-4 w-4 mr-1.5" /> : <Copy aria-hidden="true" className="h-4 w-4 mr-1.5" />}Copy image
            </Button>
          </div>
        </CardContent></Card>

        {/* Right: caption */}
        <Card className="lg:col-span-2 xl:col-span-1"><CardContent className="pt-5 space-y-3">
          <div className="flex items-end gap-2">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Caption language</Label>
              <Select value={lang} onValueChange={(v) => { setLang(v as CaptionLang); setCaptionEdited(false); }}>
                <SelectTrigger className="text-sm" aria-label="Caption language"><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(CAPTION_LANGS) as CaptionLang[]).map((l) => <SelectItem key={l} value={l}>{CAPTION_LANGS[l]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {captionEdited && (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => setCaptionEdited(false)}>
                <RefreshCw aria-hidden="true" className="h-4 w-4 mr-1" />Reset
              </Button>
            )}
          </div>
          {lang !== "en" && (
            <p className="text-xs text-muted-foreground">Only the fixed phrases are translated; the headline and details stay as you typed them.</p>
          )}
          <div className="space-y-1">
            <Label htmlFor="pm-contact" className="text-xs">Contact office (optional)</Label>
            <Input id="pm-contact" maxLength={80} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. the MDRRMO at the Municipal Hall…" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pm-caption" className="text-xs">Caption</Label>
            <Textarea id="pm-caption" rows={11} value={caption} onChange={(e) => { setCaption(e.target.value); setCaptionEdited(true); }} className="text-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-9" disabled={!ready} onClick={() => copyText(caption, "caption")}>
              {copied === "caption" ? <Check aria-hidden="true" className="h-4 w-4 mr-1" /> : <Copy aria-hidden="true" className="h-4 w-4 mr-1" />}Copy caption
            </Button>
            <Button variant="ghost" size="sm" className="h-9" disabled={!ready} onClick={() => copyText(alt, "alt")}>
              {copied === "alt" ? <Check aria-hidden="true" className="h-4 w-4 mr-1" /> : <Copy aria-hidden="true" className="h-4 w-4 mr-1" />}Copy alt text
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Alt text: {alt}</p>
          <PostAssistButton
            input={{ template, issuer, headline, body, lang }}
            onDraft={(d) => { setHeadline(d.headline); setCaption(d.caption); setCaptionEdited(true); }}
          />
        </CardContent></Card>
      </div>
    </div>
  );
}
