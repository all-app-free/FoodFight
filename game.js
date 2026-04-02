// --- STATE MANAGEMENT ---
let state = JSON.parse(localStorage.getItem('FoodFight_Pro_Save')) || {
    coins: 250, trophies: 0, selected: 'burger', claimed: [],
    fooders: {
        burger: { emoji: '🍔', name: 'SIR BURGER', hp: 1000, level: 1, unlocked: true },
        taco: { emoji: '🌮', name: 'SPICY TACO', hp: 800, level: 1, unlocked: false },
        sushi: { emoji: '🍣', name: 'SUSHI ROLL', hp: 900, level: 1, unlocked: false }
    }
};

// --- DATA GENERATION (MASSIVE TRACKS) ---
const PASS_REWARDS = Array.from({length: 40}, (_, i) => ({
    id: `p${i}`, req: i * 20, val: (i + 1) * 75, 
    type: i % 10 === 0 && i !== 0 ? 'hero' : 'coins',
    target: i % 10 === 0 && i !== 0 ? 'taco' : 'coins'
}));

const ROAD_REWARDS = Array.from({length: 50}, (_, i) => ({
    id: `r${i}`, req: i * 50, val: (i + 1) * 150, 
    type: i === 5 ? 'hero' : 'coins',
    target: i === 5 ? 'sushi' : 'coins'
}));

function save() {
    localStorage.setItem('FoodFight_Pro_Save', JSON.stringify(state));
    updateUI();
}

// --- UI REFRESH ---
function updateUI() {
    document.getElementById('p-trophies').innerText = state.trophies;
    document.getElementById('p-coins').innerText = state.coins;
    
    const hero = state.fooders[state.selected];
    document.getElementById('hero-model').innerText = hero.emoji;
    document.getElementById('hero-name').innerText = `${hero.name} LV.${hero.level}`;
    document.getElementById('stat-hp').innerText = `❤️ ${hero.hp}`;
    
    const upCost = hero.level * 200;
    document.getElementById('u-price').innerText = upCost;
    document.getElementById('btn-upgrade').style.filter = state.coins >= upCost ? "none" : "grayscale(1)";

    document.getElementById('road-fill').style.width = Math.min(100, (state.trophies/10)) + "%";
    document.getElementById('pass-fill').style.width = Math.min(100, (state.trophies/5)) + "%";

    const tray = document.getElementById('hero-tray');
    tray.innerHTML = Object.keys(state.fooders).filter(k => state.fooders[k].unlocked).map(k => `
        <div class="reward-node ${state.selected === k ? 'unlocked' : ''}" style="width:70px; margin-bottom:10px; cursor:pointer" onclick="selectHero('${k}')">
            ${state.fooders[k].emoji}
        </div>
    `).join('');
}

function selectHero(id) { state.selected = id; save(); }

function upgradeHero() {
    const hero = state.fooders[state.selected];
    const cost = hero.level * 200;
    if (state.coins >= cost) {
        state.coins -= cost;
        hero.level++;
        hero.hp += 250;
        save();
    }
}

// --- SWIPEABLE MODALS ---
function openPass() {
    document.getElementById('pass-modal').classList.remove('hidden');
    renderTrack('pass-track', PASS_REWARDS, 'pass');
}

function openRoad() {
    document.getElementById('road-modal').classList.remove('hidden');
    renderTrack('road-track', ROAD_REWARDS, 'road');
}

function renderTrack(elId, data, type) {
    const container = document.getElementById(elId);
    container.innerHTML = data.map(item => {
        const claimed = state.claimed.includes(item.id);
        const locked = state.trophies < item.req;
        return `
            <div class="reward-node ${locked?'':'unlocked'} ${claimed?'claimed':''}">
                <div style="font-size:0.8rem; color:var(--gold)">${item.req}🏆</div>
                <div style="font-size:2.5rem; margin:10px 0">${item.type === 'coins' ? '🪙' : '🎁'}</div>
                <button onclick="claimReward('${item.id}','${type}')" 
                    class="upgrade-button" style="min-width:80px; font-size:0.7rem; padding:5px" ${locked||claimed?'disabled':''}>
                    ${claimed?'OK':(locked?'LOCK':'CLAIM')}
                </button>
            </div>
        `;
    }).join('');
}

function claimReward(id, type) {
    const rewards = type === 'pass' ? PASS_REWARDS : ROAD_REWARDS;
    const item = rewards.find(r => r.id === id);
    if (item.type === 'coins') state.coins += item.val;
    else state.fooders[item.target].unlocked = true;
    state.claimed.push(id);
    save();
    type === 'pass' ? openPass() : openRoad();
}

function closeModals() { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); }

// --- GAME CORE (JOYSTICKS & ENGINE) ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gameActive = false, entities = [];

const joyL = { id: null, x: 0, y: 0, active: false };
const joyR = { id: null, x: 0, y: 0, active: false, lastS: 0 };

function initInput() {
    const handle = (e) => {
        for (let t of e.changedTouches) {
            const isL = t.clientX < window.innerWidth / 2;
            if (e.type === 'touchstart') {
                if (isL && !joyL.id) joyL.id = t.identifier;
                if (!isL && !joyR.id) joyR.id = t.identifier;
            }
            if (t.identifier === joyL.id) moveJoy(t, 'joy-move', joyL);
            if (t.identifier === joyR.id) moveJoy(t, 'joy-shoot', joyR);
            if (e.type === 'touchend') {
                if (t.identifier === joyL.id) { joyL.id = null; joyL.active = false; resetJoy('joy-move'); }
                if (t.identifier === joyR.id) { joyR.id = null; joyR.active = false; resetJoy('joy-shoot'); }
            }
        }
    };
    window.ontouchstart = window.ontouchmove = window.ontouchend = handle;
}

function moveJoy(t, id, data) {
    const r = document.getElementById(id).getBoundingClientRect();
    const dx = t.clientX - (r.left + r.width/2), dy = t.clientY - (r.top + r.height/2);
    const d = Math.min(Math.hypot(dx, dy), 40);
    const a = Math.atan2(dy, dx);
    data.active = d > 5; data.x = Math.cos(a) * (d / 40); data.y = Math.sin(a) * (d / 40);
    document.querySelector(`#${id} .handle`).style.transform = `translate(${data.x*30}px, ${data.y*30}px)`;
}
function resetJoy(id) { document.querySelector(`#${id} .handle`).style.transform = `translate(0,0)`; }

function startGame() {
    document.getElementById('menu-screen').classList.add('hidden');
    canvas.classList.remove('hidden'); document.getElementById('game-ui').classList.remove('hidden');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    gameActive = true; initInput(); 
    // Quick Demo Battle
    entities = [
        {x: 100, y: canvas.height/2, team:'blue', hp:1000, max:1000, emoji:state.fooders[state.selected].emoji},
        {x: canvas.width-100, y: canvas.height/2, team:'red', hp:1000, max:1000, emoji:'🍣'}
    ];
    loop();
}

function loop() {
    if (!gameActive) return;
    ctx.fillStyle = '#10ac84'; ctx.fillRect(0,0,canvas.width,canvas.height);
    entities.forEach(e => {
        if(e.team === 'blue' && joyL.active){ e.x += joyL.x*5; e.y += joyL.y*5; }
        ctx.font = '40px Arial'; ctx.fillText(e.emoji, e.x-20, e.y+15);
    });
    requestAnimationFrame(loop);
}

updateUI();
        
