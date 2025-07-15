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
        
        // Add click handlers for player movement
        this.setupPlayerMovementHandlers();
        
        // Setup card back style selector
        this.setupCardBackSelector();
        
        // Set default card back style to blue
        this.changeCardBackStyle('blue');
        
        // Start the game
        this.gameManager.startGame();
        
        // Place players on starting positions
        this.gameManager.placePlayersOnStartingPositions();
        
        console.log('Game setup complete!');
        console.log('Current game state:', this.gameManager.getGameStats());
    }

    setupPlayerMovementHandlers() {
        // Add click handler specifically for player tokens only
        this.gridManager.cards.forEach(card => {
            // Add event listener to the card element, but we'll filter for tokens
            card.element.addEventListener('click', (event) => {
                this.handleTokenClick(event);
            });
        });
    }

    handleTokenClick(event) {
        // Only handle clicks on player tokens
        const clickedToken = event.target.closest('.player-token');
        
        if (clickedToken && !this.routeManager.isRoutePlanningActive()) {
            console.log('Player token clicked:', clickedToken);
            event.stopPropagation();
            
            // Start route planning for the clicked player
            const playerId = parseInt(clickedToken.getAttribute('data-player-id'));
            console.log('Player ID from token:', playerId);
            
            const player = this.gameManager.getPlayer(playerId);
            console.log('Found player:', player);
            
            if (player) {
                console.log('Player current card:', player.currentCard);
                console.log('Player has current card?', !!player.currentCard);
                
                if (player.currentCard) {
                    console.log('Starting route planning...');
                    this.routeManager.startRoutePlanning(player);
                } else {
                    console.log('Player has no current card position');
                }
            } else {
                console.log('Player not found');
            }
        }
        // Ignore all other clicks - no regular card clicking
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