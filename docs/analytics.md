# Analytics — who visited, and where they came from

Vercel Web Analytics, mounted in `src/components/marketing/marketing-home.tsx`
and therefore running **only on the public marketing page**. Nothing behind
`/login` is measured. It is cookieless and stores no persistent identifier, so
there is no consent banner and no per-person tracking — the numbers are counts
of visits, not a list of people.

**One switch to flip first:** installing the package is not enough. Turn the
product on at *Vercel → the-shelf → Analytics → Enable*, or nothing is
collected. Data only flows on a deployed build; `npm run dev` sends nothing.

---

## What the referrer can and cannot tell you

Vercel records the referring domain by itself, with no tagging. That covers
some of your channels and silently fails on others:

| Where they came from | Referrer shows | Enough on its own? |
|---|---|---|
| Google / Bing search | `google.com`, `bing.com` | ✅ Yes |
| A LinkedIn post | `linkedin.com` or `lnkd.in` | ⚠️ Tells you LinkedIn, not *which post* |
| smallmachines.ai | `smallmachines.ai` | ✅ Yes |
| **The newsletter** | **nothing** | ❌ **No — see below** |
| Typed the URL, or a QR code | nothing | n/a |

The newsletter is the problem case, and it is worth understanding why rather
than trusting a dashboard that looks fine. Mail clients strip the `Referer`
header, and many open links in an in-app browser that sends nothing either.
So newsletter clicks arrive looking **identical to someone typing the URL
directly**. Both land in the "Direct" bucket. No amount of configuration
fixes this — the information never reaches the server.

The only way to separate them is to tag the links yourself, in the places you
control: your LinkedIn posts, your newsletter, and smallmachines.ai.

---

## The tagging scheme

Three parameters. Vercel picks them up automatically and lets you filter on
them.

- `utm_source` — **where** it came from (`linkedin`, `newsletter`, `smallmachines`)
- `utm_medium` — **what kind** of channel (`social`, `email`, `referral`)
- `utm_campaign` — **which specific one**, so two LinkedIn posts don't merge

Use lowercase and hyphens throughout. `LinkedIn` and `linkedin` register as two
different sources, which quietly splits one channel into two half-sized ones.

### Ready to paste

**A LinkedIn post** — change the campaign per post so you can tell them apart:

```
https://www.authoredby.app/?utm_source=linkedin&utm_medium=social&utm_campaign=launch-post-1
```

**The newsletter** — change the campaign per issue. This one is not optional;
without it the click is invisible:

```
https://www.authoredby.app/?utm_source=newsletter&utm_medium=email&utm_campaign=2026-08-issue
```

**A link from smallmachines.ai** — the referrer already covers this, so the tag
is only worth adding if you want to know *which* page sent them:

```
https://www.authoredby.app/?utm_source=smallmachines&utm_medium=referral&utm_campaign=homepage
```

**Search** — nothing to do. Never tag a link you don't control, and never tag
your own site's internal links.

---

## Reading it back

In the Vercel dashboard, *Analytics → Referrers* answers "did they search, or
come from LinkedIn." Filtering by `utm_source` answers "was this the newsletter
or someone typing the URL," and `utm_campaign` answers "which post, which
issue."

Two things that will otherwise look like bugs:

- **Direct will always be larger than feels right.** It absorbs every untagged
  email click, every QR scan, and every share into a private message. Treat it
  as a floor on your untracked reach, not as a real channel.
- **Your own visits count.** Vercel does not exclude you. Check the site from a
  private window if a small number matters.

---

## If you outgrow it

This setup answers acquisition questions — visits and source. It deliberately
does not follow anyone into the product. If you later want to ask "did
newsletter readers actually start a project," that is a different tool
(PostHog, or events on your own tables), and it is a decision with real privacy
consequences for signed-in users. It would also mean revisiting the privacy
policy, which currently discloses no analytics vendor beyond Vercel itself.
