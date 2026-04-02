// DATA HRY
let state = JSON.parse(localStorage.getItem('foodFightData')) || {
    coins: 0,
    trophies: 0,
    selected: 'burger',
    claimedRewards: [],
    fooders: {
        burger: { emoji: '🍔', name: 'SIR BURGER', hp: 1000, unlocked: true },
        taco: { emoji: '🌮', name: 'SPICY TACO', hp: 800, unlocked: false },
        sushi: { emoji: '🍣', name: 'SUSHI ROLL', hp: 900, unlocked: false }
    }
};

const PASS_LEVELS = [
    { id: 'p1', req: 0, reward: 50, type: 'coins', name: 'Startovní Mince' },
    { id: 'p2', req: 25, reward: 'taco', type: 'hero', name: 'Hrdina Taco' },
    { id: 'p3', req: 100, reward: 500, type: 'coins', name: 'Velký Poklad' }
];

const ROAD_LEVELS = [
    { id: 'r1', req: 50, reward: 100, type: 'coins', name: 'Cesta: Bonus' },
    { id: 'r2', req: 150, reward: 'sushi', type: 'hero', name: 'Cesta: Sushi' }
];

function save() {
    localStorage.setItem('foodFightData', JSON.stringify(state));
    updateUI();
}

// UI LOGIKA
function updateUI() {
    document.getElementById('p-trophies').innerText = state.trophies;
    document.getElementById('p-coins').innerText = state.coins;
    
    // Bary
    document.getElementById('pass-fill').style.width = Math.min(100, (state.trophies / 100) * 100) + "%";
    document.getElementById('road-fill').style.width = Math.min(100, (state.trophies / 200) * 100) + "%";

    // Seznam postav
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

    const hero = state.fooders[state.selected];
    document.getElementById('hero-display').innerText = hero.emoji;
    document.getElementById('hero-name').innerText = hero.name;
}

// MODÁLY
function openPass() {
    renderModal('pass-screen', 'pass-items', PASS_LEVELS);
}

function openRoad() {
    renderModal('road-screen', 'road-items', ROAD_LEVELS);
}

function renderModal(screenId, contentId, data) {
    const screen = document.getElementById(screenId);
    const container = document.getElementById(contentId);
    screen.classList.remove('hidden');
    
    container.innerHTML = data.map(item => {
        const isClaimed = state.claimedRewards.includes(item.id);
        const canClaim = state.trophies >= item.req && !isClaimed;
        return `
            <div class="reward-item ${isClaimed ? 'claimed' : ''}">
                <div><strong>${item.name}</strong><br><small>${item.req} 🏆</small></div>
                <button onclick="claim('${item.id}', '${item.type}', '${item.reward}')" ${!canClaim ? 'disabled' : ''}>
                    ${isClaimed ? 'VYBRÁNO' : (canClaim ? 'VYBRAT' : 'ZAMČENO')}
                </button>
            </div>
        `;
    }).join('');
}

function claim(id, type, val) {
    if (type === 'coins') state.coins += parseInt(val);
    if (type === 'hero') state.fooders[val].unlocked = true;
    state.claimedRewards.push(id);
    save();
    closeModals(); // Refresh skrze zavření
}

function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
}

// HRA
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gameActive = false;
let score = { b: 0, r: 0 };

function startGame() {
    document.getElementById('menu-screen').classList.add('hidden');
    canvas.classList.remove('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gameActive = true;
    score = { b: 0, r: 0 };
    loop();
}

function loop() {
    if (!gameActive) return;
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Tady by byl tvůj herní engine (postavy, střely)
    // Simulace konce hry pro ukázku přičtení:
    if (score.b >= 3) finishGame(true); 
    
    requestAnimationFrame(loop);
}

function finishGame(win) {
    gameActive = false;
    const resScreen = document.getElementById('result-screen');
    resScreen.classList.remove('hidden');
    
    const tAdd = win ? 25 : -5;
    const cAdd = win ? 40 : 10;
    
    state.trophies = Math.max(0, state.trophies + tAdd);
    state.coins += cAdd;
    
    document.getElementById('res-trophies').innerText = tAdd;
    document.getElementById('res-coins').innerText = cAdd;
    document.getElementById('res-title').innerText = win ? "VÍTĚZSTVÍ!" : "PORÁŽKA";
    
    localStorage.setItem('foodFightData', JSON.stringify(state)); 
}

// Start
updateUI();
