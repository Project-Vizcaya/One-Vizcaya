# Experimental UI/UX — test checklist

The Nov 4 redesign, now tested on `claude/test-build-combined`. Build, install and the
preview console: [Test Build Guide](Test-Build-Guide.md) §3.4 and §4 (this list is its §5.1
in detail; the Nov 25 home redesign is §5.2 there).

Test on the **smallest phone you have**, then again with the phone's text size
set to **large** (Settings → Display → Font size). Tick each item or note what
looked wrong.

## Mobile

### Everywhere
- [ ] New typeface (Atkinson Hyperlegible Next) shows in light and dark mode,
      including screen titles and dialogs.
- [ ] ₱, ✓ and ⚠ still display (they use the phone's own font; this is expected).
- [ ] No text is too small to read; grey secondary text is readable in both modes.
- [ ] Nothing is cut off or shows yellow/black overflow stripes.

### Home screen
- [ ] Bottom bar is a little taller and each tab has a label (Report/Mag-ulat/Ireport
      in Tagalog/Ilocano). Each tab is easy to hit with a thumb.
- [ ] Profile tab shows a person icon.
- [ ] "Reports saved" banner (turn on airplane mode, file a report) shows the outbox icon.

### Report a Problem
- [ ] Remove-photo (×) and **Change** buttons are easy to tap.
- [ ] Camera / Gallery picker works.
- [ ] "Not a replacement for 911" notice is visible above Submit.

### My Reports card
- [ ] On a narrow phone the progress shows "Step X of 5 · label"; on a wide phone
      or tablet all five step labels show.
- [ ] Share button is in the header; status chip sits on its own line.
- [ ] A report closed without action shows the notice, not the green stepper.
- [ ] With **Remove animations** on (Accessibility settings), the "under review"
      card does not pulse.

### SOS screen (could not be automatically tested; please check carefully)
- [ ] On a small phone with large text, the whole screen scrolls and the
      **I'm safe** button is reachable.
- [ ] The spinner stops and an icon appears once a location fix is found.
- [ ] The "this is not a phone call — also call PDRRMO / 911" notice is visible
      and readable in all three languages.
- [ ] TalkBack/VoiceOver announces status changes.

## Web console
- [ ] New typeface loads; smallest text is readable (12 px floor).
- [ ] Tab through the page with the keyboard: every button/link shows a green focus ring.
- [ ] Responder directory icons display (no emoji).
- [ ] Analytics → SLA targets: entering 0 or a blank turns the box red and shows the
      message; Confirm shows a spinner while saving.
- [ ] Broadcasts → automated alerts: Reject note box works; Cancel is disabled
      while a decision is sending.
- [ ] With the OS "reduce motion" setting on, animations stop (spinners still turn, slower).

## Still pending (not part of this branch's test)
- Native-speaker review of Tagalog/Ilocano safety copy (`docs/2-fill-in/translation-review.md`).
