// --- GLOBAL LAUNCH DATA ---
let state = JSON.parse(localStorage.getItem('FoodFight_Global')) || {
    coins: 500,
    trophies: 0,
    selectedHero: 'burger',
    unlockedHeroes: ['burger'],
    claimedRewards: [],
    heroStats: {
        burger: { name: 'SIR BURGER', emoji: '🍔', lv: 1 },
        taco: { name: 'SPICY TACO', emoji: '🌮', lv: 1 },
        sushi: { name: 'SUSHI ROLL', emoji: '🍣', lv: 1 },
        pizza: { name: 'PIZZA PETE', emoji: '🍕', lv: 1 }
    }
};

const PASS_DATA = [
    { id: 'p1', req: 0, type: 'coins', val: 100 },
    { id: 'p2', req: 50, type: 'hero', val: 'taco' },
    { id: 'p3', req: 100, type: 'coins', val: 250 },
    { id: 'p4', req: 200, type: 'hero', val: 'pizza' }
];

const ROAD_DATA = [
    { id: 'r1', req: 10, type: 'coins', val: 50 },
    { id: 'r2', req: 100, type: 'hero', val: 'sushi' },
    { id: 'r3', req: 500, type: 'coins', val: 1000 }
];

function save() {
    localStorage.setItem('FoodFight_Global', JSON.stringify(state));
    renderMenu();
}

// --- MENU LOGIC ---
function renderMenu() {
    document.getElementById('p-trophies').innerText = state.trophies;
    document.getElementById('p-coins').innerText = state.coins;
    
    const hero = state.heroStats[state.selectedHero];
    document.getElementById('hero-model').innerText = hero.emoji;
    document.getElementById('hero-name').innerText = hero.name;
    document.getElementById('hero-lv').innerText = hero.lv;
}

// --- HEROES MODAL ---
function openHeroes() {
    const modal = document.getElementById('heroes-modal');
    const grid = document.getElementById('heroes-grid');
    modal.classList.remove('hidden');
    
    grid.innerHTML = Object.keys(state.heroStats).map(id => {
        const h = state.heroStats[id];
        const unlocked = state.unlockedHeroes.includes(id);
        return `
            <div class="reward-card ${state.selectedHero === id ? 'blue' : ''}" 
                 style="opacity: ${unlocked ? 1 : 0.4}" 
                 onclick="${unlocked ? `selectHero('${id}')` : ''}">
                <div style="font-size: 3rem">${h.emoji}</div>
                <div>${h.name}</div>
                <div style="font-size: 0.7rem">${unlocked ? 'POWER ' + h.lv : 'LOCKED'}</div>
            </div>
        `;
    }).join('');
}

function selectHero(id) {
    state.selectedHero = id;
    save();
    closeModals();
}

// --- SMART TRACKS (Hides Completed) ---
function openPass() { openTrack('FOODIE PASS', PASS_DATA); }
function openRoad() { openTrack('TROPHY ROAD', ROAD_DATA); }

function openTrack(title, data) {
    const modal = document.getElementById('track-modal');
    const list = document.getElementById('track-items');
    document.getElementById('track-title').innerText = title;
    modal.classList.remove('hidden');

    // Filter out claimed rewards (Deletes them from the view)
    const activeRewards = data.filter(item => !state.claimedRewards.includes(item.id));

    list.innerHTML = activeRewards.map(item => {
        const locked = state.trophies < item.req;
        return `
            <div class="reward-card ${locked ? 'locked' : ''}">
                <div style="font-size: 0.8rem">${item.req} 🏆</div>
                <div style="font-size: 2.5rem">${item.type === 'coins' ? '🪙' : '🎁'}</div>
                <button class="menu-btn orange" 
                        style="width: 100px; height: 40px; font-size: 0.6rem"
                        ${locked ? 'disabled' : ''} 
                        onclick="claim('${item.id}', '${item.type}', '${item.val}', '${title}')">
                    ${locked ? 'LOCKED' : 'CLAIM'}
                </button>
            </div>
        `;
    }).join('');
}

function claim(id, type, val, trackName) {
    if (type === 'coins') state.coins += parseInt(val);
    if (type === 'hero') state.unlockedHeroes.push(val);
    
    state.claimedRewards.push(id);
    save();
    
    // Refresh the track immediately to "delete" the completed item
    trackName === 'FOODIE PASS' ? openPass() : openRoad();
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

function startGame() {
    alert("Match Found! Transitioning to Battle...");
    // Future: Add Battle Logic here
}

// Init
renderMenu();
    
