# Post Maker

**Communications → Post Maker** in the admin console. Makes a branded image
and a caption for an LGU's social media page. Nothing is posted from here: the
admin downloads the image and copies the caption into the LGU's own page.

## What it does
- **Sizes:** feed post 4:5 (1080×1350), square 1:1 (1080×1080),
  story 9:16 (1080×1920), landscape 16:9 (1920×1080).
- **Templates:** Announcement, Weather advisory, Emergency (red band), Event.
- **Branding:** the issuing LGU's seal and colour. Municipal admins can only
  issue for their own town; provincial admins choose the Province or any town.
- **Start from** an existing announcement, a recent broadcast, or a current
  PAGASA advisory for Nueva Vizcaya (which fills in "Source: DOST-PAGASA").
- **Optional photo:** stays on the admin's computer. Use only photos the LGU
  owns or has permission to use.
- **Caption** in English, Tagalog or Ilocano, built from fixed phrases (no AI):
  headline, details, contact, hotline, source, the LGU's name and hashtags.
  It can be edited freely. Only the fixed phrases are translated; they are
  in `docs/2-fill-in/translation-review.md` section C for a native speaker to check.
- **Alt text** for screen-reader users, ready to copy.
- Text never overflows the image: long headlines shrink, and long details are
  shortened with "…" rather than printed too small to read.

## Optional AI helper
A **"Draft headline and caption with AI"** button appears only when the AI
helper is set up. It sends the headline and details (not photos) to
Anthropic's Claude service (model `claude-opus-5-5`, low effort) and puts a
draft headline and caption in the editor, in the chosen language. The admin
checks and edits it before posting.

Safeguards:
- **Facts:** the instructions forbid adding facts that are not in the draft.
  Admins must still check every detail.
- **Who and how often:** admins only (municipal and above), 30 drafts per
  admin per day.
- **Audit log:** each draft is recorded (`ai_post_draft`) with who, when, which
  LGU, the template and the language. The text itself is not stored.
- **Refusals:** a refused request shows a clear message.

### Setting it up (technical administrator)
It is **off** until an API key exists. Deploying never needs the key.

1. Create an API key in the Anthropic Console (console.anthropic.com) and set a
   monthly spend limit there.
2. Store it in Google Secret Manager for the project:
   ```
   printf '%s' 'sk-ant-...' | gcloud secrets create ANTHROPIC_API_KEY --data-file=- --project one-vizcaya-app
   ```
3. Let the functions read it (the default compute service account runs
   Cloud Functions v2):
   ```
   gcloud secrets add-iam-policy-binding ANTHROPIC_API_KEY --project one-vizcaya-app \
     --member="serviceAccount:$(gcloud projects describe one-vizcaya-app --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```
4. Within 10 minutes the button appears for admins.

To switch it off without removing the key, set `postAssistEnabled: false` in
the Firestore document `config/ai`.

**Data note:** the announcement text goes to Anthropic. Announcements are
public by nature, but admins must not paste personal information (names of
private individuals, phone numbers of residents) into the details when using
the AI button. Mention this in the Data Privacy Officer's records.
