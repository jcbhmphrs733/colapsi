export class Card {
    constructor(value, row, col) {
        this.value = value;
        this.row = row;
        this.col = col;
        this.isFaceUp = true;
        this.element = null;
        this.players = []; // Players currently on this card
        
        this.createElement();
    }

    createElement() {
        // Create the main card element
        this.element = document.createElement('div');
        this.element.classList.add('card', 'face-up');
        
        // Store data on the element
        this.element.dataset.row = this.row;
        this.element.dataset.col = this.col;
        this.element.dataset.value = this.value;
        this.element.dataset.faceUp = 'true';
        
        // Create face-up content (always visible initially)
        this.showFace();
    }

    showFace() {
        const cardContent = document.createElement('div');
        cardContent.classList.add('card-content');
        
        const cardValueElement = document.createElement('div');
        cardValueElement.classList.add('card-value');
        cardValueElement.textContent = this.value;
        
        // Add color class for red suits (hearts and diamonds)
        if (this.value.includes('♥') || this.value.includes('♦')) {
            cardValueElement.classList.add('red-suit');
        } else {
            cardValueElement.classList.add('black-suit');
        }
        
        const position = document.createElement('div');
        position.classList.add('card-position');
        position.textContent = `[${this.row},${this.col}]`;
        
        cardContent.appendChild(cardValueElement);
        cardContent.appendChild(position);
        
        this.element.innerHTML = '';
        this.element.appendChild(cardContent);
        
        this.element.classList.add('face-up');
        this.element.classList.remove('face-down');
    }

    showBack() {
        const cardContent = document.createElement('div');
        cardContent.classList.add('card-content');
        cardContent.innerHTML = `
            <div class="card-back">
            </div>
        `;
        
        this.element.innerHTML = '';
        this.element.appendChild(cardContent);
        
        this.element.classList.add('face-down');
        this.element.classList.remove('face-up');
    }

    // Flip card to face down
    setFaceDown() {
        if (this.isFaceUp) {
            this.isFaceUp = false;
            this.element.dataset.faceUp = 'false';
            this.showBack();
            console.log(`Card ${this.value} at [${this.row}, ${this.col}] flipped face down`);
        }
    }

    // Flip card to face up
    setFaceUp() {
        if (!this.isFaceUp) {
            this.isFaceUp = true;
            this.element.dataset.faceUp = 'true';
            this.showFace();
            console.log(`Card ${this.value} at [${this.row}, ${this.col}] flipped face up`);
        }
    }

    // Check if card is face up
    isFaceUpCard() {
        return this.isFaceUp;
    }

    // Get the DOM element
    getElement() {
        return this.element;
    }

    // Get card information
    getInfo() {
        return {
            value: this.value,
            row: this.row,
            col: this.col,
            isFaceUp: this.isFaceUp,
            position: `[${this.row},${this.col}]`
        };
    }

    // Add a player to this card
    addPlayer(player) {
        if (!this.players.includes(player)) {
            this.players.push(player);
            this.updatePlayerTokens();
        }
    }

    // Remove a player from this card
    removePlayer(player) {
        const index = this.players.indexOf(player);
        if (index > -1) {
            this.players.splice(index, 1);
            this.updatePlayerTokens();
        }
    }

    // Update the visual display of player tokens
    updatePlayerTokens() {
        // Remove existing tokens
        const existingTokens = this.element.querySelector('.player-tokens');
        if (existingTokens) {
            existingTokens.remove();
        }

        // Add new tokens if there are players
        if (this.players.length > 0) {
            const tokensContainer = document.createElement('div');
            tokensContainer.classList.add('player-tokens');
            
            this.players.forEach(player => {
                const token = document.createElement('div');
                token.classList.add('player-token');
                token.style.backgroundColor = player.color;
                token.textContent = player.tokenSymbol;
                token.setAttribute('data-player-id', player.id);
                token.title = `${player.name} (Player ${player.id})`;
                tokensContainer.appendChild(token);
            });
            
            this.element.appendChild(tokensContainer);
        }
    }

    // Check if a specific player is on this card
    hasPlayer(player) {
        return this.players.includes(player);
    }

    // Get all players on this card
    getPlayers() {
        return [...this.players];
    }
}
