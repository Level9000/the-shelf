# Authored By — marketing site

The public site at [authoredby.app](https://www.authoredby.app). It is a
marketing site and nothing else: there is no sign-in, no dashboard, and no API.

The product itself is the iPhone app, which lives in `authored-by-mobile`. That
app talks to Supabase directly and reaches Anthropic through a Supabase Edge
Function defined in its own repo, so nothing here is on its critical path.

## Routes

| Route | What it is |
| --- | --- |
| `/` | The marketing page. |
| `/story/[slug]` | Public renderer for a chapter shared from the app. Reads the `boards` row matching `share_slug` with the anon key. The only route that touches the database, and the only dynamic one. |
| `/support` | Support, account deletion, and subscription help. This is the URL in App Store Connect's **Support URL** field. |
| `/privacy` | Privacy policy. Hardcoded in the mobile app as `https://www.authoredby.app/privacy` — the path cannot change. |
| `/terms` | Terms of service. Hardcoded in the mobile app as `https://www.authoredby.app/terms` — the path cannot change. |

`/privacy` and `/terms` are load-bearing for App Store review and are linked
from inside the app. Renaming either one breaks the shipped build.

## Running it

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the anon key. Both variables are
public; the site needs no secrets.

## Where the copy lives

- `src/components/marketing/marketing-home.tsx` — the page itself, section by
  section, with the price and support address imported from `src/lib/site.ts`.
- `src/components/marketing/sample-story.tsx` — the sample chapter. **Ships with
  placeholder copy.** See the header comment in that file for what replacing it
  involves.
- `src/components/marketing/tour-carousel.tsx` — the how-it-works carousel.

## History

This repo began as The Shelf, a full web app with a kanban board, AI chapter
generation, Stripe billing and Supabase auth. All of it was removed when the
product moved to iPhone. `git log` before the teardown commit has the lot if
anything ever needs to come back.
