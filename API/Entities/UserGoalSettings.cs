using System;
using API.Enums;

namespace API.Entities;

public class UserGoalSettings
{
    public int Id { get; set; }
    public int Calories { get; set; }
    public MacroMode MacroMode { get; set; }
    public double Protein { get; set; }
    public double Carbs { get; set; }
    public double Fat { get; set; }
    public bool ConfirmDeleteFood { get; set; }
    public bool ShowMacroPercent { get; set; }
    public DateTime UpdatedUtc { get; set; }

    public required string UserId { get; set; }
    public AppUser User { get; set; } = null!;
}
