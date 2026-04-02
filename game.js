// DATA HRY
const gameState = {
    coins: 0, trophies: 0, selectedId: 'burger',
    fooders: {
        burger: { name: 'SIR BURGER', emoji: '🍔', hp: 1000, lvl: 1, speed: 5, unlocked: true },
        taco: { name: 'SPICY TACO', emoji: '🌮', hp: 800, lvl: 1, speed: 7, unlocked: false, cost: 200 },
        sushi: { name: 'SUSHI ROLL', emoji: '🍣', hp: 900, lvl: 1, speed: 6, unlocked: false, cost: 500 }
    }
};

// MULTI-TOUCH OVLÁDÁNÍ
const joyL = { id: null, active: false, x: 0, y: 0 };
const joyR = { id: null, active: false, x: 0, y: 0, lastS: 0 };

function setupControls() {
    const start = (e) => {
        for (let t of e.changedTouches) {
            if (t.clientX < window.innerWidth / 2 && joyL.id === null) joyL.id = t.identifier;
            else if (t.clientX >= window.innerWidth / 2 && joyR.id === null) joyR.id = t.identifier;
        }
    };
    const move = (e) => {
        for (let t of e.changedTouches) {
            if (t.identifier === joyL.id) handleJoy(t, 'joy-move', 'stick-move', joyL);
            if (t.identifier === joyR.id) handleJoy(t, 'joy-shoot', 'stick-shoot', joyR);
        }
    };
    const end = (e) => {
        for (let t of e.changedTouches) {
            if (t.identifier === joyL.id) { joyL.id = null; joyL.active = false; resetStick('stick-move'); }
            if (t.identifier === joyR.id) { joyR.id = null; joyR.active = false; resetStick('stick-shoot'); }
        }
    };
    window.addEventListener('touchstart', start);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', end);
}

function handleJoy(t, contId, stickId, state) {
    const rect = document.getElementById(contId).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = t.clientX - cx;
    const dy = t.clientY - cy;
    const dist = Math.min(Math.hypot(dx, dy), 50);
    const ang = Math.atan2(dy, dx);
    state.active = dist > 10;
    state.x = Math.cos(ang) * (dist / 50);
    state.y = Math.sin(ang) * (dist / 50);
    document.getElementById(stickId).style.transform = `translate(${state.x*40}px, ${state.y*40}px)`;
}
function resetStick(id) { document.getElementById(id).style.transform = 'translate(0,0)'; }

// HERNÍ ENGINE
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let entities = [], projectiles = [], obstacles = [], gameRunning = false;
let score = { b: 0, r: 0 };

function initGame() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    score = { b: 0, r: 0 }; projectiles = [];
    
    obstacles = [
        { x: canvas.width * 0.2, y: canvas.height * 0.3, w: 120, h: 40 },
        { x: canvas.width * 0.7, y: canvas.height * 0.3, w: 120, h: 40 },
        { x: canvas.width * 0.45, y: canvas.height * 0.5 - 60, w: 60, h: 120 }
    ];

    entities = [
        new Foodie(150, canvas.height/2, gameState.selectedId, 'blue', true),
        new Foodie(150, 100, 'taco', 'blue'), new Foodie(150, canvas.height-100, 'sushi', 'blue'),
        new Foodie(canvas.width-150, canvas.height/2, 'burger', 'red'),
        new Foodie(canvas.width-150, 100, 'sushi', 'red'), new Foodie(canvas.width-150, canvas.height-100, 'taco', 'red')
    ];
    gameRunning = true; loop();
}

