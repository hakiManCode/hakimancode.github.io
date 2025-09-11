// deno-lint-ignore-file

// -------------------- RNG Logic --------------------
const rarities = [
  { name: "Common", color: "gray", chance: 2 },
  { name: "Uncommon", color: "green", chance: 4 },
  { name: "Rare", color: "blue", chance: 16 },
  { name: "Epic", color: "purple", chance: 64 },
  { name: "Ultra Rare", color: "red", chance: 512 },
  { name: "Legendary", color: "orange", chance: 1024 },
  { name: "Mythic", color: "yellow", chance: 10000 }
];
// -------------------- Storage --------------------
let stats = JSON.parse(localStorage.getItem("stats")) || {};
let pity = JSON.parse(localStorage.getItem("pity")) || { ultra: 0, legendary: 0, mythic: 0 };
let rolling = false;

// Initialize stats
rarities.forEach(r => { if (!stats[r.name]) stats[r.name] = 0; });
updateStats();
updatePity();

// -------------------- Utility --------------------
function randInt(min, max){
  return Math.floor(Math.random()*(max-min+1))+min;
}
function getRarity(){
  // Compute weighted chances with pity
  const ultraMultiplier = pity.ultra >= 300 ? 10 : 1;
  const legendaryMultiplier = pity.legendary >= 700 ? 50 : 1;
  const mythicMultiplier = pity.mythic >= 1000 ? 100 : 1;
  const totalWeight = rarities.reduce((sum,r) => {
	let weight = 1/r.chance;
	if(r.name==="Ultra Rare") weight *= ultraMultiplier;
	if(r.name==="Legendary") weight *= legendaryMultiplier;
	if(r.name==="Mythic") weight *= mythicMultiplier;
	return sum + weight;
  },0);
  let pick = Math.random()*totalWeight;
  for(let r of rarities){
	let weight = 1/r.chance;
	if(r.name==="Ultra Rare") weight *= ultraMultiplier;
	if(r.name==="Legendary") weight *= legendaryMultiplier;
	if(r.name==="Mythic") weight *= mythicMultiplier;
	pick -= weight;
	if(pick<=0) return r;
  }
  return rarities[0]; // fallback
}

function triggerScreenEffect(rarity){
  const screen = document.getElementById("screen-effect");

  // Reset
  screen.style.transition = "none";      // cancel previous transition
  screen.style.opacity = "0";
  screen.className = "";                  // remove previous class

  // Force reflow to ensure the opacity reset takes effect
  void screen.offsetWidth;

  // Add new class
  let cls = "";
  switch(rarity.name.toLowerCase()){
    case "common": cls="effect-common"; break;
    case "uncommon": cls="effect-uncommon"; break;
    case "rare": cls="effect-rare"; break;
    case "epic": cls="effect-epic"; break;
    case "ultra rare": cls="effect-ultra"; break;
    case "legendary": cls="effect-legendary"; break;
    case "mythic": cls="effect-mythic"; break;
  }
  if(cls){
    screen.classList.add(cls);

    // Use transition for fade
    screen.style.transition = "opacity 0.6s ease-out";
    screen.style.opacity = "1";

    // Fade out after 400ms
    setTimeout(()=>{
      screen.style.opacity="0";
    }, 400);
  }
}


function spawnParticles(rarity){
  if(!["Epic","Ultra Rare","Legendary","Mythic"].includes(rarity.name)) return;
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

// -------------------- Roll --------------------
async function roll(){
  if(rolling) return;
  rolling=true;
  const button = document.getElementById("rngbutton");
  button.disabled=true;
  // Cutscene: show fake rarities
  const display = document.getElementById("rarity");
  const start = Date.now();
  while(Date.now()-start<1500){
	let fake = rarities[randInt(0,rarities.length-1)];
	display.textContent = fake.name;
	display.style.color = fake.color;
	await new Promise(r=>setTimeout(r,80));
  }
  // Actual roll
  const result = getRarity();
  display.textContent = result.name;
  display.style.color = result.color;
  // Stats
  stats[result.name]++;
  localStorage.setItem("stats",JSON.stringify(stats));
  updateStats();
  // Pity
  pity.ultra++;
  pity.legendary++;
  pity.mythic++;
  if(result.name==="Ultra Rare") pity.ultra=0;
  if(result.name==="Legendary") pity.legendary=0;
  if(result.name==="Mythic") pity.mythic=0;
  localStorage.setItem("pity",JSON.stringify(pity));
  updatePity();
  // Effects
  triggerScreenEffect(result);
  spawnParticles(result);
  button.disabled=false;
  rolling=false;
}

// -------------------- UI Updates --------------------
function updateStats(){
  const list = document.getElementById("stats-list");
  list.innerHTML = "";
  rarities.forEach(r=>{
	const li = document.createElement("li");
	li.textContent = r.name;
	const chance = document.createElement("span");
	chance.textContent = "1 in " + r.chance;
	chance.className="subtext";
	li.appendChild(chance);
	list.appendChild(li);
  });
}
function updatePity(){
  const list = document.getElementById("pity-list");
  list.innerHTML="";
  list.innerHTML=`Ultra Rare: ${pity.ultra}/300 | Legendary: ${pity.legendary}/700 | Mythic: ${pity.mythic}/1000`;
}

// -------------------- Global --------------------
globalThis.roll = roll;
