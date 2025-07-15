import { Player } from './player.js';
import { AbilityManager } from './abilities.js';

export class GameManager {
    constructor(gridManager) {
        this.gridManager = gridManager;
        this.players = [];
        this.gameState = 'setup'; // setup, playing, paused, ended
        
        // Initialize ability manager
        this.abilityManager = new AbilityManager(this, gridManager);
        
        // Turn management
        this.currentPlayerIndex = 0;
        this.turnNumber = 1;
        
        // Timer management
        this.turnTimer = null;
        this.turnTimeLimit = 60; // 60 seconds per turn
        this.turnStartTime = null;
        
        // Route manager reference (set later)
        this.routeManager = null;
        
        // Initialize default players
        this.initializePlayers();
    }

    // Initialize four default players
    initializePlayers() {
        const player1 = new Player(1, 'Player 1', '#e53e3e', '1');
        const player2 = new Player(2, 'Player 2', '#3182ce', '2');
        const player3 = new Player(3, 'Player 3', '#38a169', '3');
        const player4 = new Player(4, 'Player 4', '#d69e2e', '4');
        
        this.players.push(player1, player2, player3, player4);
        
        console.log('Players initialized:', this.players.map(p => p.getInfo()));
    }

    // Set route manager reference
    setRouteManager(routeManager) {
        this.routeManager = routeManager;
    }

    // Add a new player
    addPlayer(name, color, tokenSymbol) {
        const id = this.players.length + 1;
        const player = new Player(id, name, color, tokenSymbol);
        this.players.push(player);
        return player;
    }

    // Move a player to a specific card
    movePlayer(player, card) {
        if (!player || !card) {
            console.error('Invalid player or card for move');
            return false;
        }
        
        player.setPosition(card);
        console.log(`${player.name} moved to ${card.value} at [${card.row}, ${card.col}]`);
        return true;
    }

    // Get player by ID
    getPlayer(id) {
        return this.players.find(player => player.id === id);
    }

    // Get all players
    getPlayers() {
        return [...this.players];
    }

    // Start the game
    startGame() {
        this.gameState = 'playing';
        this.currentPlayerIndex = 0;
        this.turnNumber = 1;
        this.updateActivePlayer();
        console.log('Game started!');
        console.log(`Turn ${this.turnNumber}: ${this.getCurrentPlayer().name}'s turn`);
    }

    // Start turn timer
    startTurnTimer() {
        // Only start timer if one isn't already running
        if (this.turnTimer) {
            console.log('Timer already running, not restarting');
            return;
        }
        
        this.turnStartTime = Date.now();
        
        this.turnTimer = setTimeout(() => {
            this.handleTurnTimeout();
        }, this.turnTimeLimit * 1000);
        
        console.log(`Turn timer started: ${this.turnTimeLimit} seconds for ${this.getCurrentPlayer().name}`);
    }

    // Clear turn timer
    clearTurnTimer() {
        if (this.turnTimer) {
            clearTimeout(this.turnTimer);
            this.turnTimer = null;
            this.turnStartTime = null;
        }
    }

    // Handle turn timeout
    handleTurnTimeout() {
        const currentPlayer = this.getCurrentPlayer();
        console.log(`⏰ TIME UP! ${currentPlayer.name} ran out of time and is eliminated from the game!`);
        
        // Clean up any active route planning for this player
        this.cleanupPlayerTurn(currentPlayer);
        
        // Remove player from the board and flip their starting card face down
        this.eliminatePlayer(currentPlayer);
        
        // Move to next turn
        this.nextTurn();
    }

    // Clean up active turn state for a player
    cleanupPlayerTurn(player) {
        // This method should be called before eliminating a player
        // to ensure all UI and state is properly cleaned up
        console.log(`Cleaning up turn state for ${player.name}`);
        
        if (this.routeManager) {
            this.routeManager.forceCleanupForTimeout(player);
        }
        
        // Clean up any active abilities
        this.abilityManager.forceCleanupForTimeout(player);
    }

    // Eliminate a player from the game
    eliminatePlayer(player) {
        console.log(`Eliminating ${player.name} from the game`);
        
        // If player is on a card, flip that card face down and remove them
        if (player.currentCard) {
            player.currentCard.setFaceDown();
            player.currentCard.removePlayer(player);
        }
        
        // Mark player as eliminated
        player.isEliminated = true;
        player.setPosition(null);
        
        console.log(`${player.name} has been eliminated and their card flipped face down`);
    }

    // Get remaining time for current turn
    getRemainingTurnTime() {
        if (!this.turnStartTime) return this.turnTimeLimit;
        
        const elapsed = (Date.now() - this.turnStartTime) / 1000;
        const remaining = Math.max(0, this.turnTimeLimit - elapsed);
        return Math.ceil(remaining);
    }

    // Get current active player
    getCurrentPlayer() {
        // Skip eliminated players
        let attempts = 0;
        while (attempts < this.players.length) {
            const player = this.players[this.currentPlayerIndex];
            if (player && !player.isEliminated) {
                return player;
            }
            // Move to next player if current is eliminated
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            attempts++;
        }
        // If all players are eliminated, return null
        return null;
    }

