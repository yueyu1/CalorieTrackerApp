import { Food } from "../../types/food";

/**
 * Calculate the nutrition scaling factor based on quantity and unit.
 * @param food The food item.
 * @param quantity The quantity of the food.
 * @param unitId The ID of the unit.
 * @returns The nutrition scaling factor.
 */
export function nutritionScale(
    food: Food,
    quantity: number,
    unitId: number
): number {
    if (!food) return 0;
    if (quantity <= 0) return 0;
    const unit = food.units.find(u => u.id === unitId);
    if (!unit) return 0;
    const baseAmount = quantity * (unit.conversionFactor ?? 1);
    return baseAmount / food.baseQuantity;
}

/** Calculate nutrition for a given food, quantity, and unit.
 * @param food The food item.
 * @param quantity The quantity of the food.
 * @param unitId The ID of the unit.
 * @returns The calculated total nutrition.
 */
export function nutritionFor(
    food: Food,
    quantity: number,
    unitId: number
) {
    const scale = nutritionScale(food, quantity, unitId);
    return {
        calories: food.calories * scale,
        protein: food.protein * scale,
        carbs: food.carbs * scale,
        fat: food.fat * scale,
    };
}