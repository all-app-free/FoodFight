// GLOBÁLNÍ STAV A LOCAL STORAGE
let state = JSON.parse(localStorage.getItem('foodFightSaveV2')) || {
    coins: 0,
    trophies: 0,
    selectedId: 'burger',
    unlockedRoad: [],
    fooders: {
        burger: { name: 'SIR BURGER', emoji: '🍔', hp: 1000, lvl: 1, unlocked: true },
        taco: { name: 'SPICY TACO', emoji: '🌮', hp: 800, lvl: 1, unlocked: false, cost: 250 },
        sushi: { name: 'SUSHI ROLL', emoji: '🍣', hp: 900, lvl: 1, unlocked: false, cost: 500 }
    }
};

const trophyRoadData = [
    { trophies: 50, reward: 100, type: 'coins' },
    { trophies: 150, reward: 'taco', type: 'character' },
    { trophies: 300, reward: 500, type: 'coins' },
    { trophies: 500, reward: 'sushi', type: 'character' }
];

function save() {
    localStorage.setItem('foodFightSaveV2', JSON.stringify(state));
    updateUI();
}

// OVLÁDÁNÍ
const joyL = { id: null, active: false, x: 0, y: 0 };
const joyR = { id: null, active: false, x: 0, y: 0, lastS: 0 };

function setupControls() {
    const handler = (e, type) => {
        e.preventDefault();
        const touches = e.changedTouches;
        for (let t of touches) {
            const isLeft = t.clientX < window.innerWidth / 2;
            if (type === 'start') {
                if (isLeft && joyL.id === null) joyL.id = t.identifier;
                if (!isLeft && joyR.id === null) joyR.id = t.identifier;
            }
            if (t.identifier === joyL.id) updateJoy(t, 'joy-move', 'stick-move', joyL);
            if (t.identifier === joyR.id) updateJoy(t, 'joy-shoot', 'stick-shoot', joyR);
            if (type === 'end') {
                if (t.identifier === joyL.id) { joyL.id = null; joyL.active = false; resetStick('stick-move'); }
                if (t.identifier === joyR.id) { joyR.id = null; joyR.active = false; resetStick('stick-shoot'); }
            }
        }
    };
    window.ontouchstart = (e) => handler(e, 'start');
    window.ontouchmove = (e) => handler(e, 'move');
    window.ontouchend = (e) => handler(e, 'end');
}

function updateJoy(t, cId, sId, stateObj) {
    const r = document.getElementById(cId).getBoundingClientRect();
    const dx = t.clientX - (r.left + r.width/2);
    const dy = t.clientY - (r.top + r.height/2);
    const d = Math.min(Math.hypot(dx, dy), 40);
    const ang = Math.atan2(dy, dx);
    stateObj.active = d > 5;
    stateObj.x = Math.cos(ang) * (d / 40);
    stateObj.y = Math.sin(ang) * (d / 40);
    document.getElementById(sId).style.transform = `translate(${stateObj.x*35}px, ${stateObj.y*35}px)`;
}
function resetStick(id) { document.getElementById(id).style.transform = 'translate(0,0)'; }

// HRA
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let entities = [], projectiles = [], gameRunning = false;
let score = { b: 0, r: 0 };

