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
        if (availableAbility && availableAbility !== 'spades' && availableAbility !== 'diamonds') {
            // Start ability for non-passive abilities (hearts, clubs)
            const abilityStarted = this.gameManager.startAbility(player, availableAbility);
            if (abilityStarted) {
                return; // Ability phase started, route planning will begin after ability completion/skip
            }
        }
        
        // For spades, diamonds, or normal players, start route planning directly
        // Spades and diamonds abilities are passive and handled automatically in beginRoutePlanning
        const options = {};
        if (availableAbility === 'spades') {
            options.allowPhantomStep = true;
        } else if (availableAbility === 'diamonds') {
            options.allowDiagonalMovement = true;
        }
        this.beginRoutePlanning(player, options);
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
    beginRoutePlanning(player, options = {}) {
        const startCard = player.currentCard;
        const cardValue = parseInt(startCard.value.charAt(0)); // Extract number from card value
        
        this.routePlanningState = {
            active: true,
            player: player,
            startCard: startCard,
            currentCard: startCard,
            route: [startCard], // Route includes starting card
            maxSteps: cardValue,
            usedCards: new Set([startCard]),
            allowPhantomStep: options.allowPhantomStep || false,
            phantomStepUsed: false,
            allowDiagonalMovement: options.allowDiagonalMovement || false,
            immediatelyReady: options.immediatelyReady || false
        };
        
        // Immediately highlight starting card with index 0
        this.highlightCard(startCard, player.color, 'start', 0);
        
        // Add visual indicator that route planning is active
        document.body.style.cursor = 'crosshair';
        
        // Route instructions are now displayed in the game hub
        
        console.log(`Route planning active: Player must make ${cardValue} steps from ${startCard.value}`);
        console.log('Use WASD keys to navigate, Enter to confirm, Escape to cancel');
        
        // Update hub route information
        this.updateHubRouteInfo();
        
        // If immediatelyReady with firstMovement, process that movement now
        if (options.immediatelyReady && options.firstMovement) {
            console.log(`Processing immediate first movement: ${options.firstMovement}`);
            // Convert movement key to direction and process immediately
            const directions = {
                'w': [-1, 0], 'arrowup': [-1, 0],
                's': [1, 0], 'arrowdown': [1, 0], 
                'a': [0, -1], 'arrowleft': [0, -1],
                'd': [0, 1], 'arrowright': [0, 1]
            };
            const direction = directions[options.firstMovement];
            if (direction) {
                this.moveRouteSelection(direction[0], direction[1]);
            }
        }
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
                // Diagonal movement (only available with diamond ability)
                case 'q':
                    if (this.routePlanningState.allowDiagonalMovement) {
                        this.moveRouteSelection(-1, -1); // Up-Left
                    }
                    break;
                case 'e':
                    if (this.routePlanningState.allowDiagonalMovement) {
                        this.moveRouteSelection(-1, 1); // Up-Right
                    }
                    break;
                case 'z':
                    if (this.routePlanningState.allowDiagonalMovement) {
                        this.moveRouteSelection(1, -1); // Down-Left
                    }
                    break;
                case 'c':
                    if (this.routePlanningState.allowDiagonalMovement) {
                        this.moveRouteSelection(1, 1); // Down-Right
                    }
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
                    if (this.routePlanningState.allowPhantomStep) {
                        if (this.routePlanningState.phantomStepUsed) {
                            console.log('Invalid move: phantom step already used in this route');
                        } else if (targetCard.players.length > 0) {
                            console.log('Invalid move: cannot step on face-down cards with other players');
                        } else {
                            console.log('Invalid move: cannot end route on face-down card');
                        }
                    } else {
                        console.log('Invalid move: cannot use face-down cards in route');
                    }
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
        
        // Check if we're removing a phantom step
        if (!removedCard.isFaceUpCard() && this.routePlanningState.allowPhantomStep) {
            // Reset phantom step usage since we're abandoning it
            this.routePlanningState.phantomStepUsed = false;
            console.log('Phantom step abandoned - can use another face-down card');
        }
        
        // Update current card to the new last card in route
        this.routePlanningState.currentCard = this.routePlanningState.route[this.routePlanningState.route.length - 1];
        
        // Clear the highlight from the removed card
        this.clearCardHighlight(removedCard);
        
        // Update instructions
        this.updateHubRouteInfo();
        
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
        
        // Handle face-down cards
        if (!card.isFaceUpCard()) {
            // Check if phantom step is allowed
            if (this.routePlanningState.allowPhantomStep) {
                // Check if phantom step already used
                if (this.routePlanningState.phantomStepUsed) {
                    console.log('Cannot use face-down card: phantom step already used in this route');
                    return false;
                }
                
                // Check if this would be the final step
                const wouldBeFinalStep = (this.routePlanningState.route.length === this.routePlanningState.maxSteps);
                if (wouldBeFinalStep) {
                    console.log('Cannot end route on face-down card');
                    return false;
                }
                
                // Check if card has players on it
                if (card.players.length > 0) {
                    console.log('Cannot use face-down card with other players on it');
                    return false;
                }
                
                // Phantom step is valid
                return true;
            } else {
                console.log(`Cannot use face-down card: ${card.value}`);
                return false;
            }
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
        
        // Track phantom step usage
        if (!card.isFaceUpCard() && this.routePlanningState.allowPhantomStep) {
            this.routePlanningState.phantomStepUsed = true;
            console.log('Phantom step used on face-down card');
        }
        
        // Highlight the card with route index
        const routeIndex = this.routePlanningState.route.length - 1;
        this.highlightCard(card, this.routePlanningState.player.color, 'route', routeIndex);
        
        // Update hub route information
        this.updateHubRouteInfo();
        
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
        this.updateHubRouteInfo();
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
        this.updateHubRouteInfo();
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

    // Getter for external access to route planning state
    isRoutePlanningActive() {
        return this.routePlanningState.active || this.gameManager.abilityManager.isAbilityActive();
    }

    // Update the route information in the game hub
    updateHubRouteInfo() {
        const routeInfo = document.getElementById('routeInfo');
        if (!routeInfo) return;
        
        if (this.routePlanningState.active) {
            const currentSteps = this.routePlanningState.route.length - 1;
            const maxSteps = this.routePlanningState.maxSteps;
            const player = this.routePlanningState.player;
            
            routeInfo.className = 'active';
            routeInfo.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 6px;">
                    ${player.name} - Planning Route
                </div>
                <div style="margin: 4px 0;">
                    Steps: ${currentSteps}/${maxSteps}
                </div>
                <div style="margin: 4px 0;">
                    ${this.routePlanningState.allowPhantomStep ? '♠ Phantom Step' : 
                      this.routePlanningState.allowDiagonalMovement ? '♦ Diagonal Movement' : 
                      'Standard Movement'}
                </div>
                ${currentSteps === maxSteps ? 
                  '<div style="color: #4CAF50; font-weight: bold;">Ready to confirm!</div>' : 
                  '<div style="opacity: 0.7;">Use WASD/Arrows to navigate</div>'}
            `;
        } else if (this.gameManager.abilityManager.isAbilityActive()) {
            const abilityState = this.gameManager.abilityManager.abilityState;
            routeInfo.className = 'active';
            routeInfo.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 6px;">
                    ${abilityState.player.name} - Using Ability
                </div>
                <div style="margin: 4px 0;">
                    ${abilityState.type === 'hearts' ? '♥ Healing' :
                      abilityState.type === 'clubs' ? '♣ Swapping' :
                      abilityState.type === 'spades' ? '♠ Phantom Step' :
                      abilityState.type === 'diamonds' ? '♦ Diagonal Movement' : 
                      'Active Ability'}
                </div>
            `;
        } else {
            routeInfo.className = '';
            routeInfo.innerHTML = '<p>No active route planning</p>';
        }
    }
}
