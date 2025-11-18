const gridSize = 10;

// Fleet configuration
const fleet = [
    { name: "Submarine", size: 1, count: 2 },
    { name: "Destroyer", size: 2, count: 2 },
    { name: "Cruiser", size: 3, count: 1 },
    { name: "Battleship", size: 4, count: 1 },
    { name: "Carrier", size: 5, count: 1 }
];

let totalShipTiles = fleet.reduce((sum, s) => sum + s.size * s.count, 0);

const playerGrid = document.getElementById("player-grid");
const enemyGrid = document.getElementById("enemy-grid");

let playerShips = [];
let enemyShips = [];

let playerHits = 0;
let enemyHits = 0;

let aiShotsTaken = new Set();

// --- AI HUNT + TARGET MODE ---
let aiMode = "hunt"; // "hunt" | "target" | "direction"
let aiTargets = [];  // tiles to test around a hit
let aiDirection = null; // { dx, dy }
let aiLastHit = null;
let aiDirectionQueue = [];


// Create grids
function createGrid(container, isEnemy) {
    for (let i = 0; i < gridSize * gridSize; i++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.index = i;

        if (isEnemy) {
            cell.addEventListener("click", () => playerShoots(cell));
        }

        container.appendChild(cell);
    }
}
createGrid(playerGrid, false);
createGrid(enemyGrid, true);

// Random islands (optional)
document.querySelectorAll(".cell").forEach(c => {
    if (Math.random() < 0.03) c.classList.add("island");
});


// -------------------------
// SHIP PLACEMENT
// -------------------------
function placeFleet() {
    function placeShip(size, board) {
        let valid = false;
        let positions = [];

        while (!valid) {
            positions = [];
            const vertical = Math.random() < 0.5;

            let startX = Math.floor(Math.random() * gridSize);
            let startY = Math.floor(Math.random() * gridSize);

            if (vertical) {
                if (startY + size > gridSize) continue;
                for (let i = 0; i < size; i++)
                    positions.push((startY + i) * gridSize + startX);
            } else {
                if (startX + size > gridSize) continue;
                for (let i = 0; i < size; i++)
                    positions.push(startY * gridSize + (startX + i));
            }

            if (positions.some(p => board.includes(p))) continue;
            valid = true;
        }

        board.push(...positions);
    }

    fleet.forEach(ship => {
        for (let i = 0; i < ship.count; i++) {
            placeShip(ship.size, playerShips);
            placeShip(ship.size, enemyShips);
        }
    });
}
placeFleet();


// ------------------------------------
// PLAYER SHOOTS (extra turn on hit)
// ------------------------------------
function playerShoots(cell) {
    if (cell.classList.contains("hit") || cell.classList.contains("miss")) return;

    const index = Number(cell.dataset.index);

    if (enemyShips.includes(index)) {
        cell.classList.add("hit");
        playerHits++;

        if (playerHits === totalShipTiles)
            return setTimeout(() => alert("🎉 You win! Fleet destroyed!"), 150);

        // HIT → player gets another turn (no AI turn)
        return;
    }

    // MISS → AI turn
    cell.classList.add("miss");
    setTimeout(() => aiTurn(), 350);
}


// ------------------------------------
// AI TURN (with hunt + target + extra turns)
// ------------------------------------
function aiTurn() {
    let shotIdx;

    // -------------------------
    // MODE 1: HUNT MODE
    // -------------------------
    if (aiMode === "hunt") {
        do {
            shotIdx = Math.floor(Math.random() * gridSize * gridSize);
        } while (aiShotsTaken.has(shotIdx));

        if (takeAiShot(shotIdx)) {
            aiMode = "target";
            aiLastHit = shotIdx;
            aiTargets = getNeighbors(shotIdx);
            return setTimeout(aiTurn, 350); // extra turn
        } else {
            return; // miss ends AI turn
        }
    }

    // -------------------------
    // MODE 2: TARGET MODE
    // -------------------------
    if (aiMode === "target") {
        while (aiTargets.length > 0) {
            const target = aiTargets.shift();

            if (aiShotsTaken.has(target)) continue;

            if (takeAiShot(target)) {
                aiMode = "direction";
                aiDirection = getDirection(aiLastHit, target);
                aiDirectionQueue = [target + aiDirection];
                aiLastHit = target;
                return setTimeout(aiTurn, 350);
            } else {
                return; // miss → stop turn
            }
        }

        // If no more targets, back to hunt
        aiMode = "hunt";
        aiLastHit = null;
        return aiTurn();
    }

    // -------------------------
    // MODE 3: DIRECTION MODE
    // -------------------------
    if (aiMode === "direction") {
        while (aiDirectionQueue.length > 0) {
            const target = aiDirectionQueue[0];

            if (target < 0 || target >= gridSize * gridSize) {
                aiMode = "hunt";
                return aiTurn();
            }

            aiDirectionQueue.shift();

            if (aiShotsTaken.has(target)) continue;

            if (takeAiShot(target)) {
                aiLastHit = target;
                aiDirectionQueue.push(target + aiDirection);
                return setTimeout(aiTurn, 350);
            } else {
                // reverse direction once
                aiDirection = -aiDirection;
                aiDirectionQueue = [aiLastHit + aiDirection];
                return; // stop for now
            }
        }

        aiMode = "hunt";
        return aiTurn();
    }
}


// ------------------------------------
// AI FIRE MECHANICS
// ------------------------------------
function takeAiShot(index) {
    aiShotsTaken.add(index);

    const cells = playerGrid.querySelectorAll(".cell");
    const cell = cells[index];

    if (playerShips.includes(index)) {
        cell.classList.add("hit");
        enemyHits++;

        if (enemyHits === totalShipTiles) {
            setTimeout(() => alert("💥 The AI destroyed your fleet!"), 150);
        }

        return true; // hit → gets another turn
    } else {
        cell.classList.add("miss");
        return false; // miss → turn ends
    }
}


// ------------------------------------
// AI HELPERS
// ------------------------------------
function getNeighbors(i) {
    let res = [];
    let x = i % gridSize;
    let y = Math.floor(i / gridSize);

    let dirs = [
        [0, -1], // up
        [0, 1],  // down
        [-1, 0], // left
        [1, 0]   // right
    ];

    for (let [dx, dy] of dirs) {
        let nx = x + dx;
        let ny = y + dy;
        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
            res.push(ny * gridSize + nx);
        }
    }

    return res;
}

function getDirection(a, b) {
    return b - a; // difference gives direction vector
}
