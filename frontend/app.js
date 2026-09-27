// MoonLetter: Living Lunar Oasis — Leaf Loss & Water Recovery Engine

document.addEventListener('DOMContentLoaded', () => {
  let mode = 'day1'; // 'day1' or 'flourishing'

  let state = {
    messageCount: 0,
    waterLevel: 100,
    streakDays: 1,
    biosphereLevel: 0,
    cosmicRainActive: false,
    currentWeek: 1
  };

  // Stacked Level-History Registry
  const fullTreeCapsules = {
    oak_01: {
      name: "Alex's Crystal Oak",
      icon: "💎",
      level: 3,
      memories: [
        { level: 1, date: "Level 1 · Sept 22 (Msg #20)", author: "Alex (St. Louis)", snippet: "First night using MoonLetter! Excited to build our shared lunar space together.", sentiment: "Hopeful Beginnings" },
        { level: 2, date: "Level 2 · Sept 24 (Msg #60)", author: "Alex (St. Louis)", snippet: "Took a walk after dinner tonight. Listening to our favorite songs under the stars.", sentiment: "Peaceful Longing" },
        { level: 3, date: "Level 3 · Sept 26 (Msg #140)", author: "Alex (St. Louis)", snippet: "I spent all evening working on project debugging, but thinking of our coffee spot trip made me smile.", sentiment: "Warm Comfort" }
      ]
    },
    mother_tree: {
      name: "Mother Baobab (Group Tree)",
      icon: "🌳",
      level: 3,
      memories: [
        { level: 1, date: "Level 1 · Sept 20 (Msg #30)", author: "Group Milestone", snippet: "30 messages reached! The oasis planted its first shared Mother Tree seedling.", sentiment: "Community Sprout" },
        { level: 2, date: "Level 2 · Sept 23 (Msg #70)", author: "Group Milestone", snippet: "70 messages reached! Mother Tree grew bioluminescent branches.", sentiment: "Flourishing Growth" },
        { level: 3, date: "Level 3 · Sept 25 (Msg #100)", author: "Group Milestone", snippet: "100th message milestone reached! Unlocked the full Galaxy Canopy.", sentiment: "100-Msg Milestone" }
      ]
    },
    cherry_01: {
      name: "Mei's Star Cherry",
      icon: "🌸",
      level: 2,
      memories: [
        { level: 1, date: "Level 1 · Sept 23 (Msg #40)", author: "Mei (Hangzhou)", snippet: "Good morning! The morning sun here is golden today. Sending you warm starlight vibes.", sentiment: "Joyful Connection" },
        { level: 2, date: "Level 2 · Sept 25 (Msg #90)", author: "Mei (Hangzhou)", snippet: "I was just thinking about that cozy coffee spot we visited last month ☕", sentiment: "Warm Fondness" }
      ]
    },
    willow_01: {
      name: "Shared Nebula Willow",
      icon: "🔮",
      level: 2,
      memories: [
        { level: 1, date: "Level 1 · Sept 21 (Msg #25)", author: "Alex & Mei", snippet: "Planted during our late night conversation about trip plans.", sentiment: "Shared Dreams" },
        { level: 2, date: "Level 2 · Sept 25 (Msg #85)", author: "Alex & Mei", snippet: "Both sent evening reflections under the same moon night.", sentiment: "Harmonic Synchrony" }
      ]
    }
  };

  let activeTreeCapsules = {};

  // ---- Real backend wiring (added) ----
  // Same-origin API served by src/server.ts. Replaces the local arithmetic
  // that used to live in handleSendMessage/simMsgBtn/etc. with the real,
  // Spectrum-backed counter — everything else (rendering, modals, critters,
  // week-snapshot preview) is untouched.
  async function apiPost(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }
  async function apiGet(path) {
    const res = await fetch(path);
    return res.json();
  }

  // Live mode shows the real garden. The W1–W4 tabs and "Flourishing Oasis"
  // are fixed preview snapshots, so live data must not be painted over them.
  let isLive = true;
  let latestState = null; // newest backend payload, still tracked during previews

  // Copies a backend state payload into the local `state` object and
  // replays the same UI hooks the mock version used to call inline.
  // `announce: false` regrows milestones already reached without re-posting their cards.
  function applyBackendState(s, { announce = true } = {}) {
    if (!s) return;
    latestState = s;
    if (!isLive) return;

    // The count only goes down when the backend was reset (Start Day 1 in
    // another tab, `bun run reset`, a server restart), so start over.
    if (s.messageCount < state.messageCount) clearToBarrenMoon();

    state.messageCount = s.messageCount;
    state.waterLevel = s.waterLevel;
    state.streakDays = s.streakDays;
    state.biosphereLevel = s.biosphereLevel;
    state.cosmicRainActive = s.cosmicRainActive;

    if (s.oakPlanted && !activeTreeCapsules['oak_01']) {
      plantFirstSprout(s.oakSnippet || '(first message)', announce);
    }
    checkMilestoneUnlocks(announce); // handles mother_tree spawn + moss/critter thresholds
    updateStateUI();                 // handles counters, progress bar, thirsty/leaf visuals
  }

  let liveSyncTimer = null;
  async function syncFromBackend() {
    try {
      const s = await apiGet('/api/oasis/state');
      applyBackendState(s);
    } catch (err) {
      console.warn('MoonLetter backend not reachable yet:', err);
    }
  }
  function startLiveSync() {
    syncFromBackend();
    if (liveSyncTimer) clearInterval(liveSyncTimer);
    liveSyncTimer = setInterval(syncFromBackend, 2000);
  }

  // UI Elements
  const msgCounterEl = document.getElementById('msg-counter');
  const waterLevelEl = document.getElementById('water-level');
  const streakCountEl = document.getElementById('streak-count');
  const biosphereLevelEl = document.getElementById('biosphere-level');
  const weatherTextEl = document.getElementById('weather-text');
  const codexSubtextEl = document.getElementById('codex-subtext');
  const codexChipsEl = document.getElementById('codex-chips');

  const chatStream = document.getElementById('chat-stream');
  const chatInput = document.getElementById('chat-input');
  const chatSendBtn = document.getElementById('chat-send-btn');
  const treesGrid = document.getElementById('pixel-trees-grid');
  const crittersLayer = document.getElementById('critters-layer');
  const mossCarpetEl = document.getElementById('moss-carpet');

  const btnDemoDay1 = document.getElementById('btn-demo-day1');
  const btnDemoFlourishing = document.getElementById('btn-demo-flourishing');

  const simMsgBtn = document.getElementById('sim-msg-btn');
  const simBurstBtn = document.getElementById('sim-burst-btn');
  const simWaterBtn = document.getElementById('sim-water-btn');
  const simDryBtn = document.getElementById('sim-dry-btn');
  const simMilestoneBtn = document.getElementById('sim-milestone-btn');
  const simRainBtn = document.getElementById('sim-rain-btn');

  const cosmicRainLayer = document.getElementById('cosmic-rain-layer');
  const fallingLeavesLayer = document.getElementById('falling-leaves-layer');

  // Modal Elements
  const modalOverlay = document.getElementById('time-capsule-modal');
  const modalCloseBtn = document.getElementById('modal-close');
  const modalTreeIcon = document.getElementById('modal-tree-icon');
  const modalTreeName = document.getElementById('modal-tree-name');
  const modalPlantDate = document.getElementById('modal-plant-date');
  const modalLevelTabs = document.getElementById('modal-level-tabs');
  const modalLevelLabel = document.getElementById('modal-level-label');
  const modalCapsuleText = document.getElementById('modal-capsule-text');
  const modalAuthor = document.getElementById('modal-author');
  const modalSentiment = document.getElementById('modal-sentiment');
  const modalStageText = document.getElementById('modal-stage-text');
  const modalWaterBar = document.getElementById('modal-water-bar');
  const modalWaterAction = document.getElementById('modal-water-action');

  let activeTreeKey = null;
  let activeMemoryIndex = 0;

  // Initial Load: Day 1 Mode
  loadDay1Mode();
  enterLiveMode();
  startLiveSync(); // catch up to whatever the real backend already has

  btnDemoDay1.addEventListener('click', startFreshDay1);
  btnDemoFlourishing.addEventListener('click', loadFlourishingMode);
  attachCritterClickListeners();
  attachWeekTabListeners();

  function loadDay1Mode() {
    loadTemporalWeekSnapshot(1);
  }

  function loadFlourishingMode() {
    loadPreviewSnapshot(4);
  }

  // "Start Day 1" is a real restart, not a preview: reset the backend too,
  // or the live sync regrows the old garden on top of the barren moon.
  function startFreshDay1() {
    apiPost('/api/oasis/reset').then((s) => {
      loadDay1Mode();
      enterLiveMode();
      applyBackendState(s);
    });
  }

  function loadPreviewSnapshot(weekNum) {
    isLive = false;
    loadTemporalWeekSnapshot(weekNum);
  }

  // A highlighted week tab means "preview"; none highlighted means live.
  function enterLiveMode() {
    isLive = true;
    btnDemoDay1.classList.add('active');
    btnDemoFlourishing.classList.remove('active');
    document.querySelectorAll('.week-tab').forEach(tab => tab.classList.remove('active'));
  }

  // Real activity (chat box, demo buttons) belongs to the live garden, so
  // leave any preview first: regrow the real garden on a barren base,
  // keeping the chat log and without re-announcing milestones already reached.
  function exitPreview() {
    if (isLive) return;
    clearToBarrenMoon();
    enterLiveMode();
    applyBackendState(latestState, { announce: false });
  }

  // Temporal Weekly Snapshot Engine (W1, W2, W3, W4)
  function loadTemporalWeekSnapshot(weekNum) {
    state.currentWeek = weekNum;

    document.querySelectorAll('.week-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-week') == weekNum);
    });

    if (fallingLeavesLayer) fallingLeavesLayer.style.display = 'none';

    if (weekNum == 1) {
      mode = 'day1';
      btnDemoDay1.classList.add('active');
      btnDemoFlourishing.classList.remove('active');

      clearToBarrenMoon();

      chatStream.innerHTML = `
        <div class="chat-bubble agent-card-bubble">
          <div class="agent-card-header"><span class="card-icon">🌙</span><span>WEEK 1 TEMPORAL SNAPSHOT</span></div>
          <p class="card-body">🚀 <strong>Day 1 Pristine Crater Surface.</strong> Send your first iMessage to plant the first seed on the moon!</p>
          <div class="card-progress">
            <span>Next Milestone Target: <strong>0 / 100 Msgs</strong></span>
            <div class="progress-bar-track"><div class="progress-bar-fill" style="width: 0%;"></div></div>
          </div>
        </div>
      `;
    } else if (weekNum == 2) {
      mode = 'week2';
      btnDemoDay1.classList.remove('active');
      btnDemoFlourishing.classList.remove('active');

      state.messageCount = 35;
      state.waterLevel = 90;
      state.streakDays = 2;
      state.biosphereLevel = 35;

      activeTreeCapsules = {
        oak_01: { name: "Alex's Crystal Oak", icon: "💎", level: 1, memories: [fullTreeCapsules.oak_01.memories[0]] },
        cherry_01: { name: "Mei's Star Cherry", icon: "🌸", level: 1, memories: [fullTreeCapsules.cherry_01.memories[0]] }
      };

      crittersLayer.style.display = 'block';
      document.getElementById('critter-bunny').style.display = 'block';
      document.getElementById('critter-bat').style.display = 'none';
      document.getElementById('critter-manta').style.display = 'none';

      if (mossCarpetEl) mossCarpetEl.style.opacity = '0.5';
      document.querySelector('.lunar-surface-container').classList.remove('barren-mode');

      weatherTextEl.textContent = 'Oasis Status: W2 Historical Snapshot (Early Moss & Sprouts)';
      codexSubtextEl.textContent = 'W2 Snapshot: 2 Anchor Sprouts · Moon Bunny Visiting';

      codexChipsEl.innerHTML = `
        <div class="codex-chip active"><span class="chip-icon">🐰</span><span class="chip-name">Moon Bunny (Visiting)</span></div>
        <div class="codex-chip active"><span class="chip-icon">💎</span><span class="chip-name">Alex's Oak (Lvl 1)</span></div>
        <div class="codex-chip active"><span class="chip-icon">🌸</span><span class="chip-name">Mei's Cherry (Lvl 1)</span></div>
      `;

      renderFullTreesGrid();
    } else if (weekNum == 3) {
      mode = 'week3';
      btnDemoDay1.classList.remove('active');
      btnDemoFlourishing.classList.remove('active');

      state.messageCount = 85;
      state.waterLevel = 95;
      state.streakDays = 3;
      state.biosphereLevel = 70;

      activeTreeCapsules = {
        oak_01: { name: "Alex's Crystal Oak", icon: "💎", level: 2, memories: [fullTreeCapsules.oak_01.memories[0], fullTreeCapsules.oak_01.memories[1]] },
        cherry_01: { name: "Mei's Star Cherry", icon: "🌸", level: 2, memories: [fullTreeCapsules.cherry_01.memories[0], fullTreeCapsules.cherry_01.memories[1]] },
        willow_01: { name: "Shared Nebula Willow", icon: "🔮", level: 1, memories: [fullTreeCapsules.willow_01.memories[0]] }
      };

      crittersLayer.style.display = 'block';
      document.getElementById('critter-bunny').style.display = 'block';
      document.getElementById('critter-bat').style.display = 'block';
      document.getElementById('critter-manta').style.display = 'none';

      if (mossCarpetEl) mossCarpetEl.style.opacity = '0.85';
      document.querySelector('.lunar-surface-container').classList.remove('barren-mode');

      weatherTextEl.textContent = 'Oasis Status: W3 Historical Snapshot (Blooming Canopy)';
      codexSubtextEl.textContent = 'W3 Snapshot: 3 Anchor Trees · Moon Bunny & Space Bat Visiting';

      renderFullTreesGrid();
    } else if (weekNum == 4) {
      mode = 'flourishing';
      btnDemoFlourishing.classList.add('active');
      btnDemoDay1.classList.remove('active');

      state.messageCount = 142;
      state.waterLevel = 85;
      state.streakDays = 4;
      state.biosphereLevel = 100;
      activeTreeCapsules = JSON.parse(JSON.stringify(fullTreeCapsules));

      crittersLayer.style.display = 'block';
      document.getElementById('critter-bunny').style.display = 'block';
      document.getElementById('critter-bat').style.display = 'block';
      document.getElementById('critter-manta').style.display = 'block';

      if (mossCarpetEl) mossCarpetEl.style.opacity = '1';
      document.querySelector('.lunar-surface-container').classList.remove('barren-mode');

      weatherTextEl.textContent = 'Oasis Status: W4 Current Sanctuary (Full Bioluminescence)';
      codexSubtextEl.textContent = 'W4 Sanctuary: 4 Anchor Trees · 3 Visiting Space Critters Active';

      renderFullTreesGrid();
    }

    updateStateUI();
  }

  // Empty crater with every seed locked: the W1 snapshot, and the base the
  // live garden regrows on after a preview or a backend reset.
  function clearToBarrenMoon() {
    state.messageCount = 0;
    state.waterLevel = 100;
    state.streakDays = 1;
    state.biosphereLevel = 0;
    activeTreeCapsules = {};

    modalOverlay.style.display = 'none'; // its tree is about to be removed
    treesGrid.innerHTML = '';
    crittersLayer.style.display = 'none';
    // Undo the W2/W3 snapshots hiding individual critters.
    ['critter-bunny', 'critter-bat', 'critter-manta'].forEach(id => {
      document.getElementById(id).style.display = '';
    });
    if (mossCarpetEl) mossCarpetEl.style.opacity = '0';
    document.querySelector('.lunar-surface-container').classList.add('barren-mode');

    weatherTextEl.textContent = 'Oasis Status: W1 Historical Snapshot (Pristine Barren Moon)';
    codexSubtextEl.textContent = 'W1 Snapshot: Awaiting First Planted Seed';

    codexChipsEl.innerHTML = `
      <div class="codex-chip locked" id="codex-oak-chip" title="Planted at Message #1"><span class="chip-icon">🔒</span><span class="chip-name">Alex's Oak (Message #1)</span></div>
      <div class="codex-chip locked" id="codex-cherry-chip" title="Planted at Message #20"><span class="chip-icon">🔒</span><span class="chip-name">Mei's Cherry (Message #20)</span></div>
      <div class="codex-chip locked" id="codex-mother-chip" title="Unlocked at 100 Messages"><span class="chip-icon">🔒</span><span class="chip-name">Mother Baobab (100 Msgs)</span></div>
    `;
  }

  // Dynamic Milestone Math
  function getMilestoneTarget(count) {
    return Math.ceil((count + 1) / 100) * 100;
  }

  function getMilestoneProgressPercent(count) {
    const target = getMilestoneTarget(count);
    const prevTarget = target - 100;
    const progress = ((count - prevTarget) / 100) * 100;
    return Math.min(100, Math.max(0, Math.round(progress)));
  }

  // Handle Sending Messages
  chatSendBtn.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendMessage();
  });

  function handleSendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    exitPreview();

    appendBubble('user-bubble', 'Alex (St. Louis)', text, 'Just now');
    chatInput.value = '';

    if (fallingLeavesLayer) fallingLeavesLayer.style.display = 'none';
    document.querySelectorAll('.tree-item').forEach(t => t.classList.remove('thirsty-state'));

    apiPost('/api/oasis/message', { text, author: 'Alex (St. Louis)' }).then((s) => {
      const wasFirst = s.messageCount === 1;
      applyBackendState(s);
      if (!wasFirst) {
        setTimeout(() => {
          const target = getMilestoneTarget(s.messageCount);
          appendAgentCard(`✨ <strong>Message registered! Trees watered to 100%.</strong> Count: <strong>${s.messageCount} / ${target} Msgs</strong>.`);
        }, 400);
      }
    });
  }

  function plantFirstSprout(userText, announce = true) {
    activeTreeCapsules['oak_01'] = {
      name: "Alex's Crystal Oak", icon: "💎", level: 1,
      memories: [{ level: 1, date: "Level 1 · Day 1 (Message #1)", author: "Alex (St. Louis)", snippet: userText, sentiment: "Warm Beginning" }]
    };

    state.biosphereLevel = Math.max(20, state.biosphereLevel);
    weatherTextEl.textContent = 'Oasis Status: First Seedling Planted! 🌱';
    codexSubtextEl.textContent = '1 Anchor Tree Active · Moss Sprouting';

    renderTreeElement('oak_01', activeTreeCapsules['oak_01']);

    if (!announce) return;
    setTimeout(() => {
      appendAgentCard(
        `🌱 <strong>FIRST SEED PLANTED ON THE MOON!</strong> Photon Agent detected your entry and planted <em>Alex's Crystal Oak Seedling</em>.`
      );
    }, 400);
  }

  function checkMilestoneUnlocks(announce = true) {
    if (state.biosphereLevel >= 25) {
      if (mossCarpetEl) mossCarpetEl.style.opacity = '1';
      document.querySelector('.lunar-surface-container').classList.remove('barren-mode');
    }

    if (state.biosphereLevel >= 35) {
      crittersLayer.style.display = 'block';
    }

    if (state.messageCount >= 100 && !activeTreeCapsules['mother_tree']) {
      activeTreeCapsules['mother_tree'] = JSON.parse(JSON.stringify(fullTreeCapsules.mother_tree));
      renderTreeElement('mother_tree', activeTreeCapsules['mother_tree']);

      const motherChip = document.getElementById('codex-mother-chip');
      if (motherChip) {
        motherChip.className = 'codex-chip active';
        motherChip.innerHTML = '<span class="chip-icon">🌳</span><span class="chip-name">Mother Baobab (Lvl 3)</span>';
      }

      if (announce) {
        appendAgentCard(
          `🎆 <strong>100-MESSAGE MILESTONE UNLOCKED!</strong> The <strong>Mother Baobab Tree</strong> sprouted with a glowing galaxy canopy!`
        );
      }
    }
  }

  // Simulation Triggers
  simMsgBtn.addEventListener('click', () => {
    exitPreview();
    if (fallingLeavesLayer) fallingLeavesLayer.style.display = 'none';
    document.querySelectorAll('.tree-item').forEach(t => t.classList.remove('thirsty-state'));

    appendBubble('partner-bubble', 'Mei (Hangzhou)', 'Sending a quick hello from Hangzhou! 🌸', 'Just now');
    apiPost('/api/oasis/message', { text: 'Sending a quick hello from Hangzhou! 🌸', author: 'Mei (Hangzhou)' })
      .then(applyBackendState);
  });

  simBurstBtn.addEventListener('click', () => {
    exitPreview();
    if (fallingLeavesLayer) fallingLeavesLayer.style.display = 'none';
    document.querySelectorAll('.tree-item').forEach(t => t.classList.remove('thirsty-state'));

    appendBubble('partner-bubble', 'Mei (Hangzhou)', 'Talking about trip memories and stargazing under the moon! ✨', 'Just now');
    const hadOak = !!activeTreeCapsules['oak_01'];
    apiPost('/api/oasis/message', {
      text: 'Talking about trip memories and stargazing under the moon! ✨',
      author: 'Mei (Hangzhou)',
      count: 10,
    }).then((s) => {
      applyBackendState(s);
      // Per-tree "levels" aren't tracked by the backend (it only knows
      // oakPlanted/motherTreePlanted) — leveling an already-planted oak
      // stays a cosmetic client-side flourish, same as before.
      if (hadOak) levelUpTree('oak_01');
    });
  });

  // Restore Water
  simWaterBtn.addEventListener('click', () => {
    exitPreview();
    apiPost('/api/oasis/water').then((s) => {
      applyBackendState(s);
      appendAgentCard(`💧 <strong>Tree Water Reaction Received!</strong> Water restored to 100%. Falling leaves stopped, flowers blooming!`);
    });
  });

  // Simulate 2 Days Inactivity (Leaves Drop Mechanic)
  if (simDryBtn) {
    simDryBtn.addEventListener('click', () => {
      exitPreview();
      apiPost('/api/oasis/demo/inactivity').then((s) => {
        applyBackendState(s);
        appendAgentCard(
          `🍂 <strong>INACTIVITY DETECTED (2 DAYS WITHOUT CHATTING)!</strong> Water level dropped to ${s.waterLevel}%. Trees are dropping leaves, but they haven't died! Send an iMessage to water them back to 100%.`
        );
      });
    });
  }

  simMilestoneBtn.addEventListener('click', () => {
    exitPreview();
    apiPost('/api/oasis/demo/milestone').then((s) => {
      applyBackendState(s);

      const motherTreeEl = document.querySelector('[data-tree-id="mother_tree"]');
      if (motherTreeEl) {
        motherTreeEl.classList.add('evolving');
        setTimeout(() => motherTreeEl.classList.remove('evolving'), 800);
      }
    });
  });

  simRainBtn.addEventListener('click', () => {
    apiPost('/api/oasis/rain/toggle').then((s) => {
      state.cosmicRainActive = s.cosmicRainActive;
      cosmicRainLayer.style.display = state.cosmicRainActive ? 'block' : 'none';
      simRainBtn.textContent = state.cosmicRainActive ? '🌧️ Rain: Active' : '🌧️ Toggle Cosmic Rain';
    });
  });

  function levelUpTree(key) {
    const treeData = activeTreeCapsules[key];
    if (!treeData) return;

    treeData.level += 1;
    treeData.memories.push({
      level: treeData.level,
      date: `Level ${treeData.level} · Just now (Message #${state.messageCount})`,
      author: "Alex (St. Louis)",
      snippet: "High chat velocity milestone! Added another memory layer to tree.",
      sentiment: "High Chat Velocity"
    });

    const treeEl = document.querySelector(`[data-tree-id="${key}"]`);
    if (treeEl) {
      const badge = treeEl.querySelector('.level-badge');
      if (badge) badge.textContent = `Lvl ${treeData.level}`;
      treeEl.classList.add('evolving');
      setTimeout(() => treeEl.classList.remove('evolving'), 800);
    }

    const target = getMilestoneTarget(state.messageCount);
    appendAgentCard(
      `💎 <strong>${treeData.name} LEVELED UP to Level ${treeData.level}!</strong> New time capsule memory attached to canopy (Message #${state.messageCount} / ${target}).`
    );
  }

  // Critter Clicking
  function attachCritterClickListeners() {
    const bunny = document.getElementById('critter-bunny');
    const bat = document.getElementById('critter-bat');
    const manta = document.getElementById('critter-manta');

    if (bunny) {
      bunny.onclick = () => {
        alert(`🐰 Luna Lagomorph (Moon Bunny):\n"I visited your oasis because of your ${state.streakDays}-day chat streak! Hop hop!"`);
      };
    }
    if (bat) {
      bat.onclick = () => {
        alert(`🦇 Nebula Space Bat:\n"I love roosting near your bioluminescent trees during late night conversations!"`);
      };
    }
    if (manta) {
      manta.onclick = () => {
        alert(`🌌 Cosmic Manta Ray:\n"Floating through your aurora mist! Your oasis flourish score is at ${state.biosphereLevel}%!"`);
      };
    }
  }

  // Render Full Trees Grid
  function renderFullTreesGrid() {
    treesGrid.innerHTML = '';
    Object.keys(activeTreeCapsules).forEach(key => {
      renderTreeElement(key, activeTreeCapsules[key]);
    });
  }

  // Render Individual Tree SVG Element
  function renderTreeElement(key, treeData) {
    let treeItem = document.querySelector(`[data-tree-id="${key}"]`);
    if (!treeItem) {
      treeItem = document.createElement('div');
      treeItem.className = `tree-item ${key === 'mother_tree' ? 'mother-tree' : ''} mature-stage evolving`;
      treeItem.setAttribute('data-tree-id', key);
      treesGrid.appendChild(treeItem);
    }

    let auraClass = 'cyan-aura';
    if (key === 'mother_tree') auraClass = 'purple-aura';
    if (key === 'cherry_01') auraClass = 'pink-aura';
    if (key === 'willow_01') auraClass = 'green-aura';

    treeItem.innerHTML = `
      <div class="tree-aura-glow ${auraClass}"></div>
      <div class="level-badge">Lvl ${treeData.level}</div>
      ${getTreeSvgMarkup(key)}
      <span class="tree-label">${treeData.name}</span>
    `;

    setTimeout(() => treeItem.classList.remove('evolving'), 800);
    attachTreeClickListeners();
  }

  function getTreeSvgMarkup(key) {
    if (key === 'mother_tree') {
      return `
        <svg viewBox="0 0 48 56" class="tree-svg mother-tree-svg">
          <path d="M 18 42 L 22 28 L 26 28 L 30 42 Z" fill="#3b1d0c" />
          <path d="M 21 28 L 27 28 L 25 50 L 23 50 Z" fill="#582f0e" />
          <rect x="16" y="44" width="16" height="4" fill="#241005" />
          <line x1="20" y1="32" x2="16" y2="46" stroke="#00f0ff" stroke-width="2" />
          <line x1="28" y1="32" x2="32" y2="46" stroke="#ff2a8d" stroke-width="2" />
          <circle cx="24" cy="22" r="20" fill="#7c3aed" opacity="0.9" />
          <circle cx="24" cy="18" r="16" fill="#c084fc" />
          <circle cx="24" cy="14" r="12" fill="#ec4899" />
          <circle cx="24" cy="10" r="7" fill="#fef08a" />
          <circle cx="14" cy="22" r="3" fill="#ffe600" />
          <circle cx="34" cy="22" r="3" fill="#ffe600" />
        </svg>
      `;
    } else if (key === 'cherry_01') {
      return `
        <svg viewBox="0 0 40 48" class="tree-svg">
          <path d="M 18 26 Q 16 36 20 44 L 24 44 Q 20 36 22 26 Z" fill="#4a2408" />
          <circle cx="20" cy="18" r="14" fill="#ff4d8d" />
          <circle cx="14" cy="14" r="9" fill="#ff85a1" />
          <circle cx="26" cy="16" r="8" fill="#ffb3c6" />
          <circle cx="20" cy="10" r="7" fill="#ffe5ec" />
          <rect x="10" y="24" width="3" height="3" fill="#ffb3c6" />
        </svg>
      `;
    } else if (key === 'willow_01') {
      return `
        <svg viewBox="0 0 40 48" class="tree-svg">
          <rect x="18" y="24" width="4" height="20" fill="#065f46" />
          <path d="M 12 12 Q 8 26 10 36 M 28 12 Q 32 26 30 36 M 20 6 Q 14 20 16 34" stroke="#50fa7b" stroke-width="2" fill="none" />
          <circle cx="20" cy="12" r="10" fill="#10b981" />
          <circle cx="20" cy="8" r="6" fill="#6ee7b7" />
        </svg>
      `;
    } else {
      // Alex's Crystal Oak
      return `
        <svg viewBox="0 0 40 48" class="tree-svg">
          <rect x="18" y="26" width="4" height="18" fill="#1e293b" />
          <line x1="20" y1="26" x2="20" y2="44" stroke="#00f0ff" stroke-width="1.5" />
          <polygon points="20,2 8,20 32,20" fill="#00f0ff" opacity="0.9" />
          <polygon points="20,10 11,26 29,26" fill="#38bdf8" />
          <polygon points="20,16 14,30 26,30" fill="#818cf8" />
          <circle cx="14" cy="20" r="3" fill="#ffe600" />
          <circle cx="26" cy="20" r="3" fill="#ffe600" />
        </svg>
      `;
    }
  }

  // Helper: Append Chat Bubble
  function appendBubble(type, sender, text, time) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}`;
    bubble.innerHTML = `
      <span class="chat-sender">${sender}</span>
      <p>${text}</p>
      <span class="chat-time">${time}</span>
    `;
    chatStream.appendChild(bubble);
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  // Helper: Append Agent Status Card
  function appendAgentCard(htmlContent) {
    const card = document.createElement('div');
    card.className = 'chat-bubble agent-card-bubble';
    const target = getMilestoneTarget(state.messageCount);
    const percent = getMilestoneProgressPercent(state.messageCount);

    card.innerHTML = `
      <div class="agent-card-header">
        <span class="card-icon">🌙</span>
        <span>PHOTON OASIS AGENT</span>
      </div>
      <div class="card-body">${htmlContent}</div>
      <div class="card-progress">
        <span>Next Milestone Target: <strong>${state.messageCount} / ${target} Msgs</strong></span>
        <div class="progress-bar-track"><div class="progress-bar-fill" style="width: ${percent}%;"></div></div>
      </div>
    `;
    chatStream.appendChild(card);
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  // Helper: Update Header UI Counters & Environmental Desaturation
  function updateStateUI() {
    const target = getMilestoneTarget(state.messageCount);
    if (msgCounterEl) msgCounterEl.textContent = `${state.messageCount} / ${target} Msgs`;
    if (waterLevelEl) waterLevelEl.textContent = `Water: ${state.waterLevel}%`;
    if (streakCountEl) streakCountEl.textContent = `${state.streakDays}-Day Streak`;
    if (biosphereLevelEl) biosphereLevelEl.textContent = `Oasis: ${state.biosphereLevel}% Lush`;

    const progressFill = document.getElementById('card-progress-fill');
    if (progressFill) progressFill.style.width = `${getMilestoneProgressPercent(state.messageCount)}%`;
    const milestoneText = document.getElementById('card-milestone-text');
    if (milestoneText) milestoneText.textContent = `${state.messageCount} / ${target} Msgs`;

    // Desaturation & Leaf Loss Environmental Trigger
    const fallingLeavesLayer = document.getElementById('falling-leaves-layer');
    const mossGround = document.querySelector('.glowing-moss-carpet');
    const trees = document.querySelectorAll('.tree-item');

    if (state.waterLevel < 50) {
      trees.forEach(t => t.classList.add('thirsty-state'));
      if (mossGround) mossGround.classList.add('thirsty-moss');
      if (fallingLeavesLayer) fallingLeavesLayer.style.display = 'block';
    } else {
      trees.forEach(t => t.classList.remove('thirsty-state'));
      if (mossGround) mossGround.classList.remove('thirsty-moss');
      if (fallingLeavesLayer) fallingLeavesLayer.style.display = 'none';
    }
  }

  // Tree Modal Handlers
  function attachTreeClickListeners() {
    const trees = document.querySelectorAll('.tree-item');
    trees.forEach(tree => {
      tree.onclick = () => {
        const treeKey = tree.getAttribute('data-tree-id');
        if (activeTreeCapsules[treeKey]) {
          openTimeCapsuleModal(treeKey);
        }
      };
    });
  }

  function openTimeCapsuleModal(treeKey) {
    activeTreeKey = treeKey;
    const treeData = activeTreeCapsules[treeKey];
    activeMemoryIndex = treeData.memories.length - 1;

    modalTreeIcon.textContent = treeData.icon;
    modalTreeName.textContent = treeData.name;
    modalPlantDate.textContent = `Level ${treeData.level} · ${treeData.memories.length} Stacked Chat Memories`;
    modalStageText.textContent = `Water: ${state.waterLevel}% (${state.waterLevel < 50 ? 'Dropping Leaves' : 'Healthy & Blooming'})`;
    modalWaterBar.style.width = `${state.waterLevel}%`;

    renderLevelTabs(treeData);
    displayMemoryDetail(treeData.memories[activeMemoryIndex]);

    modalOverlay.style.display = 'flex';
  }

  function renderLevelTabs(treeData) {
    modalLevelTabs.innerHTML = '';
    treeData.memories.forEach((mem, idx) => {
      const tab = document.createElement('button');
      tab.className = `level-tab-btn ${idx === activeMemoryIndex ? 'active' : ''}`;
      tab.textContent = `Lvl ${mem.level}`;
      tab.onclick = () => {
        activeMemoryIndex = idx;
        document.querySelectorAll('.level-tab-btn').forEach(b => b.classList.remove('active'));
        tab.classList.add('active');
        displayMemoryDetail(treeData.memories[idx]);
      };
      modalLevelTabs.appendChild(tab);
    });
  }

  function displayMemoryDetail(mem) {
    modalLevelLabel.textContent = `📜 Level ${mem.level} Memory Capsule (${mem.date}):`;
    modalCapsuleText.textContent = `"${mem.snippet}"`;
    modalAuthor.textContent = `Sent by ${mem.author}`;
    modalSentiment.textContent = `Sentiment: ${mem.sentiment}`;
  }

  modalCloseBtn.addEventListener('click', () => {
    modalOverlay.style.display = 'none';
  });

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.style.display = 'none';
  });

  modalWaterAction.addEventListener('click', () => {
    if (activeTreeKey) {
      apiPost('/api/oasis/water').then((s) => {
        applyBackendState(s);
        levelUpTree(activeTreeKey); // cosmetic per-tree flourish, same as before
        openTimeCapsuleModal(activeTreeKey);
      });
    }
  });

  // Temporal Week Selector Listener (W1, W2, W3, W4)
  function attachWeekTabListeners() {
    const weekTabs = document.querySelectorAll('.week-tab');
    weekTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const weekNum = parseInt(tab.getAttribute('data-week'), 10);
        loadPreviewSnapshot(weekNum);
      });
    });
  }
});
