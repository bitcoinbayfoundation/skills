#!/usr/bin/env node

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { basename } from "node:path";

const API_KEY = process.env.BITCOIN_BAY_AGENT_KEY;
const BASE_URL = process.env.BITCOIN_BAY_URL || "https://www.bitcoinbay.foundation";

if (!API_KEY) {
  console.error("Error: BITCOIN_BAY_AGENT_KEY env variable is not set");
  process.exit(1);
}

const AGENT_BASE = `${BASE_URL}/api/agent`;

// ── helpers ──────────────────────────────────────────────────────────────────

async function post(endpoint, body) {
  const res = await fetch(`${AGENT_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`Error ${res.status}:`, data.error || data);
    process.exit(1);
  }
  return data;
}

async function get(endpoint, params = {}) {
  const url = new URL(`${AGENT_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`Error ${res.status}:`, data.error || data);
    process.exit(1);
  }
  return data;
}

async function patch(endpoint, body) {
  const res = await fetch(`${AGENT_BASE}/${endpoint}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`Error ${res.status}:`, data.error || data);
    process.exit(1);
  }
  return data;
}

async function uploadFile(endpoint, filePath, fields = {}) {
  const buffer = readFileSync(filePath);
  const file = new File([buffer], basename(filePath));
  const form = new FormData();
  form.append("file", file);
  for (const [k, v] of Object.entries(fields)) {
    form.append(k, v);
  }

  const res = await fetch(`${AGENT_BASE}/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`Error ${res.status}:`, data.error || data);
    process.exit(1);
  }
  return data;
}

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    }
  }
  return flags;
}

function requireFlags(flags, ...keys) {
  for (const key of keys) {
    if (!flags[key]) {
      console.error(`Error: --${key} is required`);
      process.exit(1);
    }
  }
}

// ── commands ─────────────────────────────────────────────────────────────────

