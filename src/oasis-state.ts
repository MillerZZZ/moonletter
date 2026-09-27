// Mirrors the REAL logic in moonletter frontend/app.js — not the more
// ambitious backend_requirements.md wishlist (no LLM calls, no 20-message
// time capsules, no grid/critters state). Every function here corresponds
// 1:1 to something app.js already does with a local `state` object; the
// only difference is this is now the single shared source of truth, fed by
// real Spectrum messages AND by the six demo buttons in the UI.

import { EventEmitter } from "node:events";

export interface OasisState {
  messageCount: number;
  waterLevel: number;        // 0-100. Chatting -> 100. Idle -> decays.
  streakDays: number;        // consecutive calendar days with activity
  biosphereLevel: number;    // 0-100. Drives moss opacity / critter visibility client-side.
  cosmicRainActive: boolean;
  oakPlanted: boolean;
  oakSnippet: string | null; // literal first-message text — no LLM needed
  oakAuthor: string | null;
  motherTreePlanted: boolean;
  lastMessageAt: number;
}

export const oasisEvents = new EventEmitter();

const TICK_MS = Number(process.env.TICK_MS ?? 4000); // 1 "moon-day" per tick, sped up for demos
const IDLE_TICKS_BEFORE_DECAY = 2;
const WATER_DECAY_PER_IDLE_TICK = 22; // ~2-3 idle ticks: 100 -> ~35, matching "Simulate 2 Days Inactivity"
const WILT_THRESHOLD = 50; // matches app.js's CSS thirsty-state trigger (< 50%)

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC is fine for a hackathon demo)
}

function freshState(): OasisState {
  return {
    messageCount: 0,
    waterLevel: 100,
    streakDays: 1,
    biosphereLevel: 0,
    cosmicRainActive: false,
    oakPlanted: false,
    oakSnippet: null,
    oakAuthor: null,
    motherTreePlanted: false,
    lastMessageAt: Date.now(),
  };
}

let state: OasisState = freshState();
let lastActiveDateKey: string = dateKey(new Date());
let hadMessageThisTick = true;
let idleTicks = 0;
let wasWilting = false;

// getMilestoneTarget/getMilestoneProgressPercent are copied verbatim from
// app.js so the header badge ("142 / 200 Msgs") never disagrees with the backend.
export function getMilestoneTarget(count: number): number {
  return Math.ceil((count + 1) / 100) * 100;
}

export function getMilestoneProgressPercent(count: number): number {
  const target = getMilestoneTarget(count);
  const prevTarget = target - 100;
  const progress = ((count - prevTarget) / 100) * 100;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

export function getState() {
  return {
    ...state,
    milestoneTarget: getMilestoneTarget(state.messageCount),
    milestoneProgressPercent: getMilestoneProgressPercent(state.messageCount),
  };
}

function bumpStreak() {
  const today = dateKey(new Date());
  if (lastActiveDateKey === today) return;
  const yesterday = dateKey(new Date(Date.now() - 86_400_000));
  state.streakDays = lastActiveDateKey === yesterday ? state.streakDays + 1 : 1;
  lastActiveDateKey = today;
}

// Called for every real message (from Spectrum) AND every simulated one
// (from the demo buttons) — this is the one place "1 message" happens.
export function addMessage(text: string, author: string) {
  state.messageCount += 1;
  state.waterLevel = 100;
  state.biosphereLevel = Math.min(100, state.biosphereLevel + 5);
  state.lastMessageAt = Date.now();
  hadMessageThisTick = true;
  idleTicks = 0;
  bumpStreak();

  if (state.messageCount === 1 && !state.oakPlanted) {
    state.oakPlanted = true;
    state.oakSnippet = text;
    state.oakAuthor = author;
    state.biosphereLevel = Math.max(20, state.biosphereLevel);
    oasisEvents.emit("oak-planted", getState());
  }

  if (state.messageCount >= 100 && !state.motherTreePlanted) {
    state.motherTreePlanted = true;
    oasisEvents.emit("mother-tree-unlocked", getState());
  }

  return getState();
}

// Mirrors simWaterBtn ("💧 Water & Nurture Trees")
export function waterTrees() {
  state.waterLevel = 100;
  hadMessageThisTick = true;
  idleTicks = 0;
  return getState();
}

// Mirrors simDryBtn ("⌛ Simulate 2 Days Inactivity")
export function simulateInactivity() {
  state.waterLevel = 35;
  if (!wasWilting) oasisEvents.emit("wilt-start", getState());
  wasWilting = true;
  return getState();
}

// Mirrors simMilestoneBtn ("💥 100-Msg Mother Tree")
export function simulateMilestoneJump() {
  state.messageCount = Math.max(state.messageCount, 100);
  state.waterLevel = 100;
  state.biosphereLevel = 100;
  hadMessageThisTick = true;
  idleTicks = 0;
  if (!state.motherTreePlanted) {
    state.motherTreePlanted = true;
    oasisEvents.emit("mother-tree-unlocked", getState());
  }
  return getState();
}

// Mirrors simRainBtn ("🌧️ Rain: Active" toggle)
export function toggleRain() {
  state.cosmicRainActive = !state.cosmicRainActive;
  return getState();
}

// Mirrors loadDay1Mode() ("🌱 Start Day 1")
export function resetState() {
  state = freshState();
  lastActiveDateKey = dateKey(new Date());
  hadMessageThisTick = true;
  idleTicks = 0;
  wasWilting = false;
  return getState();
}

export function startDecayClock() {
  setInterval(() => {
    if (!hadMessageThisTick) {
      idleTicks += 1;
      if (idleTicks >= IDLE_TICKS_BEFORE_DECAY) {
        state.waterLevel = Math.max(0, state.waterLevel - WATER_DECAY_PER_IDLE_TICK);
      }
    }
    hadMessageThisTick = false;

    const isWilting = state.waterLevel < WILT_THRESHOLD;
    if (isWilting && !wasWilting) {
      oasisEvents.emit("wilt-start", getState());
    }
    wasWilting = isWilting;
  }, TICK_MS);
}
