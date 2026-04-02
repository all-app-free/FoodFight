// --- DATA & CONTENT ---
let state = JSON.parse(localStorage.getItem('foodFightSaveV2')) || {
    coins: 150, trophies: 0, selected: 'burger', claimed: [],
    fooders: {
        burger: { emoji: '🍔', name: 'SIR BURGER', hp: 1000, spd: 'Normal', level: 1, unlocked: true },
        taco: { emoji: '🌮', name: 'SPICY TACO', hp: 800, spd: 'Fast', level: 1, unlocked: false },
        sushi: { emoji: '🍣', name: 'SUSHI ROLL', hp: 900, spd: 'Medium', level: 1, unlocked: false }
    }
};

const UPGRADE_COSTS = [100, 250, 500, 1000, 2500];

// Expanded Rewards
const PASS_REWARDS = Array.from({length: 15}, (_, i) => ({
    id: `p${i}`, req: i * 20, 
    reward: i % 5 === 0 && i !== 0 ? 'taco' : (i * 50 + 50),
    type: i % 5 === 0 && i !== 0 ? 'hero' : 'coins',
    name: i % 5 === 0 && i !== 0 ? 'EPIC HERO' : `${i*50+50} COINS`
}));

const ROAD_REWARDS = Array.from({length: 20}, (_, i) => ({
    id: `r${i}`, req: i * 50,
    reward: i === 5 ? 'sushi' : (i * 100 + 50),
    type: i === 5 ? 'hero' : 'coins',
    name: i === 5 ? 'SUSHI UNLOCK' : `${i*100+50} COINS`
}));

function save() {
    localStorage.setItem('foodFightSaveV2', JSON.stringify(state));
    updateUI();
}

// --- UI LOGIC ---
function updateUI() {
    document.getElementById('p-trophies').innerText = state.trophies;
    document.getElementById('p-coins').innerText = state.coins;
    
    // Update Hero Preview
    const hero = state.fooders[state.selected];
    document.getElementById('hero-display').innerText = hero.emoji;
    document.getElementById('hero-name').innerText = `${hero.name} (LVL ${hero.level})`;
    document.getElementById('hero-hp-stat').innerText = `❤️ ${hero.hp}`;
    document.getElementById('hero-spd-stat').innerText = `⚡ ${hero.spd}`;
    
    // Update Upgrade Button
    const cost = UPGRADE_COSTS[hero.level - 1] || "MAX";
    document.getElementById('u-price').innerText = cost;
    const btn = document.getElementById('btn-upgrade');
    btn.style.opacity = (state.coins >= cost) ? "1" : "0.5";
    btn.style.background = (cost === "MAX") ? "#2d3436" : "var(--purple)";

    // Progress Bars
    document.getElementById('road-fill').style.width = Math.min(100, state.trophies / 10) + "%";
    document.getElementById('pass-fill').style.width = Math.min(100, state.trophies / 5) + "%";

    // Hero List
    const list = document.getElementById('fooders-list');
    list.innerHTML = Object.keys(state.fooders).filter(k => state.fooders[k].unlocked).map(k => `
        <button class="hero-btn ${state.selected === k ? 'active' : ''}" onclick="selectHero('${k}')">
            ${state.fooders[k].emoji} ${state.fooders[k].name}
        </button>
    `).join('');
}

function selectHero(key) { state.selected = key; save(); }

function upgradeHero() {
    const hero = state.fooders[state.selected];
    const cost = UPGRADE_COSTS[hero.level - 1];
    if (cost && state.coins >= cost) {
        state.coins -= cost;
        hero.level++;
        hero.hp += 150;
        save();
    }
}

// --- REWARD TRACKS ---
function openPass() {
    document.getElementById('pass-screen').classList.remove('hidden');
    renderTrack('pass-items', PASS_REWARDS, 'pass');
}

function openRoad() {
    document.getElementById('road-screen').classList.remove('hidden');
    renderTrack('road-items', ROAD_REWARDS, 'road');
}

