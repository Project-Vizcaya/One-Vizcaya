import { Fragment, useEffect, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/landing/SiteChrome";
// Single source of truth: the repo-root PRIVACY.md.
import notice from "../../../../PRIVACY.md?raw";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Data Privacy Notice · One Vizcaya";
    return () => { document.title = prev; };
  }, []);
  return (
    <div className="site min-h-screen bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:font-bold">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <Link to="/" className="inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-bold text-[var(--site-green)] underline-offset-4 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to One Vizcaya
        </Link>
        <article className="mt-4 max-w-[68ch] space-y-4 text-[17px] leading-7 text-[var(--site-muted)]">{renderMarkdown(notice)}</article>
      </main>
      <SiteFooter />
    </div>
  );
}

// Minimal renderer for the subset of Markdown PRIVACY.md uses:
// headings, rules, tables, lists, paragraphs, **bold** and *italic*.
function renderMarkdown(md: string): ReactNode[] {
  const lines = md.split(/\r?\n/);
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = i;
    if (!line.trim()) { i++; continue; }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const text = inline(h[2]);
      out.push(
        h[1].length === 1 ? <h1 key={key} className="text-balance text-3xl font-extrabold text-[var(--site-ink)] md:text-4xl">{text}</h1>
        : h[1].length === 2 ? <h2 key={key} className="pt-6 text-xl font-extrabold text-[var(--site-ink)]">{text}</h2>
        : <h3 key={key} className="font-bold text-[var(--site-ink)]">{text}</h3>,
      );
      i++;
    } else if (/^---+\s*$/.test(line)) {
      out.push(<hr key={key} className="border-[var(--site-line)]" />);
      i++;
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!/^\|[\s:|-]+\|\s*$/.test(lines[i])) rows.push(lines[i].split("|").slice(1, -1).map((c) => c.trim()));
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <div key={key} className="overflow-x-auto">
          <table className="w-full border border-[var(--site-line)] text-left text-[15px]">
            <thead className="bg-[var(--site-paper)] text-[var(--site-ink)]"><tr>{head.map((c, j) => <th key={j} scope="col" className="border border-[var(--site-line)] px-3 py-2">{inline(c)}</th>)}</tr></thead>
            <tbody>{body.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j} className="border border-[var(--site-line)] px-3 py-2 align-top">{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
    } else if (/^(\s*[-*]|\d+\.)\s/.test(line)) {
      const ordered = /^\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^(\s*[-*]|\d+\.)\s/.test(lines[i])) {
        items.push(lines[i].replace(/^(\s*[-*]|\d+\.)\s+/, ""));
        i++;
      }
      const cls = `space-y-1 pl-6 ${ordered ? "list-decimal" : "list-disc"}`;
      const lis = items.map((it, j) => <li key={j}>{inline(it)}</li>);
      out.push(ordered ? <ol key={key} className={cls}>{lis}</ol> : <ul key={key} className={cls}>{lis}</ul>);
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(#|\||---|\s*[-*]\s|\d+\.\s)/.test(lines[i])) {
        para.push(lines[i]);
        i++;
      }
      // Keep the notice's own line breaks (address blocks, date lines).
      out.push(<p key={key}>{para.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>);
    }
  }
  return out;
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, j) =>
    part.startsWith("**") ? <strong key={j} className="text-[var(--site-ink)]">{part.slice(2, -2)}</strong>
    : part.startsWith("*") && part.length > 2 ? <em key={j}>{part.slice(1, -1)}</em>
    : part,
  );
}
