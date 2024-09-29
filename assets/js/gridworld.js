const GridWorld = {
    size: 12,
    grid: [],
    agent: { x: 1, y: 1 },
    keys: [],
    doors: [],
    inventory: [],
    memory: [],
    currentGoal: null,

    debug(message) {
        console.log(message);
        this.memory.push(message);
    },

    init() {
        this.initializeGrid();
        this.initializeKeysAndDoors();
        this.render();
        this.debug("GridWorld initialized");
        setInterval(() => {
            this.debug(`Agent at (${this.agent.x},${this.agent.y})`);
            this.moveAgent();
        }, 300);
    },

    initializeGrid() {
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(0));
        for (let i = 0; i < this.size; i++) {
            this.grid[0][i] = this.grid[this.size-1][i] = this.grid[i][0] = this.grid[i][this.size-1] = 1;
            this.grid[6][i] = this.grid[i][6] = 1;
        }
    },

    initializeKeysAndDoors() {
        this.keys = [
            { x: 2, y: 2, color: 'red' },
            { x: 9, y: 2, color: 'blue' },
            { x: 2, y: 9, color: 'green' },
            { x: 9, y: 9, color: 'yellow' }
        ];
        this.doors = [
            { x: 6, y: 3, color: 'red', isOpen: false },
            { x: 3, y: 6, color: 'blue', isOpen: false },
            { x: 6, y: 9, color: 'green', isOpen: false },
            { x: 9, y: 6, color: 'yellow', isOpen: false }
        ];
    },

    canMove(x, y) {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) return false;

        const door = this.doors.find(d => d.x === x && d.y === y);

        if (door) {
            // There's a door at this position
            if (door.isOpen) {
                return true;
            } else {
                // Door is closed, check if the agent has the key
                return this.inventory.some(key => key.color === door.color);
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

            const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (const [dx, dy] of directions) {
                const newX = x + dx;
                const newY = y + dy;
                const newPos = `${newX},${newY}`;

                if (this.canMove(newX, newY) && !visited.has(newPos)) {
                    visited.add(newPos);
                    const newPath = [...path, { x: newX, y: newY }];
                    
                    // If this is a door, simulate opening it
                    const door = this.doors.find(d => d.x === newX && d.y === newY);
                    if (door && !door.isOpen && this.inventory.some(key => key.color === door.color)) {
                        this.debug(`Simulating opening ${door.color} door at (${newX},${newY})`);
                    }
                    
                    queue.push(newPath);
                }
            }
        }

        return [];
    },

    getNextGoal() {
        const uncollectedKeys = this.keys.filter(key => !this.inventory.some(i => i.color === key.color));
        if (uncollectedKeys.length > 0) {
            return uncollectedKeys[0];
        }

        const closedDoors = this.doors.filter(door => !door.isOpen);
        const openableDoors = closedDoors.filter(door => 
            this.inventory.some(key => key.color === door.color)
        );

        if (openableDoors.length > 0) {
            return openableDoors.reduce((nearest, door) => {
                const distToDoor = Math.abs(this.agent.x - door.x) + Math.abs(this.agent.y - door.y);
                const distToNearest = Math.abs(this.agent.x - nearest.x) + Math.abs(this.agent.y - nearest.y);
                return distToDoor < distToNearest ? door : nearest;
            });
        }

        if (closedDoors.length > 0) {
            return closedDoors.reduce((nearest, door) => {
                const distToDoor = Math.abs(this.agent.x - door.x) + Math.abs(this.agent.y - door.y);
                const distToNearest = Math.abs(this.agent.x - nearest.x) + Math.abs(this.agent.y - nearest.y);
                return distToDoor < distToNearest ? door : nearest;
            });
        }

        return null;
    },

    checkForKey(x, y) {
        const keyIndex = this.keys.findIndex(key => key.x === x && key.y === y);
        if (keyIndex !== -1) {
            const collectedKey = this.keys.splice(keyIndex, 1)[0];
            this.inventory.push(collectedKey);
            this.memory.push(`Collected ${collectedKey.color} key at (${x},${y})`);
            this.currentGoal = null;
        }
    },

    checkForDoor(x, y) {
        const doorIndex = this.doors.findIndex(door => door.x === x && door.y === y);
        if (doorIndex !== -1 && !this.doors[doorIndex].isOpen) {
            if (this.inventory.some(key => key.color === this.doors[doorIndex].color)) {
                this.doors[doorIndex].isOpen = true;
                this.memory.push(`Opened ${this.doors[doorIndex].color} door at (${x},${y})`);
                // Don't reset the current goal when opening a door
                // this.currentGoal = null;
            }
        }
    },

    moveAgent() {
        if (!this.currentGoal) {
            this.currentGoal = this.getNextGoal();
            this.debug(`New goal set: (${this.currentGoal.x},${this.currentGoal.y})`);
        }
        
        if (!this.currentGoal) {
            this.memory.push("All tasks completed!");
            this.render();
            return;
        }

        const path = this.findPath(this.agent, this.currentGoal);
        
        if (path.length > 1) {
            const nextStep = path[1];
            this.debug(`Path found. Next step: (${nextStep.x},${nextStep.y})`);
            
            // Check if the next step is a door that needs opening
            const door = this.doors.find(d => d.x === nextStep.x && d.y === nextStep.y && !d.isOpen);
            if (door && this.inventory.some(key => key.color === door.color)) {
                this.debug(`Opening ${door.color} door at (${nextStep.x},${nextStep.y})`);
                door.isOpen = true;
            }
            
            this.agent = { x: nextStep.x, y: nextStep.y };
            this.checkForKey(nextStep.x, nextStep.y);
            this.memory.push(`Moving to (${nextStep.x},${nextStep.y})`);
        } else {
            this.debug(`No path found to goal (${this.currentGoal.x},${this.currentGoal.y})`);
            this.memory.push(`Cannot reach goal at (${this.currentGoal.x},${this.currentGoal.y}). Finding new goal.`);
            this.currentGoal = null;
        }

        this.render();
    },

    getCellContent(x, y) {
        if (this.agent.x === x && this.agent.y === y) return '👤';
        const key = this.keys.find(k => k.x === x && k.y === y);
        if (key) return `🔑${key.color[0].toUpperCase()}`;
        const door = this.doors.find(d => d.x === x && d.y === y);
        if (door) return door.isOpen ? '🚪' : `🔒${door.color[0].toUpperCase()}`;
        return '';
    },

    render() {
        const gridElement = document.getElementById('grid');
        gridElement.innerHTML = '';
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const cell = document.createElement('div');
                cell.className = `cell ${this.grid[y][x] === 1 ? 'wall' : ''}`;
                cell.textContent = this.getCellContent(x, y);
                gridElement.appendChild(cell);
            }
        }

        const inventoryElement = document.getElementById('inventory');
        inventoryElement.innerHTML = this.inventory.map(item => `🔑${item.color[0].toUpperCase()}`).join(' ');

        const memoryElement = document.getElementById('memory');
        memoryElement.innerHTML = this.memory.slice(-5).map(item => `<li>${item}</li>`).join('');
    },

    debugPath(path) {
        const debugGrid = this.grid.map(row => row.map(cell => cell === 1 ? '⬛' : '⬜'));
        path.forEach(({x, y}, index) => {
            debugGrid[y][x] = index === 0 ? '🟩' : (index === path.length - 1 ? '🟥' : '🟨');
        });
        console.log(debugGrid.map(row => row.join('')).join('\n'));
    }
};

document.addEventListener('DOMContentLoaded', () => GridWorld.init());