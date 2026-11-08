import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
// Single source of truth: the repo-root PRIVACY.md.
import notice from "../../../../PRIVACY.md?raw";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#166534] hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to One Vizcaya
        </Link>
        <main className="mt-6 space-y-4 leading-relaxed text-slate-700">{renderMarkdown(notice)}</main>
      </div>
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
        h[1].length === 1 ? <h1 key={key} className="text-3xl font-extrabold text-slate-900">{text}</h1>
        : h[1].length === 2 ? <h2 key={key} className="pt-4 text-xl font-bold text-slate-900">{text}</h2>
        : <h3 key={key} className="font-bold text-slate-900">{text}</h3>,
      );
      i++;
    } else if (/^---+\s*$/.test(line)) {
      out.push(<hr key={key} />);
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
          <table className="w-full border text-left text-sm">
            <thead className="bg-slate-50"><tr>{head.map((c, j) => <th key={j} className="border px-3 py-2">{inline(c)}</th>)}</tr></thead>
            <tbody>{body.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j} className="border px-3 py-2 align-top">{inline(c)}</td>)}</tr>)}</tbody>
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
      out.push(<p key={key}>{inline(para.join(" "))}</p>);
    }
  }
  return out;
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, j) =>
    part.startsWith("**") ? <strong key={j} className="text-slate-900">{part.slice(2, -2)}</strong>
    : part.startsWith("*") && part.length > 2 ? <em key={j}>{part.slice(1, -1)}</em>
    : part,
  );
}
