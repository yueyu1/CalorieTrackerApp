import { MealItem } from "../../types/meal";

export function formatQuantity(item: MealItem): string {
    const qty = item.quantity;               // e.g., 1.5
    const unit = item.unit;                  // e.g., "serving"
    const label = item.unitLabel;            // e.g., "1 serving (100 g)" OR "g"
    const cf = item.conversionFactor;        // e.g., 100, 1, 28.35

    // ---------------------------------------------
    // CASE A: Simple units like "g", "oz", "ml"
    // ---------------------------------------------
    // If label contains no parentheses, it’s a simple unit
    if (!label.includes('(')) {
      // Just scale quantity:
      // 1.5 quantity + "g" label => "1.5 g"
      // 2 quantity + "oz" label => "2 oz"
      return `${qty} ${label}`;
    }

    // ---------------------------------------------
    // CASE B: Serving-based unit like "1 serving (100 g)"
    // ---------------------------------------------
    // Extract the gram part from "(100 g)"
    const match = label.match(/\(([^)]+)\)/);      // extract "100 g"
    const gramsPart = match ? match[1] : null;
    if (!gramsPart) return `${qty} ${unit}`;

    // The number inside "100 g"
    const baseNumberMatch = gramsPart.match(/^\d+(\.\d+)?/);
    const baseNumber = baseNumberMatch ? Number(baseNumberMatch[0]) : cf;

    // Scale it
    const scaled = qty * baseNumber;

    // Extract unit suffix (e.g., "g" from "100 g")
    const unitSuffix = gramsPart.replace(/^\d+(\.\d+)?\s*/, '');

    // Pluralize "serving" -> "servings" when needed
    const pluralUnit = qty === 1 ? unit : `${unit}s`;

    return `${qty} ${pluralUnit}, ${scaled} ${unitSuffix}`;
  }