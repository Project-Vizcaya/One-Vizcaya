# One Vizcaya — Meeting Q&A Rehearsal Guide

*Prepared for: pitch meeting with the Provincial Government of Nueva Vizcaya*
*How to use this: read each likely question, the short answer to say out loud, and the "why this works / watch out" note. Don't memorize word-for-word — internalize the logic so you can answer naturally.*

---

## How to carry yourself (read this first)

- **Speak in their language, not yours.** They care about constituents, budgets, risk, and accountability — not Flutter, BLoC, or Firestore. Translate every technical answer into one of those four.
- **Confidence, not defensiveness.** A hard question is interest, not attack. The phrase to live by: *"Good question — we designed for that."*
- **Anchor everything to the pilot.** When cornered, retreat to: "That's exactly what the 3-month pilot is designed to prove." A small ask is hard to refuse.
- **Never bluff a number.** If you don't know, say "I'll confirm that and send it within two days." Inventing a figure that's later wrong destroys trust.
- **You and your co-dev should agree in advance who answers what** — technical questions to one, business/cost to the other, so you never talk over each other or contradict.

---

## PART 1 — The Five Core Questions

### Q1. "You're collecting citizens' identities, locations, and photos. How is this legal under the Data Privacy Act?"

**Say:** "We built One Vizcaya around RA 10173 from the start. We collect only what a report needs — location, photo, category, contact identity — nothing more. There's a consent screen on first launch with auditable consent records, a defined data-retention period, and strict access rules so citizens see only their own reports and admins see only their jurisdiction. Before any public launch, we'd work with your legal office to register the system with the National Privacy Commission and help designate a Data Protection Officer. We don't claim to certify compliance ourselves — that's something we complete *with* your office."

**Why it works:** You lead with the law instead of being cornered by it. Naming the NPC and DPO shows you know the actual machinery.
**Watch out:** Don't over-promise that it's "fully compliant" today. "Designed in accordance with, certified jointly" is the safe, honest framing.

---

### Q2. "What happens when you graduate or move on? We can't depend on two students."

**Say:** "That's the right question to ask, and we designed specifically against it. Three things protect you. First, it's a two-person team, not one person — already less fragile. Second, we hold the full source code and documentation in escrow, released to you if we ever cease to operate, so you're never stranded. Third, we built it on Flutter and Firebase — mainstream, well-documented tools — so any competent developer can take over if needed. You're licensing a maintained service, but you're never locked in or held hostage."

**Why it works:** This is THE question that kills small-vendor deals. Answering it unprompted-confidently is your single biggest credibility move.
**Watch out:** Don't get defensive or treat it as doubt about your skill. It's a continuity question, not a competence question.

---

### Q3. "What stops fake reports, spam, or someone reporting a political rival's property out of spite?"

**Say:** "No report is ever auto-dispatched — a human dispatcher reviews every submission before any action, so the app speeds up triage but never replaces your staff's judgment. On top of that, we geofence to reject submissions outside provincial boundaries, verify photo metadata to block recycled or fake images, rate-limit how many reports one account can file, and every report carries a verified identity, so malicious reporting is traceable, not anonymous. Liability stays exactly where it is now — with the officer who decides to act — the app just gives them better information."

**Why it works:** "A human always decides" calms the fear of losing control. Officials fear automation taking authority away from them.
**Watch out:** Don't oversell the anti-fraud tech as foolproof. Frame it as "reduces and traces abuse," not "eliminates" it.

---

### Q4. "We already have offices, hotlines, and the PDRRMO. Does this replace them or compete with them?"

**Say:** "It feeds them — it never replaces them. Think of it as a smart intake layer in front of what you already run. A disaster report comes in already categorized, geotagged, and mapped, then routes to the right office — PDRRMO for disasters, Engineering for roads, the RHU for health. That's faster than a phone call where someone describes where they are. Your hotlines and offices stay exactly as they are; this just gives them a structured, trackable, mapped version of what's already coming in by voice."

**Why it works:** "Feeds, not replaces" removes the turf-war instinct. Existing staff won't feel threatened, so they won't quietly sabotage it.
**Watch out:** Never use the word "replace." Always "feed," "support," "complement," "in front of."

---

### Q5. "Many of our constituents — elderly, upland, no signal — don't have smartphones. Doesn't this leave them out?"

**Say:** "This is the gap I think about most, because a tool that only serves the connected can widen inequality, and I don't want that. So the app is the first channel, not the only one. Our roadmap includes proxy reporting — a barangay official or neighbor files on someone's behalf — plus an SMS and hotline fallback so people without smartphones aren't excluded. And the offline mode matters here too: in weak-signal upland barangays, a resident can draft a report that syncs when they reconnect. The goal is that no one is left out by their device or their signal."

**Why it works:** It shows you think like a public servant, not just a coder. This question secretly tests your *values*, not your tech.
**Watch out:** Don't dismiss it as "Phase 2." Show you genuinely see the people without phones.

---

## PART 2 — The Service-Model Questions

### Q6. "Who owns this? If we pay for it, isn't it ours?"

