const state = {
    coins: 0, trophies: 0, selectedId: 'burger',
    fooders: {
        burger: { name: 'SIR BURGER', emoji: '🍔', lvl: 1, unlocked: true, skin: 'Základní' },
        taco: { name: 'SPICY TACO', emoji: '🌮', lvl: 1, unlocked: false, cost: 200 },
        sushi: { name: 'SUSHI ROLL', emoji: '🍣', lvl: 1, unlocked: false, cost: 500 }
    }
};

const shopSkins = [
    { id: 'burger_zombie', name: 'Zombie Burger', emoji: '🧟', cost: 100, parent: 'burger' },
    { id: 'taco_hot', name: 'Pekelné Taco', emoji: '🌶️', cost: 150, parent: 'taco' }
];

// JOYSTICK LOGIC
const joyL = { active: false, x: 0, y: 0, id: -1 };
const joyR = { active: false, x: 0, y: 0, id: -1, lastS: 0 };

function setupMultiTouch() {
    const handle = (e, isEnd) => {
        const touches = e.changedTouches;
        for (let t of touches) {
            if (isEnd) {
                if (t.identifier === joyL.id) { joyL.active = false; joyL.id = -1; resetStick('stick-move'); }
                if (t.identifier === joyR.id) { joyR.active = false; joyR.id = -1; resetStick('stick-shoot'); }
                continue;
            }
            const isLeftZone = t.clientX < window.innerWidth / 2;
            if (isLeftZone && (joyL.id === -1 || joyL.id === t.identifier)) {
                updateJoy(t, 'joy-move', 'stick-move', joyL);
                joyL.id = t.identifier;
            } else if (!isLeftZone && (joyR.id === -1 || joyR.id === t.identifier)) {
                updateJoy(t, 'joy-shoot', 'stick-shoot', joyR);
                joyR.id = t.identifier;
            }
        }
    };
    window.ontouchstart = (e) => handle(e, false);
    window.ontouchmove = (e) => handle(e, false);
    window.ontouchend = (e) => handle(e, true);
}

function updateJoy(t, contId, stickId, stateObj) {
    const b = document.getElementById(contId).getBoundingClientRect();
    const dx = t.clientX - (b.left + b.width/2);
    const dy = t.clientY - (b.top + b.height/2);
    const dist = Math.min(Math.hypot(dx, dy), 45);
    const ang = Math.atan2(dy, dx);
    stateObj.x = Math.cos(ang) * (dist/45);
    stateObj.y = Math.sin(ang) * (dist/45);
    stateObj.active = dist > 5;
    document.getElementById(stickId).style.transform = `translate(${stateObj.x*35}px, ${stateObj.y*35}px)`;
}
function resetStick(id) { document.getElementById(id).style.transform = 'translate(0,0)'; }

// GAME ENGINE
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let entities = [], projectiles = [], obstacles = [];
let scores = { blue: 0, red: 0 }, gameActive = false;

function initGame() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    scores = { blue: 0, red: 0 }; projectiles = [];
    
    // Překážky (Stoly/Prkénka)
    obstacles = [
        { x: canvas.width/2 - 50, y: 100, w: 100, h: 150 },
        { x: canvas.width/2 - 50, y: canvas.height - 250, w: 100, h: 150 },
        { x: 300, y: canvas.height/2 - 50, w: 150, h: 100 },
        { x: canvas.width - 450, y: canvas.height/2 - 50, w: 150, h: 100 }
    ];

    entities = [
        new Foodie(100, canvas.height/2, state.selectedId, 'blue', true),
        new Foodie(100, 100, 'taco', 'blue'),
        new Foodie(100, canvas.height-100, 'sushi', 'blue'),
        new Foodie(canvas.width-100, canvas.height/2, 'burger', 'red'),
        new Foodie(canvas.width-100, 100, 'sushi', 'red'),
        new Foodie(canvas.width-100, canvas.height-100, 'taco', 'red')
    ];
    gameActive = true; setupMultiTouch(); loop();
}

