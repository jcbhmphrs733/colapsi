export class Player {
    constructor(id, name, color, tokenSymbol = '●') {
        this.id = id;
        this.name = name;
        this.color = color;
        this.tokenSymbol = tokenSymbol;
        this.currentCard = null;
        this.score = 0;
        this.isActive = false;
        this.moves = [];
    }

    // Set the player's current position
    setPosition(card) {
        // Remove from previous position
        if (this.currentCard) {
            this.currentCard.removePlayer(this);
        }
        
        // Set new position
        this.currentCard = card;
        if (card) {
            card.addPlayer(this);
        }
        
        // Log the move
        this.logMove(card);
    }

    // Get current position
    getPosition() {
        return this.currentCard;
    }

    // Log a move
    logMove(card) {
        if (card) {
            this.moves.push({
                card: card.value,
                position: [card.row, card.col],
                timestamp: new Date()
            });
        }
    }

    // Get player info
    getInfo() {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            tokenSymbol: this.tokenSymbol,
            currentPosition: this.currentCard ? [this.currentCard.row, this.currentCard.col] : null,
            currentCard: this.currentCard ? this.currentCard.value : null,
            score: this.score,
            isActive: this.isActive,
            totalMoves: this.moves.length
        };
    }

    // Activate/deactivate player turn
    setActive(active) {
        this.isActive = active;
    }

    // Update score
    addScore(points) {
        this.score += points;
    }

    // Reset player state
    reset() {
        if (this.currentCard) {
            this.currentCard.removePlayer(this);
        }
        this.currentCard = null;
        this.score = 0;
        this.isActive = false;
        this.moves = [];
    }

    // Get move history
    getMoveHistory() {
        return [...this.moves];
    }
}
