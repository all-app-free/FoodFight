// --- DATA A STAV ---
let state = JSON.parse(localStorage.getItem('foodFightData')) || {
    coins: 0, trophies: 0, selected: 'burger', claimedRewards: [],
    fooders: {
        burger: { emoji: '🍔', name: 'SIR BURGER', hp: 1000, speed: 5, unlocked: true },
        taco: { emoji: '🌮', name: 'SPICY TACO', hp: 800, speed: 7, unlocked: false },
        sushi: { emoji: '🍣', name: 'SUSHI ROLL', hp: 900, speed: 6, unlocked: false }
    }
};

function save() {
    localStorage.setItem('foodFightData', JSON.stringify(state));
    updateUI();
}

// --- OVLÁDÁNÍ (Multi-touch) ---
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

// --- LOGIKA HRY ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let entities = [], projectiles = [], walls = [], gameActive = false;
let score = { b: 0, r: 0 };

class Foodie {
    constructor(x, y, id, team, isPlayer = false) {
        this.x = x; this.y = y; this.id = id; this.team = team; this.isPlayer = isPlayer;
        const d = state.fooders[id] || state.fooders.burger;
        this.hp = d.hp; this.maxHp = d.hp; this.speed = d.speed;
        this.emoji = d.emoji; this.radius = 25;
    }
    draw() {
        ctx.fillStyle = this.team === 'blue' ? '#0072ff' : '#ff3e3e';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'white'; ctx.lineWidth = 3; ctx.stroke();
        ctx.font = '30px Arial'; ctx.textAlign = 'center';
        ctx.fillText(this.emoji, this.x, this.y + 10);
        // HP Bar
        ctx.fillStyle = 'black'; ctx.fillRect(this.x - 20, this.y - 40, 40, 6);
        ctx.fillStyle = this.team === 'blue' ? '#4cd137' : '#ffce00';
        ctx.fillRect(this.x - 20, this.y - 40, (this.hp / this.maxHp) * 40, 6);
    }
    update() {
        let oldX = this.x, oldY = this.y;
        if (this.isPlayer) {
            if (joyL.active) { this.x += joyL.x * this.speed; this.y += joyL.y * this.speed; }
        } else {
            // Jednoduchá AI botů
            let target = entities.find(e => e.team !== this.team);
            if (target) {
                let dx = target.x - this.x, dy = target.y - this.y, dist = Math.hypot(dx, dy);
                if (dist > 180) { this.x += (dx/dist) * (this.speed * 0.6); this.y += (dy/dist) * (this.speed * 0.6); }
                if (Math.random() < 0.02) shoot(this, dx/dist, dy/dist);
            }
        }
        // Kolize se zdmi
        walls.forEach(w => {
            if (this.x + 20 > w.x && this.x - 20 < w.x + w.w && this.y + 20 > w.y && this.y - 20 < w.y + w.h) {
                this.x = oldX; this.y = oldY;
            }
        });
        this.x = Math.max(25, Math.min(canvas.width - 25, this.x));
        this.y = Math.max(25, Math.min(canvas.height - 25, this.y));
    }
}

function shoot(o, vx, vy) {
    projectiles.push({ x: o.x, y: o.y, vx: vx * 12, vy: vy * 12, team: o.team });
}

