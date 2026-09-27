// Renders the same garden scene as public/index.html, but as a static PNG
// buffer suitable for sending as an iMessage attachment. Pure SVG string
// templating + @resvg/resvg-js — no headless browser needed.

import { Resvg } from "@resvg/resvg-js";

const PLANT_SPOTS: [number, number][] = [
  [40, 158], [145, 150], [250, 160], [95, 175], [195, 180], [55, 198],
  [215, 198], [120, 200], [270, 190], [20, 180], [165, 205], [240, 205],
  [80, 155], [290, 175],
];

function starsMarkup(n: number, seedBase: number): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    const x = (seedBase * 13 + i * 37) % 300;
    const y = (seedBase * 7 + i * 19) % 90;
    const r = i % 3 === 0 ? 1.6 : 1;
    const o = (0.35 + (i % 5) * 0.12).toFixed(2);
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${o}"/>`;
  }
  return out;
}

function plantMarkup(variant: number): string {
  if (variant === 0) {
    return `<path d="M0,0 C-2,-7 -1,-11 0,-14" stroke="#3fae6b" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <circle cx="3" cy="-9" r="4" fill="#5fd087"/>
      <circle cx="-3" cy="-12" r="3.4" fill="#7be3a0"/>`;
  }
  if (variant === 1) {
    return `<path d="M0,0 C-1,-10 1,-15 0,-22" stroke="#8a5a34" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <circle cx="-6" cy="-19" r="5.5" fill="#5fd087"/>
      <circle cx="5" cy="-21" r="6" fill="#4fc37a"/>
      <circle cx="-2" cy="-14" r="1.6" fill="#ffd23f"/>`;
  }
  return `<path d="M0,0 C-1,-13 1,-18 0,-28" stroke="#7a4b2b" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="-8" cy="-26" r="7" fill="#4fc37a"/>
    <circle cx="7" cy="-30" r="8" fill="#4fc37a"/>
    <circle cx="0" cy="-34" r="6.5" fill="#4fc37a"/>
    <circle cx="-6" cy="-24" r="1.6" fill="#ffd23f"/>`;
}

function fireflyMarkup(fx: number, fy: number): string {
  // resvg rasterizes a static frame, so <animate> is decorative-only here —
  // it just fixes the fireflies at their "on" state, which looks fine.
  return `<circle cx="${fx}" cy="${fy}" r="1.8" fill="#ffe9a8"/>`;
}

export function buildSceneSvgString(plantCount: number, wilting: boolean): string {
  const filter = wilting ? "saturate(0.45) brightness(0.92)" : "none";
  const droop = wilting ? "rotate(4)" : "rotate(0)";

  const craters = plantCount >= 8
    ? [[275, 195, 9]]
    : [[50, 175, 10], [220, 190, 14], [90, 205, 8]];
  const cratersMarkup = craters
    .map(([cx, cy, r]) => `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.4}" fill="#b7ae9e" opacity="0.7"/>`)
    .join("");

  let plantsMarkup = "";
  if (plantCount === 0) {
    plantsMarkup = `<circle cx="150" cy="146" r="3.2" fill="#ffe9a8"/>`;
  } else {
    for (let i = 0; i < plantCount && i < PLANT_SPOTS.length; i++) {
      const [x, y] = PLANT_SPOTS[i];
      plantsMarkup += `<g transform="translate(${x},${y}) ${droop}">${plantMarkup(i % 3)}</g>`;
    }
  }

  let oasisMarkup = "";
  if (plantCount >= 10) {
    oasisMarkup += `<ellipse cx="150" cy="206" rx="75" ry="12" fill="#4ecdc4" opacity="0.85"/>
      <ellipse cx="150" cy="206" rx="75" ry="12" fill="none" stroke="#bdf3ee" stroke-width="1.2" opacity="0.6"/>`;
    for (let i = 0; i < 5; i++) {
      oasisMarkup += fireflyMarkup(90 + i * 28, 150 - (i % 2) * 18);
    }
  }

  return `<svg width="900" height="675" viewBox="0 0 300 225" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="earthGrad" cx="35%" cy="30%">
        <stop offset="0%" stop-color="#bfe9ff"/>
        <stop offset="55%" stop-color="#4ecdc4"/>
        <stop offset="100%" stop-color="#2b6f8c"/>
      </radialGradient>
      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#241a52"/>
        <stop offset="55%" stop-color="#40296f"/>
        <stop offset="100%" stop-color="#6b3f8c"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="300" height="225" fill="url(#skyGrad)"/>
    ${starsMarkup(26, 4)}
    <circle cx="250" cy="34" r="14" fill="url(#earthGrad)"/>
    <path d="M0,150 Q60,130 120,148 T240,150 T300,145 L300,225 L0,225 Z" fill="#d9d3c8"/>
    <path d="M0,168 Q80,150 160,166 T300,162 L300,225 L0,225 Z" fill="#c2b89e"/>
    ${cratersMarkup}
    <g style="filter:${filter}">${plantsMarkup}</g>
    ${oasisMarkup}
  </svg>`;
}

export function renderGardenPng(plantCount: number, wilting: boolean): Buffer {
  const svg = buildSceneSvgString(plantCount, wilting);
  const resvg = new Resvg(svg);
  return resvg.render().asPng();
}
