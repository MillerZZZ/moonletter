# MoonLetter: Living Lunar Oasis — Frontend Interface Overview

## Executive Summary
**MoonLetter: Living Lunar Oasis** is a retro 16-bit / 32-bit pixel art interactive web application that visualizes a bioluminescent ecological sanctuary on the Moon, fed by iMessage chat activity via a Photon spectrum agent.

The frontend serves as both a **live interactive visualizer** for the lunar ecosystem and a **sandbox simulator** for iMessage interactions. It transforms conversation history into a living, evolving ecosystem where trees level up, store time capsules, moss spreads across lunar regolith, space critters visit, and dry leaves fall when inactive.

---

## Architecture & Layout Overview

The interface is structured as a **responsive dual-panel layout**:

```
+-----------------------------------------------------------------------------------+
|                            SKY TOP HEADER & BIOSPHERE BADGES                      |
| 🔥 4-Day Streak   |   💧 Water: 85%   |   🌿 Oasis: 85% Lush   |   💬 142 / 200 Msgs |
+----------------------------------------------------+------------------------------+
| PANEL A: Photon iMessage Sandbox (Left 40%)        | PANEL B: Pixel Oasis Canvas  |
| - Recipient Profile (MoonLetter iMessage Bot)      | - 16-Bit Pixel Celestial Sky |
| - Real-time Chat Feed                              | - Glowing Moon, Aurora, Rain |
| - Simulated iMessage Input Box                     | - 4 Core Anchor Trees (Capsules)
| - Quick Demo Controller Panel                      | - Bioluminescent Moss Carpet |
|                                                    | - Visiting Space Critters    |
|                                                    | - Falling Leaves Layer       |
+----------------------------------------------------+------------------------------+
```

---

## Key Interface Features & Capabilities

### 1. Panel A — Photon iMessage Sandbox
- **Simulated Chat Feed**: Renders incoming and outgoing iMessage bubbles with custom timestamps and avatar badges.
- **Agent Cards**: Displays special system feedback cards when milestones are reached, trees are watered, or new flora species sprout.
- **Interactive Input Bar**: Allows users to type and send messages to simulate real-time chat events that trigger tree growth and water replenishment.
- **Demo Control Suite**:
  - **`🌱 Start Day 1`**: Resets the canvas to an untouched, pristine lunar crater with zero trees and bare grey regolith.
  - **`✨ Flourishing Oasis`**: Instantly loads the fully expanded, 4-tree flourishing sanctuary.
  - **`⌛ Simulate 2 Days Inactivity`**: Triggers water depletion, tree desaturation, and falling leaves.
  - **`💧 Water Trees`**: Manually replenishes water reserves to 100% and revives foliage.
  - **`⚡ Spread Moss`**: Dynamically expands bioluminescent carpet opacity and radius across the crater floor.
  - **`📈 Simulate +100 Milestone`**: Increments message counter to the next 100-message boundary and triggers tree evolution animations.

---

### 2. Panel B — Retro 16-Bit Pixel Canvas

#### A. Sky Top Header & Biosphere Stats
- **Fixed Position**: Positioned cleanly at the top of the canvas viewport to prevent overlap with tree foliage on any screen resolution.
- **Stat Badges**:
  - **Streak**: Tracks consecutive days of chat activity.
  - **Water Level**: Shows tree moisture percentage (0–100%).
  - **Oasis Lushness**: Tracks overall ecosystem health and flora density.
  - **Message Counter**: Displays total messages sent vs. the next 100-message milestone boundary (e.g. `142 / 200 Msgs`).

#### B. 4 Core Anchor Trees & Level-Up Capsules
Instead of spawning dozens of duplicate seedling graphics that clutter the screen, the Oasis features **4 distinct anchor tree species** that level up over time:
1. **Mother Baobab (`mother_tree`)**: The central mother tree representing the core thread relationship.
2. **Starlight Oak (`oak_tree`)**: A sturdy celestial hardwood stored at position 2.
3. **Nebula Cherry (`cherry_tree`)**: A vibrant pink bioluminescent blossom tree at position 3.
4. **Crystal Willow (`willow_tree`)**: A glowing cyan weeping tree at position 4.

Each tree displays a retro **`Lvl X`** badge above its canopy and features hover scaling, glowing auras, and flower patches around its trunk.

#### C. Stacked Time Capsule Modal
Clicking any tree opens the **Time Capsule Modal**, which functions as a temporal memory vault:
- **Level Tabs (`Lvl 1`, `Lvl 2`, `Lvl 3`...)**: Allows switching between previous growth stages of the tree.
- **Memory Cards**: Shows the exact date planted, message count at that milestone, summary quote from the conversation, and key topic tags.
- **Watering Quick Action**: Includes a `💧 Water Tree` button within the modal.

#### D. Bioluminescent Moss Carpet
- Dynamic SVG gradient carpet underneath trees that expands and glows brighter as message count and biosphere health increase.
- Includes animated blooming flowers and glowing fungal spores.

#### E. Visiting Space Critters
Interactive 16-bit animated critters gather around the oasis when biosphere health is high:
- 🐰 **Luna Lagomorph (Moon Bunny)**: Hopping pixel bunny.
- 🦇 **Nebula Bat (Space Bat)**: Fluttering cosmic bat.
- 🌌 **Astra Manta (Star Ray)**: Floating celestial ray.
- *Interactivity*: Hovering or clicking critters triggers custom pixel speech bubbles (e.g., `"Hop! 🐰"`, `"Squeak! 🦇"`).

#### F. Inactivity Decay & Leaf Loss Engine
- **Thirst Trigger (`< 50% Water`)**: Activated after 2+ days without chatting.
- **Desaturation**: Trees desaturate into a dry grey-brown tone (`grayscale(0.9) desaturate(100%)`), tree glowing auras turn off, and flowers wither.
- **Dry Moss**: The moss carpet turns faded and dark (`.thirsty-moss`).
- **Falling Leaves**: Animated dry amber/brown leaves flutter down through the sky (`.falling-leaf`), while scattered leaves rest on the crater ground floor (`.ground-leaves`).
- **Revival**: Any new message or water action instantly restores 100% water and blooms the ecosystem back to vivid bioluminescence.

#### G. Temporal Time Travel (`W1`–`W4`)
- Located in the sky control bar (`W1`, `W2`, `W3`, `W4`).
- Tapping any week button instantly loads historical snapshots of the Oasis, allowing users to look back at how their sanctuary appeared in prior weeks.

---

## Technical File Mapping

| File | Purpose |
|---|---|
| [`index.html`](file:///c:/Users/torre/Documents/moonletter/index.html) | Main HTML structure containing dual-panel grid, SVG tree graphics, modal overlays, and critter elements. |
| [`style.css`](file:///c:/Users/torre/Documents/moonletter/style.css) | 16-bit pixel art styles, custom neon palettes, animations (`image-rendering: pixelated`), and leaf loss keyframes. |
| [`app.js`](file:///c:/Users/torre/Documents/moonletter/app.js) | Frontend state engine managing state changes, iMessage simulator, tree level-up capsules, thirst decay, and week snapshots. |
| [`backend_requirements.md`](file:///c:/Users/torre/Documents/moonletter/backend_requirements.md) | API specification detailing data schemas (`GET /api/oasis/:convo_id`, `POST /api/photon/message`) for backend integration. |
| [`lunar_oasis_plan.md`](file:///c:/Users/torre/Documents/moonletter/lunar_oasis_plan.md) | Full architectural roadmap and concept designs. |