**Say:** "You own all the data — every report, photo, and record belongs to the Provincial Government, and it's exportable anytime. What our team retains is the software itself and its intellectual property, and we license it to you to use. This is the standard model for government software — you don't buy the vendor's source code, you license a maintained product. It actually protects you: because we own and maintain it, we're responsible for keeping it secure, updated, and improving, instead of handing you code that no one's accountable for."

**Why it works:** Splitting "your data vs. our software" is clean and standard. It reassures them on the thing they care about (data) while keeping what you care about (IP).
**Watch out:** Be ready for pushback. If they insist on owning the code, that's a negotiation — you can discuss escrow, a buyout option, or a longer license, but don't concede ownership on the spot.

---

### Q7. "Why should we pay your team instead of just hiring our own IT person to build this?"

**Say:** "Three reasons. First, cost: one full-time developer's salary and benefits typically exceeds our service fee, and you'd need more than one to cover leave and continuity. Second, time: this already exists and works — hiring and building from scratch is a year or more of risk. Third, knowledge: an in-house hire who leaves takes the system's knowledge with them; our team already knows every line, and the escrow arrangement covers continuity. You're not paying us to write code you could write — you're paying for a working system, maintained by people who built it, at less than the cost of carrying that capacity in-house."

**Why it works:** Reframes you from "expense" to "the cheaper option." Government salaries + benefits + turnover are a real, well-understood pain.
**Watch out:** Don't disparage their IT staff. Frame it as "augmenting" them, not replacing them — their IT people become your point of contact.

---

### Q8. "What exactly does our fee buy us? Be specific."

**Say:** "Two separate things, and we keep them separate on the invoice. One, the cloud infrastructure — the Firebase usage — billed to you transparently at actual cost, no markup. At pilot scale that's effectively zero; even province-wide it's under five thousand pesos a month. Two, the professional service: hosting management, security updates, bug fixes, new features as your needs evolve, staff training, and a support line when your dispatchers need help. The infrastructure is cheap — what you're really investing in is a team that keeps this secure, current, and improving, so it never becomes dead software."

**Why it works:** Separating pass-through cost from service fee makes you look honest and makes the service fee legible rather than mysterious.
**Watch out:** Have a real number or range ready for the service fee at pilot and at province scale. "We'll get back to you" is weak here — agree on it with your co-dev beforehand.

---

### Q9. "Government can't just hire someone informally. How would we even procure this?"

**Say:** "Understood, and we expect to follow your procurement process fully. We're prepared to register as a service provider and go through whatever channel your office requires — whether that's a negotiated contract for the pilot or a formal procurement for the operational phase. We'd lean on your procurement and legal offices to tell us the correct path. The pilot can start small and low-risk while that process runs in parallel."

**Why it works:** Showing you respect and expect the bureaucracy signals maturity. Trying to shortcut it signals the opposite.
**Watch out:** Don't pretend to be an expert in government procurement — you're not, and they know it. Defer to their process; that humility reads as competence.

---

## PART 3 — Curveballs to be ready for

**"Has this been tested with real users?"**
→ "Not yet in the field — that's precisely what the pilot is for. It's feature-complete and works in development; the pilot proves it in real conditions before you commit to anything wider."

**"What if it fails or goes down during a real disaster?"**
→ "It's built on Google's infrastructure, the same backbone large apps rely on, with offline queuing so reports aren't lost during outages. And because it feeds your existing systems rather than replacing them, your current hotlines and offices remain the backstop — we add capability without removing your fallback."

**"Can you add [some feature] we need?"**
→ "Yes — that flexibility is exactly the point of a maintained service over off-the-shelf software. Tell me the need and I'll scope it. New features over time are part of the engagement." *(Then actually note it down — it signals you listen.)*

**"How much, total, for the whole province?"**
→ Give your pre-agreed range, split into infrastructure (under ₱5,000/mo) and service fee. Then immediately re-anchor: "But I'd recommend starting with the pilot — prove it in one town first, then we size the provincial engagement on real data."

**"Who else is using this? Any other LGU?"**
→ If no: "Nueva Vizcaya would be the first — which means it's built specifically for this province, by people from here, and you'd be the flagship. The pilot is how we prove it before scaling." *(Turn lack of track record into 'purpose-built and first-mover.')*

**"This sounds too good / too cheap. What's the catch?"**
→ "No catch — the infrastructure genuinely is cheap because the technology is efficient. Our fee reflects the ongoing work of maintaining and improving it. We'd rather be honest about low costs and earn a long-term relationship than inflate a one-time price."

---

## The three things to leave them with

If they remember nothing else, make sure these land:
1. **"It feeds your existing systems — it doesn't replace anything."** (Removes threat.)
2. **"Start with a 3-month pilot in one town, at essentially no cost."** (Makes yes easy.)
3. **"You own your data; we keep it maintained so it never becomes dead software."** (Resolves ownership + continuity.)

---

## Final note to self

You built a genuinely impressive system as a student. The meeting isn't a test of whether the code is good — it's a test of whether they can *trust you to deliver and stick around*. Every answer above is really answering one question underneath: **"Can we rely on these people?"** Calm, prepared, honest, and respectful of their process — that's what earns the yes.
