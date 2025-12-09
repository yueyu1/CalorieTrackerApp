import { Injectable } from '@angular/core';
import { Food } from '../../types/food';
import { UnitOption } from '../../types/unit';

@Injectable({
  providedIn: 'root',
})
export class UnitService {
  buildUnitOptions(food: Food): UnitOption[] {
    const baseQty = food.baseQuantity;
    const baseUnit = food.baseUnit;

    return [
      {
        id: `${baseQty}${baseUnit}`,            // ex: "100g"
        label: `1 serving (${baseQty} ${baseUnit})`
      }
    ];
  }

}
