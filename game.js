// --- DATA SYSTEM ---
let state = JSON.parse(localStorage.getItem('foodFightSave')) || {
    coins: 0, trophies: 0, selected: 'burger', claimed: [],
    fooders: {
        burger: { emoji: '🍔', name: 'SIR BURGER', hp: 1000, speed: 4.8, unlocked: true },
        taco: { emoji: '🌮', name: 'SPICY TACO', hp: 800, speed: 6.5, unlocked: false },
        sushi: { emoji: '🍣', name: 'SUSHI ROLL', hp: 900, speed: 5.8, unlocked: false }
    }
};

const PASS_DATA = [
    { id: 'p1', req: 0, reward: 50, type: 'coins', name: 'Welcome Gift' },
    { id: 'p2', req: 30, reward: 150, type: 'coins', name: 'Pouch of Gold' },
    { id: 'p3', req: 80, reward: 'taco', type: 'hero', name: 'Unlock Taco' },
    { id: 'p4', req: 200, reward: 1000, type: 'coins', name: 'King Fortune' }
];

const ROAD_DATA = [
    { id: 'r1', req: 10, reward: 25, type: 'coins', name: 'Road Start' },
    { id: 'r2', req: 50, reward: 'sushi', type: 'hero', name: 'Sushi Master' },
    { id: 'r3', req: 150, reward: 500, type: 'coins', name: 'Trophy Hoard' }
];

function save() {
    localStorage.setItem('foodFightSave', JSON.stringify(state));
    updateUI();
}

// --- CONTROLS ---
const joyL = { id: null, active: false, x: 0, y: 0 };
const joyR = { id: null, active: false, x: 0, y: 0, lastS: 0 };

function initControls() {
    const handle = (e, type) => {
        for (let t of e.changedTouches) {
            const isLeft = t.clientX < window.innerWidth / 2;
            if (type === 'start') {
                if (isLeft && joyL.id === null) joyL.id = t.identifier;
                if (!isLeft && joyR.id === null) joyR.id = t.identifier;
            }
            if (t.identifier === joyL.id) moveStick(t, 'joy-move', 'stick-move', joyL);
            if (t.identifier === joyR.id) moveStick(t, 'joy-shoot', 'stick-shoot', joyR);
            if (type === 'end') {
                if (t.identifier === joyL.id) { joyL.id = null; joyL.active = false; resetS('stick-move'); }
                if (t.identifier === joyR.id) { joyR.id = null; joyR.active = false; resetS('stick-shoot'); }
            }
        }
    };
    window.ontouchstart = (e) => handle(e, 'start');
    window.ontouchmove = (e) => handle(e, 'move');
    window.ontouchend = (e) => handle(e, 'end');
}

function moveStick(t, cId, sId, st) {
    const r = document.getElementById(cId).getBoundingClientRect();
    const dx = t.clientX - (r.left + r.width/2), dy = t.clientY - (r.top + r.height/2);
    const d = Math.min(Math.hypot(dx, dy), 40);
    const ang = Math.atan2(dy, dx);
    st.active = d > 5; st.x = Math.cos(ang) * (d/40); st.y = Math.sin(ang) * (d/40);
    document.getElementById(sId).style.transform = `translate(${st.x*35}px,${st.y*35}px)`;
}
function resetS(id) { document.getElementById(id).style.transform = 'translate(0,0)'; }

// --- GAME LOGIC ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let entities = [], projectiles = [], walls = [], gameActive = false;
let score = { b: 0, r: 0 };

