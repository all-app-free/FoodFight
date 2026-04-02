// --- DATA & SETUP ---
let state = JSON.parse(localStorage.getItem('FoodFightSaveV3')) || {
    coins: 200, trophies: 0, selected: 'burger', claimed: [],
    fooders: {
        burger: { emoji: '🍔', name: 'SIR BURGER', hp: 1000, level: 1, unlocked: true },
        taco: { emoji: '🌮', name: 'SPICY TACO', hp: 800, level: 1, unlocked: false },
        sushi: { emoji: '🍣', name: 'SUSHI ROLL', hp: 900, level: 1, unlocked: false }
    }
};

const PASS_REWARDS = Array.from({length: 20}, (_, i) => ({
    id: `p${i}`, req: i * 25, val: (i+1)*50, type: i % 5 === 0 && i !== 0 ? 'hero' : 'coins',
    target: i % 5 === 0 && i !== 0 ? 'taco' : 'coins'
}));

const ROAD_REWARDS = Array.from({length: 30}, (_, i) => ({
    id: `r${i}`, req: i * 40, val: (i+1)*100, type: i === 6 ? 'hero' : 'coins',
    target: i === 6 ? 'sushi' : 'coins'
}));

function save() {
    localStorage.setItem('FoodFightSaveV3', JSON.stringify(state));
    updateUI();
}

// --- UI UPDATES ---
function updateUI() {
    document.getElementById('p-trophies').innerText = state.trophies;
    document.getElementById('p-coins').innerText = state.coins;
    
    const hero = state.fooders[state.selected];
    document.getElementById('hero-render').innerText = hero.emoji;
    document.getElementById('hero-name').innerText = `${hero.name} LV.${hero.level}`;
    document.getElementById('stat-hp').innerText = `❤️ ${hero.hp}`;
    
    const upCost = hero.level * 150;
    document.getElementById('u-price').innerText = upCost;
    document.getElementById('btn-upgrade').style.opacity = state.coins >= upCost ? "1" : "0.5";

    document.getElementById('road-fill').style.width = Math.min(100, state.trophies/10) + "%";
    document.getElementById('pass-fill').style.width = Math.min(100, state.trophies/5) + "%";

    const tray = document.getElementById('hero-list');
    tray.innerHTML = Object.keys(state.fooders).filter(k => state.fooders[k].unlocked).map(k => `
        <div class="reward-pole ${state.selected === k ? 'claimed' : ''}" style="width:70px; cursor:pointer" onclick="selectHero('${k}')">
            ${state.fooders[k].emoji}
        </div>
    `).join('');
}

function selectHero(id) { state.selected = id; save(); }

function upgradeHero() {
    const hero = state.fooders[state.selected];
    const cost = hero.level * 150;
    if (state.coins >= cost) {
        state.coins -= cost;
        hero.level++;
        hero.hp += 200;
        save();
    }
}

// --- MODALS ---
function openPass() {
    document.getElementById('pass-modal').classList.remove('hidden');
    renderTrack('pass-items', PASS_REWARDS, 'pass');
}

function openRoad() {
    document.getElementById('road-modal').classList.remove('hidden');
    renderTrack('road-items', ROAD_REWARDS, 'road');
}

function renderTrack(elId, data, type) {
    const container = document.getElementById(elId);
    container.innerHTML = data.map(item => {
        const claimed = state.claimed.includes(item.id);
        const locked = state.trophies < item.req;
        return `
            <div class="reward-pole ${locked?'locked':''} ${claimed?'claimed':''}">
                <div style="font-size:0.7rem">${item.req}🏆</div>
                <span class="icon">${item.type === 'coins' ? '🪙' : '🎁'}</span>
                <button onclick="claimReward('${item.id}','${type}')" 
                    class="btn-fancy ${locked?'':'green'}" style="font-size:0.6rem; padding:4px" ${locked||claimed?'disabled':''}>
                    ${claimed?'CLAIMED':(locked?'LOCKED':'CLAIM')}
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

function closeModals() { document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); }

// --- GAME LOGIC (JOYSTICKS & ENGINE) ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gameActive = false, entities = [], projectiles = [];

const joyL = { id: null, x: 0, y: 0, active: false };
const joyR = { id: null, x: 0, y: 0, active: false, lastS: 0 };

function initGameInput() {
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
    const dx = t.clientX - (r.left + 50), dy = t.clientY - (r.top + 50);
    const d = Math.min(Math.hypot(dx, dy), 40);
    const a = Math.atan2(dy, dx);
    data.active = d > 5; data.x = Math.cos(a) * (d / 40); data.y = Math.sin(a) * (d / 40);
    document.querySelector(`#${id} .thumb`).style.transform = `translate(${data.x*30}px, ${data.y*30}px)`;
}
function resetJoy(id) { document.querySelector(`#${id} .thumb`).style.transform = `translate(0,0)`; }

function startGame() {
    document.getElementById('menu-screen').classList.add('hidden');
    canvas.classList.remove('hidden'); document.getElementById('game-ui').classList.remove('hidden');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    entities = [new Fighter(100, canvas.height/2, 'blue', state.selected, true)];
    // Add bots
    for(let i=0; i<2; i++) entities.push(new Fighter(100, 50+i*300, 'blue', 'burger'));
    for(let i=0; i<3; i++) entities.push(new Fighter(canvas.width-100, 100+i*200, 'red', 'taco'));
    gameActive = true; initGameInput(); loop();
}

class Fighter {
    constructor(x, y, team, id, isP = false) {
        this.x = x; this.y = y; this.team = team; this.isP = isP;
        this.hp = state.fooders[id].hp; this.max = this.hp; this.emoji = state.fooders[id].emoji;
    }
    update() {
        if (this.isP) {
            if (joyL.active) { this.x += joyL.x * 6; this.y += joyL.y * 6; }
            if (joyR.active && Date.now() - joyR.lastS > 400) { 
                projectiles.push({x:this.x, y:this.y, vx:joyR.x*12, vy:joyR.y*12, team:this.team});
                joyR.lastS = Date.now();
            }
        } else {
            this.x += (this.team === 'blue' ? 1 : -1) * 2;
            if (Math.random() < 0.01) projectiles.push({x:this.x, y:this.y, vx:(this.team==='blue'?1:-1)*10, vy:0, team:this.team});
        }
    }
    draw() {
        ctx.font = '30px Arial'; ctx.fillText(this.emoji, this.x-15, this.y+10);
        ctx.fillStyle = 'red'; ctx.fillRect(this.x-20, this.y-30, 40, 4);
        ctx.fillStyle = 'green'; ctx.fillRect(this.x-20, this.y-30, (this.hp/this.max)*40, 4);
    }
}

function loop() {
    if (!gameActive) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    entities.forEach(e => { e.update(); e.draw(); });
    projectiles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 7); ctx.fill();
        entities.forEach(e => {
            if (e.team !== p.team && Math.hypot(p.x-e.x, p.y-e.y) < 30) {
                e.hp -= 200; projectiles.splice(i,1);
                if (e.hp <= 0) {
                    state.trophies += 5; state.coins += 10; save();
                    location.reload(); // Quick reset for demo
                }
            }
        });
    });
    requestAnimationFrame(loop);
}

updateUI();

