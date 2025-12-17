using System;

namespace API.Dtos;

public class GoalSettingsResponseDto
{
    public bool IsSet { get; set; }
    public GoalSettingsDto? Settings { get; set; }
}
