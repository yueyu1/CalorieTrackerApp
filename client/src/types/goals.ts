export type MacroMode = 'percent' | 'grams';
export type GoalPreset = 'maintain' | 'cut' | 'bulk';
export type WeightUnit = 'g' | 'oz';

export type GoalSettingsDto = {
  calories: number;
  macroMode: MacroMode;
  protein: number;
  carbs: number;
  fat: number;
  confirmDeleteFood: boolean;
  showMacroPercent: boolean;
}

export type GoalSettingsResponseDto = {
  isSet: boolean;
  settings: GoalSettingsDto | null;
}