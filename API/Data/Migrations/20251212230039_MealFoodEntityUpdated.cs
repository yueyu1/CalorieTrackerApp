using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Data.Migrations
{
    /// <inheritdoc />
    public partial class MealFoodEntityUpdated : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_MealFoods",
                table: "MealFoods");

            migrationBuilder.AddColumn<int>(
                name: "Id",
                table: "MealFoods",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0)
                .Annotation("Sqlite:Autoincrement", true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_MealFoods",
                table: "MealFoods",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_MealFoods_MealId",
                table: "MealFoods",
                column: "MealId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_MealFoods",
                table: "MealFoods");

            migrationBuilder.DropIndex(
                name: "IX_MealFoods_MealId",
                table: "MealFoods");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "MealFoods");

            migrationBuilder.AddPrimaryKey(
                name: "PK_MealFoods",
                table: "MealFoods",
                columns: new[] { "MealId", "FoodId" });
        }
    }
}
