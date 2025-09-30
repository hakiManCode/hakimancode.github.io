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
  localStorage.setItem("achievements", JSON.stringify(achievements));
  updateAchievementsUI();
}

function updateAchievementsUI() {
  const list = document.getElementById("achievements-list");
  list.innerHTML = "";
  const data = [
    { id: "10kRoll", text: "Roll a 10k+ rarity" },
    { id: "100kRoll", text: "Roll a 100k+ rarity" },
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
  let panel = document.getElementById("dev-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "dev-panel";
    panel.style.position = "fixed";
    panel.style.bottom = "10px";
    panel.style.right = "10px";
    panel.style.background = "#222";
    panel.style.color = "#fff";
    panel.style.padding = "10px";
    panel.style.borderRadius = "10px";
    panel.innerHTML = `
      <h4>Dev Panel</h4>
      <label><input type="checkbox" id="fast-roll-toggle"> Fast Roll</label>
    `;
    document.body.appendChild(panel);
    document.getElementById("fast-roll-toggle").addEventListener("change", (e) => {
      fastRoll = e.target.checked;
    });
  }
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

  // spawn glowing particles
  for (let i = 0; i < 80; i++) {
    const p = document.createElement("div");
    p.className = "luminous-particle";
    p.style.left = `${randInt(0, window.innerWidth)}px`;
    p.style.top = `${window.innerHeight}px`;
    document.getElementById("luminous-particles").appendChild(p);
  }

  // wait 9s, then fade to white + shake
  await new Promise(res => setTimeout(res, 9000));

  overlay.classList.add("fade-white");

  let intensity = 20;
  const start = Date.now();
  const dur = 800;
  (function shakeFrame() {
    const elapsed = Date.now() - start;
    if (elapsed >= dur) {
      document.body.style.transform = "";
      return;
    }
    const decay = 1 - elapsed / dur;
    const x = (Math.random() - 0.5) * intensity * decay;
    const y = (Math.random() - 0.5) * intensity * decay;
    document.body.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(shakeFrame);
  })();

  await new Promise(res => setTimeout(res, 1000));
  overlay.remove();
}
