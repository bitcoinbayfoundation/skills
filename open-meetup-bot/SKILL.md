---
name: open-meetup-bot
description: Publish content to the Bitcoin Bay Foundation website (bitcoinbay.foundation). Use this skill whenever you've finished research, found a useful resource, written an article, or have content that should be shared on the Bitcoin Bay website. Triggers on phrases like "post this to the site", "add this resource", "create a blog post", "publish to Bitcoin Bay", "add to the website", or any time you've completed research about Bitcoin education, events, or news that would be valuable to the Bitcoin Bay community. Also use proactively after completing research tasks where the output would make a good website post or education resource.
---

# Bitcoin Bay Website — Content Publishing

You have access to the Bitcoin Bay Foundation website API via a CLI tool. Use it to create blog posts, education resources, events, upload media, and add newsletter subscribers.

## Important: Everything is draft by default

All content you create is saved as **draft** and requires human approval before it goes live. Never pass `--status published` — the default `draft` status ensures an admin reviews everything before it's visible on the site. This is intentional so you can freely create content without worrying about publishing something that isn't ready.

## CLI tool

The CLI is published on npm as `@bitcoinbay/open-meetup-bot` and runs directly via `npx -y` (the `-y` flag skips the install confirmation prompt).

### Prerequisites

1. The `OPEN_MEETUP_AGENT_KEY` environment variable must be set. If it's missing, the CLI will tell you. `OPEN_MEETUP_URL` defaults to `https://bitcoinbay.foundation` — override it for local development.
2. `sharp` is bundled for image optimization. Images are automatically resized (max 2400px), converted to WebP, and stripped of EXIF metadata before upload.

## Commands

### Create a blog post

Use when you've written content, summarized research, or have news to share.

```bash
npx -y @bitcoinbay/open-meetup-bot create:post \
  --title "Your Post Title" \
  --body "Full markdown body of the post" \
  --excerpt "A short summary for previews" \
  --tags "bitcoin,education,tampa-bay"
```

Optional flags: `--featured_image <url>`, `--featured`, `--published_at <iso-date>`

The body supports full markdown — headers, links, images, code blocks, lists, etc.

### Create an education resource

Use when you've found a documentary, book, article, website, or podcast worth recommending.

```bash
npx -y @bitcoinbay/open-meetup-bot create:resource \
  --title "The Bitcoin Standard" \
  --url "https://saifedean.com/thebitcoinstandard" \
  --category books \
  --author "Saifedean Ammous" \
  --description "A comprehensive look at the history of money and why Bitcoin matters" \
  --tags "economics,money,history"
```

Categories must be one of: `documentaries`, `books`, `articles`, `websites`, `podcasts`

Optional flags: `--image <url>`, `--featured`

### Create an event

Use when scheduling a meetup, workshop, or community gathering.

```bash
npx -y @bitcoinbay/open-meetup-bot create:event \
  --title "Bitcoin Basics Workshop" \
  --start_at "2026-04-15T18:00:00-04:00" \
  --end_at "2026-04-15T20:00:00-04:00" \
  --venue_name "The Lab St. Pete" \
  --venue_address "1101 Fourth St S, Saint Petersburg, FL 33701" \
  --description "Learn the fundamentals of Bitcoin" \
  --hosts "Bitcoin Bay Foundation" \
  --is_free true
```

Optional flags: `--image <url>`, `--price <amount>`, `--meetup_url <url>`

Dates must be ISO 8601 format. Include timezone offset (Tampa Bay is ET: `-04:00` EDT / `-05:00` EST).

### Upload media

Use when you need to attach an image to a post, event, or resource. **If you have a local image file, always use this command** — it optimizes images automatically (resizes to max 2400px, converts to WebP, strips EXIF) before uploading.

```bash
npx -y @bitcoinbay/open-meetup-bot upload:media \
  --file /path/to/image.jpg \
  --folder events \
  --alt "Description of the image"
```

Returns a URL you can use in `--image` or `--featured_image` flags of other commands. Upload first, then reference the URL.

Images are automatically optimized with sharp before upload — a 26MB photo will be compressed to a few hundred KB. Non-image files are uploaded as-is.

### Add a newsletter subscriber

```bash
npx -y @bitcoinbay/open-meetup-bot add:subscriber \
  --email "satoshi@example.com" \
  --name "Satoshi Nakamoto"
```

### List resources

```bash
npx -y @bitcoinbay/open-meetup-bot list:resources [--status draft|published] [--category <c>] [--featured] [--since <iso>] [--until <iso>] [--limit <n>]
```

### List blog posts

```bash
npx -y @bitcoinbay/open-meetup-bot list:posts [--status draft|published] [--featured] [--since <iso>] [--until <iso>] [--limit <n>]
```

### List events

```bash
npx -y @bitcoinbay/open-meetup-bot list:events [--status draft|published] [--upcoming] [--since <iso>] [--until <iso>] [--limit <n>]
```

### Update a resource

```bash
npx -y @bitcoinbay/open-meetup-bot update:resource --id <id> [--title <t>] [--url <u>] [--category <c>] [--description <d>] [--author <a>] [--image <url>] [--featured] [--status draft|published] [--tags <comma-separated>]
```

### Update a blog post

```bash
npx -y @bitcoinbay/open-meetup-bot update:post --id <id> [--title <t>] [--body <b>] [--excerpt <e>] [--featured_image <url>] [--featured] [--status draft|published] [--published_at <iso>] [--tags <comma-separated>]
```

### Update an event

```bash
npx -y @bitcoinbay/open-meetup-bot update:event --id <id> [--title <t>] [--description <d>] [--hosts <h>] [--start_at <iso>] [--end_at <iso>] [--venue_name <v>] [--venue_address <a>] [--image <url>] [--is_free <bool>] [--price <p>] [--status draft|published]
```

## Content guidelines

Bitcoin Bay Foundation is a 501(c)(3) nonprofit focused on Bitcoin education in Tampa Bay, Florida. When creating content:

- Write in a clear, approachable tone — the audience ranges from complete beginners to experienced Bitcoiners
- Focus on education, not financial advice — never include price predictions or investment recommendations
- Use "Bitcoin" (capital B) when referring to the network/protocol, "bitcoin" (lowercase) when referring to the currency unit
- Keep descriptions concise but informative — a sentence or two that tells someone why this resource/event matters
- Tag content appropriately so it's discoverable — use lowercase, hyphenated tags like `lightning-network`, `self-custody`, `tampa-bay`

## Workflow example

After finishing a research task where you found valuable Bitcoin educational content:

```bash
# Upload a cover image if you have one
npx -y @bitcoinbay/open-meetup-bot upload:media --file ./cover.png --folder resources --alt "Book cover"
# → Media uploaded: https://blob.vercel-storage.com/media/resources/1234-cover.png

# Create the resource
npx -y @bitcoinbay/open-meetup-bot create:resource \
  --title "Mastering the Lightning Network" \
  --url "https://github.com/lnbook/lnbook" \
  --category books \
  --author "Andreas Antonopoulos, Olaoluwa Osuntokun, René Pickhardt" \
  --description "A technical deep-dive into the Lightning Network for developers and power users" \
  --image "https://blob.vercel-storage.com/media/resources/1234-cover.png" \
  --tags "lightning-network,development,technical"
```

The content will appear in the admin dashboard as a draft for review.
