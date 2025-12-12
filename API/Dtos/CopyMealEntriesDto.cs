using System;

namespace API.Dtos;

public class CopyMealEntriesDto
{
    public int SourceMealId { get; set; }
    public required string Mode { get; set; }
}
