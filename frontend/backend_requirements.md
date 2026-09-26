# 📋 MoonLetter: Lunar Oasis — Backend API & Feature Requirements

This specification outlines the data models, API endpoints, and LLM agent requirements needed from the backend team to support the **MoonLetter: Lunar Oasis** user interface.

---

## 💾 1. Data Schema Specs

### A. Oasis Session State (`GET /api/oasis/:convo_id`)
```json
{
  "convo_id": "stl-hgz-chat-01",
  "message_count": 142,
  "milestone_target": 100,
  "water_level": 85,
  "streak_days": 4,
  "last_active": "2026-09-26T16:15:00Z",
  "oasis_flourish_score": 92,
  "mother_tree": {
    "id": "tree_mother_01",
    "species": "Nebula Baobab",
    "stage": "flowering",
    "health": 100,
    "leaves_lost": 0,
    "water_needed": 15,
    "planted_at_message": 100
  },
  "flora": [
    {
      "id": "flora_01",
      "species": "Starlight Cherry Blossom",
      "type": "tree",
      "grid_x": 3,
      "grid_y": 5,
      "planted_at_message": 20,
      "time_capsule": {
        "author": "Alex",
        "timestamp": "2026-09-25T21:40:00Z",
        "snippet": "I had a crazy long day at work, but talking to you makes everything feel peaceful.",
        "sentiment_tag": "peaceful_longing"
      }
    },
    {
      "id": "flora_02",
      "species": "Bioluminescent Crystal Oak",
      "type": "tree",
      "grid_x": 7,
      "grid_y": 4,
      "planted_at_message": 50,
      "time_capsule": {
        "author": "Mei",
        "timestamp": "2026-09-26T10:15:00Z",
        "snippet": "The morning sun here is golden today! Sending you warm starlight vibes.",
        "sentiment_tag": "joyful"
      }
    },
    {
      "id": "flora_03",
      "species": "Moon Sprout",
      "type": "sprout",
      "grid_x": 5,
      "grid_y": 6,
      "planted_at_message": 70,
      "time_capsule": null
    }
  ],
  "critters": [
    { "id": "critter_01", "type": "moon_bunny", "name": "Luna Lagomorph", "x": 4, "y": 5 },
    { "id": "critter_02", "type": "cosmic_manta", "name": "Nebula Manta", "x": 8, "y": 2 }
  ]
}
```

---

## ⚡ 2. Backend Event Triggers & Endpoints

### 1. `POST /api/photon/message` (Incoming Chat Handler)
- **Input**: `{ "sender": "Alex", "convo_id": "...", "text": "...", "timestamp": "..." }`
- **Actions**:
  1. Increment `message_count`.
  2. Evaluate streak logic (`streak_days`).
  3. If `message_count % 20 === 0`: Run LLM sentiment/topic analysis $\rightarrow$ pick/generate a plant $\rightarrow$ save `time_capsule` metadata containing `{ author, timestamp, snippet, sentiment_tag }`.
  4. If `message_count >= 100`: Trigger **Mother Tree Spawn Event**.
  5. Return updated oasis payload + Photon agent reply text card.

### 2. `POST /api/oasis/water` (Watering Action)
- **Trigger**: Called when user taps "Water Tree" button in UI or sends a 💧 / ❤️ reaction in iMessage.
- **Actions**: Restores `water_level`, reduces `leaves_lost`, and triggers flowering state.

### 3. `GET /api/oasis/:convo_id/time_capsule/:flora_id`
- **Returns**: Full time capsule details for a specific tree when tapped on the lunar canvas.

---

## 🤖 3. LLM Agent Prompt Contract
When the LLM analyzes chat history, ask it to output JSON:
```json
{
  "recommended_plant": "Bioluminescent Crystal Oak",
  "reasoning": "Chat focused on deep night reflections and comfort.",
  "sentiment_category": "comforting_night",
  "time_capsule_summary": "Discussed midnight tea and stargazing.",
  "color_palette_hex": ["#00f0ff", "#12092b", "#ff2a8d"]
}
```