function startGame() {
    document.getElementById('menu-screen').classList.add('hidden');
    canvas.classList.remove('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    score = { b: 0, r: 0 };
    entities = [
        new Foodie(100, canvas.height/2, state.selectedId, 'blue', true),
        new Foodie(canvas.width-100, canvas.height/2, 'burger', 'red')
    ];
    gameRunning = true; setupControls(); loop();
}

class Foodie {
    constructor(x, y, id, team, isP = false) {
        this.x = x; this.y = y; this.id = id; this.team = team; this.isP = isP;
        this.hp = state.fooders[id].hp; this.maxHp = this.hp;
    }
    draw() {
        ctx.fillStyle = this.team === 'blue' ? '#0072ff' : '#ff3e3e';
        ctx.beginPath(); ctx.arc(this.x, this.y, 25, 0, Math.PI*2); ctx.fill();
        ctx.font = '30px Arial'; ctx.textAlign = 'center';
        ctx.fillText(state.fooders[this.id].emoji, this.x, this.y+10);
    }
    update() {
        if (this.isP) {
            if (joyL.active) { this.x += joyL.x * 6; this.y += joyL.y * 6; }
        } else {
            let target = entities[0];
            let dx = target.x - this.x, dy = target.y - this.y, d = Math.hypot(dx, dy);
            if (d > 200) { this.x += (dx/d)*3; this.y += (dy/d)*3; }
            else if (Math.random() < 0.02) shoot(this, dx/d, dy/d);
        }
    }
}

function shoot(o, vx, vy) { projectiles.push({ x: o.x, y: o.y, vx: vx*12, vy: vy*12, team: o.team }); }

function loop() {
    if (!gameRunning) return;
    ctx.fillStyle = '#2d5a27'; ctx.fillRect(0,0,canvas.width,canvas.height);
    
    if (joyR.active) {
        ctx.strokeStyle = 'white'; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(entities[0].x, entities[0].y);
        ctx.lineTo(entities[0].x + joyR.x*200, entities[0].y + joyR.y*200); ctx.stroke();
        ctx.setLineDash([]);
    }

    entities.forEach(e => { e.update(); e.draw(); });
    if (joyR.active && Date.now() - joyR.lastS > 400) { shoot(entities[0], joyR.x, joyR.y); joyR.lastS = Date.now(); }

    projectiles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill();
        entities.forEach(e => {
            if (e.team !== p.team && Math.hypot(p.x-e.x, p.y-e.y) < 25) {
                e.hp -= 200; projectiles.splice(i, 1);
                if (e.hp <= 0) {
                    score[p.team === 'blue' ? 'b' : 'r']++;
                    e.hp = e.maxHp; e.x = e.team === 'blue' ? 100 : canvas.width-100;
                    document.getElementById('s-blue').innerText = score.b;
                    document.getElementById('s-red').innerText = score.r;
                    if (score.b >= 30 || score.r >= 30) end(score.b >= 30);
                }
            }
        });
    });
    requestAnimationFrame(loop);
}

function end(win) {
    gameRunning = false;
    canvas.classList.add('hidden');
    document.getElementById('game-ui').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    
    const c = win ? 50 : 10;
    const t = win ? 25 : -5;
    state.coins += c;
    state.trophies = Math.max(0, state.trophies + t);
    
    document.getElementById('res-coins').innerText = c;
    document.getElementById('res-trophies').innerText = t;
    document.getElementById('res-title').innerText = win ? "VÍTĚZSTVÍ!" : "PORÁŽKA!";
    save();
}

function backToMenu() {
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
}

// UI & ROAD LOGIC
function updateUI() {
    document.getElementById('p-coins').innerText = state.coins;
    document.getElementById('p-trophies').innerText = state.trophies;
    
    // Trophy Road Progress
    const nextGoal = trophyRoadData.find(g => !state.unlockedRoad.includes(g.trophies)) || {trophies: 1000};
    const prog = (state.trophies / nextGoal.trophies) * 100;
    document.getElementById('road-progress').style.width = Math.min(100, prog) + "%";

    // Fooders List
    const list = document.getElementById('fooders-list');
    list.innerHTML = '';
    Object.keys(state.fooders).forEach(id => {
        const f = state.fooders[id];
        const btn = document.createElement('div');
        btn.className = `fooder-item ${state.selectedId === id ? 'active' : ''} ${!f.unlocked ? 'locked' : ''}`;
        btn.innerHTML = `${f.emoji} ${f.name}`;
        btn.onclick = () => { if(f.unlocked) { state.selectedId = id; save(); } };
        list.appendChild(btn);
    });
}

function openTrophyRoad() {
    document.getElementById('road-screen').classList.remove('hidden');
    const container = document.getElementById('road-items');
    container.innerHTML = '';
    trophyRoadData.forEach(item => {
        const isUnlocked = state.trophies >= item.trophies;
        const card = document.createElement('div');
        card.className = `reward-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        card.innerHTML = `
            <div>
                <strong>${item.trophies} 🏆</strong><br>
                <span>Odměna: ${item.reward} ${item.type === 'coins' ? '🪙' : ''}</span>
            </div>
            <button ${isUnlocked && !state.unlockedRoad.includes(item.trophies) ? '' : 'disabled'} 
                onclick="claimRoad(${item.trophies})">
                ${state.unlockedRoad.includes(item.trophies) ? 'ZÍSKÁNO' : 'VYBRAT'}
            </button>
        `;
        container.appendChild(card);
    });
}

function claimRoad(id) {
    const item = trophyRoadData.find(g => g.trophies === id);
    if (item.type === 'coins') state.coins += item.reward;
    if (item.type === 'character') state.fooders[item.reward].unlocked = true;
    state.unlockedRoad.push(id);
    save();
    openTrophyRoad();
}

function openPass() { document.getElementById('pass-screen').classList.remove('hidden'); }
function closePass() { document.getElementById('pass-screen').classList.add('hidden'); }
function closeRoad() { document.getElementById('road-screen').classList.add('hidden'); }

updateUI();
        
