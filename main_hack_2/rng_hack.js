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
  { name: "Thunderous", color: "cyan", chance: 100000 },
];

// -------------------- STORAGE --------------------
let stats = JSON.parse(localStorage.getItem("stats")) || {};
let pity = JSON.parse(localStorage.getItem("pity")) || {
  ultra: 0,
  legendary: 0,
  mythic: 0,
};
let rolling = false;
let rollBuff = JSON.parse(localStorage.getItem("rollBuff")) || false;

// Initialize stats
rarities.forEach(r => { if (!stats[r.name]) stats[r.name] = 0; });
updateStats();
updatePity();
updateBuffUI();

// -------------------- UTILITY --------------------
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Weighted function for actual rolls
function getRarity() {
  const ultraMultiplier = pity.ultra >= 300 ? 10 : 1;
  const legendaryMultiplier = pity.legendary >= 700 ? 50 : 1;
  const mythicMultiplier = pity.mythic >= 1000 ? 100 : 1;
  const buffMultiplier = rollBuff ? 1.2 : 1;

  const totalWeight = rarities.reduce((sum,r)=>{
    let weight = (1/r.chance)*buffMultiplier;
    if(r.name==="Ultra Rare") weight*=ultraMultiplier;
    if(r.name==="Legendary") weight*=legendaryMultiplier;
    if(r.name==="Mythic") weight*= mythicMultiplier;
    return sum+weight;
  },0);

  let pick = Math.random()*totalWeight;
  for(let r of rarities){
    let weight = (1/r.chance)*buffMultiplier;
    if(r.name==="Ultra Rare") weight*=ultraMultiplier;
    if(r.name==="Legendary") weight*=legendaryMultiplier;
    if(r.name==="Mythic") weight*= mythicMultiplier;
    pick -= weight;
    if(pick<=0) return r;
  }
  return rarities[0];
}

// Weighted function for fake cutscene rolls (no stats/pity)
function getFakeRarity() {
  const ultraMultiplier = pity.ultra >= 300 ? 10 : 1;
  const legendaryMultiplier = pity.legendary >= 700 ? 50 : 1;
  const mythicMultiplier = pity.mythic >= 1000 ? 100 : 1;
  const buffMultiplier = rollBuff ? 1.2 : 1;

  const totalWeight = rarities.reduce((sum,r)=>{
    let weight = (1/r.chance)*buffMultiplier;
    if(r.name==="Ultra Rare") weight*=ultraMultiplier;
    if(r.name==="Legendary") weight*=legendaryMultiplier;
    if(r.name==="Mythic") weight*= mythicMultiplier;
    return sum+weight;
  },0);

  let pick = Math.random()*totalWeight;
  for(let r of rarities){
    let weight = (1/r.chance)*buffMultiplier;
    if(r.name==="Ultra Rare") weight*=ultraMultiplier;
    if(r.name==="Legendary") weight*=legendaryMultiplier;
    if(r.name==="Mythic") weight*= mythicMultiplier;
    pick -= weight;
    if(pick<=0) return r;
  }
  return rarities[0];
}

// -------------------- SCREEN EFFECT --------------------
function triggerScreenEffect(rarity){
  const screen = document.getElementById("screen-effect");

  // Reset
  screen.className = "";
  void screen.offsetWidth;

  let cls = "effect-" + rarity.name.toLowerCase().replace(" ","");
  screen.classList.add(cls);

  // Flash: fade out
  screen.style.opacity = "1";

  if(rarity.name==="Thunderous") {
    // Extra: shake window & brief cyan lightning
    document.body.classList.add("shake");
    setTimeout(()=>document.body.classList.remove("shake"), 750);

    // Optional lightning flash
    screen.style.background = "rgba(0,255,255,0.5)";
    setTimeout(()=> screen.style.background = "", 150);
  }

  setTimeout(()=>{ screen.style.opacity = "0"; }, 300);
}

