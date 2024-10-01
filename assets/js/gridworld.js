const GridWorld = {
    sizeX: 12, // Replace 'size' with 'sizeX'
    sizeY: 12, // Add 'sizeY'
    grid: [],
    agent: { x: 1, y: 1 },
    keys: [],
    doors: [],
    inventory: [],
    memory: [],
    currentGoal: null,
    gridInitialized: false,

    debug(message) {
        console.log(message);
        this.memory.push(message);
    },

    init() {
        // Adjust grid size based on screen width and height
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const sidebar = document.querySelector('.sidebar');
        const sidebarWidth = sidebar ? sidebar.offsetWidth : 0;

        // Desired minimum cell size
        const minCellSize = 50; // Adjust as needed

        // Calculate number of cells that fit in width and height
        let sizeX = Math.floor((screenWidth - sidebarWidth) / minCellSize);
        let sizeY = Math.floor(screenHeight / minCellSize);

        // Ensure sizes are within reasonable bounds
        sizeX = Math.max(5, sizeX);
        sizeY = Math.max(5, sizeY);

        // Ensure the number of cells is always odd
        if (sizeX % 2 === 0) sizeX -= 1;
        if (sizeY % 2 === 0) sizeY -= 1;

        // Calculate the actual cell size to perfectly fit the screen dimensions
        const cellSizeX = (screenWidth - sidebarWidth) / sizeX;
        const cellSizeY = screenHeight / sizeY;
        const cellSize = Math.min(cellSizeX, cellSizeY);

        // Set sizes
        this.sizeX = sizeX;
        this.sizeY = sizeY;

        // Set CSS variables for cell size and grid size
        document.documentElement.style.setProperty('--cell-size', `${cellSize}px`);
        document.documentElement.style.setProperty('--grid-size-x', this.sizeX);
        document.documentElement.style.setProperty('--grid-size-y', this.sizeY);

        // Reset agent and world state
        this.agent = { x: 1, y: 1 };
        this.inventory = [];
        this.memory = [];
        this.currentGoal = null;

        this.initializeGrid();
        this.initializeKeysAndDoors();
        this.render();
        this.debug("GridWorld initialized");

        // Clear any existing intervals to prevent multiple intervals running
        if (this.interval) {
            clearInterval(this.interval);
        }

        this.interval = setInterval(() => {
            this.debug(`Agent at (${this.agent.x},${this.agent.y})`);
            this.moveAgent();
        }, 300);
    },

    initializeGrid() {
        // Update grid initialization to use 'sizeX' and 'sizeY'
        this.grid = Array(this.sizeY)
            .fill(null)
            .map(() => Array(this.sizeX).fill(0));

        // Create walls around the border
        for (let i = 0; i < this.sizeX; i++) {
            this.grid[0][i] = 1;
            this.grid[this.sizeY - 1][i] = 1;
        }
        for (let j = 0; j < this.sizeY; j++) {
            this.grid[j][0] = 1;
            this.grid[j][this.sizeX - 1] = 1;
        }

        // Add cross walls if grid size permits
        if (this.sizeX >= 12 && this.sizeY >= 12) {
            for (let i = 0; i < this.sizeX; i++) {
                this.grid[Math.floor(this.sizeY / 2)][i] = 1;
            }
            for (let j = 0; j < this.sizeY; j++) {
                this.grid[j][Math.floor(this.sizeX / 2)] = 1;
            }
        }
    },

    initializeKeysAndDoors() {
        const positions = [
            { x: 2, y: 2 },
            { x: this.sizeX - 3, y: 2 },
            { x: 2, y: this.sizeY - 3 },
            { x: this.sizeX - 3, y: this.sizeY - 3 },
        ];

        const colors = ["red", "blue", "green", "yellow"];

        this.keys = positions.map((pos, index) => ({
            x: pos.x,
            y: pos.y,
            color: colors[index],
        }));

        this.doors = [
            {
                x: Math.floor(this.sizeX / 2),
                y: 3,
                color: "red",
                isOpen: false,
            },
            {
                x: 3,
                y: Math.floor(this.sizeY / 2),
                color: "blue",
                isOpen: false,
            },
            {
                x: Math.floor(this.sizeX / 2),
                y: this.sizeY - 4,
                color: "green",
                isOpen: false,
            },
            {
                x: this.sizeX - 4,
                y: Math.floor(this.sizeY / 2),
                color: "yellow",
                isOpen: false,
            },
        ];
    },

    canMove(x, y) {
        if (x < 0 || x >= this.sizeX || y < 0 || y >= this.sizeY) return false;

        // Removed the check for header cells
        // if (this.isHeaderCell(x, y)) return false;

        const door = this.doors.find((d) => d.x === x && d.y === y);

        if (door) {
            // There's a door at this position
            if (door.isOpen) {
                return true;
            } else {
                // Door is closed, check if the agent has the key
                return this.inventory.some((key) => key.color === door.color);
            }
        }

        if (this.grid[y][x] === 1) {
            // Wall and no door
            return false;
        }

        // Open space
        return true;
    },

    findPath(start, goal) {
        const queue = [[start]];
        const visited = new Set();

        while (queue.length > 0) {
            const path = queue.shift();
            const { x, y } = path[path.length - 1];

            if (x === goal.x && y === goal.y) {
                this.debugPath(path);
                return path;
            }

            const directions = [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1],
            ];
            for (const [dx, dy] of directions) {
                const newX = x + dx;
                const newY = y + dy;
                const newPos = `${newX},${newY}`;

                if (this.canMove(newX, newY) && !visited.has(newPos)) {
                    visited.add(newPos);
                    const newPath = [...path, { x: newX, y: newY }];

                    // If this is a door, simulate opening it
                    const door = this.doors.find((d) => d.x === newX && d.y === newY);
                    if (
                        door &&
                        !door.isOpen &&
                        this.inventory.some((key) => key.color === door.color)
                    ) {
                        this.debug(
                            `Simulating opening ${door.color} door at (${newX},${newY})`
                        );
                    }

                    queue.push(newPath);
                }
            }
        }

        return [];
    },

    getNextGoal() {
        const uncollectedKeys = this.keys.filter(
            (key) => !this.inventory.some((i) => i.color === key.color)
        );
        if (uncollectedKeys.length > 0) {
            return uncollectedKeys[0];
        }

        const closedDoors = this.doors.filter((door) => !door.isOpen);
        const openableDoors = closedDoors.filter((door) =>
            this.inventory.some((key) => key.color === door.color)
        );

        if (openableDoors.length > 0) {
            return openableDoors.reduce((nearest, door) => {
                const distToDoor =
                    Math.abs(this.agent.x - door.x) + Math.abs(this.agent.y - door.y);
                const distToNearest =
                    Math.abs(this.agent.x - nearest.x) +
                    Math.abs(this.agent.y - nearest.y);
                return distToDoor < distToNearest ? door : nearest;
            });
        }

        if (closedDoors.length > 0) {
            return closedDoors.reduce((nearest, door) => {
                const distToDoor =
                    Math.abs(this.agent.x - door.x) + Math.abs(this.agent.y - door.y);
                const distToNearest =
                    Math.abs(this.agent.x - nearest.x) +
                    Math.abs(this.agent.y - nearest.y);
                return distToDoor < distToNearest ? door : nearest;
            });
        }

        return null;
    },

    checkForKey(x, y) {
        const keyIndex = this.keys.findIndex((key) => key.x === x && key.y === y);
        if (keyIndex !== -1) {
            const collectedKey = this.keys.splice(keyIndex, 1)[0];
            this.inventory.push(collectedKey);
            this.memory.push(`Collected ${collectedKey.color} key at (${x},${y})`);
            this.currentGoal = null;
        }
    },

    checkForDoor(x, y) {
        const doorIndex = this.doors.findIndex((door) => door.x === x && door.y === y);
        if (doorIndex !== -1 && !this.doors[doorIndex].isOpen) {
            if (this.inventory.some((key) => key.color === this.doors[doorIndex].color)) {
                this.doors[doorIndex].isOpen = true;
                this.memory.push(
                    `Opened ${this.doors[doorIndex].color} door at (${x},${y})`
                );
                // Don't reset the current goal when opening a door
            }
        }
    },

    moveAgent() {
        if (!this.currentGoal) {
            this.currentGoal = this.getNextGoal();
            if (this.currentGoal) {
                this.debug(`New goal set: (${this.currentGoal.x},${this.currentGoal.y})`);
            }
        }

        if (!this.currentGoal) {
            this.memory.push("All tasks completed!");
            this.render();
            clearInterval(this.interval); // Stop the movement when tasks are complete
            return;
        }

        const path = this.findPath(this.agent, this.currentGoal);

        if (path.length > 1) {
            const nextStep = path[1];
            this.debug(`Path found. Next step: (${nextStep.x},${nextStep.y})`);

            // Check if the next step is a door that needs opening
            const door = this.doors.find(
                (d) => d.x === nextStep.x && d.y === nextStep.y && !d.isOpen
            );
            if (door && this.inventory.some((key) => key.color === door.color)) {
                this.debug(`Opening ${door.color} door at (${nextStep.x},${nextStep.y})`);
                door.isOpen = true;
            }

            this.agent = { x: nextStep.x, y: nextStep.y };
            this.checkForKey(nextStep.x, nextStep.y);
            this.checkForDoor(nextStep.x, nextStep.y);
            this.memory.push(`Moving to (${nextStep.x},${nextStep.y})`);
        } else {
            this.debug(
                `No path found to goal (${this.currentGoal.x},${this.currentGoal.y})`
            );
            this.memory.push(
                `Cannot reach goal at (${this.currentGoal.x},${this.currentGoal.y}). Finding new goal.`
            );
            this.currentGoal = null;
        }

        this.render();
    },

    getCellContent(x, y) {
        const key = this.keys.find((k) => k.x === x && k.y === y);
        if (key) {
            return `🔑${key.color[0].toUpperCase()}`;
        }

        const door = this.doors.find((d) => d.x === x && d.y === y);
        if (door) {
            const doorImgSrc = door.isOpen ? "images/unlocked.png" : "images/locked.png";
            const lockImgSrc = "images/lock.png";

            return `
                <div class="door-container">
                    <img src="${doorImgSrc}" class="door-image" />
                    ${!door.isOpen ? `<img src="${lockImgSrc}" class="lock-icon ${door.color}-lock" />` : ''}
                </div>
            `;
        }
        return '';
    },

    render() {
        const gridElement = document.getElementById("grid");

        // **Initialize the grid only once**
        if (!this.gridInitialized) {
            // Clear the grid element
            gridElement.innerHTML = '';

            for (let y = 0; y < this.sizeY; y++) {
                for (let x = 0; x < this.sizeX; x++) {
                    const cell = document.createElement("div");
                    cell.className = `cell dynamic-cell ${this.grid[y][x] === 1 ? "wall" : ""}`;
                    cell.style.gridColumn = x + 1;
                    cell.style.gridRow = y + 1;

                    // Store coordinates for later use
                    cell.dataset.x = x;
                    cell.dataset.y = y;

                    gridElement.appendChild(cell);
                }
            }
            this.gridInitialized = true;
        }

        // **Update cell contents without recreating cells**
        const dynamicCells = gridElement.querySelectorAll(".dynamic-cell");
        dynamicCells.forEach((cell) => {
            const x = parseInt(cell.dataset.x);
            const y = parseInt(cell.dataset.y);

            // Determine current content
            let cellContent = '';
            if (this.agent.x === x && this.agent.y === y) {
                cellContent = 'agent';
            } else {
                cellContent = this.getCellContent(x, y);
            }

            // Check if content has changed
            if (cell.dataset.content !== cellContent) {
                // Clear and update cell content
                cell.innerHTML = '';

                if (cellContent === 'agent') {
                    const agentIcon = document.createElement("div");
                    agentIcon.className = "agent-cell";
                    const agentImg = document.createElement("img");
                    agentImg.src = "images/hacker.png";
                    agentImg.alt = "Agent";
                    agentIcon.appendChild(agentImg);
                    cell.appendChild(agentIcon);
                } else if (cellContent) {
                    cell.innerHTML = cellContent;
                }

                // Update cell classes
                cell.className = `cell dynamic-cell ${this.grid[y][x] === 1 ? "wall" : ""}`;
                if (cellContent.includes('lock-icon')) {
                    cell.classList.add('door-cell');
                }

                // Store new content
                cell.dataset.content = cellContent;
            }
            // If content hasn't changed, do nothing to avoid unnecessary reflows
        });

        // Update inventory
        const inventoryElement = document.getElementById("inventory");
        inventoryElement.innerHTML = this.inventory
            .map((item) => `<div class="inventory-item">🔑 ${item.color}</div>`)
            .join("");

        // Update memory (thoughts)
        const memoryElement = document.getElementById("memory");
        memoryElement.innerHTML = this.memory
            .slice(-10) // Show last 10 thoughts
            .reverse()  // Most recent first
            .map((item) => `<li>${item}</li>`)
            .join("");
    },
    debugPath(path) {
        // Optional: Implement debug path visualization
    },

};

// Add event listener for window resize
window.addEventListener("resize", () => {
    GridWorld.init();
});

document.addEventListener("DOMContentLoaded", () => GridWorld.init());