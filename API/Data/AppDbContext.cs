using System;
using API.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class AppDbContext(DbContextOptions options) : IdentityDbContext<AppUser>(options)
{
    public DbSet<Meal> Meals { get; set; }
    public DbSet<Food> Foods { get; set; }
    public DbSet<MealFood> MealFoods { get; set; }
    public DbSet<FoodUnit> FoodUnits { get; set; }
    public DbSet<UserGoalSettings> UserGoalSettings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AppUser>()
            .HasMany(u => u.Meals)
            .WithOne(m => m.User)
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AppUser>()
            .HasMany(u => u.Foods)
            .WithOne(f => f.User)
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AppUser>()
            .HasOne(u => u.GoalSettings)
            .WithOne(gs => gs.User)
            .HasForeignKey<UserGoalSettings>(gs => gs.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Meal>()
            .HasMany(m => m.MealFoods)
            .WithOne(mf => mf.Meal)
            .HasForeignKey(mf => mf.MealId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MealFood>()
            .HasOne(mf => mf.Meal)
            .WithMany(m => m.MealFoods)
            .HasForeignKey(mf => mf.MealId);

        modelBuilder.Entity<Food>()
            .HasMany(f => f.MealFoods)
            .WithOne(mf => mf.Food)
            .HasForeignKey(mf => mf.FoodId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Food>()
            .HasMany(f => f.Units)
            .WithOne(u => u.Food)
            .HasForeignKey(u => u.FoodId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
