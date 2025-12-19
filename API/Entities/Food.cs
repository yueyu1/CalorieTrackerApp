using System.Text.Json.Serialization;

namespace API.Entities;

public class Food
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Brand { get; set; }

    public int Calories { get; set; }
    public double Protein { get; set; }
    public double Carbs { get; set; }
    public double Fat { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    /// <summary>
    /// The quantity that these macros apply to (e.g. 100, 1, etc.).
    /// </summary>
    public double BaseQuantity { get; set; } = 100;

    /// <summary>
    /// The unit that BaseQuantity is in (e.g. "g", "serving", "piece").
    /// </summary>
    public string BaseUnit { get; set; } = "g";

    public bool IsArchived { get; set; }
    public DateTime? ArchivedAt { get; set; }

    // Navigation properties
    public string? UserId { get; set; }
    [JsonIgnore]
    public AppUser? User { get; set; }

    [JsonIgnore]
    public ICollection<MealFood> MealFoods { get; set; } = [];

    public ICollection<FoodUnit> Units { get; set; } = [];
}