class Foodie {
    constructor(x, y, id, team, isPlayer = false) {
        this.x = x; this.y = y; this.team = team; this.isPlayer = isPlayer;
        const d = state.fooders[id] || state.fooders.burger;
        this.hp = d.hp; this.max = d.hp; this.speed = d.speed; this.emoji = d.emoji;
    }
    draw() {
        ctx.fillStyle = this.team === 'blue' ? '#0072ff' : '#ff3e3e';
        ctx.beginPath(); ctx.arc(this.x, this.y, 25, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
        ctx.font = '22px Arial'; ctx.textAlign = 'center'; ctx.fillText(this.emoji, this.x, this.y+8);
        // HP
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(this.x-20, this.y-35, 40, 5);
        ctx.fillStyle = this.team === 'blue' ? '#4cd137' : '#ffce00';
        ctx.fillRect(this.x-20, this.y-35, (this.hp/this.max)*40, 5);
    }
    update() {
        let ox = this.x, oy = this.y;
        if (this.isPlayer) {
            if (joyL.active) { this.x += joyL.x * this.speed; this.y += joyL.y * this.speed; }
        } else {
            let target = entities.find(e => e.team !== this.team);
            if (target) {
                let dx = target.x - this.x, dy = target.y - this.y, dist = Math.hypot(dx, dy);
                let vx = (dx/dist)*this.speed*0.6;
                let vy = (dy/dist)*this.speed*0.6;

                // Improved Bot Avoidance (Sliding along walls)
                let futureX = this.x + vx;
                let futureY = this.y + vy;
                let hitWall = walls.find(w => futureX+20 > w.x && futureX-20 < w.x+w.w && futureY+20 > w.y && futureY-20 < w.y+w.h);
                
                if (hitWall) {
                    // Try moving only X or only Y to "slide"
                    if (!walls.find(w => futureX+20 > w.x && futureX-20 < w.x+w.w && this.y+20 > w.y && this.y-20 < w.y+w.h)) vy = 0;
                    else if (!walls.find(w => this.x+20 > w.x && this.x-20 < w.x+w.w && futureY+20 > w.y && futureY-20 < w.y+w.h)) vx = 0;
                    else { vx = 0; vy = 0; } // Stuck
                }

                if (dist > 180) { this.x += vx; this.y += vy; }
                if (Math.random() < 0.02) shoot(this, dx/dist, dy/dist);
            }
        }
        walls.forEach(w => {
            if (this.x+22 > w.x && this.x-22 < w.x+w.w && this.y+22 > w.y && this.y-22 < w.y+w.h) { this.x=ox; this.y=oy; }
        });
        this.x = Math.max(25, Math.min(canvas.width-25, this.x));
        this.y = Math.max(25, Math.min(canvas.height-25, this.y));
    }
}

function shoot(o, vx, vy) { projectiles.push({ x: o.x, y: o.y, vx: vx*12, vy: vy*12, team: o.team }); }

function startGame() {
    document.getElementById('menu-screen').classList.add('hidden');
    canvas.classList.remove('hidden'); document.getElementById('game-ui').classList.remove('hidden');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    score = { b: 0, r: 0 }; projectiles = [];
    walls = [
        { x: canvas.width*0.2, y: canvas.height*0.2, w: 45, h: canvas.height*0.25 },
        { x: canvas.width*0.75, y: canvas.height*0.5, w: 45, h: canvas.height*0.25 },
        { x: canvas.width*0.4, y: canvas.height*0.45, w: canvas.width*0.2, h: 45 }
    ];
    entities = [
        new Foodie(100, canvas.height/2, state.selected, 'blue', true),
        new Foodie(100, 100, 'taco', 'blue'), new Foodie(100, canvas.height-100, 'burger', 'blue'),
        new Foodie(canvas.width-100, canvas.height/2, 'burger', 'red'),
        new Foodie(canvas.width-100, 100, 'sushi', 'red'), new Foodie(canvas.width-100, canvas.height-100, 'taco', 'red')
    ];
    gameActive = true; initControls(); loop();
}

function loop() {
    if (!gameActive) return;
    ctx.fillStyle = '#2d5a27'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#1a3a15'; walls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));

    if (joyR.active && Date.now() - joyR.lastS > 400) { shoot(entities[0], joyR.x, joyR.y); joyR.lastS = Date.now(); }

    entities.forEach(e => { e.update(); e.draw(); });
    projectiles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill();
        walls.forEach(w => { if(p.x > w.x && p.x < w.x+w.w && p.y > w.y && p.y < w.y+w.h) projectiles.splice(i,1); });
        entities.forEach(e => {
            if (e.team !== p.team && Math.hypot(p.x-e.x, p.y-e.y) < 25) {
                e.hp -= 200; projectiles.splice(i,1);
                if (e.hp <= 0) {
                    score[p.team==='blue'?'b':'r']++;
                    e.hp = e.max; e.x = e.team==='blue'?100:canvas.width-100;
                    document.getElementById('s-blue').innerText = score.b;
                    document.getElementById('s-red').innerText = score.r;
                    if (score.b >= 10 || score.r >= 10) endMatch(score.b >= 10);
                }
            }
        });
    });
    requestAnimationFrame(loop);
}