const commands = {
  "create:event": {
    usage: "--title <t> --start_at <iso> [--description <d>] [--hosts <h>] [--end_at <iso>] [--venue_name <v>] [--venue_address <a>] [--image <url>] [--is_free <bool>] [--price <p>] [--status draft|published]",
    desc: "Create an event",
    async run(flags) {
      requireFlags(flags, "title", "start_at");
      const result = await post("events", {
        title: flags.title,
        start_at: flags.start_at,
        description: flags.description,
        hosts: flags.hosts,
        end_at: flags.end_at,
        venue_name: flags.venue_name,
        venue_address: flags.venue_address,
        image: flags.image,
        is_free: flags.is_free !== "false",
        price: flags.price,
        status: flags.status || "draft",
      });
      console.log("Event created:", result.id);
      console.log("Slug:", result.slug);
    },
  },

  "create:resource": {
    usage: "--title <t> --url <u> --category <c> [--description <d>] [--author <a>] [--image <url>] [--featured] [--status draft|published] [--tags <comma-separated>]",
    desc: "Create an education resource",
    async run(flags) {
      requireFlags(flags, "title", "url", "category");
      const result = await post("resources", {
        title: flags.title,
        url: flags.url,
        category: flags.category,
        description: flags.description,
        author: flags.author,
        image: flags.image,
        featured: flags.featured === "true",
        status: flags.status || "draft",
        tags: flags.tags ? flags.tags.split(",").map((t) => t.trim()) : [],
      });
      console.log("Resource created:", result.id);
      console.log("Slug:", result.slug);
    },
  },

  "create:post": {
    usage: "--title <t> [--body <b>] [--excerpt <e>] [--featured_image <url>] [--featured] [--status draft|published] [--published_at <iso>] [--tags <comma-separated>]",
    desc: "Create a blog post",
    async run(flags) {
      requireFlags(flags, "title");
      const result = await post("posts", {
        title: flags.title,
        body: flags.body,
        excerpt: flags.excerpt,
        featured_image: flags.featured_image,
        featured: flags.featured === "true",
        status: flags.status || "draft",
        published_at: flags.published_at,
        tags: flags.tags ? flags.tags.split(",").map((t) => t.trim()) : [],
      });
      console.log("Post created:", result.id);
      console.log("Slug:", result.slug);
    },
  },

  "upload:media": {
    usage: "--file <path> [--folder <f>] [--alt <text>]",
    desc: "Upload a media file (auto-optimizes images with sharp)",
    async run(flags) {
      requireFlags(flags, "file");
      const filePath = flags.file;
      const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
      const imageExts = new Set(["jpg", "jpeg", "png", "webp", "tiff", "avif"]);

      let uploadPath = filePath;
      let tmpPath = null;

      if (imageExts.has(ext)) {
        const sharp = (await import("sharp")).default;
        const inputBuffer = readFileSync(filePath);
        const metadata = await sharp(inputBuffer).metadata();

        const MAX_DIM = 2400;
        let pipeline = sharp(inputBuffer).rotate();
        const w = metadata.width ?? 0;
        const h = metadata.height ?? 0;
        if (w > MAX_DIM || h > MAX_DIM) {
          pipeline = pipeline.resize(MAX_DIM, MAX_DIM, {
            fit: "inside",
            withoutEnlargement: true,
          });
        }

        const optimized = await pipeline.webp({ quality: 80 }).toBuffer();
        const baseName = basename(filePath).replace(/\.[^.]+$/, "");
        tmpPath = `/tmp/${baseName}-${Date.now()}.webp`;
        writeFileSync(tmpPath, optimized);
        uploadPath = tmpPath;

        const originalKB = Math.round(inputBuffer.byteLength / 1024);
        const optimizedKB = Math.round(optimized.byteLength / 1024);
        console.log(`Optimized: ${originalKB}KB → ${optimizedKB}KB (webp)`);
      }

      const fields = {};
      if (flags.folder) fields.folder = flags.folder;
      if (flags.alt) fields.alt = flags.alt;
      const result = await uploadFile("media", uploadPath, fields);
      console.log("Media uploaded:", result.url);
      console.log("ID:", result.id);

      if (tmpPath) {
        try {
          unlinkSync(tmpPath);
        } catch { /* ignore */ }
      }
    },
  },

  "add:subscriber": {
    usage: "--email <e> [--name <n>]",
    desc: "Add a newsletter subscriber",
    async run(flags) {
      requireFlags(flags, "email");
      await post("subscribers", {
        email: flags.email,
        name: flags.name,
      });
      console.log("Subscriber added:", flags.email);
    },
  },

  "list:resources": {
    usage: "[--status draft|published] [--category <c>] [--featured] [--since <iso>] [--until <iso>] [--limit <n>]",
    desc: "List education resources",
    async run(flags) {
      const items = await get("resources", {
        status: flags.status,
        category: flags.category,
        featured: flags.featured,
        since: flags.since,
        until: flags.until,
        limit: flags.limit,
      });
      if (items.length === 0) {
        console.log("No resources found.");
        return;
      }
      for (const r of items) {
        const tags = r.tags?.map((t) => t.name).join(", ") || "";
        console.log(`${r.id}  [${r.status}]  ${r.category.padEnd(14)}  ${r.title}${tags ? `  (${tags})` : ""}`);
      }
      console.log(`\n${items.length} resource(s)`);
    },
  },

  "list:posts": {
    usage: "[--status draft|published] [--featured] [--since <iso>] [--until <iso>] [--limit <n>]",
    desc: "List blog posts",
    async run(flags) {
      const items = await get("posts", {
        status: flags.status,
        featured: flags.featured,
        since: flags.since,
        until: flags.until,
        limit: flags.limit,
      });
      if (items.length === 0) {
        console.log("No posts found.");
        return;
      }
      for (const p of items) {
        const tags = p.tags?.map((t) => t.name).join(", ") || "";
        console.log(`${p.id}  [${p.status}]  ${p.title}${tags ? `  (${tags})` : ""}`);
      }
      console.log(`\n${items.length} post(s)`);
    },
  },

  "list:events": {
    usage: "[--status draft|published] [--upcoming] [--since <iso>] [--until <iso>] [--limit <n>]",
    desc: "List events",
    async run(flags) {
      const items = await get("events", {
        status: flags.status,
        upcoming: flags.upcoming,
        since: flags.since,
        until: flags.until,
        limit: flags.limit,
      });
      if (items.length === 0) {
        console.log("No events found.");
        return;
      }
      for (const e of items) {
        const date = new Date(e.start_at).toLocaleDateString();
        console.log(`${e.id}  [${e.status}]  ${date}  ${e.title}`);
      }
      console.log(`\n${items.length} event(s)`);
    },
  },

  "update:resource": {
    usage: "--id <id> [--title <t>] [--url <u>] [--category <c>] [--description <d>] [--author <a>] [--image <url>] [--featured] [--status draft|published] [--tags <comma-separated>]",
    desc: "Update an education resource",
    async run(flags) {
      requireFlags(flags, "id");
      const body = {};
      if (flags.title) body.title = flags.title;
      if (flags.url) body.url = flags.url;
      if (flags.category) body.category = flags.category;
      if (flags.description) body.description = flags.description;
      if (flags.author) body.author = flags.author;
      if (flags.image) body.image = flags.image;
      if (flags.featured) body.featured = flags.featured === "true";
      if (flags.status) body.status = flags.status;
      if (flags.tags) body.tags = flags.tags.split(",").map((t) => t.trim());
      const result = await patch(`resources/${flags.id}`, body);
      console.log("Resource updated:", result.id);
      console.log("Status:", result.status);
    },
  },

  "update:post": {
    usage: "--id <id> [--title <t>] [--body <b>] [--excerpt <e>] [--featured_image <url>] [--featured] [--status draft|published] [--published_at <iso>] [--tags <comma-separated>]",
    desc: "Update a blog post",
    async run(flags) {
      requireFlags(flags, "id");
      const body = {};
      if (flags.title) body.title = flags.title;
      if (flags.body) body.body = flags.body;
      if (flags.excerpt) body.excerpt = flags.excerpt;
      if (flags.featured_image) body.featured_image = flags.featured_image;
      if (flags.featured) body.featured = flags.featured === "true";
      if (flags.status) body.status = flags.status;
      if (flags.published_at) body.published_at = flags.published_at;
      if (flags.tags) body.tags = flags.tags.split(",").map((t) => t.trim());
      const result = await patch(`posts/${flags.id}`, body);
      console.log("Post updated:", result.id);
      console.log("Status:", result.status);
    },
  },

  "update:event": {
    usage: "--id <id> [--title <t>] [--description <d>] [--hosts <h>] [--start_at <iso>] [--end_at <iso>] [--venue_name <v>] [--venue_address <a>] [--image <url>] [--is_free <bool>] [--price <p>] [--status draft|published]",
    desc: "Update an event",
    async run(flags) {
      requireFlags(flags, "id");
      const body = {};
      if (flags.title) body.title = flags.title;
      if (flags.description) body.description = flags.description;
      if (flags.hosts) body.hosts = flags.hosts;
      if (flags.start_at) body.start_at = flags.start_at;
      if (flags.end_at) body.end_at = flags.end_at;
      if (flags.venue_name) body.venue_name = flags.venue_name;
      if (flags.venue_address) body.venue_address = flags.venue_address;
      if (flags.image) body.image = flags.image;
      if (flags.meetup_url) body.meetup_url = flags.meetup_url;
      if (flags.is_free) body.is_free = flags.is_free !== "false";
      if (flags.price) body.price = flags.price;
      if (flags.status) body.status = flags.status;
      const result = await patch(`events/${flags.id}`, body);
      console.log("Event updated:", result.id);
      console.log("Status:", result.status);
    },
  },
};

// ── main ─────────────────────────────────────────────────────────────────────

const [command, ...rest] = process.argv.slice(2);

if (!command || command === "help" || command === "--help") {
  console.log("Bitcoin Bay Agent CLI\n");
  console.log("Usage: open-meetup-bot <command> [flags]\n");
  console.log("Commands:");
  for (const [name, cmd] of Object.entries(commands)) {
    console.log(`  ${name.padEnd(20)} ${cmd.desc}`);
  }
  console.log(`\nRun 'open-meetup-bot <command> --help' for flag details.`);
  console.log(`\nEnv: BITCOIN_BAY_AGENT_KEY (required), BITCOIN_BAY_URL (default: ${BASE_URL})`);
  process.exit(0);
}

const cmd = commands[command];
if (!cmd) {
  console.error(`Unknown command: ${command}`);
  console.error(`Run 'open-meetup-bot help' for available commands.`);
  process.exit(1);
}

const flags = parseFlags(rest);
if (flags.help) {
  console.log(`${cmd.desc}\n`);
  console.log(`Usage: open-meetup-bot ${command} ${cmd.usage}`);
  process.exit(0);
}

await cmd.run(flags);
