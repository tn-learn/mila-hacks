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
    lastStepWasThought: false,
    actionThoughtInterval: 50, // 1 second interval between action and thought prints
    thoughtTemplates: {
        needKey: [
            "I need the {color} key to open the {color} door.",
            "Without the {color} key, I can't open the {color} door.",
            "I should look for the {color} key to proceed.",
            "I must find the {color} key to unlock the {color} door."
        ],
        haveKeyForDoor: [
            "I have the {color} key; I can now open the {color} door.",
            "With the {color} key in hand, I can unlock the {color} door.",
            "Time to use the {color} key on the {color} door.",
            "Ready to open the {color} door with the {color} key."
        ],
        headingToKey: [
            "Heading towards the {color} key at ({x},{y}).",
            "I see the {color} key ahead; moving towards it.",
            "The {color} key is nearby; I'll go get it.",
            "Going to pick up the {color} key at ({x},{y})."
        ],
        movingToGoal: [
            "Moving towards ({x},{y}).",
            "On my way to ({x},{y}).",
            "Heading towards my next objective at ({x},{y}).",
            "Proceeding to ({x},{y})."
        ],
        noGoal: [
            "All tasks are completed.",
            "I've done everything I needed to do.",
            "There's nothing left to do here.",
            "Mission accomplished."
        ]
    },
    exploredMap: [], // Add property to store explored cells
    unreachableGoals: [], // Add this line to track unreachable goals

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

        // Initialize exploredMap
        this.exploredMap = Array(this.sizeY)
            .fill(null)
            .map(() => Array(this.sizeX).fill(false));

        // Update visibility around the starting position
        this.updateVisibility();

        this.initializeGrid();
        this.initializeKeysAndDoors();
        this.render();
        this.debug("GridWorld initialized");

        // Clear any existing intervals to prevent multiple intervals running
        if (this.interval) {
            clearInterval(this.interval);
        }

        // Start the agent's movement
        this.moveAgent();
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

                    queue.push(newPath);
                }
            }
        }

        return [];
    },

    getNextGoal() {
        // Helper function to check if a path exists to a goal
        const isReachable = (goal) => {
            const path = this.findPath(this.agent, goal);
            return path.length > 0;
        };

        // Find visible keys
        const visibleKeys = this.keys.filter(
            (key) => this.exploredMap[key.y][key.x] && !this.unreachableGoals.some(g => g.x === key.x && g.y === key.y)
        );

        // **Randomize the order of visible keys**
        this.shuffleArray(visibleKeys);

        for (const key of visibleKeys) {
            if (isReachable(key)) {
                return key;
            } else {
                this.unreachableGoals.push(key);
            }
        }

        // Find visible doors that are not open
        const visibleDoors = this.doors.filter(
            (door) => this.exploredMap[door.y][door.x] && !door.isOpen && !this.unreachableGoals.some(g => g.x === door.x && g.y === door.y)
        );

        const openableDoors = visibleDoors.filter((door) =>
            this.inventory.some((key) => key.color === door.color)
        );

        // **Randomize the order of openable doors**
        this.shuffleArray(openableDoors);

        for (const door of openableDoors) {
            if (isReachable(door)) {
                return door;
            } else {
                this.unreachableGoals.push(door);
            }
        }

        // Check if the agent has keys for any unopened doors not yet found
        const unopenedDoorsWithKeys = this.doors.filter(
            (door) =>
                !door.isOpen &&
                this.inventory.some((key) => key.color === door.color) &&
                !this.unreachableGoals.some(g => g.x === door.x && g.y === door.y)
        );

        if (unopenedDoorsWithKeys.length > 0) {
            // Continue exploring to find these doors
            const unexploredCells = [];
            for (let y = 0; y < this.sizeY; y++) {
                for (let x = 0; x < this.sizeX; x++) {
                    if (
                        !this.exploredMap[y][x] &&
                        this.canMove(x, y) &&
                        !this.unreachableGoals.some(g => g.x === x && g.y === y)
                    ) {
                        unexploredCells.push({ x, y });
                    }
                }
            }

            if (unexploredCells.length > 0) {
                // **Randomize the unexplored cells**
                this.shuffleArray(unexploredCells);

                for (const cell of unexploredCells) {
                    if (isReachable(cell)) {
                        return cell;
                    } else {
                        this.unreachableGoals.push(cell);
                    }
                }
            }
        }

        // No known goals, explore unexplored areas
        const unexploredCells = [];
        for (let y = 0; y < this.sizeY; y++) {
            for (let x = 0; x < this.sizeX; x++) {
                if (
                    !this.exploredMap[y][x] &&
                    this.canMove(x, y) &&
                    !this.unreachableGoals.some(g => g.x === x && g.y === y)
                ) {
                    unexploredCells.push({ x, y });
                }
            }
        }

        if (unexploredCells.length > 0) {
            // **Randomize the unexplored cells**
            this.shuffleArray(unexploredCells);

            for (const cell of unexploredCells) {
                if (isReachable(cell)) {
                    return cell;
                } else {
                    this.unreachableGoals.push(cell);
                }
            }
        }

        // No goals left
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
            } else {
                this.printActionOrThought({ type: 'thought', message: "All tasks completed!" });
                clearInterval(this.interval);
                return;
            }
        }

        if (!this.lastStepWasThought) {
            this.generateThought();
            this.lastStepWasThought = true;
            setTimeout(() => this.moveAgent(), this.actionThoughtInterval);
        } else {
            const path = this.findPath(this.agent, this.currentGoal);

            if (path.length > 1) {
                const nextStep = path[1];

                const door = this.doors.find(
                    (d) => d.x === nextStep.x && d.y === nextStep.y && !d.isOpen
                );
                if (door && this.inventory.some((key) => key.color === door.color)) {
                    this.printActionOrThought({ type: 'action', message: `Opening ${door.color} door at (${nextStep.x},${nextStep.y})` });
                    door.isOpen = true;
                }

                this.agent = { x: nextStep.x, y: nextStep.y };

                // Update visibility
                this.updateVisibility();

                this.checkForKey(nextStep.x, nextStep.y);
                this.checkForDoor(nextStep.x, nextStep.y);
                this.printActionOrThought({ type: 'action', message: `Moved to (${nextStep.x},${nextStep.y})` });
            } else {
                // Could not find a path to the current goal; mark it as unreachable
                this.unreachableGoals.push(this.currentGoal);
                this.currentGoal = null;
            }

            this.lastStepWasThought = false;
            this.render();
            setTimeout(() => this.moveAgent(), this.actionThoughtInterval);
        }
    },

    generateThought() {
        let thought = '';
        let thoughtArray = [];
        let data = {};

        if (this.currentGoal && this.currentGoal.color && this.currentGoal.isOpen === false) {
            // Current goal is a closed door
            if (!this.inventory.some((key) => key.color === this.currentGoal.color)) {
                // Agent doesn't have the key
                thoughtArray = this.thoughtTemplates.needKey;
                data = { color: this.currentGoal.color };
            } else {
                // Agent has the key
                thoughtArray = this.thoughtTemplates.haveKeyForDoor;
                data = { color: this.currentGoal.color };
            }
        } else if (this.currentGoal && this.currentGoal.color) {
            // Current goal is a key
            thoughtArray = this.thoughtTemplates.headingToKey;
            data = {
                color: this.currentGoal.color,
                x: this.currentGoal.x,
                y: this.currentGoal.y
            };
        } else if (this.currentGoal) {
            // Moving towards a generic goal
            thoughtArray = this.thoughtTemplates.movingToGoal;
            data = { x: this.currentGoal.x, y: this.currentGoal.y };
        } else {
            // No current goal
            thoughtArray = this.thoughtTemplates.noGoal;
        }

        // Randomly select and process a thought template
        thought = this.randomThought(thoughtArray, data);
        this.printActionOrThought({ type: 'thought', message: thought });
    },

    randomThought(thoughtArray, data) {
        if (!thoughtArray || thoughtArray.length === 0) return '';
        const template = thoughtArray[Math.floor(Math.random() * thoughtArray.length)];
        return this.processTemplate(template, data);
    },

    processTemplate(template, data) {
        return template.replace(/{(\w+)}/g, (match, key) => data[key] || match);
    },
    getCellContent(x, y) {
        const key = this.keys.find((k) => k.x === x && k.y === y);
        if (key) {
            return `<div class="key-icon key-${key.color}"></div>`;
        }

        const door = this.doors.find((d) => d.x === x && d.y === y);
        if (door) {
            const doorImgSrc = door.isOpen ? "static/images/unlocked.png" : "static/images/locked.png";
            const lockImgSrc = "static/images/lock.png";

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

            // Determine if cell is explored
            const isExplored = this.exploredMap[y][x];

            if (!isExplored) {
                // Hide unexplored cells
                cell.classList.add('fog-of-war');
                cell.innerHTML = '';
            } else {
                cell.classList.remove('fog-of-war');

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
                        agentImg.src = "static/images/hacker.png";
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
            }
        });

        // Update inventory
        const inventoryElement = document.getElementById("inventory");
        inventoryElement.innerHTML = this.inventory
            .map((item) => `<div class="inventory-item key-icon key-${item.color}"></div>`)
            .join("");

        // Update memory (thoughts and actions)
        const memoryElement = document.getElementById("memory");
        memoryElement.innerHTML = this.memory
            .map((item) => {
                if (item.type === 'thought') {
                    return `<li class="thought-entry">Thought: ${item.message}</li>`;
                } else if (item.type === 'action') {
                    return `<li class="action-entry">Action: ${item.message}</li>`;
                } else {
                    return `<li>${item}</li>`;
                }
            })
            .join("");

        // Scroll to the bottom of the memory list
        memoryElement.scrollTop = memoryElement.scrollHeight;

        // Render mini-map
        const miniMapElement = document.getElementById('mini-map');
        miniMapElement.innerHTML = '';
        const miniMapSize = Math.min(miniMapElement.offsetWidth, miniMapElement.offsetHeight);
        const cellSize = miniMapSize / Math.max(this.sizeX, this.sizeY);

        miniMapElement.style.display = 'grid';
        miniMapElement.style.gridTemplateColumns = `repeat(${this.sizeX}, ${cellSize}px)`;
        miniMapElement.style.gridTemplateRows = `repeat(${this.sizeY}, ${cellSize}px)`;

        for (let y = 0; y < this.sizeY; y++) {
            for (let x = 0; x < this.sizeX; x++) {
                const cell = document.createElement('div');
                cell.className = 'mini-map-cell';
                
                if (this.exploredMap[y][x]) {
                    if (this.agent.x === x && this.agent.y === y) {
                        cell.classList.add('mini-map-agent');
                    } else if (this.grid[y][x] === 1) {
                        cell.classList.add('mini-map-wall');
                    } else {
                        cell.classList.add('mini-map-explored');
                    }
                } else {
                    cell.classList.add('mini-map-unexplored');
                }

                miniMapElement.appendChild(cell);
            }
        }
    },
    debugPath(path) {
        // Optional: Implement debug path visualization
    },

    printActionOrThought(item) {
        this.memory.push(item);
        const memoryElement = document.getElementById("memory");
        const newEntry = document.createElement('li');
        newEntry.className = item.type === 'thought' ? 'thought-entry' : 'action-entry';
        newEntry.textContent = `${item.type.charAt(0).toUpperCase() + item.type.slice(1)}: ${item.message}`;
        memoryElement.appendChild(newEntry);
        memoryElement.scrollTop = memoryElement.scrollHeight;
    },

    updateVisibility() {
        const { x, y } = this.agent;
        const directions = [
            { dx: 0, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: -1 },
            { dx: -1, dy: 1 },
            { dx: 1, dy: -1 },
            { dx: 1, dy: 1 }
        ];
        for (const { dx, dy } of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < this.sizeX && ny >= 0 && ny < this.sizeY) {
                this.exploredMap[ny][nx] = true;
            }
        }
    },

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

};

// Add event listener for window resize
window.addEventListener("resize", () => {
    GridWorld.init();
});

document.addEventListener("DOMContentLoaded", () => GridWorld.init());