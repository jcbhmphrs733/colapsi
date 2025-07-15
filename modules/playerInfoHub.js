export class PlayerInfoHub {
    constructor(gameManager, gridManager) {
        this.gameManager = gameManager;
        this.gridManager = gridManager;
        this.timerInterval = null;
        this.init();
    }

    init() {
        this.initializeHub();
        this.setupEventListeners();
    }

    // Initialize the game hub
    initializeHub() {
        const hubToggle = document.getElementById('hubToggle');
        const gameHub = document.getElementById('gameHub');
        
        if (!hubToggle || !gameHub) {
            console.error('Hub elements not found');
            return;
        }
        
        // Set initial state (expanded)
        gameHub.classList.remove('collapsed');
        
        // Toggle hub on click
        hubToggle.addEventListener('click', () => {
            gameHub.classList.toggle('collapsed');
        });
        
        // Initialize hub sections
        this.updatePlayersDisplay();
        this.updateGameStats();
        this.updateAbilityInfo();
    }

    // Setup event listeners
    setupEventListeners() {
        // Setup give up button in hub
        const giveUpButton = document.getElementById('giveUpButton');
        if (giveUpButton) {
            giveUpButton.addEventListener('click', () => {
                this.handleGiveUpClick();
            });
        }

        // Setup card back selector
        const cardBackSelector = document.getElementById('cardBackStyle');
        if (cardBackSelector) {
            cardBackSelector.addEventListener('change', (event) => {
                this.changeCardBackStyle(event.target.value);
            });
        }
    }

    // Start timer update interval
    startTimerUpdateInterval() {
        // Start timer updates every second
        this.timerInterval = setInterval(() => {
            this.updateTurnDisplay();
        }, 1000);
    }

    // Stop timer updates
    stopTimerUpdates() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    // Update players display in the hub
    updatePlayersDisplay() {
        const playersList = document.getElementById('playersList');
        if (!playersList || !this.gameManager) return;
        
        const players = this.gameManager.getPlayers();
        const currentPlayer = this.gameManager.getCurrentPlayer();
        
        playersList.innerHTML = '';
        
        players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            
            if (currentPlayer && player.id === currentPlayer.id) {
                playerItem.classList.add('active');
            }
            
            if (player.isEliminated) {
                playerItem.classList.add('eliminated');
            }
            
            playerItem.style.borderLeftColor = player.color;
            
            playerItem.innerHTML = `
                <div class="player-info">
                    <div class="player-token-mini" style="background-color: ${player.color};">
                        ${player.tokenSymbol}
                    </div>
                    <div>
                        <div style="font-weight: bold; font-size: 13px;">${player.name}</div>
                        <div class="player-status">
                            ${player.isEliminated ? 'Eliminated' : 
                              player.currentCard ? `On ${player.currentCard.value}` : 'Not placed'}
                        </div>
                    </div>
                </div>
                <div style="text-align: right; font-size: 11px; color: #a0a0a0;">
                    ${player.moves.length} moves
                </div>
            `;
            
            playersList.appendChild(playerItem);
        });
    }

    // Update game statistics in the hub
    updateGameStats() {
        const gameStats = document.getElementById('gameStats');
        if (!gameStats || !this.gameManager) return;
        
        const stats = this.gameManager.getGameStats();
        const activePlayers = this.gameManager.getPlayers().filter(p => !p.isEliminated);
        
        gameStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Turn:</span>
                <span class="stat-value">${stats.turnNumber}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Active Players:</span>
                <span class="stat-value">${activePlayers.length}/4</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Game State:</span>
                <span class="stat-value">${this.gameManager.gameState}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Moves:</span>
                <span class="stat-value">${this.gameManager.getPlayers().reduce((sum, p) => sum + p.moves.length, 0)}</span>
            </div>
        `;
    }

    // Update ability information in the hub
    updateAbilityInfo(abilityType, playerName, instructionData) {
        const abilityInfo = document.getElementById('abilityInfo');
        if (!abilityInfo) return;
        
        if (abilityType && playerName) {
            // Show active ability instructions in the hub
            let abilityContent = '';
            
            switch (abilityType) {
                case 'hearts':
                    abilityContent = `
                        <div style="background: rgba(244, 67, 54, 0.1); padding: 12px; border-radius: 8px; border-left: 3px solid #f44336;">
                            <div style="font-weight: bold; margin-bottom: 8px; color: #f44336;">
                                ♥ ${playerName} - Heart Healing
                            </div>
                            <div style="font-size: 12px; margin: 6px 0;">
                                ${instructionData?.phase === 'healing' ? 
                                    'Click a face-down card to heal it (flip face-up)' :
                                    instructionData?.phase === 'route' ?
                                    'Plan your route normally after healing' :
                                    'Use your healing ability'}
                            </div>
                            <div style="font-size: 11px; opacity: 0.8; margin-top: 8px;">
                                ESC: Skip ability • Movement keys: Skip to route planning
                            </div>
                        </div>
                    `;
                    break;
                    
                case 'clubs':
                    abilityContent = `
                        <div style="background: rgba(0, 0, 0, 0.1); padding: 12px; border-radius: 8px; border-left: 3px solid #000;">
                            <div style="font-weight: bold; margin-bottom: 8px; color: #000;">
                                ♣ ${playerName} - Club Swapping
                            </div>
                            <div style="font-size: 12px; margin: 6px 0;">
                                ${instructionData?.phase === 'selecting' ?
                                    'Click two face-up cards to swap their positions' :
                                    instructionData?.phase === 'route' ?
                                    'Plan your route normally after swapping' :
                                    'Use your swapping ability'}
                            </div>
                            <div style="font-size: 11px; opacity: 0.8; margin-top: 8px;">
                                ESC: Skip ability • Movement keys: Skip to route planning
                            </div>
                        </div>
                    `;
                    break;
                    
                case 'spades':
                    abilityContent = `
                        <div style="background: rgba(0, 0, 0, 0.1); padding: 12px; border-radius: 8px; border-left: 3px solid #000;">
                            <div style="font-weight: bold; margin-bottom: 8px; color: #000;">
                                ♠ ${playerName} - Phantom Step (Passive)
                            </div>
                            <div style="font-size: 12px; margin: 6px 0;">
                                You can include one face-down card in your route (but cannot end on it)
                            </div>
                        </div>
                    `;
                    break;
                    
                case 'diamonds':
                    abilityContent = `
                        <div style="background: rgba(183, 28, 28, 0.1); padding: 12px; border-radius: 8px; border-left: 3px solid #b71c1c;">
                            <div style="font-weight: bold; margin-bottom: 8px; color: #b71c1c;">
                                ♦ ${playerName} - Diagonal Movement (Passive)
                            </div>
                            <div style="font-size: 12px; margin: 6px 0;">
                                You can move diagonally during route planning (Q/E, Z/C keys)
                            </div>
                        </div>
                    `;
                    break;
            }
            
            abilityInfo.innerHTML = abilityContent;
        } else {
            // Get card counts by suit
            const suitCounts = this.gridManager.getCardCountsBySuit();
            
            // Show default ability legend with face-up card counts only
            abilityInfo.innerHTML = `
                <div class="ability-legend">
                    <div class="ability-item">
                        <span>♥ Hearts: Healing</span>
                        <span style="font-size: 11px; opacity: 0.8; margin-left: auto; font-weight: bold;">
                            ${suitCounts.hearts.faceUp} visible
                        </span>
                    </div>
                    <div class="ability-item">
                        <span>♣ Clubs: Swapping</span>
                        <span style="font-size: 11px; opacity: 0.8; margin-left: auto; font-weight: bold;">
                            ${suitCounts.clubs.faceUp} visible
                        </span>
                    </div>
                    <div class="ability-item">
                        <span>♠ Spades: Phantom Step</span>
                        <span style="font-size: 11px; opacity: 0.8; margin-left: auto; font-weight: bold;">
                            ${suitCounts.spades.faceUp} visible
                        </span>
                    </div>
                    <div class="ability-item">
                        <span>♦ Diamonds: Diagonal Movement</span>
                        <span style="font-size: 11px; opacity: 0.8; margin-left: auto; font-weight: bold;">
                            ${suitCounts.diamonds.faceUp} visible
                        </span>
                    </div>
                </div>
            `;
        }
    }

    // Update turn display
    updateTurnDisplay() {
        const turnDisplay = document.getElementById('turnDisplay');
        if (!turnDisplay) return;
        
        const currentPlayer = this.gameManager.getCurrentPlayer();
        const gameStats = this.gameManager.getGameStats();
        
        if (!currentPlayer) {
            // Game has ended
            turnDisplay.innerHTML = `
                <div style="text-align: center; color: #8B4513; background: rgba(248, 247, 244, 0.9); padding: 15px; border-radius: 8px; border: 2px solid #ddd;">
                    <strong>Game Over!</strong>
                </div>
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
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <div class="player-token-mini" style="background-color: ${currentPlayer.color};">
                    ${currentPlayer.tokenSymbol}
                </div>
                <div>
                    <div style="font-weight: bold; font-size: 14px;">${currentPlayer.name}</div>
                    <div style="font-size: 11px; opacity: 0.8;">Turn ${gameStats.turnNumber}</div>
                </div>
            </div>
            <div style="font-size: 11px; margin: 4px 0;">
                Position: ${currentPlayer.currentCard ? currentPlayer.currentCard.value : 'None'}
            </div>
            <div style="font-size: 12px; color: ${timeColor}; font-weight: bold; text-align: center;">
                ⏱️ ${remainingTime}s remaining
            </div>
        `;
        
        // Update other hub sections
        this.updatePlayersDisplay();
        this.updateGameStats();
        this.updateAbilityInfo(); // Update ability info to refresh card counts
    }

    // Handle give up button click
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

    // Show give up confirmation dialog
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

    // Confirm give up action
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

    // Change card back style
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

    // Reset hub displays
    resetHub() {
        const turnDisplay = document.getElementById('turnDisplay');
        if (turnDisplay) {
            turnDisplay.innerHTML = '';
        }
        
        const playersList = document.getElementById('playersList');
        if (playersList) {
            playersList.innerHTML = '';
        }
        
        const gameStats = document.getElementById('gameStats');
        if (gameStats) {
            gameStats.innerHTML = '';
        }
        
        const routeInfo = document.getElementById('routeInfo');
        if (routeInfo) {
            routeInfo.innerHTML = '<p>No active route planning</p>';
        }

        // Stop timer updates
        this.stopTimerUpdates();
    }

    // Handle game end
    handleGameEnd() {
        // Stop timer updates
        this.stopTimerUpdates();
        
        // Hide Give Up button
        const giveUpButton = document.getElementById('giveUpButton');
        if (giveUpButton) {
            giveUpButton.style.display = 'none';
        }
    }
}