function endMatch(win) {
    gameActive = false;
    document.getElementById('result-screen').classList.remove('hidden');
    const t = win ? 20 : -5; const c = win ? 40 : 10;
    state.trophies = Math.max(0, state.trophies + t); state.coins += c;
    document.getElementById('res-trophies').innerText = (t >= 0 ? "+" : "") + t;
    document.getElementById('res-coins').innerText = "+" + c;
    document.getElementById('res-title').innerText = win ? "VICTORY" : "DEFEAT";
    save();
}

// --- UI SYTEM ---
function updateUI() {
    document.getElementById('p-trophies').innerText = state.trophies;
    document.getElementById('p-coins').innerText = state.coins;
    document.getElementById('pass-fill').style.width = Math.min(100, (state.trophies/2)) + "%";
    document.getElementById('road-fill').style.width = Math.min(100, (state.trophies/1.5)) + "%";
    
    const list = document.getElementById('fooders-list'); list.innerHTML = '';
    Object.keys(state.fooders).forEach(key => {
        const f = state.fooders[key]; if (!f.unlocked) return;
        const div = document.createElement('div'); div.className = `fooder-item ${state.selected === key ? 'active' : ''}`;
        div.innerHTML = `${f.emoji} ${f.name}`; div.onclick = () => { state.selected = key; save(); };
        list.appendChild(div);
    });
    const h = state.fooders[state.selected];
    document.getElementById('hero-display').innerText = h.emoji;
    document.getElementById('hero-name').innerText = h.name;
}

function openPass() {
    document.getElementById('pass-screen').classList.remove('hidden');
    const cont = document.getElementById('pass-items');
    cont.innerHTML = PASS_DATA.map(item => {
        const claimed = state.claimed.includes(item.id);
        const can = state.trophies >= item.req && !claimed;
        return `<div class="reward-node ${claimed?'claimed':''}">
            <div style="font-size:0.8rem; color:var(--yellow)">${item.req} 🏆</div>
            <div style="font-size:2.5rem; margin:10px 0">${item.type==='coins'?'🪙':'🎁'}</div>
            <div style="font-size:0.7rem; height:25px">${item.name}</div>
            <button onclick="claim('${item.id}', 'pass')" class="${can?'btn-claim':'btn-locked'}" ${!can?'disabled':''}>
                ${claimed?'CLAIMED':(can?'CLAIM':'LOCKED')}
            </button>
        </div>`;
    }).join('');
}

function openRoad() {
    document.getElementById('road-screen').classList.remove('hidden');
    const cont = document.getElementById('road-items');
    cont.innerHTML = ROAD_DATA.map(item => {
        const claimed = state.claimed.includes(item.id);
        const can = state.trophies >= item.req && !claimed;
        return `<div class="reward-node ${claimed?'claimed':''}">
            <div style="font-size:0.8rem; color:var(--yellow)">${item.req} 🏆</div>
            <div style="font-size:2.5rem; margin:10px 0">${item.type==='coins'?'🪙':'🎁'}</div>
            <div style="font-size:0.7rem; height:25px">${item.name}</div>
            <button onclick="claim('${item.id}', 'road')" class="${can?'btn-claim':'btn-locked'}" ${!can?'disabled':''}>
                ${claimed?'CLAIMED':(can?'CLAIM':'LOCKED')}
            </button>
        </div>`;
    }).join('');
}

function claim(id, type) {
    const data = type === 'pass' ? PASS_DATA : ROAD_DATA;
    const item = data.find(p => p.id === id);
    if (item.type === 'coins') state.coins += item.reward;
    if (item.type === 'hero') state.fooders[item.reward].unlocked = true;
    state.claimed.push(id); save(); 
    if(type === 'pass') openPass(); else openRoad();
}

function closeModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')); }

initControls();
updateUI();
        
