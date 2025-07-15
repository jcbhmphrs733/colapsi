export class ClubSwappingAbility {
    constructor(gameManager, gridManager) {
        this.gameManager = gameManager;
        this.gridManager = gridManager;
        this.swappedCards = null; // Track swapped cards for undo functionality
    }

    // Set route manager reference
    setRouteManager(routeManager) {
        this.routeManager = routeManager;
    }

    // Check if player can use club swapping
    canUse(player) {
        const hasCurrentCard = !!player.currentCard;
        const cardSuit = hasCurrentCard ? this.gameManager.getCardSuit(player.currentCard) : null;
        
        if (!hasCurrentCard) return false;
        return cardSuit === 'clubs';
    }

    // Start club swapping ability
    start(player, abilityState) {
        const startCard = player.currentCard;
        const availableCards = this.getAllSwappableCards(startCard);
        
        // Update ability state
        abilityState.active = true;
        abilityState.type = 'clubs';
        abilityState.player = player;
        abilityState.startCard = startCard;
        abilityState.availableTargets = availableCards;
        abilityState.selectedCard = null;
        abilityState.swapTargets = [];
        
        // Setup UI - highlight all available cards
        this.highlightSwappableCards(availableCards);
        this.showSwappingInstructions(player.name);
        this.setupSwappingClickHandlers(abilityState);
        
        return true;
    }

    // Get all cards that can be swapped (all except starting card)
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

    // Get adjacent cards for swapping (4-directional)
    getAdjacentCardsForSwapping(card, abilityState) {
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
            if (adjacentCard && adjacentCard !== abilityState.startCard) {
                adjacent.push(adjacentCard);
            }
        });

        return adjacent;
    }

    // Select card for swapping
    selectCardForSwapping(card, abilityState) {
        if (abilityState.selectedCard === card) {
            // Clicking the same card again - deselect and return to "select any card" mode
            this.deselectCardForSwapping(abilityState);
            return;
        }

        if (!abilityState.selectedCard) {
            // First card selection - show swap targets
            abilityState.selectedCard = card;
            abilityState.swapTargets = this.getAdjacentCardsForSwapping(card, abilityState);
            
            // Update UI to show only the selected card and its swap targets
            this.clearSwappingHighlights();
            this.highlightSelectedCard(card);
            this.highlightSwapTargets(abilityState.swapTargets);
            this.setupSwappingClickHandlers(abilityState); // Reset click handlers for new targets
            
            console.log(`Selected card ${card.value} for swapping. Available swap targets: ${abilityState.swapTargets.length}`);
        } else {
            // Second card selection - perform the swap
            if (abilityState.swapTargets.includes(card)) {
                this.performCardSwap(abilityState.selectedCard, card, abilityState);
            } else {
                console.log('Invalid swap target. Card must be adjacent to selected card.');
            }
        }
    }

    // Deselect card for swapping
    deselectCardForSwapping(abilityState) {
        console.log('Deselecting card, returning to "select any card" mode');
        
        // Reset selection state
        abilityState.selectedCard = null;
        abilityState.swapTargets = [];
        
        // Return to highlighting all available cards
        this.clearSwappingHighlights();
        this.highlightSwappableCards(abilityState.availableTargets);
        this.setupSwappingClickHandlers(abilityState); // Reset click handlers for all cards
    }

    // Perform card swap
    performCardSwap(card1, card2, abilityState) {
        console.log(`Swapping ${card1.value} at [${card1.row}, ${card1.col}] with ${card2.value} at [${card2.row}, ${card2.col}]`);
        
        // Store original state for potential undo (including players)
        this.swappedCards = {
            card1: { 
                card: card1, 
                originalValue: card1.value, 
                originalFaceUp: card1.isFaceUpCard(),
                originalPlayers: [...card1.players] // Store copy of players array
            },
            card2: { 
                card: card2, 
                originalValue: card2.value, 
                originalFaceUp: card2.isFaceUpCard(),
                originalPlayers: [...card2.players] // Store copy of players array
            }
        };
        
        // Store current players before swapping
        const card1Players = [...card1.players];
        const card2Players = [...card2.players];
        
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
        
        // Swap the players between cards
        // Clear current players from both cards (this removes tokens)
        [...card1.players].forEach(player => card1.removePlayer(player));
        [...card2.players].forEach(player => card2.removePlayer(player));
        
        // Move card2's original players to card1
        card2Players.forEach(player => {
            player.currentCard = card1; // Update player's card reference
            card1.addPlayer(player); // This will re-render player tokens
        });
        
        // Move card1's original players to card2
        card1Players.forEach(player => {
            player.currentCard = card2; // Update player's card reference
            card2.addPlayer(player); // This will re-render player tokens
        });
        
        console.log(`Swap completed: ${card1.value} <-> ${card2.value}`);
        
        // Store the player reference before cleanup
        const player = abilityState.player;
        
        // Clean up UI and proceed to route planning
        this.cleanup();
        
        // Start route planning for this player with immediate readiness
        if (this.routeManager) {
            console.log(`Starting route planning for ${player.name} after club swap`);
            this.routeManager.beginRoutePlanning(player, { immediatelyReady: true });
        } else {
            console.error('RouteManager not available!');
        }
    }

    // Skip club swapping
    skip(abilityState, cleanupCallback) {
        console.log('Skipping club swapping');
        const player = abilityState.player;
        cleanupCallback();
        
        // Start route planning for this player with immediate readiness
        if (this.routeManager) {
            this.routeManager.beginRoutePlanning(player, { immediatelyReady: true });
        }
        
        return true;
    }

    // Skip club swapping and immediately make a move
    skipWithMovement(abilityState, cleanupCallback, movementKey) {
        console.log(`Skipping club swapping and moving ${movementKey}`);
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

    // Undo card swap
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
        
        // Restore original player positions
        // Clear current players from both cards
        [...card1.card.players].forEach(player => card1.card.removePlayer(player));
        [...card2.card.players].forEach(player => card2.card.removePlayer(player));
        
        // Restore card1's original players
        card1.originalPlayers.forEach(player => {
            player.currentCard = card1.card; // Update player's card reference
            card1.card.addPlayer(player); // This will re-render player tokens
        });
        
        // Restore card2's original players
        card2.originalPlayers.forEach(player => {
            player.currentCard = card2.card; // Update player's card reference
            card2.card.addPlayer(player); // This will re-render player tokens
        });
        
        // Clear swap tracking
        this.swappedCards = null;
        
        console.log('Card swap undone');
        return true;
    }

    // Handle keyboard input
    handleKeyboardInput(event, abilityState, cleanupCallback) {
        const key = event.key.toLowerCase();
        if (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
            // Player wants to skip swapping and start route planning with this direction as first move
            this.skipWithMovement(abilityState, cleanupCallback, key);
            return true; // Handled
        } else if (key === 'escape') {
            // Undo swap (if any) and return to beginning of turn
            if (this.swappedCards) {
                this.undoCardSwap();
            }
            cleanupCallback();
            return true; // Handled
        }
        return false; // Not handled
    }

    // Clear swap tracking
    clearSwappedCards() {
        this.swappedCards = null;
    }

    // === UI METHODS ===

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

    setupSwappingClickHandlers(abilityState) {
        // Clear any existing handlers first
        this.cleanupSwappingClickHandlers();
        
        // Determine which cards should be clickable
        let clickableCards = [];
        
        if (!abilityState.selectedCard) {
            // No card selected yet - all available cards are clickable
            clickableCards = abilityState.availableTargets;
        } else {
            // Card selected - selected card and swap targets are clickable
            clickableCards = [abilityState.selectedCard, ...abilityState.swapTargets];
        }
        
        clickableCards.forEach(card => {
            const handler = (event) => {
                event.stopPropagation();
                this.selectCardForSwapping(card, abilityState);
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
                <p style="margin: 5px 0;">Click any purple highlighted card to select it for swapping</p>
                <p style="margin: 5px 0; font-size: 12px;">
                    • Then click an adjacent card to swap<br>
                    • Click selected card again to deselect<br>
                    • Or start planning your route to skip swapping<br>
                    • Escape: Cancel ability and return to start<br>
                    • During route: Escape restarts this ability
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

    // Cleanup UI
    cleanup() {
        this.clearSwappingHighlights();
        this.cleanupSwappingClickHandlers();
        this.clearSwappingInstructions();
    }
}
