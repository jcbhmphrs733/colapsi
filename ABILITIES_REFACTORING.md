# Abilities System Refactoring

## Overview
Successfully refactored the heart healing ability system into a modular `abilities.js` module that can easily support additional suit-based abilities in the future.

## Changes Made

### New Files Created
- **`modules/abilities.js`** - New centralized ability management system

### Files Modified
- **`modules/gameManager.js`** - Integrated AbilityManager, removed old healing methods
- **`modules/route.js`** - Removed healing state and methods, delegated to AbilityManager
- **`main.js`** - Set up cross-references between managers

## Architecture

### AbilityManager Class
- **Purpose**: Centralized management of all suit-based special abilities
- **Current Abilities**: Heart healing (flip adjacent face-down cards face up)
- **Future Ready**: Framework for diamond, club, and spade abilities

### Key Methods
- `canUseAbility(player)` - Check if player can use any ability
- `startAbility(player, abilityType)` - Initiate ability phase
- `performHeartHealing(card)` - Execute heart healing
- `skipHeartHealing()` - Skip healing and proceed to route planning
- `handleKeyboardInput(event)` - Process ability-specific keyboard input
- `forceCleanupForTimeout(player)` - Clean up on player timeout

### Integration Points
- **GameManager**: Owns AbilityManager instance, provides legacy API compatibility
- **RouteManager**: Checks for abilities before starting route planning
- **UI Management**: AbilityManager handles its own UI elements and cleanup

## Backward Compatibility
All existing method calls (`canUseHeartHealing`, `healCard`, etc.) still work through delegation to maintain compatibility.

## Future Expansion
The system is now ready for easy addition of:
- **Diamond abilities** - Add to `startAbility()` switch statement
- **Club abilities** - Add to `startAbility()` switch statement  
- **Spade abilities** - Add to `startAbility()` switch statement

Each new ability type can follow the same pattern:
1. Add detection logic to `canUseAbility()`
2. Add execution logic to `startAbility()`
3. Implement ability-specific methods
4. Add UI management methods
5. Handle keyboard input in `handleKeyboardInput()`

## Benefits
- **Modular**: Clear separation of ability logic from route planning
- **Extensible**: Easy to add new suit abilities
- **Maintainable**: Centralized ability management
- **Clean**: Removed duplicate code and simplified dependencies
