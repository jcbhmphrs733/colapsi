import { Card } from './card.js';
import { Deck } from './deck.js';

export class GridManager {
    constructor(gridId) {
        this.container = document.getElementById(gridId);
        this.cards = [];
        this.rows = 4;
        this.columns = 6;
        this.deck = new Deck();
        
        // Debug logging
        console.log('GridManager initialized');
        console.log('Container found:', this.container);
        console.log('Deck size:', this.deck.getCardValues().length);
        console.log('Grid size:', this.rows, 'x', this.columns, '=', this.rows * this.columns, 'cards');
        
        if (!this.container) {
            console.error(`Could not find element with id: ${gridId}`);
        }
        
        // Verify deck has enough cards
        if (!this.deck.hasEnoughCardsForGrid(this.rows, this.columns)) {
            console.error('Deck does not have enough cards for the grid size');
        }
    }

    createGrid() {
        if (!this.container) {
            console.error('No container found, cannot create grid');
            return;
        }

        console.log('Creating grid...');
        this.container.innerHTML = ''; // Clear existing content
        this.cards = [];

        // Set up the grid container
        this.container.classList.add('grid-container');

        // Get shuffled card values from deck
        const shuffledCards = this.deck.getShuffledCardValues();
        let cardIndex = 0;

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns; col++) {
                // Get the next card value from shuffled deck
                const cardValue = shuffledCards[cardIndex];
                cardIndex++;
                
                // Create new Card instance
                const card = new Card(cardValue, row, col);
                
                // Add card to container and tracking array
                this.container.appendChild(card.getElement());
                this.cards.push(card);
            }
        }
        
        console.log(`Grid created with ${this.cards.length} cards`);
        console.log('Cards used:', shuffledCards);
    }
    updateGrid() {
        // Logic to update the grid display based on rows and columns
        console.log('Grid updated with rows:', this.rows, 'and columns:', this.columns);
    }

    // Get card at specific position
    getCardAt(row, col) {
        return this.cards.find(card => card.row === row && card.col === col);
    }

    // Get all cards with specific value
    getCardsByValue(value) {
        return this.cards.filter(card => card.value === value);
    }

    // Get all face-up cards
    getFaceUpCards() {
        return this.cards.filter(card => card.isFaceUp);
    }

    // Get all face-down cards
    getFaceDownCards() {
        return this.cards.filter(card => !card.isFaceUp);
    }

    // Flip all cards to face up
    flipAllFaceUp() {
        this.cards.forEach(card => card.setFaceUp());
    }

    // Flip all cards to face down
    flipAllFaceDown() {
        this.cards.forEach(card => card.setFaceDown());
    }

    // Get grid statistics
    getGridStats() {
        return {
            totalCards: this.cards.length,
            faceUpCards: this.getFaceUpCards().length,
            faceDownCards: this.getFaceDownCards().length,
            gridSize: `${this.rows}x${this.columns}`
        };
    }

    // Count remaining cards by suit
    getCardCountsBySuit() {
        const counts = {
            hearts: { total: 0, faceUp: 0, faceDown: 0 },
            diamonds: { total: 0, faceUp: 0, faceDown: 0 },
            clubs: { total: 0, faceUp: 0, faceDown: 0 },
            spades: { total: 0, faceUp: 0, faceDown: 0 }
        };

        this.cards.forEach(card => {
            const suit = this.getCardSuit(card.value);
            if (suit && counts[suit]) {
                counts[suit].total++;
                if (card.isFaceUpCard()) {
                    counts[suit].faceUp++;
                } else {
                    counts[suit].faceDown++;
                }
            }
        });

        return counts;
    }

    // Helper method to get suit from card value
    getCardSuit(cardValue) {
        if (cardValue.includes('♥')) return 'hearts';
        if (cardValue.includes('♦')) return 'diamonds';
        if (cardValue.includes('♣')) return 'clubs';
        if (cardValue.includes('♠')) return 'spades';
        return null;
    }
}