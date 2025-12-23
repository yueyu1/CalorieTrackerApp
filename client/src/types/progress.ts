export type DailyTotals = {
  date: string;     // "YYYY-MM-DD" from DateOnly
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

export type TodayMacro = {
  key: 'protein' | 'carbs' | 'fat';
  label: string;
  icon: string;      // material icon name
  value: number;     // grams
  goal: number;      // grams
};

export type DayPoint = {
  label: string;     // e.g. "M"
  calories: number | null;
};