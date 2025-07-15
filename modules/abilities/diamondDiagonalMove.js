export class DiamondDiagonalMoveAbility {
    constructor(gameManager, gridManager) {
        this.gameManager = gameManager;
        this.gridManager = gridManager;
    }

    // Set route manager reference
    setRouteManager(routeManager) {
        this.routeManager = routeManager;
    }

    // Check if player can use diamond diagonal movement
    canUse(player) {
        const hasCurrentCard = !!player.currentCard;
        const cardSuit = hasCurrentCard ? this.gameManager.getCardSuit(player.currentCard) : null;
        
        if (!hasCurrentCard) return false;
        return cardSuit === 'diamonds';
    }

    // Start diamond diagonal movement ability
    start(player, abilityState) {
        // Diamonds ability is passive - automatically enables diagonal movement for this turn
        abilityState.active = true;
        abilityState.type = 'diamonds';
        abilityState.player = player;
        abilityState.startCard = player.currentCard;
        
        // Show instructions and immediately start route planning with diagonal movement enabled
        this.showDiagonalMoveInstructions(player.name);
        
        // Start route planning immediately with diagonal movement enabled
        if (this.routeManager) {
            this.routeManager.beginRoutePlanning(player, { allowDiagonalMovement: true });
        }
        
        return true;
    }

    // Skip diamond diagonal movement (same as starting route planning without the ability)
    skip(abilityState, cleanupCallback) {
        console.log('Skipping diagonal movement');
        const player = abilityState.player;
        cleanupCallback();
        
        // Start normal route planning
        if (this.routeManager) {
            this.routeManager.beginRoutePlanning(player, { immediatelyReady: true });
        }
        
        return true;
    }

    // Skip diagonal movement and immediately make a move
    skipWithMovement(abilityState, cleanupCallback, movementKey) {
        console.log(`Skipping diagonal movement and moving ${movementKey}`);
        const player = abilityState.player;
        cleanupCallback();
        
        // Start route planning with immediate movement
        if (this.routeManager) {
            this.routeManager.beginRoutePlanning(player, { 
                immediatelyReady: true, 
                firstMovement: movementKey 
            });
        }
        
        return true;
    }

    // Handle keyboard input
    handleKeyboardInput(event, abilityState, cleanupCallback) {
        const key = event.key.toLowerCase();
        if (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
            // Player wants to skip diagonal movement and start normal route planning
            this.skipWithMovement(abilityState, cleanupCallback, key);
            return true; // Handled
        } else if (key === 'escape') {
            // Cancel diagonal movement entirely
            cleanupCallback();
            return true; // Handled
        }
        return false; // Not handled
    }

    // === UI METHODS ===

    showDiagonalMoveInstructions(playerName) {
        // Remove any existing instructions
        const existingInstructions = document.getElementById('diagonal-move-instructions');
        if (existingInstructions) {
            existingInstructions.remove();
        }
        
        // Create instruction panel
        const instructions = document.createElement('div');
        instructions.id = 'diagonal-move-instructions';
        instructions.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 193, 7, 0.9);
                color: black;
                padding: 15px;
                border-radius: 8px;
                z-index: 1000;
                font-family: Arial, sans-serif;
                max-width: 250px;
            ">
                <h4 style="margin: 0 0 10px 0; color: black;">
                    ${playerName} - Diagonal Movement ♦
                </h4>
                <p style="margin: 5px 0;">You can move <strong>diagonally</strong> during route planning</p>
                <p style="margin: 5px 0; font-size: 12px;">
                    • Plan your route normally<br>
                    • All 8 directions available (including diagonals)<br>
                    • Use Q/E, Shift+Arrows for diagonal movement<br>
                    • Escape: Cancel ability and return to start<br>
                    • During route: Escape restarts this ability
                </p>
            </div>
        `;
        
        document.body.appendChild(instructions);
    }

    clearDiagonalMoveInstructions() {
        const instructions = document.getElementById('diagonal-move-instructions');
        if (instructions) {
            instructions.remove();
        }
    }

    // Cleanup UI
    cleanup() {
        this.clearDiagonalMoveInstructions();
    }
}
