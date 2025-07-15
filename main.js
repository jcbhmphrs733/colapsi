import { GridManager } from "./modules/gridManager.js";
import { GameManager } from "./modules/gameManager.js";
import { RouteManager } from "./modules/route.js";

class ColapsiApp {
    constructor() {
        this.gridManager = null;
        this.gameManager = null;
        this.routeManager = null;
        this.minWidth = 980;
        this.minHeight = 935;
        this.init();
    }

    init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupGame();
                this.enforceMinimumWindowSize();
            });
        } else {
            this.setupGame();
            this.enforceMinimumWindowSize();
        }
    }

    setupGame() {
        // Initialize grid
        this.gridManager = new GridManager('gridContainer');
        this.gridManager.createGrid();
        
        // Initialize game manager
        this.gameManager = new GameManager(this.gridManager);
        
        // Initialize route manager
        this.routeManager = new RouteManager(this.gridManager, this.gameManager);
        
        // Give GameManager access to RouteManager for cleanup
        this.gameManager.setRouteManager(this.routeManager);
        
        // Give AbilityManager access to RouteManager for ability completion
        this.gameManager.abilityManager.setRouteManager(this.routeManager);
        
        // Setup card back style selector
        this.setupCardBackSelector();
        
        // Set default card back style to blue
        this.changeCardBackStyle('blue');
        
        // Start the game
        this.gameManager.startGame();
        
        // Place players on starting positions
        this.gameManager.placePlayersOnStartingPositions();
        
        // Setup turn management UI
        this.setupTurnManagement();
        
        console.log('Game setup complete!');
        console.log('Current game state:', this.gameManager.getGameStats());
    }

    setupTurnManagement() {
        // Add UI for current turn
        this.createTurnDisplay();
        
        // Add Give Up button
        this.createGiveUpButton();
        
        // Start first turn automatically after a brief setup delay
        setTimeout(() => {
            this.startCurrentTurn();
        }, 1000); // Give players a moment to see the setup
    }

    createTurnDisplay() {
        // Create turn display element
        const turnDisplay = document.createElement('div');
        turnDisplay.id = 'turnDisplay';
        turnDisplay.style.cssText = `
            position: fixed;
            top: 80px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 1000;
            font-family: Arial, sans-serif;
            min-width: 200px;
        `;
        
        document.body.appendChild(turnDisplay);
        this.updateTurnDisplay();
        
        // Start timer update interval
        this.startTimerUpdateInterval();
    }

    createGiveUpButton() {
        // Create Give Up button
        const giveUpButton = document.createElement('button');
        giveUpButton.id = 'giveUpButton';
        giveUpButton.textContent = 'Give Up';
        giveUpButton.style.cssText = `
            position: fixed;
            top: 220px;
            left: 20px;
            background: #d32f2f;
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            z-index: 1000;
            transition: background-color 0.3s ease;
        `;
        
        giveUpButton.addEventListener('mouseenter', () => {
            giveUpButton.style.background = '#b71c1c';
        });
        
        giveUpButton.addEventListener('mouseleave', () => {
            giveUpButton.style.background = '#d32f2f';
        });
        
        giveUpButton.addEventListener('click', () => {
            this.handleGiveUpClick();
        });
        
        document.body.appendChild(giveUpButton);
    }

    handleGiveUpClick() {
        const currentPlayer = this.gameManager.getCurrentPlayer();
        if (!currentPlayer || this.gameManager.gameState !== 'playing') {
            return;
        }
        
        // Only allow current player to give up
        if (!this.gameManager.isPlayerTurn(currentPlayer)) {
            return;
        }
        
        // Show confirmation dialog
        this.showGiveUpConfirmation(currentPlayer);
    }

    showGiveUpConfirmation(player) {
        // Remove any existing confirmation
        const existingConfirm = document.getElementById('giveUpConfirmation');
        if (existingConfirm) {
            existingConfirm.remove();
        }
        
        // Create confirmation overlay
        const overlay = document.createElement('div');
        overlay.id = 'giveUpConfirmation';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;
        
        // Create confirmation dialog
        const confirmDialog = document.createElement('div');
        confirmDialog.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        `;
        
        confirmDialog.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #d32f2f;">
                ⚠️ Give Up Confirmation
            </h3>
            <p style="margin: 0 0 10px 0; font-size: 16px; color: #333;">
                <strong>${player.name}</strong>, are you sure you want to give up?
            </p>
            <p style="margin: 0 0 25px 0; font-size: 14px; color: #666;">
                You will be eliminated from the game and cannot continue playing.
            </p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="confirmGiveUp" style="
                    background: #d32f2f;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                ">Yes, Give Up</button>
                <button id="cancelGiveUp" style="
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                ">Continue Playing</button>
            </div>
        `;
        
        overlay.appendChild(confirmDialog);
        document.body.appendChild(overlay);
        
        // Add event listeners
        const confirmButton = confirmDialog.querySelector('#confirmGiveUp');
        const cancelButton = confirmDialog.querySelector('#cancelGiveUp');
        
        confirmButton.addEventListener('click', () => {
            this.confirmGiveUp(player);
            overlay.remove();
        });
        
        cancelButton.addEventListener('click', () => {
            overlay.remove();
        });
        
        // Allow clicking outside to cancel
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                overlay.remove();
            }
        });
        
        // ESC key to cancel
        const escapeHandler = (event) => {
            if (event.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    confirmGiveUp(player) {
        console.log(`${player.name} chose to give up voluntarily`);
        
        // Clean up any active turn state
        this.gameManager.cleanupPlayerTurn(player);
        
        // Eliminate the player
        this.gameManager.eliminatePlayer(player);
        
        // Move to next turn
        this.gameManager.nextTurn();
        
        // Update display immediately
        this.updateTurnDisplay();
    }

    updateTurnDisplay() {
        const turnDisplay = document.getElementById('turnDisplay');
        if (turnDisplay) {
            const currentPlayer = this.gameManager.getCurrentPlayer();
            const gameStats = this.gameManager.getGameStats();
            
            if (!currentPlayer) {
                // Game has ended
                turnDisplay.innerHTML = `
                    <h4 style="margin: 0 0 10px 0; color: #FFD700;">
                        Game Over!
                    </h4>
                    <p style="margin: 5px 0; font-size: 16px;">
                        Check console for winner
                    </p>
                `;
                return;
            }
            
            const remainingTime = this.gameManager.getRemainingTurnTime();
            const timeColor = remainingTime <= 10 ? '#ff4444' : remainingTime <= 30 ? '#ffaa00' : '#4CAF50';
            
            // Add warning animation when time is running out
            if (remainingTime <= 10) {
                turnDisplay.classList.add('timer-warning');
            } else {
                turnDisplay.classList.remove('timer-warning');
            }
            
            turnDisplay.innerHTML = `
                <h4 style="margin: 0 0 10px 0; color: ${currentPlayer.color};">
                    Turn ${gameStats.turnNumber}
                </h4>
                <p style="margin: 5px 0; font-size: 16px;">
                    <strong>${currentPlayer.name}</strong>'s Turn
                </p>
                <p style="margin: 5px 0; font-size: 12px; opacity: 0.8;">
                    Current position: ${currentPlayer.currentCard ? currentPlayer.currentCard.value : 'None'}
                </p>
                <p style="margin: 5px 0; font-size: 14px; color: ${timeColor}; font-weight: bold;">
                    ⏱️ Time: ${remainingTime}s
                </p>
            `;
        }
    }

    startTimerUpdateInterval() {
        // Update timer display every second
        this.timerInterval = setInterval(() => {
            this.updateTurnDisplay();
        }, 1000);
    }

    startCurrentTurn() {
        // Update display
        this.updateTurnDisplay();
        
        // Check if route planning is already active
        if (this.routeManager.isRoutePlanningActive()) {
            console.log('Turn already in progress');
            return;
        }
        
        // Start the current player's turn automatically
        this.routeManager.startCurrentPlayerTurn();
        
        // Setup listener for automatic turn transitions
        this.setupTurnEndListener();
    }

    setupTurnEndListener() {
        // Listen for turn end and automatically start next turn
        const checkTurnEnd = setInterval(() => {
            if (!this.routeManager.isRoutePlanningActive()) {
                // Turn has ended, update display for new player
                this.updateTurnDisplay();
                
                // Check if game has ended
                if (this.gameManager.gameState === 'ended') {
                    // Stop timer updates
                    if (this.timerInterval) {
                        clearInterval(this.timerInterval);
                    }
                    // Hide Give Up button
                    const giveUpButton = document.getElementById('giveUpButton');
                    if (giveUpButton) {
                        giveUpButton.style.display = 'none';
                    }
                    clearInterval(checkTurnEnd);
                    return;
                }
                
                // Automatically start next player's turn after brief delay
                setTimeout(() => {
                    if (this.gameManager.gameState === 'playing') {
                        this.startCurrentTurn();
                    }
                }, 500); // Brief pause between turns
                
                clearInterval(checkTurnEnd);
            }
        }, 100);
    }

    setupCardBackSelector() {
        const selector = document.getElementById('cardBackStyle');
        if (selector) {
            selector.addEventListener('change', (event) => {
                this.changeCardBackStyle(event.target.value);
            });
        }
    }

    changeCardBackStyle(style) {
        // Remove any existing card back classes
        this.gridManager.cards.forEach(card => {
            if (card.element) {
                card.element.classList.remove('red', 'green', 'blue', 'grey');
                
                // Add new style class
                card.element.classList.add(style);
            }
        });
        
        console.log(`Card back style changed to: ${style}`);
    }

    enforceMinimumWindowSize() {
        // Check and enforce minimum window size on load
        this.checkWindowSize();
        
        // Listen for window resize events
        window.addEventListener('resize', () => {
            this.checkWindowSize();
        });
    }

    checkWindowSize() {
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;
        
        // If window is smaller than minimum, try to resize it
        if (currentWidth < this.minWidth || currentHeight < this.minHeight) {
            const newWidth = Math.max(currentWidth, this.minWidth);
            const newHeight = Math.max(currentHeight, this.minHeight);
            
            // Try to resize the window (this works in some browsers/contexts)
            try {
                window.resizeTo(newWidth, newHeight);
            } catch (error) {
                // If resizing fails, log a warning
                console.warn(`Window is smaller than recommended minimum size (${this.minWidth}x${this.minHeight}). Current: ${currentWidth}x${currentHeight}`);
            }
        }
    }
}

// Initialize the app when the script loads
const app = new ColapsiApp();

export { ColapsiApp };