// -------------------- PARTICLES --------------------
function spawnParticles(rarity){
  if(!["Epic","Ultra Rare","Legendary","Mythic","Thunderous"].includes(rarity.name)) return;
  const container = document.getElementById("particle-container");
  for(let i=0;i<30;i++){
    const p = document.createElement("div");
    p.className="particle";
    p.style.left = randInt(0,window.innerWidth)+"px";
    p.style.top = randInt(0,window.innerHeight)+"px";
    p.style.backgroundColor = rarity.color;
    container.appendChild(p);
    setTimeout(()=>p.remove(),1200);
  }
}

// -------------------- ROLL --------------------
async function roll() {
  if (rolling) return;
  rolling = true;
  const button = document.getElementById("rngbutton");
  button.disabled = true;

  const display = document.getElementById("rarity");
  const chanceDisplay = document.getElementById("rarity-chance");

  // Cutscene: weighted fake rarities
  const totalIterations = 11; // number of fake updates
  for (let i = 0; i < totalIterations; i++) {
    const fake = getFakeRarity();
    display.textContent = fake.name;
    display.style.color = fake.color;
    chanceDisplay.textContent = "1 in " + fake.chance;

    // Ease down effect (10px jump)
    display.style.transition = "none";
    display.style.transform = "translateY(-10px)";
    void display.offsetWidth; // force reflow
    display.style.transition = "transform 0.15s ease-out";
    display.style.transform = "translateY(0)";

    // Gradually slow down: start fast, then slower
    const delay = 40 + i * 20; // first iteration 40ms, last ~400ms
    await new Promise(r => setTimeout(r, delay));
  }

  // Actual roll
  const result = getRarity();
  display.textContent = result.name;
  display.style.color = result.color;
  chanceDisplay.textContent = "1 in " + result.chance;

  // Ease down for final result
  display.style.transition = "none";
  display.style.transform = "translateY(-10px)";
  void display.offsetWidth;
  display.style.transition = "transform 0.25s ease-out";
  display.style.transform = "translateY(0)";

  // Stats
  stats[result.name]++;
  localStorage.setItem("stats", JSON.stringify(stats));
  updateStats();

  // Pity
  pity.ultra++; pity.legendary++; pity.mythic++;
  if (result.name === "Ultra Rare") pity.ultra = 0;
  if (result.name === "Legendary") pity.legendary = 0;
  if (result.name === "Mythic") pity.mythic = 0;
  localStorage.setItem("pity", JSON.stringify(pity));
  updatePity();

  // Effects
  triggerScreenEffect(result);
  spawnParticles(result);

  button.disabled = false;
  rolling = false;
}

// -------------------- BUFF --------------------
function toggleBuff(){
  if(rollBuff){
    rollBuff=false;
  } else if(getTotalRolls()>=5000){
    rollBuff=true;
  } else return;
  localStorage.setItem("rollBuff", JSON.stringify(rollBuff));
  updateBuffUI();
}

function updateBuffUI(){
  const btn = document.getElementById("buff-button");
  if(!btn) return;
  btn.textContent = rollBuff ? "Buff Active (Click to Disable)" : "Purchase Buff (5000 rolls)";
}

// -------------------- UI --------------------
function updateStats(){
  const list = document.getElementById("stats-list");
  list.innerHTML = "";
  rarities.forEach(r=>{
    const li = document.createElement("li");
    const count = stats[r.name];
    li.textContent = r.name + ": " + (count>0?count:"???");
    const chance = document.createElement("span");
    chance.textContent = "1 in " + r.chance;
    chance.className = "subtext";
    li.appendChild(chance);
    list.appendChild(li);
  });
}

function updatePity() {
  const list = document.getElementById("pity-list");
  list.innerHTML = `Ultra Rare: ${pity.ultra}/300 | Legendary: ${pity.legendary}/700 | Mythic: ${pity.mythic}/1000`;
}

function getTotalRolls(){
  return rarities.reduce((sum,r)=>sum+(stats[r.name]||0),0);
}

// -------------------- GLOBAL --------------------
globalThis.roll = roll;
globalThis.toggleBuff = toggleBuff;
