# One Vizcaya design contract

One visual language for the resident app, the admin console and the PDRRMO
Command Hub. Keep it simple: one brand colour, one accent, neutral surfaces,
and colour used for **meaning**, never decoration.

## Colour (and why)

| Role | Token | Light | Use |
|---|---|---|---|
| Brand | `--primary` | `hsl(152 73% 17%)` deep provincial green | Primary buttons, links, selected state, sidebar |
| Accent | `--gold` | `hsl(43 85% 48%)` | Sparingly: active-nav marker, the one thing on a screen that must catch the eye |
| Surface | `--background` / `--card` | near-white / white | Content sits on white cards with a 1px border, no shadows |
| Text | `--foreground` / `--muted-foreground` | slate 14% / 38% lightness | Body / secondary (both ≥ 4.5:1 on white) |
| Danger | `--destructive` | `hsl(0 72% 42%)` | Errors and destructive actions only |

- **Green + gold**: gold sits opposite the cool green on the colour wheel's
  warm side, so a little of it stands out without a second loud colour. It
  comes from the provincial seal, not a template.
- **Red means danger.** It is never the brand colour, so an "on scene" unit or
  a critical alert is unmistakable.
- **Incidents are magenta**, the complement of the brand green: they pop on
  the map and never collide with a unit status colour.

### Unit status: a warmth scale that follows urgency

| Status | Colour | Text on it | Glyph |
|---|---|---|---|
| Available | green-700 `#15803D` | white | check |
| Dispatched | yellow-400 `#FACC15` | dark `#422006` | bell |
| En route | orange-700 `#C2410C` | white | arrow |
| On scene | red-700 `#B91C1C` | white | pin |
| Returning | sky-700 `#0369A1` | white | return arrow |
| Off duty | slate-500 `#64748B` | white | — |

Every status also shows its **name or glyph**: colour is never the only cue
(colour-blind users, glare on a phone outdoors). Yellow / orange / red differ
in lightness as well as hue.

### Incident status

| Status | Colour |
|---|---|
| Received (needs triage) | fuchsia-600 `#C026D3` |
| Validated / referred | fuchsia-700 `#A21CAF` |
| In progress | fuchsia-900 `#701A75` |
| Resolved / closed / invalid / duplicate | slate-500 `#64748B` |

## Type

- **Atkinson Hyperlegible Next** (made for low-vision readability), 16px base,
  in the console, the Hub and the app (redesign branch).
- **Atkinson Hyperlegible Mono** for incident IDs and call signs.
- Page title 20px semibold; section title 14px semibold; body 14–16px;
  secondary 13px. Nothing below 12px.

## Shape, space, motion

- Radius 6px everywhere (`--radius`); pills fully rounded only for statuses.
- Spacing on the 4px scale. Dense lists in operator screens; large touch
  targets (≥ 48px, primary actions 64px) on the responder phone screen.
- Borders, not shadows. Map markers alone get a small shadow for legibility.
- Colour/opacity transitions 150ms; nothing moves under "reduce motion".

## Patterns to reject

Purple/indigo brand colours, gradients, glass effects, oversized rounded cards,
emoji as icons, colour-only status, decorative animation, uppercase everywhere,
placeholder-only labels.
