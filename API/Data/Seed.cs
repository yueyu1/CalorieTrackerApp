using System.Text.Json;
using System.Text.Json.Serialization;
using API.Entities;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class Seed
{
    public static async Task SeedGlobalFoodsAsync(AppDbContext context, IWebHostEnvironment env)
    {
        var path = Path.Combine(env.ContentRootPath, "Data", "global-foods.json");
        if (!File.Exists(path))
            throw new FileNotFoundException("The global-foods.json file was not found.", path);

        var json = await File.ReadAllTextAsync(path);

        var foodsFromJson = JsonSerializer.Deserialize<List<Food>>(json, JsonOptions);

        if (foodsFromJson == null || foodsFromJson.Count == 0)
            throw new Exception("No global foods found in the JSON file.");

        // Build key set of existing global foods
        var existingKeys = await context.Foods
            .Where(f => f.UserId == null)
            .Select(f => new { f.Name, f.Brand, f.BaseUnit, f.BaseQuantity })
            .ToListAsync();

        var existingSet = existingKeys
            .Select(x => $"{x.Name}|{x.Brand}|{x.BaseUnit}|{x.BaseQuantity}")
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var now = DateTime.UtcNow;

        var toAdd = new List<Food>();

        foreach (var f in foodsFromJson)
        {
            // Force global/system-owned fields
            f.Id = 0;
            f.UserId = null;
            f.User = null;
            f.CreatedAt = now;
            f.UpdatedAt = null;
            f.IsArchived = false;
            f.ArchivedAt = null;

            // Basic validation
            if (string.IsNullOrWhiteSpace(f.Name)) continue;
            if (f.Units is null || f.Units.Count == 0) continue;

            // Normalize units + ensure foodId not pre-set
            foreach (var u in f.Units)
            {
                u.Id = 0;
                u.FoodId = 0;
                u.Food = null!;
                u.Code = u.Code?.Trim().ToLowerInvariant() ?? "";
                u.Label = u.Label?.Trim() ?? "";
                if (u.ConversionFactor <= 0) u.ConversionFactor = 1;
            }

            var key = $"{f.Name}|{f.Brand}|{f.BaseUnit}|{f.BaseQuantity}";
            if (existingSet.Contains(key)) continue;

            toAdd.Add(f);
        }

        if (toAdd.Count == 0) return;

        await context.Foods.AddRangeAsync(toAdd);
        await context.SaveChangesAsync();
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters =
        {
            new JsonStringEnumConverter()
        }
    };
}
