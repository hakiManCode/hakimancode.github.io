// deno-lint-ignore-file

// -------------------- RARITIES --------------------
const rarities = [
  { name: "Common", color: "gray", chance: 2 },
  { name: "Uncommon", color: "green", chance: 4 },
  { name: "Rare", color: "blue", chance: 16 },
  { name: "Epic", color: "purple", chance: 64 },
  { name: "Ultra Rare", color: "red", chance: 512 },
  { name: "Legendary", color: "orange", chance: 1024 },
  { name: "Mythic", color: "yellow", chance: 10000 },
  { name: "Luminous", color: "#fffacd", chance: 125000 },
  { name: "Abyssal", color: "#00bfff", chance: 200000 },
  // NEW RARITY: Apollo (Fiery)
  { name: "Apollo", color: "#ff4500", chance: 250000 },
];

// -------------------- STORAGE / STATE --------------------
let stats = JSON.parse(localStorage.getItem("stats")) || {};
let pity = JSON.parse(localStorage.getItem("pity")) || { ultra: 0, legendary: 0, mythic: 0 };
let rolling = false;
let rollCount = rarities.reduce((sum, r) => sum + (stats[r.name] || 0), 0);
let buffActive = JSON.parse(localStorage.getItem("buffActive")) || false;
let fastRoll = false; // dev feature

// ensure stats keys exist
rarities.forEach(r => { if (!stats[r.name]) stats[r.name] = 0; });
updateStats();
updatePity();
updateBuffButton();

// -------------------- UTILITY --------------------
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Weighted rarity (actual roll)
function getWeightedRarity() {
  const ultraMultiplier = pity.ultra >= 300 ? 10 : 1;
  const legendaryMultiplier = pity.legendary >= 700 ? 50 : 1;
  const mythicMultiplier = pity.mythic >= 1000 ? 100 : 1;

  const totalWeight = rarities.reduce((sum, r) => {
    let weight = 1 / r.chance;
    if (r.name === "Ultra Rare") weight *= ultraMultiplier;
    if (r.name === "Legendary") weight *= legendaryMultiplier;
    if (r.name === "Mythic") weight *= mythicMultiplier;
    return sum + weight;
  }, 0);

  let pick = Math.random() * totalWeight;
  for (let r of rarities) {
    let weight = 1 / r.chance;
    if (r.name === "Ultra Rare") weight *= ultraMultiplier;
    if (r.name === "Legendary") weight *= legendaryMultiplier;
    if (r.name === "Mythic") weight *= mythicMultiplier;
    pick -= weight;
    if (pick <= 0) return r;
  }
  return rarities[0];
}

// Fake cutscene uses the same weighting but doesn't affect stats/pity
function getFakeRarity() {
  return getWeightedRarity();
}

// -------------------- EFFECTS --------------------
function triggerScreenEffect(rarity) {
  if (rarity.name === "Luminous") {
    luminousCutscene();
    return;
  }
  
  if (rarity.name === "Abyssal") {
    abyssalCutscene();
    return;
  }
  
  if (rarity.name === "Apollo") { // NEW CHECK
    apolloCutscene();
    return;
  }

  const screen = document.getElementById("screen-effect");
  if (!screen) return;
  screen.className = "";
  void screen.offsetWidth;
  const cls = "effect-" + rarity.name.toLowerCase().replace(/\s+/g, "");
  screen.classList.add(cls);

  screen.style.opacity = "1";
  setTimeout(() => { screen.style.opacity = "0"; }, 320);
}

function spawnParticles(rarity) {
  if (!["Epic", "Ultra Rare", "Legendary", "Mythic"].includes(rarity.name)) return;
  const container = document.getElementById("particle-container");
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.left = `${randInt(0, window.innerWidth)}px`;
    p.style.top = `${randInt(0, window.innerHeight)}px`;
    p.style.backgroundColor = rarity.color;
    container.appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }
}

