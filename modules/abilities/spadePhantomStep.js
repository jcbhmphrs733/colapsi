export class SpadePhantomStepAbility {
    constructor(gameManager, gridManager) {
        this.gameManager = gameManager;
        this.gridManager = gridManager;
    }

    // Set route manager reference
    setRouteManager(routeManager) {
        this.routeManager = routeManager;
    }

    // Check if player can use spade phantom step
    canUse(player) {
        const hasCurrentCard = !!player.currentCard;
        const cardSuit = hasCurrentCard ? this.gameManager.getCardSuit(player.currentCard) : null;
        
        if (!hasCurrentCard) return false;
        return cardSuit === 'spades';
    }

    // Start spade phantom step ability
    start(player, abilityState) {
        // Spades ability is passive - automatically enables phantom step for this turn
        abilityState.active = true;
        abilityState.type = 'spades';
        abilityState.player = player;
        abilityState.startCard = player.currentCard;
        
        // Show instructions and immediately start route planning with phantom step enabled
        this.showPhantomStepInstructions(player.name);
        
        // Start route planning immediately with phantom step enabled
        if (this.routeManager) {
            this.routeManager.beginRoutePlanning(player, { allowPhantomStep: true });
        }
        
        return true;
    }

    // Skip spade phantom step (same as starting route planning without the ability)
    skip(abilityState, cleanupCallback) {
        console.log('Skipping phantom step');
        const player = abilityState.player;
        cleanupCallback();
        
        // Start normal route planning
        if (this.routeManager) {
            this.routeManager.beginRoutePlanning(player);
        }
        
        return true;
    }

    // Handle keyboard input
    handleKeyboardInput(event, abilityState, cleanupCallback) {
        const key = event.key.toLowerCase();
        if (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
            // Player wants to skip phantom step and start normal route planning
            this.skip(abilityState, cleanupCallback);
            return true; // Handled
        } else if (key === 'escape') {
            // Cancel phantom step entirely
            cleanupCallback();
            return true; // Handled
        }
        return false; // Not handled
    }

    // Check if a face-down card can be used in phantom step
    canUsePhantomStep(card) {
        // Any face-down card without players can be used
        return !card.isFaceUpCard() && card.players.length === 0;
    }

    // Validate phantom step route
    validatePhantomStepRoute(route) {
        let phantomStepUsed = false;
        
        for (let i = 0; i < route.length; i++) {
            const card = route[i];
            
            // Check if this is a face-down card
            if (!card.isFaceUpCard()) {
                if (phantomStepUsed) {
                    // Already used phantom step once
                    return {
                        valid: false,
                        error: 'Only one face-down card can be included in your route',
                        errorIndex: i
                    };
                }
                
                if (!this.canUsePhantomStep(card)) {
                    return {
                        valid: false,
                        error: 'Cannot step on face-down cards with other players',
                        errorIndex: i
                    };
                }
                
                if (i === route.length - 1) {
                    // Cannot end route on face-down card
                    return {
                        valid: false,
                        error: 'Cannot end your route on a face-down card',
                        errorIndex: i
                    };
                }
                
                phantomStepUsed = true;
            }
        }
        
        return { valid: true };
    }

    // === UI METHODS ===

    showPhantomStepInstructions(playerName) {
        // Remove any existing instructions
        const existingInstructions = document.getElementById('phantom-step-instructions');
        if (existingInstructions) {
            existingInstructions.remove();
        }
        
        // Create instruction panel
        const instructions = document.createElement('div');
        instructions.id = 'phantom-step-instructions';
        instructions.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                left: 20px;
                background: rgba(33, 33, 33, 0.9);
                color: white;
                padding: 15px;
                border-radius: 8px;
                z-index: 1000;
                font-family: Arial, sans-serif;
                max-width: 250px;
            ">
                <h4 style="margin: 0 0 10px 0; color: white;">
                    ${playerName} - Phantom Step ♠
                </h4>
                <p style="margin: 5px 0;">You may include <strong>one face-down card</strong> in your route</p>
                <p style="margin: 5px 0; font-size: 12px;">
                    • Plan your route normally<br>
                    • Step on any face-down card as a bridge<br>
                    • Cannot end route on face-down card<br>
                    • Escape: Cancel ability and return to start<br>
                    • During route: Escape restarts this ability
                </p>
            </div>
        `;
        
        document.body.appendChild(instructions);
    }

    clearPhantomStepInstructions() {
        const instructions = document.getElementById('phantom-step-instructions');
        if (instructions) {
            instructions.remove();
        }
    }

    // Cleanup UI
    cleanup() {
        this.clearPhantomStepInstructions();
    }
}
