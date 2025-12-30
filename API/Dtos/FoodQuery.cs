using System;
using API.Enums;

namespace API.Dtos;

public class FoodQuery
{
    public FoodScope Scope { get; set; } = FoodScope.All;
    public string? Search { get; set; }
    public FoodSort Sort { get; set; } = FoodSort.Relevance;
    public int Skip { get; set; } = 0;
    public int Take { get; set; } = 25;
    public const int MaxTake = 100;
    public bool BrandsOnly { get; set; } = false;
}
