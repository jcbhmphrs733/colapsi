export class RouteManager {
    constructor(gridManager, gameManager) {
        this.gridManager = gridManager;
        this.gameManager = gameManager;
        
        // Route planning state
        this.routePlanningState = {
            active: false,
            player: null,
            startCard: null,
            currentCard: null,
            route: [],
            maxSteps: 0,
            usedCards: new Set()
        };
        
        this.setupKeyboardHandlers();
    }

    // Start the current player's turn automatically
    startCurrentPlayerTurn() {
        const currentPlayer = this.gameManager.getCurrentPlayer();
        if (currentPlayer && !this.isRoutePlanningActive()) {
            // Start the turn timer ONLY if it hasn't been started yet this turn
            if (!this.gameManager.turnTimer) {
                this.gameManager.startTurnTimer();
            }
            this.startRoutePlanning(currentPlayer);
        }
    }

    // Start route planning for a player
    startRoutePlanning(player) {
        // Check if it's actually this player's turn
        if (!this.gameManager.isPlayerTurn(player)) {
            console.log(`Not ${player.name}'s turn! Current turn: ${this.gameManager.getCurrentPlayer().name}`);
            return;
        }
        
        const startCard = player.currentCard;
        
        // Check if player can use any special ability
        const availableAbility = this.gameManager.canUseAbility(player);
        if (availableAbility) {
            const abilityStarted = this.gameManager.startAbility(player, availableAbility);
            if (abilityStarted) {
                return; // Ability phase started, route planning will begin after ability completion/skip
            }
        }
        
        // Otherwise start normal route planning
        this.beginRoutePlanning(player);
    }

    // Start heart healing phase
    startHeartHealing(player) {
        const startCard = player.currentCard;
        const availableCards = this.gameManager.getAdjacentCardsForHealing(startCard);
        
        if (availableCards.length === 0) {
            // No face-down cards available for healing, proceed with normal route
            this.beginRoutePlanning(player);
            return;
        }
        
        this.healingState = {
            active: true,
            player: player,
            startCard: startCard,
            availableCards: availableCards
        };
        
        // Highlight available cards for healing
        this.highlightHealingCards(availableCards);
        this.showHealingInstructions(player.name);
        
        // Add click handlers for healing
        this.setupHealingClickHandlers();
    }

    // Begin normal route planning
    beginRoutePlanning(player) {
        const startCard = player.currentCard;
        const cardValue = parseInt(startCard.value.charAt(0)); // Extract number from card value
        
        this.routePlanningState = {
            active: true,
            player: player,
            startCard: startCard,
            currentCard: startCard,
            route: [startCard], // Route includes starting card
            maxSteps: cardValue,
            usedCards: new Set([startCard])
        };
        
        // Immediately highlight starting card with index 0
        this.highlightCard(startCard, player.color, 'start', 0);
        
        // Add visual indicator that route planning is active
        document.body.style.cursor = 'crosshair';
        
        // Show instructions
        this.showRouteInstructions(player.name, cardValue);
        
        console.log(`Route planning active: Player must make ${cardValue} steps from ${startCard.value}`);
        console.log('Use WASD keys to navigate, Enter to confirm, Escape to cancel');
    }

    // Setup keyboard handlers for WASD and arrow key navigation
    setupKeyboardHandlers() {
        // Prevent WASD and arrow key defaults when route planning is active
        document.addEventListener('keydown', (event) => {
            if (this.routePlanningState.active && 
                (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'w', 'a', 's', 'd'].includes(event.code || event.key.toLowerCase()) ||
                 ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key))) {
                event.preventDefault();
                event.stopPropagation();
            }
        }, true);

        document.addEventListener('keyup', (event) => {
            // First check if ability manager wants to handle this
            if (this.gameManager.abilityManager.handleKeyboardInput(event)) {
                return; // Ability manager handled it
            }
            
            if (!this.routePlanningState.active) return;
            
            event.preventDefault();
            event.stopPropagation();
            
            const key = event.key.toLowerCase();
            
            switch(key) {
                case 'w':
                case 'arrowup':
                    this.moveRouteSelection(-1, 0); // Up
                    break;
                case 's':
                case 'arrowdown':
                    this.moveRouteSelection(1, 0);  // Down
                    break;
                case 'a':
                case 'arrowleft':
                    this.moveRouteSelection(0, -1); // Left
                    break;
                case 'd':
                case 'arrowright':
                    this.moveRouteSelection(0, 1);  // Right
                    break;
                case 'enter':
                    this.finishRoute();
                    break;
                case 'escape':
                    this.cancelRoute();
                    break;
            }
        });
    }

    // Move selection with grid wrapping
    moveRouteSelection(rowDelta, colDelta) {
        const currentRow = this.routePlanningState.currentCard.row;
        const currentCol = this.routePlanningState.currentCard.col;
        
        // Calculate new position with wrapping
        const gridRows = this.gridManager.rows;
        const gridCols = this.gridManager.columns;
        
        // Wrap around the edges using modulo arithmetic
        let newRow = (currentRow + rowDelta + gridRows) % gridRows;
        let newCol = (currentCol + colDelta + gridCols) % gridCols;
        
        // Find the target card
        const targetCard = this.gridManager.getCardAt(newRow, newCol);
        
        if (!targetCard) {
            console.log('Invalid move: card not found (this should not happen with wrapping)');
            return;
        }
        
        console.log(`Moving from [${currentRow}, ${currentCol}] to [${newRow}, ${newCol}] ${targetCard.value}`);
        
        // Check if this move would backtrack (undo the last step)
        if (this.isBacktrackMove(targetCard)) {
            this.removeLastRouteStep();
        } else {
            // Check if we can add this card to the route
            if (this.canAddToRoute(targetCard)) {
                this.addCardToRoute(targetCard);
            } else {
                // Provide more specific feedback
                if (!targetCard.isFaceUpCard()) {
                    console.log('Invalid move: cannot use face-down cards in route');
                } else if (this.routePlanningState.usedCards.has(targetCard)) {
                    console.log('Invalid move: card already used in this route');
                } else if (this.routePlanningState.route.length >= this.routePlanningState.maxSteps + 1) {
                    console.log('Invalid move: route already complete');
                } else {
                    // Check if it's a final step issue
                    const wouldBeFinalStep = (this.routePlanningState.route.length === this.routePlanningState.maxSteps);
                    if (wouldBeFinalStep && this.isCardOccupiedByOtherPlayer(targetCard, this.routePlanningState.player)) {
                        console.log('Invalid move: cannot end route on card occupied by another player');
                    } else {
                        console.log('Invalid move: unknown reason');
                    }
                }
            }
        }
    }

    // Check if move is a backtrack
    isBacktrackMove(targetCard) {
        // Can only backtrack if we have at least 2 cards in route (start + at least one step)
        if (this.routePlanningState.route.length < 2) {
            return false;
        }
        
        // Check if target card is the second-to-last card in the route
        const secondToLastCard = this.routePlanningState.route[this.routePlanningState.route.length - 2];
        return targetCard === secondToLastCard;
    }

    // Remove last step from route (backtrack)
    removeLastRouteStep() {
        if (this.routePlanningState.route.length <= 1) {
            console.log('Cannot backtrack: already at starting position');
            return;
        }
        
        // Remove the last card from route
        const removedCard = this.routePlanningState.route.pop();
        this.routePlanningState.usedCards.delete(removedCard);
        
        // Update current card to the new last card in route
        this.routePlanningState.currentCard = this.routePlanningState.route[this.routePlanningState.route.length - 1];
        
        // Clear the highlight from the removed card
        this.clearCardHighlight(removedCard);
        
        // Update instructions
        this.updateRouteInstructions();
        
        console.log(`Backtracked: removed ${removedCard.value} from route`);
        console.log(`Current position: ${this.routePlanningState.currentCard.value}`);
    }

    // Check if card can be added to route
    canAddToRoute(card) {
        // Can't use a card that's already in the route
        if (this.routePlanningState.usedCards.has(card)) {
            return false;
        }
        
        // Can't exceed max steps
        if (this.routePlanningState.route.length >= this.routePlanningState.maxSteps + 1) {
            return false;
        }
        
        // Can't use face-down cards
        if (!card.isFaceUpCard()) {
            console.log(`Cannot use face-down card: ${card.value}`);
            return false;
        }
        
        // Check if this would be the final step in the route
        const wouldBeFinalStep = (this.routePlanningState.route.length === this.routePlanningState.maxSteps);
        
        // If this is the final step, check if the card is occupied by another player
        if (wouldBeFinalStep && this.isCardOccupiedByOtherPlayer(card, this.routePlanningState.player)) {
            console.log(`Cannot end route on card occupied by another player: ${card.value}`);
            return false;
        }
        
        return true;
    }

    // Add card to route
    addCardToRoute(card) {
        this.routePlanningState.route.push(card);
        this.routePlanningState.usedCards.add(card);
        this.routePlanningState.currentCard = card;
        
        // Highlight the card with route index
        const routeIndex = this.routePlanningState.route.length - 1;
        this.highlightCard(card, this.routePlanningState.player.color, 'route', routeIndex);
        
        // Update instructions
        this.updateRouteInstructions();
        
        console.log(`Added card ${card.value} to route (step ${routeIndex}/${this.routePlanningState.maxSteps})`);
        
        // Check if route is complete
        if (this.routePlanningState.route.length === this.routePlanningState.maxSteps + 1) {
            console.log('Route complete! Press Enter to confirm or Escape to cancel');
        }
    }

    // Check if card is occupied by another player
    isCardOccupiedByOtherPlayer(card, currentPlayer) {
        return this.gameManager.players.some(player => 
            player !== currentPlayer && player.currentCard === card
        );
    }

    // Finish route and move player
    finishRoute() {
        if (this.routePlanningState.route.length !== this.routePlanningState.maxSteps + 1) {
            console.log(`Route incomplete: ${this.routePlanningState.route.length - 1}/${this.routePlanningState.maxSteps} steps`);
            return;
        }
        
        const finalCard = this.routePlanningState.route[this.routePlanningState.route.length - 1];
        
        // Get the starting card before moving the player
        const startingCard = this.routePlanningState.startCard;
        
        // Move player to final position
        this.gameManager.movePlayer(this.routePlanningState.player, finalCard);
        
        // Flip the starting card face down
        startingCard.setFaceDown();
        
        console.log(`${this.routePlanningState.player.name} completed route to ${finalCard.value}`);
        console.log(`Starting card ${startingCard.value} flipped face down`);
        
        // Clear healed card tracking (route was completed successfully)
        this.gameManager.abilityManager.clearAbilityChanges();
        
        this.clearRouteHighlights();
        this.clearRouteInstructions();
        document.body.style.cursor = '';
        this.routePlanningState.active = false;
        
        // Clear the turn timer since turn is complete
        this.gameManager.clearTurnTimer();
        
        // Advance to next player's turn
        this.gameManager.nextTurn();
    }

    // Cancel route planning
    cancelRoute() {
        console.log('Route planning cancelled');
        
        // Restore healed card to face down state
        this.gameManager.abilityManager.restoreAbilityChanges();
        
        this.clearRouteHighlights();
        this.clearRouteInstructions();
        document.body.style.cursor = '';
        this.routePlanningState.active = false;
        
        // IMPORTANT: Don't advance turn on cancel - timer continues running
        // This prevents players from exploiting cancellation to reset the timer
    }

    // Cancel healing phase
    cancelHealing() {
        console.log('Heart healing cancelled');
        
        // Clean up healing UI
        this.clearHealingHighlights();
        this.cleanupHealingClickHandlers();
        this.clearHealingInstructions();
        
        // Reset healing state
        this.healingState.active = false;
        
        // IMPORTANT: Don't advance turn on cancel - timer continues running
        // This prevents players from exploiting cancellation to reset the timer
    }

    // Force cleanup when player times out (called by GameManager)
    forceCleanupForTimeout(player) {
        console.log(`Force cleanup for ${player.name} due to timeout`);
        
        // Clean up route planning if active for this player
        if (this.routePlanningState.active && this.routePlanningState.player === player) {
            this.clearRouteHighlights();
            this.clearRouteInstructions();
            document.body.style.cursor = '';
            this.routePlanningState.active = false;
        }
    }

    // Visual highlighting methods
    highlightCard(card, color, type, index = null) {
        card.element.style.border = `3px solid ${color}`;
        card.element.style.boxShadow = `0 0 10px ${color}`;
        
        if (type === 'start') {
            card.element.style.backgroundColor = `${color}20`;
            
            // Add route index indicator for starting card (index 0)
            let routeIndicator = card.element.querySelector('.route-indicator');
            if (!routeIndicator) {
                routeIndicator = document.createElement('div');
                routeIndicator.classList.add('route-indicator');
                card.element.appendChild(routeIndicator);
            }
            routeIndicator.textContent = index !== null ? index : 0;
            routeIndicator.style.cssText = `
                position: absolute;
                top: 5px;
                left: 5px;
                background: ${color};
                color: white;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                z-index: 15;
            `;
        } else if (type === 'route' && index !== null) {
            // Add route index indicator for route cards
            let routeIndicator = card.element.querySelector('.route-indicator');
            if (!routeIndicator) {
                routeIndicator = document.createElement('div');
                routeIndicator.classList.add('route-indicator');
                card.element.appendChild(routeIndicator);
            }
            routeIndicator.textContent = index;
            routeIndicator.style.cssText = `
                position: absolute;
                top: 5px;
                left: 5px;
                background: ${color};
                color: white;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                z-index: 15;
            `;
        }
    }

    clearCardHighlight(card) {
        card.element.style.border = '';
        card.element.style.boxShadow = '';
        card.element.style.backgroundColor = '';
        
        const routeIndicator = card.element.querySelector('.route-indicator');
        if (routeIndicator) {
            routeIndicator.remove();
        }
    }

    clearRouteHighlights() {
        this.gridManager.cards.forEach(card => {
            this.clearCardHighlight(card);
        });
    }

    // UI instruction methods
    showRouteInstructions(playerName, steps) {
        // Remove any existing instructions
        const existingInstructions = document.getElementById('route-instructions');
        if (existingInstructions) {
            existingInstructions.remove();
        }
        
        // Create instruction panel
        const instructions = document.createElement('div');
        instructions.id = 'route-instructions';
        instructions.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px;
                border-radius: 8px;
                z-index: 1000;
                font-family: Arial, sans-serif;
                max-width: 250px;
            ">
                <h4 style="margin: 0 0 10px 0; color: ${this.routePlanningState.player.color};">
                    ${playerName} - Route Planning
                </h4>
                <p style="margin: 5px 0;">Must make exactly <strong>${steps}</strong> steps</p>
                <p style="margin: 5px 0; font-size: 12px;">
                    • WASD/Arrow Keys: Navigate/Backtrack<br>
                    • Grid edges wrap around<br>
                    • Enter: Confirm route<br>
                    • Escape: Cancel
                </p>
                <p style="margin: 5px 0; font-size: 11px; opacity: 0.8;">
                    Steps: 0/${steps} (Starting position)
                </p>
            </div>
        `;
        
        document.body.appendChild(instructions);
    }

    updateRouteInstructions() {
        const instructions = document.getElementById('route-instructions');
        if (instructions) {
            const stepsDisplay = instructions.querySelector('p:last-child');
            if (stepsDisplay) {
                const currentSteps = this.routePlanningState.route.length - 1;
                const maxSteps = this.routePlanningState.maxSteps;
                stepsDisplay.innerHTML = `Steps: ${currentSteps}/${maxSteps}`;
                
                if (currentSteps === maxSteps) {
                    stepsDisplay.style.color = '#4CAF50';
                    stepsDisplay.innerHTML += ' - Ready to confirm!';
                } else {
                    stepsDisplay.style.color = '';
                }
            }
        }
    }

    clearRouteInstructions() {
        const instructions = document.getElementById('route-instructions');
        if (instructions) {
            instructions.remove();
        }
    }

    // Getter for external access to route planning state
    isRoutePlanningActive() {
        return this.routePlanningState.active || this.gameManager.abilityManager.isAbilityActive();
    }
}
