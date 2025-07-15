import { HeartHealingAbility } from './heartHealing.js';
import { ClubSwappingAbility } from './clubSwapping.js';
import { SpadePhantomStepAbility } from './spadePhantomStep.js';
import { DiamondDiagonalMoveAbility } from './diamondDiagonalMove.js';

export class AbilityManager {
    constructor(gameManager, gridManager) {
        this.gameManager = gameManager;
        this.gridManager = gridManager;
        
        // Initialize individual ability handlers
        this.heartHealing = new HeartHealingAbility(gameManager, gridManager);
        this.clubSwapping = new ClubSwappingAbility(gameManager, gridManager);
        this.spadePhantomStep = new SpadePhantomStepAbility(gameManager, gridManager);
        this.diamondDiagonalMove = new DiamondDiagonalMoveAbility(gameManager, gridManager);
        
        // Ability state for UI management
        this.abilityState = {
            active: false,
            type: null, // 'hearts', 'diamonds', 'clubs', 'spades'
            player: null,
            startCard: null,
            availableTargets: [],
            selectedCard: null, // For club swapping - the first card selected
            swapTargets: [] // For club swapping - available cards to swap with
        };
    }

    // Set route manager reference (called after route manager is created)
    setRouteManager(routeManager) {
        this.routeManager = routeManager;
        this.heartHealing.setRouteManager(routeManager);
        this.clubSwapping.setRouteManager(routeManager);
        this.spadePhantomStep.setRouteManager(routeManager);
        this.diamondDiagonalMove.setRouteManager(routeManager);
    }

    // Main method to check if a player can use any ability
    canUseAbility(player) {
        if (!this.gameManager.areSpecialAbilitiesUnlocked()) {
            return null;
        }
        
        if (!player.currentCard) {
            return null;
        }
        
        const suit = this.gameManager.getCardSuit(player.currentCard);
        
        switch (suit) {
            case 'hearts':
                return this.heartHealing.canUse(player) ? 'hearts' : null;
            case 'diamonds':
                return this.diamondDiagonalMove.canUse(player) ? 'diamonds' : null;
            case 'clubs':
                return this.clubSwapping.canUse(player) ? 'clubs' : null;
            case 'spades':
                return this.spadePhantomStep.canUse(player) ? 'spades' : null;
            default:
                return null;
        }
    }

    // Start ability phase for a player
    startAbility(player, abilityType) {
        switch (abilityType) {
            case 'hearts':
                return this.heartHealing.start(player, this.abilityState);
            case 'diamonds':
                // TODO: Implement diamond ability
                return false;
            case 'clubs':
                return this.clubSwapping.start(player, this.abilityState);
            case 'spades':
                // Spades is handled directly in route planning as a passive ability
                return false;
            default:
                return false;
        }
    }

    // Cancel current ability
    cancelAbility() {
        console.log(`Cancelling ${this.abilityState.type} ability`);
        
        // If we're cancelling a club swap and there was a swap performed, undo it
        if (this.abilityState.type === 'clubs' && this.clubSwapping.swappedCards) {
            this.clubSwapping.undoCardSwap();
        }
        
        this.cleanupAbilityUI();
    }

    // Restore any changes made during abilities (when route is cancelled)
    restoreAbilityChanges() {
        if (this.heartHealing.healedCard) {
            this.heartHealing.restoreHealedCard();
        }
        
        if (this.clubSwapping.swappedCards) {
            this.clubSwapping.undoCardSwap();
        }
    }

    // Clear ability change tracking (when route is completed)
    clearAbilityChanges() {
        this.heartHealing.clearHealedCard();
        this.clubSwapping.clearSwappedCards();
    }

    // Force cleanup when player times out
    forceCleanupForTimeout(player) {
        if (this.abilityState.active && this.abilityState.player === player) {
            console.log(`Force cleanup for ${player.name} ability due to timeout`);
            this.cleanupAbilityUI();
        }
    }

    // Check if any ability is currently active
    isAbilityActive() {
        return this.abilityState.active;
    }

    getActiveAbility() {
        return this.abilityState.active ? this.abilityState.type : null;
    }

    // Handle keyboard input
    handleKeyboardInput(event) {
        if (!this.abilityState.active) {
            return false; // Not handled
        }
        
        const cleanupCallback = () => this.cleanupAbilityUI();
        
        switch (this.abilityState.type) {
            case 'hearts':
                return this.heartHealing.handleKeyboardInput(event, this.abilityState, cleanupCallback);
            case 'clubs':
                return this.clubSwapping.handleKeyboardInput(event, this.abilityState, cleanupCallback);
            case 'spades':
                return this.spadePhantomStep.handleKeyboardInput(event, this.abilityState, cleanupCallback);
            default:
                return false; // Not handled
        }
    }

    // === UI MANAGEMENT ===

    cleanupAbilityUI() {
        // Delegate cleanup to the appropriate ability handler
        switch (this.abilityState.type) {
            case 'hearts':
                this.heartHealing.cleanup();
                break;
            case 'clubs':
                this.clubSwapping.cleanup();
                break;
            case 'spades':
                this.spadePhantomStep.cleanup();
                break;
        }
        
        // Reset state
        this.abilityState = {
            active: false,
            type: null,
            player: null,
            startCard: null,
            availableTargets: [],
            selectedCard: null,
            swapTargets: []
        };
    }

    // === LEGACY METHODS FOR BACKWARD COMPATIBILITY ===
    // These delegate to the individual ability handlers to maintain existing API

    // Heart healing legacy methods
    canUseHeartHealing(player) {
        return this.heartHealing.canUse(player);
    }

    getAdjacentCardsForHealing(card) {
        return this.heartHealing.getAdjacentCardsForHealing(card);
    }

    healCard(card) {
        return this.heartHealing.healCard(card);
    }

    restoreHealedCard() {
        return this.heartHealing.restoreHealedCard();
    }

    clearHealedCard() {
        return this.heartHealing.clearHealedCard();
    }
}