    // Update which player is active
    updateActivePlayer() {
        // Deactivate all players
        this.players.forEach(player => player.setActive(false));
        
        // Activate current player
        if (this.players[this.currentPlayerIndex]) {
            this.players[this.currentPlayerIndex].setActive(true);
        }
        
        // Update visual display of all player tokens
        this.updatePlayerTokenVisuals();
    }

    // Update visual display of player tokens to show active state
    updatePlayerTokenVisuals() {
        this.gridManager.cards.forEach(card => {
            if (card.players.length > 0) {
                card.updatePlayerTokens();
            }
        });
    }

    // Advance to next player's turn
    nextTurn() {
        this.clearTurnTimer(); // Always clear timer when advancing turns
        
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        
        // If we've cycled through all players, increment turn number
        if (this.currentPlayerIndex === 0) {
            this.turnNumber++;
        }
        
        // Skip eliminated players
        const currentPlayer = this.getCurrentPlayer();
        
        // Check if game should end (all players eliminated or only one left)
        const activePlayers = this.players.filter(p => !p.isEliminated);
        if (activePlayers.length <= 1) {
            this.endGame();
            return null;
        }
        
        this.updateActivePlayer();
        console.log(`Turn ${this.turnNumber}: ${currentPlayer.name}'s turn`);
        
        return currentPlayer;
    }

    // Check if it's a specific player's turn
    isPlayerTurn(player) {
        return this.getCurrentPlayer() === player;
    }

    // End the game
    endGame() {
        this.clearTurnTimer(); // Clear any active timer
        this.gameState = 'ended';
        console.log('Game ended!');
        
        // Show final scores
        const activePlayers = this.players.filter(p => !p.isEliminated);
        const scores = this.players.map(p => ({
            name: p.name,
            score: p.score,
            moves: p.moves.length,
            eliminated: p.isEliminated || false
        }));
        
        console.log('Final scores:', scores);
        
        if (activePlayers.length === 1) {
            console.log(`🏆 Winner: ${activePlayers[0].name}!`);
        } else if (activePlayers.length === 0) {
            console.log('💀 All players eliminated! No winner.');
        }
    }

    // Reset the game
    resetGame() {
        this.players.forEach(player => player.reset());
        this.gameState = 'setup';
        console.log('Game reset');
    }

    // Get game statistics
    getGameStats() {
        return {
            gameState: this.gameState,
            currentPlayer: this.getCurrentPlayer()?.name,
            turnNumber: this.turnNumber,
            players: this.players.map(p => p.getInfo())
        };
    }

    // Place players on starting positions (example implementation)
    placePlayersOnStartingPositions() {
        // Find all cards with value "7" (7♠, 7♥, 7♦, 7♣)
        const sevenCards = [];
        this.gridManager.cards.forEach(card => {
            if (card.value.startsWith('7')) {
                sevenCards.push(card);
            }
        });
        
        if (sevenCards.length < 4) {
            console.error('Not enough cards with value 7 found for all players');
            return;
        }
        
        // Shuffle the seven cards to randomize starting positions
        const shuffledSevenCards = this.shuffleArray([...sevenCards]);
        
        // Place all four players on random 7 cards
        for (let i = 0; i < this.players.length && i < shuffledSevenCards.length; i++) {
            this.movePlayer(this.players[i], shuffledSevenCards[i]);
            console.log(`${this.players[i].name} placed on ${shuffledSevenCards[i].value} at [${shuffledSevenCards[i].row}, ${shuffledSevenCards[i].col}]`);
        }
        
        console.log('All players placed on random 7-value cards');
    }
    // Helper method to shuffle an array
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Check if special abilities are unlocked
    areSpecialAbilitiesUnlocked() {
        const faceDownCount = this.gridManager.cards.filter(card => !card.isFaceUpCard()).length;
        const playersCount = this.players.length;
        
        return faceDownCount >= playersCount;
    }

    // Get the suit of a card
    getCardSuit(card) {
        const value = card.value;
        if (value.includes('♠')) return 'spades';
        if (value.includes('♥')) return 'hearts';
        if (value.includes('♦')) return 'diamonds';
        if (value.includes('♣')) return 'clubs';
        return null;
    }

    // Check if player can use any special ability
    canUseAbility(player) {
        return this.abilityManager.canUseAbility(player);
    }

    // Start ability phase for a player
    startAbility(player, abilityType) {
        return this.abilityManager.startAbility(player, abilityType);
    }

    // === LEGACY METHODS FOR BACKWARD COMPATIBILITY ===
    // These delegate to the ability manager to maintain existing API

    canUseHeartHealing(player) {
        return this.abilityManager.canUseHeartHealing(player);
    }

    getAdjacentCardsForHealing(card) {
        return this.abilityManager.getAdjacentCardsForHealing(card);
    }

    healCard(card) {
        return this.abilityManager.healCard(card);
    }

    restoreHealedCard() {
        this.abilityManager.restoreHealedCard();
    }

    clearHealedCard() {
        this.abilityManager.clearHealedCard();
    }

    // New methods for general ability management
    restoreAbilityChanges() {
        this.abilityManager.restoreAbilityChanges();
    }

    clearAbilityChanges() {
        this.abilityManager.clearAbilityChanges();
    }
}