function renderTrack(elementId, data, type) {
    const container = document.getElementById(elementId);
    container.innerHTML = data.map(item => {
        const claimed = state.claimed.includes(item.id);
        const canClaim = state.trophies >= item.req && !claimed;
        return `
            <div class="reward-pole ${state.trophies >= item.req ? 'unlocked' : ''} ${claimed ? 'claimed' : ''}">
                <div style="font-size:0.7rem">${item.req} 🏆</div>
                <span class="icon">${item.type === 'coins' ? '🪙' : '🎁'}</span>
                <div style="font-size:0.5rem; height:20px">${item.name}</div>
                <button onclick="claim('${item.id}', '${type}')" 
                        style="background:${canClaim ? 'var(--yellow)' : '#555'}"
                        ${!canClaim ? 'disabled' : ''}>
                    ${claimed ? 'CLAIMED' : (canClaim ? 'CLAIM' : 'LOCKED')}
                </button>
            </div>
        `;
    }).join('');
}

function claim(id, type) {
    const rewards = type === 'pass' ? PASS_REWARDS : ROAD_REWARDS;
    const item = rewards.find(r => r.id === id);
    if (item.type === 'coins') state.coins += item.reward;
    if (item.type === 'hero') state.fooders[item.reward].unlocked = true;
    state.claimed.push(id);
    save();
    type === 'pass' ? openPass() : openRoad();
}

function closeModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')); }

// --- CORE GAME ENGINE (Bot sliding & 3v3) ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gameActive = false, entities = [], projectiles = [], walls = [];
let score = { b: 0, r: 0 };

const joyL = { x: 0, y: 0, active: false, id: null };
const joyR = { x: 0, y: 0, active: false, id: null, lastS: 0 };

function initControls() {
    const handle = (e) => {
        for (let t of e.changedTouches) {
            const isLeft = t.clientX < window.innerWidth / 2;
            if (e.type === 'touchstart') {
                if (isLeft && joyL.id === null) joyL.id = t.identifier;
                if (!isLeft && joyR.id === null) joyR.id = t.identifier;
            }
            if (t.identifier === joyL.id) updateStick(t, 'joy-move', joyL);
            if (t.identifier === joyR.id) updateStick(t, 'joy-shoot', joyR);
            if (e.type === 'touchend' || e.type === 'touchcancel') {
                if (t.identifier === joyL.id) { joyL.id = null; joyL.active = false; resetStick('joy-move'); }
                if (t.identifier === joyR.id) { joyR.id = null; joyR.active = false; resetStick('joy-shoot'); }
            }
        }
    };
    ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(ev => window.addEventListener(ev, handle));
}

function updateStick(t, id, data) {
    const rect = document.getElementById(id).getBoundingClientRect();
    const centerX = rect.left + rect.width / 2, centerY = rect.top + rect.height / 2;
    const dx = t.clientX - centerX, dy = t.clientY - centerY;
    const dist = Math.min(Math.hypot(dx, dy), 40);
    const angle = Math.atan2(dy, dx);
    data.active = dist > 5;
    data.x = Math.cos(angle) * (dist / 40);
    data.y = Math.sin(angle) * (dist / 40);
    document.querySelector(`#${id} .joy-thumb`).style.transform = `translate(${data.x * 30}px, ${data.y * 30}px)`;
}

function resetStick(id) { document.querySelector(`#${id} .joy-thumb`).style.transform = `translate(0,0)`; }