class Foodie {
    constructor(x, y, id, team, isP = false) {
        this.x = x; this.y = y; this.id = id; this.team = team; this.isP = isP;
        const c = gameState.fooders[id];
        this.hp = c.hp; this.maxHp = c.hp; this.speed = c.speed;
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(0, 18, 20, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.fillRect(-25, -45, 50, 8);
        ctx.fillStyle = this.team === 'blue' ? '#0072ff' : '#ff3e3e';
        ctx.fillRect(-25, -45, (this.hp/this.maxHp)*50, 8);
        ctx.font = '40px Arial'; ctx.textAlign = 'center';
        ctx.fillText(gameState.fooders[this.id].emoji, 0, 15);
        ctx.restore();
    }
    update() {
        let ox = this.x, oy = this.y;
        if (this.isP) {
            if (joyL.active) { this.x += joyL.x * this.speed; this.y += joyL.y * this.speed; }
        } else {
            let target = entities.find(e => e.team !== this.team);
            if (target) {
                let dx = target.x - this.x, dy = target.y - this.y, d = Math.hypot(dx, dy);
                if (d > 180) { this.x += (dx/d)*3; this.y += (dy/d)*3; }
                else if (Math.random() < 0.04) fire(this, dx/d, dy/d);
            }
        }
        obstacles.forEach(o => {
            if (this.x+15 > o.x && this.x-15 < o.x+o.w && this.y+15 > o.y && this.y-15 < o.y+o.h) { this.x = ox; this.y = oy; }
        });
        this.x = Math.max(30, Math.min(canvas.width-30, this.x));
        this.y = Math.max(30, Math.min(canvas.height-30, this.y));
    }
}

function fire(o, vx, vy) { projectiles.push({ x: o.x, y: o.y, vx: vx*12, vy: vy*12, team: o.team }); }

function loop() {
    if (!gameRunning) return;
    ctx.fillStyle = '#2d5a27'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#5d4037'; obstacles.forEach(o => ctx.fillRect(o.x, o.y, o.w, o.h));

    // AIM LINE
    if (joyR.active) {
        const p = entities[0];
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.setLineDash([5, 10]); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + joyR.x*250, p.y + joyR.y*250); ctx.stroke();
        ctx.setLineDash([]);
    }

    entities.forEach(e => { e.update(); e.draw(); });

    if (joyR.active && Date.now() - joyR.lastS > 350) { fire(entities[0], joyR.x, joyR.y); joyR.lastS = Date.now(); }

    projectiles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = p.team === 'blue' ? '#ff0' : '#f00'; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI*2); ctx.fill();
        entities.forEach(e => {
            if (e.team !== p.team && Math.hypot(p.x-e.x, p.y-e.y) < 25) {
                e.hp -= 200; projectiles.splice(i, 1);
                if (e.hp <= 0) {
                    e.hp = e.maxHp; e.x = e.team === 'blue' ? 100 : canvas.width-100;
                    score[p.team === 'blue' ? 'b' : 'r']++;
                    document.getElementById('s-blue').innerText = score.b;
                    document.getElementById('s-red').innerText = score.r;
                    if (score.b >= 30 || score.r >= 30) finish(score.b >= 30);
                }
            }
        });
    });
    requestAnimationFrame(loop);
}

function finish(win) {
    gameRunning = false;
    document.getElementById('gameCanvas').classList.add('hidden');
    document.getElementById('game-ui').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('res-title').innerText = win ? "VÍTĚZSTVÍ!" : "PORÁŽKA!";
    const c = win ? 60 : 15; const t = win ? 20 : 5;
    state.coins += c; state.trophies += t;
    document.getElementById('res-coins').innerText = c;
    document.getElementById('res-trophies').innerText = t;
}

// UI LOGIKA
function updateMenu() {
    document.getElementById('p-coins').innerText = gameState.coins;
    document.getElementById('p-trophies').innerText = gameState.trophies;
    const list = document.getElementById('fooders-list'); list.innerHTML = '';
    Object.keys(gameState.fooders).forEach(id => {
        const f = gameState.fooders[id];
        const item = document.createElement('div');
        item.className = `fooder-item ${gameState.selectedId === id ? 'active' : ''} ${!f.unlocked ? 'locked' : ''}`;
        item.innerHTML = `<span>${f.emoji}</span> <div>${f.name}<br><small>Level ${f.lvl}</small></div>`;
        item.onclick = () => { gameState.selectedId = id; updateMenu(); };
        list.appendChild(item);
    });
    const sel = gameState.fooders[gameState.selectedId];
    document.getElementById('hero-preview').innerText = sel.emoji;
    document.getElementById('hero-name').innerText = sel.name;
    document.getElementById('upgrade-btn').innerText = sel.unlocked ? `LEVELIT UP! (${sel.lvl * 100} 🪙)` : `ODEMKNOUT (${sel.cost} 🪙)`;
}

document.getElementById('play-btn').onclick = () => {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('gameCanvas').classList.remove('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    initGame();
};

function backToMenu() {
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    updateMenu();
}

setupControls();
updateMenu();
                                       
