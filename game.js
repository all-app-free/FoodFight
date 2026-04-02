// DATA HRY
const gameState = {
    coins: 500,
    selectedId: 'burger',
    fooders: {
        burger: { name: 'SIR BURGER', emoji: '🍔', lvl: 1, hp: 100, speed: 4, unlocked: true },
        taco: { name: 'SPICY TACO', emoji: '🌮', lvl: 1, hp: 80, speed: 6, unlocked: false, cost: 200 },
        sushi: { name: 'SUSHI ROLL', emoji: '🍣', lvl: 1, hp: 90, speed: 5, unlocked: false, cost: 500 }
    }
};

// INITIALIZACE MENU
function renderMenu() {
    document.getElementById('player-coins').innerText = gameState.coins;
    const list = document.getElementById('fooder-list');
    list.innerHTML = '';

    Object.keys(gameState.fooders).forEach(id => {
        const f = gameState.fooders[id];
        const div = document.createElement('div');
        div.className = `fooder-item ${!f.unlocked ? 'locked' : ''} ${gameState.selectedId === id ? 'selected' : ''}`;
        div.innerHTML = `<span>${f.emoji}</span> ${f.name} ${!f.unlocked ? '<span class="lock-icon">🔒</span>' : ''}`;
        div.onclick = () => selectFooder(id);
        list.appendChild(div);
    });

    const curr = gameState.fooders[gameState.selectedId];
    document.getElementById('hero-preview').innerText = curr.emoji;
    document.getElementById('hero-name').innerText = curr.name;
    document.getElementById('hero-lvl').innerText = curr.lvl;
    
    const upBtn = document.getElementById('upgrade-btn');
    if (!curr.unlocked) {
        upBtn.innerText = `ODEMKNOUT (${curr.cost} 🪙)`;
    } else {
        upBtn.innerText = `LEVELIT UP! (${curr.lvl * 150} 🪙)`;
    }
}

function selectFooder(id) {
    gameState.selectedId = id;
    renderMenu();
}

document.getElementById('upgrade-btn').onclick = () => {
    const f = gameState.fooders[gameState.selectedId];
    if (!f.unlocked) {
        if (gameState.coins >= f.cost) {
            gameState.coins -= f.cost;
            f.unlocked = true;
        }
    } else {
        let cost = f.lvl * 150;
        if (gameState.coins >= cost) {
            gameState.coins -= cost;
            f.lvl++;
        }
    }
    renderMenu();
};

// HERNÍ ENGINE
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let entities = [];
let projectiles = [];
let gameRunning = false;
let scores = { blue: 0, red: 0 };

const joyL = { x: 0, y: 0, active: false };
const joyR = { x: 0, y: 0, active: false, lastS: 0 };

class Foodie {
    constructor(x, y, id, team, isPlayer = false) {
        const conf = gameState.fooders[id];
        this.x = x; this.y = y; this.team = team;
        this.emoji = conf.emoji;
        this.hp = conf.hp + (conf.lvl * 10);
        this.maxHp = this.hp;
        this.speed = conf.speed;
        this.isPlayer = isPlayer;
        this.radius = 25;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.arc(0, 15, 20, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'black'; ctx.fillRect(-25, -40, 50, 6);
        ctx.fillStyle = this.team === 'blue' ? '#0072ff' : '#ff3e3e';
        ctx.fillRect(-25, -40, (this.hp/this.maxHp)*50, 6);
        ctx.font = '40px Arial'; ctx.textAlign = 'center';
        ctx.fillText(this.emoji, 0, 15);
        ctx.restore();
    }

    update() {
        if (this.isPlayer) {
            if (joyL.active) {
                this.x += joyL.x * this.speed;
                this.y += joyL.y * this.speed;
            }
        } else {
            // AI Boti - jdou k nejbližšímu nepříteli
            let target = entities.find(e => e.team !== this.team);
            if (target) {
                let dx = target.x - this.x;
                let dy = target.y - this.y;
                let dist = Math.hypot(dx, dy);
                if (dist > 150) {
                    this.x += (dx/dist) * (this.speed * 0.6);
                    this.y += (dy/dist) * (this.speed * 0.6);
                } else if (Math.random() < 0.02) {
                    shoot(this, dx/dist, dy/dist);
                }
            }
        }
        this.x = Math.max(25, Math.min(canvas.width-25, this.x));
        this.y = Math.max(25, Math.min(canvas.height-25, this.y));
    }
}

function shoot(owner, vx, vy) {
    projectiles.push({ x: owner.x, y: owner.y, vx: vx*10, vy: vy*10, team: owner.team });
}

function initGame() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    entities = [];
    // 3v3
    entities.push(new Foodie(100, canvas.height/2, gameState.selectedId, 'blue', true));
    entities.push(new Foodie(100, 100, 'taco', 'blue'));
    entities.push(new Foodie(100, canvas.height-100, 'burger', 'blue'));
    
