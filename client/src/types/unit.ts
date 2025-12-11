export type UnitOption = {
  id: string; // e.g. "serving", "100g", "4oz"
  label: string; // e.g. "1 serving (85 g)"
}

export type FoodUnit = {
  id: number;                 // unique identifier
  code: string;               // e.g. "serving", "100g", "4oz"
  label: string;              // e.g. "1 serving (85 g)"
  conversionFactor: number;   // e.g. 85 for "1 serving (85 g)"
  unitType: string;           // e.g. "weight", "volume", "each"
}

export type UnitType = 'Weight' | 'Volume' | 'Piece';