class Fighter {
    constructor(x, y, team, id, isPlayer = false) {
        this.x = x; this.y = y; this.team = team; this.isPlayer = isPlayer;
        const d = state.fooders[id] || state.fooders.burger;
        this.emoji = d.emoji; this.hp = d.hp; this.maxHp = d.hp; this.spd = isPlayer ? 5.5 : 3.5;
    }
    update() {
        let ox = this.x, oy = this.y;
        if (this.isPlayer) {
            if (joyL.active) { this.x += joyL.x * this.spd; this.y += joyL.y * this.spd; }
            if (joyR.active && Date.now() - joyR.lastS > 400) { this.shoot(); joyR.lastS = Date.now(); }
        } else {
            const target = entities.find(e => e.team !== this.team);
            if (target) {
                const dx = target.x - this.x, dy = target.y - this.y, dist = Math.hypot(dx, dy);
                if (dist > 150) { 
                    let vx = (dx / dist) * this.spd, vy = (dy / dist) * this.spd;
                    // Wall sliding logic
                    if (this.checkWall(this.x + vx, this.y)) this.x += vx;
                    if (this.checkWall(this.x, this.y + vy)) this.y += vy;
                }
                if (Math.random() < 0.02) this.shoot(dx / dist, dy / dist);
            }
        }
        if (!this.checkWall(this.x, this.y)) { this.x = ox; this.y = oy; }
        this.x = Math.max(30, Math.min(canvas.width - 30, this.x));
        this.y = Math.max(30, Math.min(canvas.height - 30, this.y));
    }
    checkWall(nx, ny) {
        return !walls.some(w => nx + 20 > w.x && nx - 20 < w.x + w.w && ny + 20 > w.y && ny - 20 < w.y + w.h);
    }
    shoot(vx = joyR.x, vy = joyR.y) {
        projectiles.push({ x: this.x, y: this.y, vx: vx * 12, vy: vy * 12, team: this.team });
    }
    draw() {
        ctx.fillStyle = this.team === 'blue' ? 'var(--blue)' : 'var(--red)';
        ctx.beginPath(); ctx.arc(this.x, this.y, 25, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
        ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.fillText(this.emoji, this.x, this.y + 8);
        ctx.fillStyle = '#000'; ctx.fillRect(this.x - 20, this.y - 35, 40, 6);
        ctx.fillStyle = this.team === 'blue' ? '#2ed573' : '#ffd32a';
        ctx.fillRect(this.x - 20, this.y - 35, (this.hp / this.maxHp) * 40, 6);
    }
}

function startGame() {
    document.getElementById('menu-screen').classList.add('hidden');
    canvas.classList.remove('hidden'); document.getElementById('game-ui').classList.remove('hidden');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    score = { b: 0, r: 0 }; entities = []; projectiles = [];
    walls = [
        { x: canvas.width * 0.25, y: canvas.height * 0.2, w: 40, h: canvas.height * 0.3 },
        { x: canvas.width * 0.7, y: canvas.height * 0.5, w: 40, h: canvas.height * 0.3 },
        { x: canvas.width * 0.45, y: canvas.height * 0.45, w: 100, h: 40 }
    ];
    entities.push(new Fighter(100, canvas.height / 2, 'blue', state.selected, true));
    entities.push(new Fighter(100, 100, 'blue', 'taco'), new Fighter(100, canvas.height - 100, 'blue', 'burger'));
    entities.push(new Fighter(canvas.width - 100, canvas.height / 2, 'red', 'sushi'));
    entities.push(new Fighter(canvas.width - 100, 100, 'red', 'taco'), new Fighter(canvas.width - 100, canvas.height - 100, 'red', 'burger'));
    gameActive = true; initControls(); loop();
}

function loop() {
    if (!gameActive) return;
    ctx.fillStyle = '#10ac84'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a3d62'; walls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));
    
    entities.forEach(e => { e.update(); e.draw(); });
    projectiles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
        entities.forEach(e => {
            if (e.team !== p.team && Math.hypot(p.x - e.x, p.y - e.y) < 25) {
                e.hp -= 200; projectiles.splice(i, 1);
                if (e.hp <= 0) {
                    score[p.team === 'blue' ? 'b' : 'r']++;
                    e.hp = e.maxHp; e.x = e.team === 'blue' ? 100 : canvas.width - 100;
                    document.getElementById('s-blue').innerText = score.b;
                    document.getElementById('s-red').innerText = score.r;
                    if (score.b >= 10 || score.r >= 10) endGame(score.b >= 10);
                }
            }
        });
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) projectiles.splice(i, 1);
    });
    requestAnimationFrame(loop);
}

function endGame(win) {
    gameActive = false;
    const res = document.getElementById('result-screen');
    res.classList.remove('hidden');
    const t = win ? 25 : -5; const c = win ? 60 : 15;
    state.trophies = Math.max(0, state.trophies + t);
    state.coins += c;
    document.getElementById('res-title').innerText = win ? "VICTORY" : "DEFEAT";
    document.getElementById('res-trophies').innerText = (t > 0 ? "+" : "") + t;
    document.getElementById('res-coins').innerText = "+" + c;
    save();
}

updateUI();

