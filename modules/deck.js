export class Deck {
    constructor() {
        // Static array of card values - 2-7 in each suit (24 cards total for 6x4 grid)
        this.cardValues = [
            '2♠', '3♠', '4♠', '5♠', '6♠', '7♠',
            '2♥', '3♥', '4♥', '5♥', '6♥', '7♥',
            '2♦', '3♦', '4♦', '5♦', '6♦', '7♦',
            '2♣', '3♣', '4♣', '5♣', '6♣', '7♣'
        ];
    }

    // Get all card values
    getCardValues() {
        return [...this.cardValues]; // Return a copy
    }

    // Shuffle an array using Fisher-Yates algorithm
    shuffle(array) {
        const shuffled = [...array]; // Create a copy
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Get shuffled card values
    getShuffledCardValues() {
        return this.shuffle(this.cardValues);
    }

    // Get deck size
    size() {
        return this.cardValues.length;
    }

    // Check if deck has enough cards for a grid
    hasEnoughCardsForGrid(rows, columns) {
        return this.cardValues.length >= (rows * columns);
    }

    // Get cards by suit
    getCardsBySuit(suit) {
        return this.cardValues.filter(card => card.includes(suit));
    }

    // Get cards by rank
    getCardsByRank(rank) {
        return this.cardValues.filter(card => card.startsWith(rank));
    }
}
