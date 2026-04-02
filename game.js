// SYSTÉM UKLÁDÁNÍ
let state = JSON.parse(localStorage.getItem('foodFightSave')) || {
    coins: 0, trophies: 0, 
    selected: 'burger',
    unlockedItems: [],
    fooders: {
        burger: { emoji: '🍔', name: 'SIR BURGER', hp: 1000, speed: 5, unlocked: true },
        taco: { emoji: '🌮', name: 'SPICY TACO', hp: 800, speed: 7, unlocked: false },
        sushi: { emoji: '🍣', name: 'SUSHI ROLL', hp: 900, speed: 6, unlocked: false }
    }
};

const passRewards = [
    { lvl: 1, req: 0, reward: 100, type: 'coins' },
    { lvl: 2, req: 10, reward: 'taco', type: 'hero' },
    { lvl: 3, req: 50, reward: 500, type: 'coins' }
];

const roadRewards = [
    { trophies: 50, reward: 200, type: 'coins' },
    { trophies: 150, reward: 'sushi', type: 'hero' }
];

function save() { 
    localStorage.setItem('foodFightSave', JSON.stringify(state)); 
    updateUI(); 
}

// OVLÁDÁNÍ
const joyL = { id: null, active: false, x: 0, y: 0 };
const joyR = { id: null, active: false, x: 0, y: 0, lastS: 0 };

function initControls() {
    const handle = (e, type) => {
        const touches = e.changedTouches;
        for (let t of touches) {
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

// UI UPDATES
function updateUI() {
    document.getElementById('p-coins').innerText = state.coins;
    document.getElementById('p-trophies').innerText = state.trophies;
    
    // Progress Bary
    document.getElementById('road-fill').style.width = Math.min(100, (state.trophies / 200) * 100) + "%";
    document.getElementById('pass-fill').style.width = Math.min(100, (state.trophies / 100) * 100) + "%";

    // Fooders List
    const list = document.getElementById('fooders-list');
    list.innerHTML = '';
    Object.keys(state.fooders).forEach(id => {
        const f = state.fooders[id];
        if (!f.unlocked) return;
        const div = document.createElement('div');
        div.className = `fooder-item ${state.selected === id ? 'active' : ''}`;
        div.innerHTML = `${f.emoji} ${f.name}`;
        div.onclick = () => { state.selected = id; save(); };
        list.appendChild(div);
    });

    const sel = state.fooders[state.selected];
    document.getElementById('hero-display').innerText = sel.emoji;
    document.getElementById('hero-name').innerText = sel.name;
}

// MODALS LOGIC
function openPass() {
    const win = document.getElementById('pass-screen');
    win.classList.remove('hidden');
    const cont = document.getElementById('pass-items');
    cont.innerHTML = passRewards.map(r => `
        <div class="reward-row">
            <span>LVL ${r.lvl} (${r.req} XP) - ${r.reward} ${r.type === 'coins' ? '🪙' : '🍔'}</span>
            <button onclick="claim('pass', ${r.lvl})" ${state.trophies < r.req ? 'disabled' : ''}>VYBRAT</button>
        </div>
    `).join('');
}

function openRoad() {
    document.getElementById('road-screen').classList.remove('hidden');
    const cont = document.getElementById('road-items');
    cont.innerHTML = roadRewards.map(r => `
        <div class="reward-row">
            <span>🏆 ${r.trophies} - ${r.reward} ${r.type === 'coins' ? '🪙' : '🍔'}</span>
            <button onclick="claim('road', ${r.trophies})" ${state.trophies < r.trophies ? 'disabled' : ''}>VYBRAT</button>
        </div>
    `).join('');
}

function claim(type, id) {
    const key = `${type}_${id}`;
    if (state.unlockedItems.includes(key)) return alert("Již vybráno!");
    
    let reward;
    if (type === 'pass') reward = passRewards.find(r => r.lvl === id);
    else reward = roadRewards.find(r => r.trophies === id);

    if (reward.type === 'coins') state.coins += reward.reward;
    if (reward.type === 'hero') state.fooders[reward.reward].unlocked = true;
    
    state.unlockedItems.push(key);
    save(); closeModals();
}

function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
}

// GAME ENGINE
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let entities = [], projectiles = [], gameActive = false;
let score = { b: 0, r: 0 };

function startGame() {
    document.getElementById('menu-screen').classList.add('hidden');
    canvas.classList.remove('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    
    entities = [
        new Foodie(100, canvas.height/2, state.selected, 'blue', true),
        new Foodie(canvas.width-100, canvas.height/2, 'burger', 'red')
    ];
    gameActive = true; initControls(); loop();
}

class Foodie {
    constructor(x,y,id,team,isP) { 
        this.x=x; this.y=y; this.id=id; this.team=team; this.isP=isP; 
        this.hp=state.fooders[id].hp; this.max=this.hp;
    }
    draw() {
        ctx.fillStyle = this.team === 'blue' ? '#0072ff' : '#ff3e3e';
        ctx.beginPath(); ctx.arc(this.x, this.y, 30, 0, Math.PI*2); ctx.fill();
        ctx.font = '30px Arial'; ctx.textAlign='center'; ctx.fillText(state.fooders[this.id].emoji, this.x, this.y+10);
    }
    update() {
        if (this.isP) {
            if (joyL.active) { this.x += joyL.x*5; this.y += joyL.y*5; }
        } else {
            let dx = entities[0].x - this.x, dy = entities[0].y - this.y, d = Math.hypot(dx,dy);
            if (d > 200) { this.x += dx/d*3; this.y += dy/d*3; }
            else if (Math.random() < 0.02) shoot(this, dx/d, dy/d);
        }
    }
}

function shoot(o, vx, vy) { projectiles.push({ x: o.x, y: o.y, vx: vx*10, vy: vy*10, team: o.team }); }

function loop() {
    if (!gameActive) return;
    ctx.fillStyle = '#2d5a27'; ctx.fillRect(0,0,canvas.width,canvas.height);

    if (joyR.active) {
        ctx.strokeStyle = 'white'; ctx.setLineDash([5,5]); ctx.beginPath();
        ctx.moveTo(entities[0].x, entities[0].y); ctx.lineTo(entities[0].x+joyR.x*200, entities[0].y+joyR.y*200); ctx.stroke();
    }

    entities.forEach(e => { e.update(); e.draw(); });
    if (joyR.active && Date.now() - joyR.lastS > 400) { shoot(entities[0], joyR.x, joyR.y); joyR.lastS = Date.now(); }

    projectiles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill();
        entities.forEach(e => {
            if (e.team !== p.team && Math.hypot(p.x-e.x, p.y-e.y) < 30) {
                e.hp -= 200; projectiles.splice(i,1);
                if (e.hp <= 0) {
                    score[p.team === 'blue' ? 'b' : 'r']++;
                    e.hp = e.max; e.x = e.team === 'blue' ? 100 : canvas.width-100;
                    document.getElementById('s-blue').innerText = score.b;
                    document.getElementById('s-red').innerText = score.r;
                    if (score.b >= 30) finish(true);
                }
            }
        });
    });
    requestAnimationFrame(loop);
}

function finish(win) {
    gameActive = false;
    document.getElementById('result-screen').classList.remove('hidden');
    const t = win ? 25 : -5; const c = win ? 40 : 10;
    state.trophies = Math.max(0, state.trophies + t);
    state.coins += c;
    document.getElementById('res-trophies').innerText = t;
    document.getElementById('res-coins').innerText = c;
    save();
}

updateUI();
        
