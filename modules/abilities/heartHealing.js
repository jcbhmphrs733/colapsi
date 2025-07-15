export class HeartHealingAbility {
    constructor(gameManager, gridManager) {
        this.gameManager = gameManager;
        this.gridManager = gridManager;
        this.healedCard = null; // Track healed card for cleanup
    }

    // Set route manager reference
    setRouteManager(routeManager) {
        this.routeManager = routeManager;
    }

    // Check if player can use heart healing
    canUse(player) {
        const hasCurrentCard = !!player.currentCard;
        const cardSuit = hasCurrentCard ? this.gameManager.getCardSuit(player.currentCard) : null;
        
        if (!hasCurrentCard) return false;
        return cardSuit === 'hearts';
    }

    // Start heart healing ability
    start(player, abilityState) {
        const startCard = player.currentCard;
        const availableCards = this.getAdjacentCardsForHealing(startCard);
        
        if (availableCards.length === 0) {
            // No face-down cards available for healing
            return false;
        }
        
        // Update ability state
        abilityState.active = true;
        abilityState.type = 'hearts';
        abilityState.player = player;
        abilityState.startCard = startCard;
        abilityState.availableTargets = availableCards;
        
        // Setup UI
        this.highlightHealingCards(availableCards);
        this.gameManager.updateHubAbilityInfo('hearts', player.name, { phase: 'healing' });
        this.setupHealingClickHandlers(availableCards, abilityState);
        
        return true;
    }

    // Get adjacent cards that can be healed
    getAdjacentCardsForHealing(card) {
        const adjacent = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],  // Up-left, Up, Up-right
            [0, -1],           [0, 1],   // Left, Right
            [1, -1],  [1, 0],  [1, 1]    // Down-left, Down, Down-right
        ];

        directions.forEach(([rowDelta, colDelta]) => {
            const newRow = (card.row + rowDelta + this.gridManager.rows) % this.gridManager.rows;
            const newCol = (card.col + colDelta + this.gridManager.columns) % this.gridManager.columns;
            
            const adjacentCard = this.gridManager.getCardAt(newRow, newCol);
            if (adjacentCard && !adjacentCard.isFaceUpCard()) {
                adjacent.push(adjacentCard);
            }
        });

        return adjacent;
    }

    // Perform heart healing
    performHealing(card, abilityState, cleanupCallback) {
        console.log(`Healing card: ${card.value}`);
        
        // Heal the card
        this.healCard(card);
        
        // Store the player reference before cleanup
        const player = abilityState.player;
        
        // Clean up UI
        cleanupCallback();
        this.gameManager.clearHubAbilityInfo();
        
        // Start route planning for this player with immediate readiness
        if (this.routeManager) {
            this.routeManager.beginRoutePlanning(player, { immediatelyReady: true });
        }
        
        return true;
    }

    // Skip heart healing
    skip(abilityState, cleanupCallback) {
        console.log('Skipping heart healing');
        const player = abilityState.player;
        cleanupCallback();
        this.gameManager.clearHubAbilityInfo();
        
        // Start route planning for this player with immediate readiness
        if (this.routeManager) {
            this.routeManager.beginRoutePlanning(player, { immediatelyReady: true });
        }
        
        return true;
    }

    // Skip heart healing and immediately make a move
    skipWithMovement(abilityState, cleanupCallback, movementKey) {
        console.log(`Skipping heart healing and moving ${movementKey}`);
        const player = abilityState.player;
        cleanupCallback();
        this.gameManager.clearHubAbilityInfo();
        
        // Start route planning with immediate movement
        if (this.routeManager) {
            this.routeManager.beginRoutePlanning(player, { 
                immediatelyReady: true, 
                firstMovement: movementKey 
            });
        }
        
        return true;
    }

    // Heal a card
    healCard(card) {
        if (card && !card.isFaceUpCard()) {
            card.setFaceUp();
            this.healedCard = card;
            console.log(`Healed card: ${card.value} at [${card.row}, ${card.col}]`);
            return true;
        }
        return false;
    }

    // Restore healed card
    restoreHealedCard() {
        if (this.healedCard) {
            this.healedCard.setFaceDown();
            console.log(`Restored healed card: ${this.healedCard.value} to face down`);
            this.healedCard = null;
        }
    }

    // Clear healed card tracking
    clearHealedCard() {
        this.healedCard = null;
    }

    // Handle keyboard input
    handleKeyboardInput(event, abilityState, cleanupCallback) {
        const key = event.key.toLowerCase();
        if (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
            // Player wants to skip healing and start route planning with this direction as first move
            this.skipWithMovement(abilityState, cleanupCallback, key);
            return true; // Handled
        } else if (key === 'escape') {
            // Cancel healing entirely
            cleanupCallback();
            return true; // Handled
        }
        return false; // Not handled
    }

    // === UI METHODS ===

    highlightHealingCards(cards) {
        cards.forEach(card => {
            card.element.style.border = '3px solid #ff9800';
            card.element.style.boxShadow = '0 0 15px #ff9800';
            card.element.style.cursor = 'pointer';
            card.element.classList.add('healing-available');
        });
    }

    clearHealingHighlights() {
        // Clear highlights from all cards that might have healing styling
        this.gridManager.cards.forEach(card => {
            if (card.element.classList.contains('healing-available')) {
                card.element.style.border = '';
                card.element.style.boxShadow = '';
                card.element.style.cursor = '';
                card.element.classList.remove('healing-available');
            }
        });
    }

    setupHealingClickHandlers(availableTargets, abilityState) {
        availableTargets.forEach(card => {
            const handler = (event) => {
                event.stopPropagation();
                this.performHealing(card, abilityState, () => {
                    this.clearHealingHighlights();
                    this.cleanupHealingClickHandlers();
                    this.clearHealingInstructions();
                });
            };
            card.element.addEventListener('click', handler, { once: true });
            // Store handler for cleanup
            card.element._healingHandler = handler;
        });
    }

    cleanupHealingClickHandlers() {
        // Remove healing handlers from all cards that might have them
        this.gridManager.cards.forEach(card => {
            if (card.element._healingHandler) {
                card.element.removeEventListener('click', card.element._healingHandler);
                delete card.element._healingHandler;
            }
        });
    }

    showHealingInstructions(playerName) {
        // Remove any existing instructions
        const existingInstructions = document.getElementById('healing-instructions');
        if (existingInstructions) {
            existingInstructions.remove();
        }
        
        // Create instruction panel
        const instructions = document.createElement('div');
        instructions.id = 'healing-instructions';
        instructions.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 152, 0, 0.9);
                color: white;
                padding: 15px;
                border-radius: 8px;
                z-index: 1000;
                font-family: Arial, sans-serif;
                max-width: 250px;
            ">
                <h4 style="margin: 0 0 10px 0; color: white;">
                    ${playerName} - Heart Healing ♥
                </h4>
                <p style="margin: 5px 0;">Click an orange highlighted card to heal it (flip face up)</p>
                <p style="margin: 5px 0; font-size: 12px;">
                    • Or start planning your route to skip healing<br>
                    • Escape: Cancel ability and return to start<br>
                    • During route: Escape restarts this ability
                </p>
            </div>
        `;
        
        document.body.appendChild(instructions);
    }

    clearHealingInstructions() {
        const instructions = document.getElementById('healing-instructions');
        if (instructions) {
            instructions.remove();
        }
    }

    // Cleanup UI
    cleanup() {
        this.clearHealingHighlights();
        this.cleanupHealingClickHandlers();
        this.clearHealingInstructions();
        this.gameManager.clearHubAbilityInfo();
    }
}
