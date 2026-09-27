import { Spectrum, text } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
// To test locally without Photon credentials, swap the line above for:
//   import { terminal } from "spectrum-ts/providers/terminal";
// and call `Spectrum({ providers: [terminal.config()] })` below instead,
// dropping the credentials check. Spectrum normalizes every provider into
// the same [space, message] stream, so the message loop stays the same.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  addMessage,
  getState,
  resetState,
  waterTrees,
  simulateInactivity,
  simulateMilestoneJump,
  toggleRain,
  startDecayClock,
  oasisEvents,
  type OasisState,
} from "./oasis-state";

const PORT = Number(process.env.PORT ?? 3000);
const { PROJECT_ID, PROJECT_SECRET } = process.env;
if (!PROJECT_ID || !PROJECT_SECRET) {
  console.error("iMessage needs PROJECT_ID and PROJECT_SECRET in .env. Copy them from your project's Settings at https://app.photon.codes (promo code HACKWITHPHOTON).");
  process.exit(1);
}
const __dirname = dirname(fileURLToPath(import.meta.url));
// Serves the teammate's actual pixel-art frontend (index.html/app.js/style.css),
// patched to call these endpoints instead of mutating a local mock `state`.
const PUBLIC_DIR = join(__dirname, "..", "frontend");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

function cors(res: import("node:http").ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function serveStatic(pathname: string) {
  const filePath = pathname === "/" ? "/index.html" : pathname;
  const full = join(PUBLIC_DIR, filePath);
  const body = await readFile(full);
  return { body, type: MIME[extname(full)] ?? "application/octet-stream" };
}

async function readJsonBody(req: import("node:http").IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function sendJson(res: import("node:http").ServerResponse, data: unknown) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const httpServer = createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const { pathname } = url;
  const method = req.method ?? "GET";

  // --- Read state ---
  if (pathname === "/api/oasis/state" && method === "GET") {
    return sendJson(res, getState());
  }

  // --- Real / simulated incoming message (handleSendMessage, simMsgBtn, simBurstBtn) ---
  if (pathname === "/api/oasis/message" && method === "POST") {
    const body = await readJsonBody(req);
    const msgText = typeof body.text === "string" && body.text.trim() ? body.text.trim() : "…";
    const author = typeof body.author === "string" && body.author ? body.author : "Partner";
    const count = Number.isInteger(body.count) && body.count > 0 ? body.count : 1;
    let state: ReturnType<typeof getState> | null = null;
    for (let i = 0; i < count; i++) {
      state = addMessage(i === 0 ? msgText : `${msgText} (${i + 1}/${count})`, author);
    }
    return sendJson(res, state);
  }

  // --- simWaterBtn: "💧 Water & Nurture Trees" ---
  if (pathname === "/api/oasis/water" && method === "POST") {
    return sendJson(res, waterTrees());
  }

  // --- simDryBtn: "⌛ Simulate 2 Days Inactivity" ---
  if (pathname === "/api/oasis/demo/inactivity" && method === "POST") {
    return sendJson(res, simulateInactivity());
  }

  // --- simMilestoneBtn: "💥 100-Msg Mother Tree" ---
  if (pathname === "/api/oasis/demo/milestone" && method === "POST") {
    return sendJson(res, simulateMilestoneJump());
  }

  // --- simRainBtn: "🌧️ Rain: Active" toggle ---
  if (pathname === "/api/oasis/rain/toggle" && method === "POST") {
    return sendJson(res, toggleRain());
  }

  // --- loadDay1Mode: "🌱 Start Day 1" ---
  if (pathname === "/api/oasis/reset" && method === "POST") {
    return sendJson(res, resetState());
  }

  try {
    const { body, type } = await serveStatic(pathname);
    res.writeHead(200, { "Content-Type": type });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

httpServer.listen(PORT, () => {
  console.log(`🌙 Oasis UI + API running at http://localhost:${PORT}`);
});

startDecayClock();

const app = await Spectrum({
  projectId: PROJECT_ID,
  projectSecret: PROJECT_SECRET,
  providers: [imessage.config()],
});

// Remembers whichever conversation last sent a message, so a milestone
// crossed via a demo button can still post into the real thread, not just
// update the local dashboard.
let lastSpace: any = null;

oasisEvents.on("oak-planted", async (_state: OasisState) => {
  if (!lastSpace) return;
  try {
    await lastSpace.send(text("🌱 First seed planted on the moon! Photon detected your first message and planted Alex's Crystal Oak."));
  } catch (err) {
    console.error("Failed to send oak-planted notice:", err);
  }
});

oasisEvents.on("mother-tree-unlocked", async (state: OasisState) => {
  if (!lastSpace) return;
  try {
    await lastSpace.send(text(`🎆 100-message milestone unlocked! The Mother Baobab sprouted with a glowing galaxy canopy. (${state.messageCount} messages)`));
  } catch (err) {
    console.error("Failed to send mother-tree notice:", err);
  }
});

oasisEvents.on("wilt-start", async (_state: OasisState) => {
  if (!lastSpace) return;
  try {
    await lastSpace.send(text("🍂 The trees are dropping leaves — it's been quiet for a couple of moon-days. Send a message to water them back to 100%."));
  } catch (err) {
    console.error("Failed to send wilt notice:", err);
  }
});

console.log("Photon is watching quietly — text your Photon iMessage line to grow the oasis.");
console.log("It only speaks up at real milestones (first sprout, 100-msg mother tree) or if things go quiet.");

// iMessage also streams read receipts, typing, tapbacks, edits, unsends and
// group changes; only content someone actually sent counts as chatting.
const SENT_CONTENT = new Set(["text", "markdown", "attachment", "voice", "contact", "richlink", "app", "poll", "group", "reply", "effect"]);

// Replies and send-with-effect messages wrap their text one level down.
function textOf(content: any): string {
  if (content?.type === "text") return content.text;
  if (content?.type === "reply" || content?.type === "effect") return textOf(content.content);
  return "";
}

// The terminal may be on the projector during the demo, so senders are
// masked: +13145550123 → +1•••0123, name@example.com → na•••@example.com.
function maskHandle(handle: string): string {
  if (handle.includes("@")) return handle.replace(/^(.{0,2}).*@/, "$1•••@");
  if (/^\+?\d{7,}$/.test(handle)) return `${handle.slice(0, 2)}•••${handle.slice(-4)}`;
  return handle;
}

// One line per log entry: quoted text (cut at 60 characters) or the content type.
function preview(content: any): string {
  const chars = Array.from(textOf(content));
  if (chars.length === 0) return `[${content?.type}]`;
  return JSON.stringify(chars.length > 60 ? `${chars.slice(0, 57).join("")}…` : chars.join(""));
}

for await (const [space, message] of app.messages) {
  if (!SENT_CONTENT.has(message?.content?.type)) continue;
  lastSpace = space;
  const author = message?.sender?.id ? String(message.sender.id) : "Partner";
  const state = addMessage(textOf(message.content), author);
  console.log(`📩 iMessage from ${maskHandle(author)}: ${preview(message.content)} → message #${state.messageCount}`);
}
