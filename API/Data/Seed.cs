using System;
using System.Text.Json;
using API.Entities;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class Seed
{
    public static async Task SeedGlobalFoodsAsync(AppDbContext context)
    {
        // If ANY global foods exist (UserId == null), do not reseed
        var hasGlobalFoods = await context.Foods.AnyAsync(f => f.UserId == null);
        if (hasGlobalFoods) return;

        // Build path to the global-foods.json file
        var path = Path.Combine(AppContext.BaseDirectory, "Data", "global-foods.json");

        if (!File.Exists(path))
            throw new FileNotFoundException("The global-foods.json file was not found.", path);
        
        // Read the JSON file
        var json = await File.ReadAllTextAsync(path);

        // Deserialize the JSON into a list of Food objects
        var globalFoods = JsonSerializer.Deserialize<List<Food>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (globalFoods == null || globalFoods.Count == 0)
            throw new Exception("No global foods found in the JSON file.");
        
        // Add the global foods to the database
        await context.Foods.AddRangeAsync(globalFoods);

        // Save changes to the database
        await context.SaveChangesAsync();
    }
}