// -------------------- ROLL --------------------
async function roll() {
  if (rolling) return;
  rolling = true;

  const button = document.getElementById("rngbutton");
  const display = document.getElementById("rarity");
  const sub = document.getElementById("rarity-chance");

  if (!display || !sub) {
    if (button) button.disabled = false;
    rolling = false;
    return;
  }

  try {
    if (button) button.disabled = true;

    if (!fastRoll) {
      display.style.transition = "transform 180ms cubic-bezier(.2,.9,.2,1), opacity 200ms ease";

      const iterations = 10;
      for (let i = 0; i < iterations; i++) {
        const fake = getFakeRarity();
        display.textContent = fake.name;
        display.style.color = fake.color;
        sub.textContent = `1 in ${fake.chance}`;

        display.style.transition = "none";
        display.style.transform = "translateY(-10px)";
        void display.offsetWidth;
        display.style.transition = "transform 160ms cubic-bezier(.2,.9,.2,1)";
        display.style.transform = "translateY(0)";

        const delay = 40 + i * 30;
        await new Promise(res => setTimeout(res, delay));
      }
    }

    const result = getWeightedRarity();

    if (result.name === "Luminous") {
      await luminousCutscene();
    } else if (result.name === "Abyssal") {
      await abyssalCutscene();
    } else if (result.name === "Apollo") { // NEW CALL
      await apolloCutscene();
    }


    display.style.transition = "none";
    display.style.transform = "translateY(-20px)";
    display.style.opacity = "0";
    void display.offsetWidth;

    display.textContent = result.name;
    display.style.color = result.color;
    sub.textContent = `1 in ${result.chance}`;

    display.style.transition = "transform 300ms cubic-bezier(.2,.9,.2,1), opacity 300ms ease-out";
    display.style.transform = "translateY(0)";
    display.style.opacity = "1";

    stats[result.name] = (stats[result.name] || 0) + 1;
    localStorage.setItem("stats", JSON.stringify(stats));

    pity.ultra = (pity.ultra || 0) + 1;
    pity.legendary = (pity.legendary || 0) + 1;
    pity.mythic = (pity.mythic || 0) + 1;
    if (result.name === "Ultra Rare") pity.ultra = 0;
    if (result.name === "Legendary") pity.legendary = 0;
    if (result.name === "Mythic") pity.mythic = 0;
    localStorage.setItem("pity", JSON.stringify(pity));

    rollCount++;
    localStorage.setItem("rollCount", rollCount);

    updateStats();
    updatePity();
    updateBuffButton();
    checkAchievements(result);

    triggerScreenEffect(result);
    spawnParticles(result);

  } catch (err) {
    console.error("roll error:", err);
  } finally {
    if (button) button.disabled = false;
    rolling = false;
  }
}

// -------------------- STATS / PITY UI --------------------
function updateStats() {
  const list = document.getElementById("stats-list");
  const statsTitle = document.querySelector("#stats h2");
  if (!list || !statsTitle) return;

  // Calculate total rolls
  const totalRolls = rarities.reduce((sum, r) => sum + (stats[r.name] || 0), 0);

  // Show total rolls in the title
  statsTitle.textContent = `Stats (Total Rolls: ${totalRolls})`;

  // Clear and rebuild list
  list.innerHTML = "";
  rarities.forEach(r => {
    const rolled = stats[r.name] || 0;
    const li = document.createElement("li");

    const nameText = rolled > 0 ? r.name : "???";
    const chanceText = rolled > 0 ? `1 in ${r.chance}` : "???";
    const rolledText = rolled > 0 ? rolled : 0;

    li.innerHTML = `${nameText} — Rolled: ${rolledText} <span class="subtext">${chanceText}</span>`;
    list.appendChild(li);
  });
}


function updatePity() {
  const list = document.getElementById("pity-list");
  if (!list) return;
  list.innerHTML = `Ultra Rare: ${pity.ultra || 0}/300 | Legendary: ${pity.legendary || 0}/700 | Mythic: ${pity.mythic || 0}/1000`;
}

// -------------------- BUFF --------------------
function updateBuffButton() {
  const buyBtn = document.getElementById('buy-buff');
  const buffText = document.getElementById('buff-text');
  if (!buyBtn) return;
  buyBtn.disabled = rollCount < 5000;
  buyBtn.title = buyBtn.disabled
    ? `Need ${5000 - rollCount} more rolls to buy the buff`
    : 'Buy 1.2x Multiplier (5000 Rolls)';
  if (buffText) {
    buffText.textContent = `Total rolls: ${rollCount} | Buffs: ${buffActive ? 'ON' : 'OFF'}`;
  }
}

function buyBuff() {
  if (rollCount < 5000) return;
  rollCount -= 5000;
  buffActive = true;
  localStorage.setItem("rollCount", rollCount);
  localStorage.setItem("buffActive", true);
  updateBuffButton();
}

document.getElementById('buy-buff')?.addEventListener('click', buyBuff);

// -------------------- ACHIEVEMENTS --------------------
const achievements = JSON.parse(localStorage.getItem("achievements")) || {
  "10kRoll": false,
  "100kRoll": false,
  "200kRoll": false,
  "250kRoll": false, // NEW ACHIEVEMENT
};