function startGame() {
    document.getElementById('menu-screen').classList.add('hidden');
    canvas.classList.remove('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;

    score = { b: 0, r: 0 }; projectiles = [];
    walls = [
        { x: canvas.width * 0.2, y: canvas.height * 0.2, w: 40, h: canvas.height * 0.2 },
        { x: canvas.width * 0.75, y: canvas.height * 0.6, w: 40, h: canvas.height * 0.2 },
        { x: canvas.width * 0.4, y: canvas.height * 0.45, w: canvas.width * 0.2, h: 40 }
    ];

    entities = [
        new Foodie(100, canvas.height/2, state.selected, 'blue', true),
        new Foodie(100, 100, 'taco', 'blue'),
        new Foodie(100, canvas.height-100, 'burger', 'blue'),
        new Foodie(canvas.width-100, canvas.height/2, 'burger', 'red'),
        new Foodie(canvas.width-100, 100, 'sushi', 'red'),
        new Foodie(canvas.width-100, canvas.height-100, 'taco', 'red')
    ];

    gameActive = true; initControls(); loop();
}

function loop() {
    if (!gameActive) return;
    ctx.fillStyle = '#2d5a27'; ctx.fillRect(0,0,canvas.width,canvas.height);
    
    // Kreslení zdí
    ctx.fillStyle = '#1a3a15';
    walls.forEach(w => { ctx.fillRect(w.x, w.y, w.w, w.h); ctx.strokeStyle = '#fff'; ctx.strokeRect(w.x, w.y, w.w, w.h); });

    // Mířidlo hráče
    if (joyR.active) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.setLineDash([5, 10]); ctx.beginPath();
        ctx.moveTo(entities[0].x, entities[0].y); ctx.lineTo(entities[0].x + joyR.x*250, entities[0].y + joyR.y*250); ctx.stroke(); ctx.setLineDash([]);
        if (Date.now() - joyR.lastS > 350) { shoot(entities[0], joyR.x, joyR.y); joyR.lastS = Date.now(); }
    }

    entities.forEach(e => { e.update(); e.draw(); });

    projectiles.forEach((p, pi) => {
        p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI*2); ctx.fill();

        // Kolize střely se zdmi
        walls.forEach(w => { if (p.x > w.x && p.x < w.x+w.w && p.y > w.y && p.y < w.y+w.h) projectiles.splice(pi, 1); });

        // Zásah postav
        entities.forEach(e => {
            if (e.team !== p.team && Math.hypot(p.x - e.x, p.y - e.y) < 30) {
                e.hp -= 200; projectiles.splice(pi, 1);
                if (e.hp <= 0) {
                    score[p.team === 'blue' ? 'b' : 'r']++;
                    e.hp = e.maxHp; e.x = e.team === 'blue' ? 100 : canvas.width - 100;
                    document.getElementById('s-blue').innerText = score.b;
                    document.getElementById('s-red').innerText = score.r;
                    if (score.b >= 30 || score.r >= 30) finishGame(score.b >= 30);
                }
            }
        });
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) projectiles.splice(pi, 1);
    });

    requestAnimationFrame(loop);
}

function finishGame(win) {
    gameActive = false;
    document.getElementById('game-ui').classList.add('hidden');
    const res = document.getElementById('result-screen');
    res.classList.remove('hidden');
    
    const t = win ? 25 : -5; const c = win ? 40 : 10;
    state.trophies = Math.max(0, state.trophies + t);
    state.coins += c;
    
    document.getElementById('res-trophies').innerText = t;
    document.getElementById('res-coins').innerText = c;
    document.getElementById('res-title').innerText = win ? "VÍTĚZSTVÍ!" : "PORÁŽKA";
    save();
}

// --- OSTATNÍ FUNKCE MENU ---
function updateUI() {
    document.getElementById('p-trophies').innerText = state.trophies;
    document.getElementById('p-coins').innerText = state.coins;
    document.getElementById('pass-fill').style.width = Math.min(100, state.trophies) + "%";
    document.getElementById('road-fill').style.width = Math.min(100, (state.trophies / 2) ) + "%";

    const list = document.getElementById('fooders-list');
    list.innerHTML = '';
    Object.keys(state.fooders).forEach(key => {
        const f = state.fooders[key];
        if (!f.unlocked) return;
        const div = document.createElement('div');
        div.className = `fooder-item ${state.selected === key ? 'active' : ''}`;
        div.innerHTML = `${f.emoji} ${f.name}`;
        div.onclick = () => { state.selected = key; save(); };
        list.appendChild(div);
    });
    const h = state.fooders[state.selected];
    document.getElementById('hero-display').innerText = h.emoji;
    document.getElementById('hero-name').innerText = h.name;
}

function openPass() {
    const screen = document.getElementById('pass-screen');
    const container = document.getElementById('pass-items');
    screen.classList.remove('hidden');
    container.innerHTML = PASS_LEVELS.map(item => {
        const isClaimed = state.claimedRewards.includes(item.id);
        const canClaim = state.trophies >= item.req && !isClaimed;
        return `
            <div class="reward-item ${isClaimed ? 'claimed' : ''}">
                <div><strong>${item.name}</strong><br><small>${item.req} 🏆</small></div>
                <button onclick="claim('${item.id}', '${item.type}', '${item.reward}')" ${!canClaim ? 'disabled' : ''}>
                    ${isClaimed ? 'VYBRÁNO' : (canClaim ? 'VYBRAT' : 'ZAMČENO')}
                </button>
            </div>`;
    }).join('');
}

function claim(id, type, val) {
    if (type === 'coins') state.coins += parseInt(val);
    if (type === 'hero') state.fooders[val].unlocked = true;
    state.claimedRewards.push(id);
    save(); closeModals();
}

function closeModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')); }
function openRoad() { document.getElementById('road-screen').classList.remove('hidden'); }

const PASS_LEVELS = [
    { id: 'p1', req: 0, reward: 50, type: 'coins', name: 'Startovní Mince' },
    { id: 'p2', req: 25, reward: 'taco', type: 'hero', name: 'Hrdina Taco' },
    { id: 'p3', req: 100, reward: 500, type: 'coins', name: 'Velký Poklad' }
];

updateUI();
                
