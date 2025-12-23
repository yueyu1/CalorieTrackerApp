using System;

namespace API.Dtos;

public class DailyTotalsDto
{
    public DateOnly Date { get; set; }
    public int? Calories { get; set; }
    public int? Protein { get; set; }
    public int? Carbs { get; set; }
    public int? Fat { get; set; }
}