function checkAchievements(rarity) {
  if (rarity.chance >= 10000 && !achievements["10kRoll"]) {
    achievements["10kRoll"] = true;
    alert("🏆 Achievement Unlocked: Hit a 1 in 10,000+ rarity!");
  }
  if (rarity.chance >= 100000 && !achievements["100kRoll"]) {
    achievements["100kRoll"] = true;
    alert("🏆 Achievement Unlocked: Hit a 1 in 100,000+ rarity!");
  }
  if (rarity.chance >= 200000 && !achievements["200kRoll"]) {
    achievements["200kRoll"] = true;
    alert("🏆 Achievement Unlocked: Hit a 1 in 200,000+ rarity (The Abyssal Plunge)!");
  }
  if (rarity.chance >= 250000 && !achievements["250kRoll"]) { // NEW CHECK
    achievements["250kRoll"] = true;
    alert("🏆 Achievement Unlocked: Hit a 1 in 250,000+ rarity (The Solar Forge)!");
  }
  localStorage.setItem("achievements", JSON.stringify(achievements));
  updateAchievementsUI();
}

function updateAchievementsUI() {
  const list = document.getElementById("achievements-list");
  list.innerHTML = "";
  const data = [
    { id: "10kRoll", text: "Roll a 10k+ rarity" },
    { id: "100kRoll", text: "Roll a 100k+ rarity" },
    { id: "200kRoll", text: "Roll a 200k+ rarity (Abyssal)" },
    { id: "250kRoll", text: "Roll a 250k+ rarity (Apollo)" }, // NEW DISPLAY TEXT
  ];
  data.forEach(a => {
    const li = document.createElement("li");
    li.textContent = a.text;
    if (achievements[a.id]) li.classList.add("unlocked");
    list.appendChild(li);
  });
}

document.getElementById("toggle-achievements").addEventListener("click", () => {
  const panel = document.getElementById("achievements-panel");
  panel.style.display = panel.style.display === "none" ? "block" : "none";
});
updateAchievementsUI();

// -------------------- DEV PANEL --------------------
function showDevPanel() {
  const code = prompt("Enter dev access code:");
  if (code !== "h4ckc1ub") return alert("Wrong code.");

  const panel = document.getElementById("dev-panel");
  panel.style.display = "block";

  // Ensure the checkbox syncs with fastRoll
  const fastToggle = document.getElementById("fast-roll-toggle");
  fastToggle.checked = fastRoll;
  fastToggle.addEventListener("change", (e) => {
    fastRoll = e.target.checked;
  });

  // Minimize/expand functionality
  const minimizeBtn = document.getElementById("dev-minimize");
  const content = document.getElementById("dev-content");
  minimizeBtn.onclick = () => {
    if (content.style.display === "none") {
      content.style.display = "block";
      minimizeBtn.textContent = "_"; // collapse symbol
    } else {
      content.style.display = "none";
      minimizeBtn.textContent = "+"; // expand symbol
    }
  };
}

document.getElementById("dev-unlock")?.addEventListener("click", showDevPanel);


// -------------------- LUMINOUS CUTSCENE --------------------
async function luminousCutscene() {
  const overlay = document.createElement("div");
  overlay.id = "luminous-overlay";
  overlay.innerHTML = `
    <div class="luminous-gradient"></div>
    <h1 class="luminous-title">RNG Unlimited</h1>
    <div id="luminous-particles"></div>
  `;
  document.body.appendChild(overlay);

  const particleContainer = document.getElementById("luminous-particles");
  
  // Start continuous particle spawning (10 particles/second)
  const particleInterval = setInterval(() => {
    const p = document.createElement("div");
    p.className = "luminous-particle";
    
    // Spawn horizontally random
    p.style.left = `${randInt(0, window.innerWidth)}px`;
    
    // Start just off-screen at the bottom (+ small random offset)
    p.style.top = `${window.innerHeight + (Math.random() * 50)}px`; 
    
    // Stagger the movement start slightly
    p.style.animationDelay = `${Math.random() * 0.5}s`;
    
    particleContainer.appendChild(p);
  }, 100); 

  // 1. Wait for the main black screen phase (8 seconds)
  await new Promise(res => setTimeout(res, 8000));
  
  // STOP the particle spawning loop
  clearInterval(particleInterval);

  // 2. Start the slow fade to white (1 second)
  overlay.classList.add("fade-white");
  await new Promise(res => setTimeout(res, 1000));

  // 3. Start the heavy shake while the screen is fully white
  let intensity = 100; // Increased intensity
  const start = Date.now();
  const dur = 800; // Duration of the intense shake
  (function shakeFrame() {
    const elapsed = Date.now() - start;
    if (elapsed >= dur) {
      document.body.style.transform = "";
      
      // Cleanup the cutscene elements after the shake
      setTimeout(() => overlay.remove(), 200);
      return;
    }
    const decay = 1 - elapsed / dur;
    const x = (Math.random() - 0.5) * intensity * decay;
    const y = (Math.random() - 0.5) * intensity * decay;
    document.body.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(shakeFrame);
  })();
}