class Foodie {
    constructor(x, y, id, team, isP = false) {
        this.x = x; this.y = y; this.team = team; this.id = id; this.isP = isP;
        this.hp = 100; this.maxHp = 100; this.rad = 22; this.speed = 4;
    }
    draw() {
        ctx.fillStyle = this.team === 'blue' ? '#0072ff' : '#ff3e3e';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.rad, 0, Math.PI*2); ctx.fill();
        ctx.font = '30px Arial'; ctx.textAlign = 'center';
        ctx.fillText(state.fooders[this.id].emoji, this.x, this.y+10);
    }
    update() {
        let oldX = this.x, oldY = this.y;
        if (this.isP) {
            if (joyL.active) { this.x += joyL.x * this.speed; this.y += joyL.y * this.speed; }
        } else {
            // AI Boti - jdou po nejbližším nepříteli, nejen po hráči
            let enemy = entities.filter(e => e.team !== this.team).sort((a,b) => Math.hypot(this.x-a.x, this.y-a.y) - Math.hypot(this.x-b.x, this.y-b.y))[0];
            if (enemy) {
                let dx = enemy.x - this.x, dy = enemy.y - this.y, d = Math.hypot(dx, dy);
                if (d > 120) { this.x += (dx/d)*2; this.y += (dy/d)*2; }
                else if (Math.random() < 0.03) shoot(this, dx/d, dy/d);
            }
        }
        // Kolize s překážkami
        obstacles.forEach(o => {
            if (this.x > o.x && this.x < o.x+o.w && this.y > o.y && this.y < o.y+o.h) { this.x = oldX; this.y = oldY; }
        });
    }
}

function shoot(o, vx, vy) { projectiles.push({ x: o.x, y: o.y, vx: vx*8, vy: vy*8, team: o.team }); }

function loop() {
    if (!gameActive) return;
    ctx.fillStyle = '#1a3c15'; ctx.fillRect(0,0,canvas.width,canvas.height);
    obstacles.forEach(o => { ctx.fillStyle = '#5d4037'; ctx.fillRect(o.x, o.y, o.w, o.h); });

    entities.forEach(e => { e.update(); e.draw(); });

    if (joyR.active && Date.now() - joyR.lastS > 400) {
        shoot(entities[0], joyR.x, joyR.y); joyR.lastS = Date.now();
    }

    projectiles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill();
        entities.forEach(e => {
            if (e.team !== p.team && Math.hypot(p.x-e.x, p.y-e.y) < 25) {
                e.hp -= 20; projectiles.splice(i, 1);
                if (e.hp <= 0) {
                    e.hp = 100; e.x = e.team === 'blue' ? 100 : canvas.width-100;
                    scores[p.team]++;
                    document.getElementById('s-blue').innerText = scores.blue;
                    document.getElementById('s-red').innerText = scores.red;
                    if (scores[p.team] >= 30) endGame(p.team);
                }
            }
        });
    });
    requestAnimationFrame(loop);
}

function endGame(winner) {
    gameActive = false;
    document.getElementById('gameCanvas').classList.add('hidden');
    document.getElementById('game-ui').classList.add('hidden');
    document.getElementById('overview-screen').classList.remove('hidden');
    
    document.getElementById('win-status').innerText = winner === 'blue' ? "VÍTĚZSTVÍ!" : "PORÁŽKA!";
    
    const blueList = document.getElementById('team-blue-res');
    blueList.innerHTML = '<h3>Můj Tým</h3>';
    entities.filter(e => e.team === 'blue').forEach(e => {
        blueList.innerHTML += `<div class="res-item">${state.fooders[e.id].emoji} ${state.fooders[e.id].name}</div>`;
    });

    const redList = document.getElementById('team-red-res');
    redList.innerHTML = '<h3>Soupeři</h3>';
    entities.filter(e => e.team === 'red').forEach(e => {
        redList.innerHTML += `<div class="res-item">${state.fooders[e.id].emoji} ${state.fooders[e.id].name}</div>`;
    });

    window.matchResult = { winner };
}

function showNextResult() {
    document.getElementById('overview-screen').classList.add('hidden');
    document.getElementById('rewards-screen').classList.remove('hidden');
    
    let win = window.matchResult.winner === 'blue';
    let c = win ? 50 : 10;
    let t = win ? 20 : -5;
    
    state.coins += c;
    state.trophies += Math.max(0, state.trophies + t);
    
    document.getElementById('reward-coins').innerText = c;
    document.getElementById('reward-trophies').innerText = t;
    updateMenuUI();
}

function updateMenuUI() {
    document.getElementById('p-coins').innerText = state.coins;
    document.getElementById('p-trophies').innerText = state.trophies;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

document.getElementById('play-btn').onclick = () => {
    showScreen('none');
    canvas.classList.remove('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    initGame();
};

updateMenuUI();
                                              
