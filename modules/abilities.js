export class AbilityManager {
    constructor(gameManager, gridManager) {
        this.gameManager = gameManager;
        this.gridManager = gridManager;
        
        // Track cards affected by abilities (for cleanup purposes)
        this.healedCard = null;
        this.swappedCards = null; // Track cards that were swapped for undo functionality
        
        // Ability state for UI management
        this.abilityState = {
            active: false,
            type: null, // 'hearts', 'diamonds', 'clubs', 'spades'
            player: null,
            startCard: null,
            availableTargets: [],
            selectedCard: null, // For club swapping - the first card selected
            swapTargets: [] // For club swapping - available cards to swap with
        };
    }

    // Set route manager reference (called after route manager is created)
    setRouteManager(routeManager) {
        this.routeManager = routeManager;
    }

    // Main method to check if a player can use any ability
    canUseAbility(player) {
        if (!this.gameManager.areSpecialAbilitiesUnlocked()) {
            return null;
        }
        
        if (!player.currentCard) {
            return null;
        }
        
        const suit = this.gameManager.getCardSuit(player.currentCard);
        
        switch (suit) {
            case 'hearts':
                return this.canUseHeartHealing(player) ? 'hearts' : null;
            case 'diamonds':
                // TODO: Implement diamond ability check
                return null;
            case 'clubs':
                return this.canUseClubSwapping(player) ? 'clubs' : null;
            case 'spades':
                // TODO: Implement spade ability check
                return null;
            default:
                return null;
        }
    }

    // Start ability phase for a player
    startAbility(player, abilityType) {
        switch (abilityType) {
            case 'hearts':
                return this.startHeartHealing(player);
            case 'diamonds':
                // TODO: Implement diamond ability
                return false;
            case 'clubs':
                return this.startClubSwapping(player);
            case 'spades':
                // TODO: Implement spade ability
                return false;
            default:
                return false;
        }
    }

    // === HEART HEALING ABILITY ===
    
    canUseHeartHealing(player) {
        const hasCurrentCard = !!player.currentCard;
        const cardSuit = hasCurrentCard ? this.gameManager.getCardSuit(player.currentCard) : null;
        
        if (!hasCurrentCard) return false;
        return cardSuit === 'hearts';
    }

    startHeartHealing(player) {
        const startCard = player.currentCard;
        const availableCards = this.getAdjacentCardsForHealing(startCard);
        
        if (availableCards.length === 0) {
            // No face-down cards available for healing
            return false;
        }
        
        this.abilityState = {
            active: true,
            type: 'hearts',
            player: player,
            startCard: startCard,
            availableTargets: availableCards
        };
        
        // Setup UI
        this.highlightHealingCards(availableCards);
        this.showHealingInstructions(player.name);
        this.setupHealingClickHandlers();
        
        return true;
    }

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

    performHeartHealing(card) {
        console.log(`Healing card: ${card.value}`);
        
        // Heal the card
        this.healCard(card);
        
        // Clean up UI
        this.cleanupAbilityUI();
        
        // Start route planning for this player
        if (this.routeManager) {
            this.routeManager.beginRoutePlanning(this.abilityState.player);
        }
        
        return true;
    }

    skipHeartHealing() {
        console.log('Skipping heart healing');
        const player = this.abilityState.player;
        this.cleanupAbilityUI();
        
        // Start route planning for this player
        if (this.routeManager) {
            this.routeManager.beginRoutePlanning(player);
        }
        
        return true;
    }

    // === CLUB SWAPPING ABILITY ===
    
    canUseClubSwapping(player) {
        const hasCurrentCard = !!player.currentCard;
        const cardSuit = hasCurrentCard ? this.gameManager.getCardSuit(player.currentCard) : null;
        
        if (!hasCurrentCard) return false;
        return cardSuit === 'clubs';
    }

    startClubSwapping(player) {
        const startCard = player.currentCard;
        const availableCards = this.getAllSwappableCards(startCard);
        
        // Club swapping is always available (can swap any cards except starting card)
        this.abilityState = {
            active: true,
            type: 'clubs',
            player: player,
            startCard: startCard,
            availableTargets: availableCards,
            selectedCard: null,
            swapTargets: []
        };
        
        // Setup UI - highlight all available cards
        this.highlightSwappableCards(availableCards);
        this.showSwappingInstructions(player.name);
        this.setupSwappingClickHandlers();
        
        return true;
    }

    getAllSwappableCards(excludeCard) {
        const available = [];
        this.gridManager.cards.forEach(card => {
            // Exclude the player's starting card
            if (card !== excludeCard) {
                available.push(card);
            }
        });
        return available;
    }

    getAdjacentCardsForSwapping(card) {
        const adjacent = [];
        const directions = [
            [-1, 0], // Up
            [1, 0],  // Down
            [0, -1], // Left
            [0, 1]   // Right
        ];

        directions.forEach(([rowDelta, colDelta]) => {
            const newRow = (card.row + rowDelta + this.gridManager.rows) % this.gridManager.rows;
            const newCol = (card.col + colDelta + this.gridManager.columns) % this.gridManager.columns;
            
            const adjacentCard = this.gridManager.getCardAt(newRow, newCol);
            // Exclude the player's starting card from swap targets
            if (adjacentCard && adjacentCard !== this.abilityState.startCard) {
                adjacent.push(adjacentCard);
            }
        });

        return adjacent;
    }

    selectCardForSwapping(card) {
        if (this.abilityState.selectedCard === card) {
            // Clicking the same card again - deselect and return to "select any card" mode
            this.deselectCardForSwapping();
            return;
        }

        if (!this.abilityState.selectedCard) {
            // First card selection - show swap targets
            this.abilityState.selectedCard = card;
            this.abilityState.swapTargets = this.getAdjacentCardsForSwapping(card);
            
            // Update UI to show only the selected card and its swap targets
            this.clearSwappingHighlights();
            this.highlightSelectedCard(card);
            this.highlightSwapTargets(this.abilityState.swapTargets);
            this.setupSwappingClickHandlers(); // Reset click handlers for new targets
            
            console.log(`Selected card ${card.value} for swapping. Available swap targets: ${this.abilityState.swapTargets.length}`);
        } else {
            // Second card selection - perform the swap
            if (this.abilityState.swapTargets.includes(card)) {
                this.performCardSwap(this.abilityState.selectedCard, card);
            } else {
                console.log('Invalid swap target. Card must be adjacent to selected card.');
            }
        }
    }

    deselectCardForSwapping() {
        console.log('Deselecting card, returning to "select any card" mode');
        
        // Reset selection state
        this.abilityState.selectedCard = null;
        this.abilityState.swapTargets = [];
        
        // Return to highlighting all available cards
        this.clearSwappingHighlights();
        this.highlightSwappableCards(this.abilityState.availableTargets);
        this.setupSwappingClickHandlers(); // Reset click handlers for all cards
    }

    performCardSwap(card1, card2) {
        console.log(`Swapping ${card1.value} at [${card1.row}, ${card1.col}] with ${card2.value} at [${card2.row}, ${card2.col}]`);
        
        // Store original state for potential undo
        this.swappedCards = {
            card1: { card: card1, originalValue: card1.value, originalFaceUp: card1.isFaceUpCard() },
            card2: { card: card2, originalValue: card2.value, originalFaceUp: card2.isFaceUpCard() }
        };
        
        // Perform the swap - exchange values and face-up states
        const tempValue = card1.value;
        const tempFaceUp = card1.isFaceUpCard();
        
        // Swap card1 <- card2
        card1.value = card2.value;
        card1.element.dataset.value = card1.value;
        if (card2.isFaceUpCard()) {
            card1.setFaceUp();
            // Force display refresh for face-up cards
            if (card1.isFaceUpCard()) {
                card1.showFace();
            }
        } else {
            card1.setFaceDown();
        }
        
        // Swap card2 <- card1 (original)
        card2.value = tempValue;
        card2.element.dataset.value = card2.value;
        if (tempFaceUp) {
            card2.setFaceUp();
            // Force display refresh for face-up cards
            if (card2.isFaceUpCard()) {
                card2.showFace();
            }
        } else {
            card2.setFaceDown();
        }
        
        console.log(`Swap completed: ${card1.value} <-> ${card2.value}`);
        
        // Store the player reference before cleanup
        const player = this.abilityState.player;
        
        // Clean up UI and proceed to route planning
        this.cleanupAbilityUI();
        
        // Start route planning for this player
        if (this.routeManager) {
            console.log(`Starting route planning for ${player.name} after club swap`);
            this.routeManager.beginRoutePlanning(player);
        } else {
            console.error('RouteManager not available!');
        }
    }

    skipClubSwapping() {
        console.log('Skipping club swapping');
        const player = this.abilityState.player;
        this.cleanupAbilityUI();
        
        // Start route planning for this player
        if (this.routeManager) {
            this.routeManager.beginRoutePlanning(player);
        }
        
        return true;
    }

    undoCardSwap() {
        if (!this.swappedCards) {
            console.log('No swap to undo');
            return false;
        }
        
        console.log('Undoing card swap');
        
        const { card1, card2 } = this.swappedCards;
        
        // Restore original values
        card1.card.value = card1.originalValue;
        card1.card.element.dataset.value = card1.originalValue;
        if (card1.originalFaceUp) {
            card1.card.setFaceUp();
            // Force display refresh for face-up cards
            if (card1.card.isFaceUpCard()) {
                card1.card.showFace();
            }
        } else {
            card1.card.setFaceDown();
        }
        
        card2.card.value = card2.originalValue;
        card2.card.element.dataset.value = card2.originalValue;
        if (card2.originalFaceUp) {
            card2.card.setFaceUp();
            // Force display refresh for face-up cards
            if (card2.card.isFaceUpCard()) {
                card2.card.showFace();
            }
        } else {
            card2.card.setFaceDown();
        }
        
        // Clear swap tracking
        this.swappedCards = null;
        
        console.log('Card swap undone');
        return true;
    }

    // === GENERAL ABILITY METHODS ===

    healCard(card) {
        if (card && !card.isFaceUpCard()) {
            card.setFaceUp();
            this.healedCard = card;
            console.log(`Healed card: ${card.value} at [${card.row}, ${card.col}]`);
            return true;
        }
        return false;
    }

    restoreHealedCard() {
        if (this.healedCard) {
            this.healedCard.setFaceDown();
            console.log(`Restored healed card: ${this.healedCard.value} to face down`);
            this.healedCard = null;
        }
    }

    clearHealedCard() {
        this.healedCard = null;
    }

    // Cancel current ability
    cancelAbility() {
        console.log(`Cancelling ${this.abilityState.type} ability`);
        
        // If we're cancelling a club swap and there was a swap performed, undo it
        if (this.abilityState.type === 'clubs' && this.swappedCards) {
            this.undoCardSwap();
        }
        
        this.cleanupAbilityUI();
    }

    // Restore any changes made during abilities (when route is cancelled)
    restoreAbilityChanges() {
        if (this.healedCard) {
            this.restoreHealedCard();
        }
        
        if (this.swappedCards) {
            this.undoCardSwap();
        }
    }

    // Clear ability change tracking (when route is completed)
    clearAbilityChanges() {
        this.clearHealedCard();
        this.swappedCards = null;
    }

    // Force cleanup when player times out
    forceCleanupForTimeout(player) {
        if (this.abilityState.active && this.abilityState.player === player) {
            console.log(`Force cleanup for ${player.name} ability due to timeout`);
            this.cleanupAbilityUI();
        }
    }

    // Check if any ability is currently active
    isAbilityActive() {
        return this.abilityState.active;
    }

    getActiveAbility() {
        return this.abilityState.active ? this.abilityState.type : null;
    }

    // === UI MANAGEMENT ===

    cleanupAbilityUI() {
        if (this.abilityState.type === 'hearts') {
            this.clearHealingHighlights();
            this.cleanupHealingClickHandlers();
            this.clearHealingInstructions();
        } else if (this.abilityState.type === 'clubs') {
            this.clearSwappingHighlights();
            this.cleanupSwappingClickHandlers();
            this.clearSwappingInstructions();
        }
        
        // Reset state
        this.abilityState = {
            active: false,
            type: null,
            player: null,
            startCard: null,
            availableTargets: [],
            selectedCard: null,
            swapTargets: []
        };
    }

    // === HEART HEALING UI ===

    highlightHealingCards(cards) {
        cards.forEach(card => {
            card.element.style.border = '3px solid #ff9800';
            card.element.style.boxShadow = '0 0 15px #ff9800';
            card.element.style.cursor = 'pointer';
            card.element.classList.add('healing-available');
        });
    }

    clearHealingHighlights() {
        this.abilityState.availableTargets.forEach(card => {
            card.element.style.border = '';
            card.element.style.boxShadow = '';
            card.element.style.cursor = '';
            card.element.classList.remove('healing-available');
        });
    }

    setupHealingClickHandlers() {
        this.abilityState.availableTargets.forEach(card => {
            const handler = (event) => {
                event.stopPropagation();
                this.performHeartHealing(card);
            };
            card.element.addEventListener('click', handler, { once: true });
            // Store handler for cleanup
            card.element._healingHandler = handler;
        });
    }

    cleanupHealingClickHandlers() {
        this.abilityState.availableTargets.forEach(card => {
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
                    • Or start planning your route to skip healing
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

    // === CLUB SWAPPING UI ===

    highlightSwappableCards(cards) {
        cards.forEach(card => {
            card.element.style.border = '3px solid #9c21f3e6';
            card.element.style.boxShadow = '0 0 15px #9c21f3e6';
            card.element.style.cursor = 'pointer';
            card.element.classList.add('swapping-available');
        });
    }

    highlightSelectedCard(card) {
        card.element.style.border = '3px solid #4CAF50';
        card.element.style.boxShadow = '0 0 15px #4CAF50';
        card.element.style.cursor = 'pointer';
        card.element.classList.add('swapping-selected');
    }

    highlightSwapTargets(cards) {
        cards.forEach(card => {
            card.element.style.border = '3px solid #FF5722';
            card.element.style.boxShadow = '0 0 15px #FF5722';
            card.element.style.cursor = 'pointer';
            card.element.classList.add('swapping-target');
        });
    }

    clearSwappingHighlights() {
        // Clear all swapping-related highlights
        this.gridManager.cards.forEach(card => {
            card.element.style.border = '';
            card.element.style.boxShadow = '';
            card.element.style.cursor = '';
            card.element.classList.remove('swapping-available', 'swapping-selected', 'swapping-target');
        });
    }

    setupSwappingClickHandlers() {
        // Clear any existing handlers first
        this.cleanupSwappingClickHandlers();
        
        // Determine which cards should be clickable
        let clickableCards = [];
        
        if (!this.abilityState.selectedCard) {
            // No card selected yet - all available cards are clickable
            clickableCards = this.abilityState.availableTargets;
        } else {
            // Card selected - selected card and swap targets are clickable
            clickableCards = [this.abilityState.selectedCard, ...this.abilityState.swapTargets];
        }
        
        clickableCards.forEach(card => {
            const handler = (event) => {
                event.stopPropagation();
                this.selectCardForSwapping(card);
            };
            card.element.addEventListener('click', handler, { once: false });
            // Store handler for cleanup
            card.element._swappingHandler = handler;
        });
    }

    cleanupSwappingClickHandlers() {
        this.gridManager.cards.forEach(card => {
            if (card.element._swappingHandler) {
                card.element.removeEventListener('click', card.element._swappingHandler);
                delete card.element._swappingHandler;
            }
        });
    }

    showSwappingInstructions(playerName) {
        // Remove any existing instructions
        const existingInstructions = document.getElementById('swapping-instructions');
        if (existingInstructions) {
            existingInstructions.remove();
        }
        
        // Create instruction panel
        const instructions = document.createElement('div');
        instructions.id = 'swapping-instructions';
        instructions.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(156, 33, 243, 0.9);
                color: white;
                padding: 15px;
                border-radius: 8px;
                z-index: 1000;
                font-family: Arial, sans-serif;
                max-width: 250px;
            ">
                <h4 style="margin: 0 0 10px 0; color: white;">
                    ${playerName} - Card Swapping ♣
                </h4>
                <p style="margin: 5px 0;">Click any blue highlighted card to select it for swapping</p>
                <p style="margin: 5px 0; font-size: 12px;">
                    • Then click an adjacent card to swap<br>
                    • Click selected card again to deselect<br>
                    • Or start planning your route to skip swapping<br>
                    • Escape: Undo swap and return to start
                </p>
            </div>
        `;
        
        document.body.appendChild(instructions);
    }

    clearSwappingInstructions() {
        const instructions = document.getElementById('swapping-instructions');
        if (instructions) {
            instructions.remove();
        }
    }

    // === KEYBOARD HANDLING ===

    handleKeyboardInput(event) {
        if (!this.abilityState.active) {
            return false; // Not handled
        }
        
        if (this.abilityState.type === 'hearts') {
            const key = event.key.toLowerCase();
            if (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
                // Player wants to skip healing and start route planning
                this.skipHeartHealing();
                return true; // Handled
            } else if (key === 'escape') {
                // Cancel healing entirely
                this.cancelAbility();
                return true; // Handled
            }
        } else if (this.abilityState.type === 'clubs') {
            const key = event.key.toLowerCase();
            if (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
                // Player wants to skip swapping and start route planning
                this.skipClubSwapping();
                return true; // Handled
            } else if (key === 'escape') {
                // Undo swap (if any) and return to beginning of turn
                this.cancelAbility();
                return true; // Handled
            }
        }
        
        return false; // Not handled
    }
}