// -------------------- ABYSSAL CUTSCENE --------------------
async function abyssalCutscene() {
  const overlay = document.createElement("div");
  overlay.id = "abyssal-overlay";
  overlay.innerHTML = `
    <div class="abyssal-gradient"></div>
    <h1 class="abyssal-title">RNG Unlimited</h1>
    <div id="abyssal-particles"></div>
  `;
  document.body.appendChild(overlay);

  const particleContainer = document.getElementById("abyssal-particles");
  
  // Start continuous particle spawning (Slower: 1 particle/150ms for more dispersed look)
  const particleInterval = setInterval(() => {
    const p = document.createElement("div");
    p.className = "abyssal-particle";
    
    // Spawn horizontally random
    p.style.left = `${randInt(0, window.innerWidth)}px`;
    
    // Start just off-screen at the bottom (+ small random offset)
    p.style.top = `${window.innerHeight + (Math.random() * 50)}px`; 
    
    // Longer animation delay for a wave-like staggered start
    p.style.animationDelay = `${Math.random() * 2}s`; 
    
    // Add random horizontal drift offset for aquatic feel
    p.style.setProperty('--drift-x', `${(Math.random() - 0.5) * 50}px`);
    
    particleContainer.appendChild(p);
  }, 150);

  // 1. Wait for the main dark screen phase (8 seconds)
  await new Promise(res => setTimeout(res, 8000));
  
  // STOP the particle spawning loop
  clearInterval(particleInterval);

  // 2. Start the slow fade to deep blue (1 second)
  overlay.classList.add("fade-blue");
  await new Promise(res => setTimeout(res, 1000));

  // 3. Start the heavy shake while the screen is fully blue
  let intensity = 120; // Slightly stronger shake
  const start = Date.now();
  const dur = 800; // Duration of the intense shake
  (function shakeFrame() {
    const elapsed = Date.now() - start;
    if (elapsed >= dur) {
      document.body.style.transform = "";
      
      // Cleanup the cutscene elements after the shake
      setTimeout(() => overlay.remove(), 200);
      return;
    }
    const decay = 1 - elapsed / dur;
    const x = (Math.random() - 0.5) * intensity * decay;
    const y = (Math.random() - 0.5) * intensity * decay;
    document.body.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(shakeFrame);
  })();
}

// -------------------- APOLLO CUTSCENE --------------------
async function apolloCutscene() { // NEW FUNCTION
  const overlay = document.createElement("div");
  overlay.id = "apollo-overlay";
  overlay.innerHTML = `
    <div class="apollo-gradient"></div>
    <h1 class="apollo-title">RNG Unlimited</h1>
    <div id="apollo-particles"></div>
  `;
  document.body.appendChild(overlay);

  const particleContainer = document.getElementById("apollo-particles");
  
  // Start continuous particle spawning (small, fast embers)
  const particleInterval = setInterval(() => {
    const p = document.createElement("div");
    p.className = "apollo-particle";
    
    // UPDATED: Spawn horizontally across the entire screen
    p.style.left = `${randInt(0, window.innerWidth)}px`; 
    
    // Start just off-screen at the bottom (+ small random offset)
    p.style.top = `${window.innerHeight + (Math.random() * 50)}px`; 
    
    // Stagger the movement start slightly
    p.style.animationDelay = `${Math.random() * 1}s`;
    
    particleContainer.appendChild(p);
  }, 50); // Faster spawn rate

  // 1. Wait for the main dark screen phase (8 seconds)
  await new Promise(res => setTimeout(res, 8000));
  
  // STOP the particle spawning loop
  clearInterval(particleInterval);

  // 2. Start the slow fade to bright orange (1 second)
  overlay.classList.add("fade-orange");
  await new Promise(res => setTimeout(res, 1000));

  // 3. Start the intense shake while the screen is fully orange/red
  let intensity = 130; // Very intense shake
  const start = Date.now();
  const dur = 800; // Duration of the intense shake
  (function shakeFrame() {
    const elapsed = Date.now() - start;
    if (elapsed >= dur) {
      document.body.style.transform = "";
      
      // Cleanup the cutscene elements after the shake
      setTimeout(() => overlay.remove(), 200);
      return;
    }
    const decay = 1 - elapsed / dur;
    const x = (Math.random() - 0.5) * intensity * decay;
    const y = (Math.random() - 0.5) * intensity * decay;
    document.body.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(shakeFrame);
  })();
}