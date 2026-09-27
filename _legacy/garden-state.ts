// Single source of truth for the garden. Both the real Spectrum message loop
// and the demo "/api/seed" shortcut call addMessages() — so a real text and a
// demo-seeded text grow the garden in exactly the same way. server.ts listens
// on `gardenEvents` to know when to send a picture of the garden back into
// the actual conversation.

import { EventEmitter } from "node:events";

export interface GardenState {
  total: number;        // total messages counted (both sides combined)
  plantCount: number;   // floor(total / MESSAGES_PER_PLANT)
  idleTicks: number;    // "moon-days" since the last message
  health: number;       // 0-100, decays with idleTicks, drives wilting
  lastMessageAt: number;
}

export const gardenEvents = new EventEmitter();

export const MESSAGES_PER_PLANT = 5;

const TIERS = [
  { min: 0,  name: "Barren Crater" },
  { min: 1,  name: "First Sprouts" },
  { min: 3,  name: "Young Grove" },
  { min: 6,  name: "Full Grove" },
  { min: 10, name: "Moonlit Oasis" },
];

export function tierName(plantCount: number): string {
  let name = TIERS[0].name;
  for (const t of TIERS) if (plantCount >= t.min) name = t.name;
  return name;
}

const TICK_MS = Number(process.env.TICK_MS ?? 4000); // 1 "moon-day" per tick (sped up for demos)
const DECAY_LIGHT = 6;
const DECAY_HEAVY = 14;
const HEAVY_AFTER_TICKS = 3;
const HEALTH_GAIN_PER_MESSAGE = 14;

let state: GardenState = {
  total: 0,
  plantCount: 0,
  idleTicks: 0,
  health: 100,
  lastMessageAt: Date.now(),
};

let hadMessageThisTick = true;

export function getState(): GardenState {
  return { ...state };
}

export function addMessages(count: number) {
  const prevPlantCount = state.plantCount;
  state.total += count;
  state.plantCount = Math.floor(state.total / MESSAGES_PER_PLANT);
  state.idleTicks = 0;
  state.health = Math.min(100, state.health + HEALTH_GAIN_PER_MESSAGE * Math.max(1, Math.min(count, 3)));
  state.lastMessageAt = Date.now();
  hadMessageThisTick = true;
  if (state.plantCount > prevPlantCount) {
    gardenEvents.emit("milestone", getState());
  }
  return getState();
}

export function resetState() {
  state = { total: 0, plantCount: 0, idleTicks: 0, health: 100, lastMessageAt: Date.now() };
  hadMessageThisTick = true;
  wasWilting = false;
  return getState();
}

let wasWilting = false;

export function startDecayClock() {
  setInterval(() => {
    if (!hadMessageThisTick) {
      state.idleTicks += 1;
      const decay = state.idleTicks >= HEAVY_AFTER_TICKS ? DECAY_HEAVY : DECAY_LIGHT;
      state.health = Math.max(0, state.health - decay);
    }
    hadMessageThisTick = false;

    const isWilting = state.health <= 35;
    if (isWilting && !wasWilting) {
      gardenEvents.emit("wilt-start", getState());
    }
    wasWilting = isWilting;
  }, TICK_MS);
}
