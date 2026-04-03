let state = JSON.parse(localStorage.getItem('FoodFight_Final_Save')) || {
    coins: 200, trophies: 0, selected: 'burger', claimed: [],
    fooders: {
        burger: { emoji: '🍔', name: 'SIR BURGER', hp: 1000, level: 1, unlocked: true },
        taco: { emoji: '🌮', name: 'SPICY TACO', hp: 800, level: 1, unlocked: false },
        sushi: { emoji: '🍣', name: 'SUSHI ROLL', hp: 900, level: 1, unlocked: false }
    }
};

const PASS_DATA = Array.from({length: 30}, (_, i) => ({ id: `p${i}`, req: i * 20, val: (i+1)*50, type: i%5===0&&i!==0?'hero':'coins', target: 'taco'}));
const ROAD_DATA = Array.from({length: 50}, (_, i) => ({ id: `r${i}`, req: i * 50, val: (i+1)*100, type: i===5?'hero':'coins', target: 'sushi'}));

function updateUI() {
    document.getElementById('p-trophies').innerText = state.trophies;
    document.getElementById('p-coins').innerText = state.coins;
    
    const h = state.fooders[state.selected];
    document.getElementById('hero-model').innerText = h.emoji;
    document.getElementById('hero-name').innerText = h.name + " LV." + h.level;
    document.getElementById('stat-hp').innerText = "❤️ " + h.hp;
    
    const cost = h.level * 150;
    document.getElementById('u-price').innerText = cost;
    document.getElementById('btn-upgrade').style.opacity = state.coins >= cost ? "1" : "0.5";

    document.getElementById('road-fill').style.width = Math.min(100, state.trophies/10) + "%";
    document.getElementById('pass-fill').style.width = Math.min(100, state.trophies/5) + "%";

    const tray = document.getElementById('hero-tray');
    tray.innerHTML = Object.keys(state.fooders).filter(k => state.fooders[k].unlocked).map(k => `
        <div class="reward-node ${state.selected === k ? 'unlocked' : ''}" style="width:60px; padding:10px; margin-bottom:10px; cursor:pointer" onclick="selectHero('${k}')">
            ${state.fooders[k].emoji}
        </div>
    `).join('');
}

function selectHero(id) { state.selected = id; save(); }
function save() { localStorage.setItem('FoodFight_Final_Save', JSON.stringify(state)); updateUI(); }

function upgradeHero() {
    const h = state.fooders[state.selected];
    const cost = h.level * 150;
    if(state.coins >= cost) { state.coins -= cost; h.level++; h.hp += 200; save(); }
}

function openPass() { document.getElementById('pass-modal').classList.remove('hidden'); renderTrack('pass-track', PASS_DATA, 'pass'); }
function openRoad() { document.getElementById('road-modal').classList.remove('hidden'); renderTrack('road-track', ROAD_DATA, 'road'); }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); }

function renderTrack(elId, data, type) {
    const container = document.getElementById(elId);
    container.innerHTML = data.map(item => {
        const claimed = state.claimed.includes(item.id);
        const locked = state.trophies < item.req;
        return `
            <div class="reward-node ${locked?'':'unlocked'}">
                <div style="font-size:0.7rem">${item.req} 🏆</div>
                <div style="font-size:2rem; margin:10px 0">${item.type==='coins'?'🪙':'🎁'}</div>
                <button class="upgrade-btn-premium" style="font-size:0.6rem; min-width:80px" onclick="claim('${item.id}','${type}')" ${locked||claimed?'disabled':''}>
                    ${claimed?'OK':(locked?'LOCKED':'CLAIM')}
                </button>
            </div>
        `;
    }).join('');
}

function claim(id, type) {
    const rewards = type === 'pass' ? PASS_DATA : ROAD_DATA;
    const item = rewards.find(r => r.id === id);
    if(item.type === 'coins') state.coins += item.val;
    else state.fooders[item.target].unlocked = true;
    state.claimed.push(id);
    save();
    type === 'pass' ? openPass() : openRoad();
}

function startGame() {
    // Basic Transition to Game
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('gameCanvas').classList.remove('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    // Game logic would go here
}

updateUI();
