const gameState = {
    coins: 0, 
    trophies: 0, 
    selectedId: 'burger',
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
    window.addEventListener('touchstart', start, {passive: false});
    window.addEventListener('touchmove', move, {passive: false});
    window.addEventListener('touchend', end);
}

function handleJoy(t, contId, stickId, state) {
    const rect = document.getElementById(contId).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = t.clientX - cx;
    const dy = t.clientY - cy;
    const dist = Math.min(Math.hypot(dx, dy), 40);
    const ang = Math.atan2(dy, dx);
    state.active = dist > 5;
    state.x = Math.cos(ang) * (dist / 40);
    state.y = Math.sin(ang) * (dist / 40);
    document.getElementById(stickId).style.transform = `translate(${state.x*35}px, ${state.y*35}px)`;
}
function resetStick(id) { document.getElementById(id).style.transform = 'translate(0,0)'; }

// HERNÍ ENGINE
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let entities = [], projectiles = [], obstacles = [], gameRunning = false;
let score = { b: 0, r: 0 };

function startGame() {
    document.getElementById('menu-screen').classList.add('hidden');
    canvas.classList.remove('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;
    score = { b: 0, r: 0 };
    projectiles = [];
    
    // Překážky
    obstacles = [{ x: canvas.width * 0.4, y: canvas.height * 0.4, w: 100, h: 40 }];

    entities = [
        new Foodie(100, canvas.height/2, gameState.selectedId, 'blue', true),
        new Foodie(100, 100, 'taco', 'blue'),
        new Foodie(canvas.width-100, canvas.height/2, 'burger', 'red')
    ];
    gameRunning = true; loop();
}

class Foodie {
    constructor(x, y, id, team, isP = false) {
        this.x = x; this.y = y; this.id = id; this.team = team; this.isP = isP;
        this.hp = gameState.fooders[id].hp; this.maxHp = this.hp;
    }
    draw() {
        ctx.fillStyle = this.team === 'blue' ? '#0072ff' : '#ff3e3e';
        ctx.beginPath(); ctx.arc(this.x, this.y, 25, 0, Math.PI*2); ctx.fill();
        ctx.font = '30px Arial'; ctx.textAlign = 'center';
        ctx.fillText(gameState.fooders[this.id].emoji, this.x, this.y+10);
    }
    update() {
        if (this.isP) {
            if (joyL.active) { this.x += joyL.x * 5; this.y += joyL.y * 5; }
        } else {
            let target = entities.find(e => e.team !== this.team);
            if (target && Math.random() < 0.02) fire(this, (target.x-this.x)/100, (target.y-this.y)/100);
        }
    }
}

function fire(o, vx, vy) { projectiles.push({ x: o.x, y: o.y, vx: vx*10, vy: vy*10, team: o.team }); }

function loop() {
    if (!gameRunning) return;
    ctx.fillStyle = '#2d5a27'; ctx.fillRect(0,0,canvas.width,canvas.height);
    
    // MÍŘIDLO
    if (joyR.active) {
        ctx.strokeStyle = 'white'; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(entities[0].x, entities[0].y);
        ctx.lineTo(entities[0].x + joyR.x*200, entities[0].y + joyR.y*200); ctx.stroke();
        ctx.setLineDash([]);
    }

    entities.forEach(e => { e.update(); e.draw(); });
    if (joyR.active && Date.now() - joyR.lastS > 400) { fire(entities[0], joyR.x, joyR.y); joyR.lastS = Date.now(); }

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
                    if (score.b >= 30 || score.r >= 30) finishGame(score.b >= 30);
                }
            }
        });
    });
    requestAnimationFrame(loop);
}

function finishGame(win) {
    gameRunning = false;
    document.getElementById('game-ui').classList.add('hidden');
    canvas.classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    
    const c = win ? 50 : 10;
    const t = win ? 25 : -5;
    
    // KLÍČOVÁ OPRAVA: Tady se přičítají hodnoty do globálního stavu
    gameState.coins += c;
    gameState.trophies = Math.max(0, gameState.trophies + t);
    
    document.getElementById('res-coins').innerText = c;
    document.getElementById('res-trophies').innerText = t;
}

function backToMenu() {
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    updateUI();
}

// UI FUNKCE
function updateUI() {
    document.getElementById('p-coins').innerText = gameState.coins;
    document.getElementById('p-trophies').innerText = gameState.trophies;
    // Aktualizace Fooders listu atd.
}

function openPass() { document.getElementById('pass-screen').classList.remove('hidden'); }
function closePass() { document.getElementById('pass-screen').classList.add('hidden'); }

setupControls();
updateUI();
