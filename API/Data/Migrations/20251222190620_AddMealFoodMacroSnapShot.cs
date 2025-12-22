using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMealFoodMacroSnapShot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Calories",
                table: "MealFoods",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<double>(
                name: "Carbs",
                table: "MealFoods",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Fat",
                table: "MealFoods",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Protein",
                table: "MealFoods",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Calories",
                table: "MealFoods");

            migrationBuilder.DropColumn(
                name: "Carbs",
                table: "MealFoods");

            migrationBuilder.DropColumn(
                name: "Fat",
                table: "MealFoods");

            migrationBuilder.DropColumn(
                name: "Protein",
                table: "MealFoods");
        }
    }
}
