export type Meal = {
  mealType: MealType;
  items: {
    id: number;
    name: string;
    brand?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
}

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';