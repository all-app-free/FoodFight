const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu-screen');
const playBtn = document.getElementById('play-button');

let gameActive = false;
let players = [];

// Nastavení postav
const FOODIES = {
    burger: { emoji: '🍔', hp: 150, speed: 4 },
    taco: { emoji: '🌮', hp: 80, speed: 6 },
    sushi: { emoji: '🍣', hp: 100, speed: 5 }
};

class Player {
    constructor(x, y, type, team, isBot) {
        this.x = x; this.y = y;
        this.type = type;
        this.team = team;
        this.isBot = isBot;
        this.hp = FOODIES[type].hp;
        this.maxHp = FOODIES[type].hp;
        this.speed = FOODIES[type].speed;
        this.angle = 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // HP Bar
        ctx.fillStyle = '#000';
        ctx.fillRect(-30, -50, 60, 8);
        ctx.fillStyle = this.team === 'blue' ? '#00f' : '#f00';
        ctx.fillRect(-30, -50, (this.hp / this.maxHp) * 60, 8);

        // Postava
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(FOODIES[this.type].emoji, 0, 15);
        ctx.restore();
    }

    update(targetX, targetY) {
        if (!this.isBot) {
            // Hráč následuje dotyk/myš
            let dx = targetX - this.x;
            let dy = targetY - this.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 5) {
                this.x += (dx/dist) * this.speed;
                this.y += (dy/dist) * this.speed;
            }
        } else {
            // Jednoduchá AI botů
            this.x += (Math.random() - 0.5) * this.speed;
            this.y += (Math.random() - 0.5) * this.speed;
        }
    }
}

function initGame() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Vytvoření týmu (Hráč + 2 boti vs 3 boti)
    players.push(new Player(100, canvas.height/2, 'burger', 'blue', false));
    players.push(new Player(100, 100, 'taco', 'blue', true));
    players.push(new Player(100, canvas.height-100, 'sushi', 'blue', true));

    players.push(new Player(canvas.width-100, canvas.height/2, 'burger', 'red', true));
    players.push(new Player(canvas.width-100, 100, 'taco', 'red', true));
    players.push(new Player(canvas.width-100, canvas.height-100, 'sushi', 'red', true));
}

let touchX = 0, touchY = 0;
canvas.addEventListener('mousemove', e => { touchX = e.clientX; touchY = e.clientY; });
canvas.addEventListener('touchstart', e => { 
    touchX = e.touches[0].clientX; 
    touchY = e.touches[0].clientY; 
});

function gameLoop() {
    if (!gameActive) return;
    ctx.fillStyle = '#2d5a27'; // Zelená podlaha kuchyně
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Kreslení dlaždic (stůl)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    for(let i=0; i<canvas.width; i+=50) ctx.strokeRect(i, 0, 50, canvas.height);

    players.forEach(p => {
        p.update(touchX, touchY);
        p.draw();
    });

    requestAnimationFrame(gameLoop);
}

playBtn.addEventListener('click', () => {
    menu.classList.add('hidden');
    canvas.classList.remove('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    gameActive = true;
    initGame();
    gameLoop();
});