    entities.push(new Foodie(canvas.width-100, canvas.height/2, 'burger', 'red'));
    entities.push(new Foodie(canvas.width-100, 100, 'sushi', 'red'));
    entities.push(new Foodie(canvas.width-100, canvas.height-100, 'taco', 'red'));

    gameRunning = true;
    requestAnimationFrame(loop);
}

function loop() {
    if (!gameRunning) return;
    ctx.fillStyle = '#2d5a27'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    entities.forEach(e => { e.update(); e.draw(); });

    if (joyR.active && Date.now() - joyR.lastS > 400) {
        shoot(entities[0], joyR.x, joyR.y);
        joyR.lastS = Date.now();
    }

    projectiles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = p.team === 'blue' ? 'yellow' : 'red';
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill();

        entities.forEach(e => {
            if (e.team !== p.team && Math.hypot(p.x-e.x, p.y-e.y) < 25) {
                e.hp -= 25; projectiles.splice(i, 1);
                if (e.hp <= 0) {
                    e.hp = e.maxHp; e.x = e.team === 'blue' ? 100 : canvas.width-100;
                    scores[p.team]++;
                    document.getElementById('s-blue').innerText = scores.blue;
                    document.getElementById('s-red').innerText = scores.red;
                }
            }
        });
    });

    requestAnimationFrame(loop);
}

// OVLÁDÁNÍ JOYSTICKŮ
function setupJoysticks() {
    const handle = (e, stickId, state) => {
        const t = e.touches[0];
        const b = document.getElementById(stickId).parentElement.getBoundingClientRect();
        const dx = t.clientX - (b.left + b.width/2);
        const dy = t.clientY - (b.top + b.height/2);
        const dist = Math.min(Math.hypot(dx, dy), 40);
        const angle = Math.atan2(dy, dx);
        state.x = Math.cos(angle) * (dist/40);
        state.y = Math.sin(angle) * (dist/40);
        state.active = dist > 5;
        document.getElementById(stickId).style.transform = `translate(${state.x*35}px, ${state.y*35}px)`;
    };

    document.getElementById('joy-move-cont').ontouchstart = (e) => handle(e, 'stick-move', joyL);
    document.getElementById('joy-move-cont').ontouchmove = (e) => handle(e, 'stick-move', joyL);
    document.getElementById('joy-move-cont').ontouchend = () => { joyL.active = false; document.getElementById('stick-move').style.transform = 'translate(0,0)'; };

    document.getElementById('joy-shoot-cont').ontouchstart = (e) => handle(e, 'stick-shoot', joyR);
    document.getElementById('joy-shoot-cont').ontouchmove = (e) => handle(e, 'stick-shoot', joyR);
    document.getElementById('joy-shoot-cont').ontouchend = () => { joyR.active = false; document.getElementById('stick-shoot').style.transform = 'translate(0,0)'; };
}

document.getElementById('play-btn').onclick = () => {
    document.getElementById('menu-screen').classList.add('hidden');
    canvas.classList.remove('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    initGame(); setupJoysticks();
};

renderMenu();
    
