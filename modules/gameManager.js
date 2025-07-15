import { Player } from './player.js';

export class GameManager {
    constructor(gridManager) {
        this.gridManager = gridManager;
        this.players = [];
        this.gameState = 'setup'; // setup, playing, paused, ended
        
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
        console.log('Game started!');
    }

    // End the game
    endGame() {
        this.gameState = 'ended';
        console.log('Game ended!');
        
        // Show final scores
        const scores = this.players.map(p => ({
            name: p.name,
            score: p.score,
            moves: p.moves.length
        }));
        console.log('Final scores:', scores);
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
}
