using System;

namespace API.Dtos;

public class GoalSettingsDto
{
    public int Calories { get; set; }
    public required string MacroMode { get; set; }
    public double Protein { get; set; }
    public double Carbs { get; set; }
    public double Fat { get; set; }
    public required string WeightUnit { get; set; }
    public bool ShowMacroPercent { get; set; }
}
