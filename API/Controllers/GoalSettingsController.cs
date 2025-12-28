using API.Data;
using API.Dtos;
using API.Entities;
using API.Enums;
using API.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.CodeAnalysis;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    [Authorize]
    [Route("api/goal-settings")]
    [ApiController]
    public class GoalSettingsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<GoalSettingsResponseDto>> GetGoalSettings()
        {
            var userId = HttpContext.GetCurrentUserId();

            var settings = await db.UserGoalSettings
                .Where(s => s.UserId == userId)
                .Select(s => Map(s))
                .FirstOrDefaultAsync();

            if (settings == null)
            {
                return Ok(new GoalSettingsResponseDto
                {
                    IsSet = false,
                    Settings = null
                });
            }

            return Ok(new GoalSettingsResponseDto
            {
                IsSet = true,
                Settings = settings
            });
        }

        [HttpPost]
        public async Task<ActionResult<GoalSettingsResponseDto>> UpdateOrCreateGoalSettings(GoalSettingsDto dto)
        {
            var userId = HttpContext.GetCurrentUserId();

            if (dto.MacroMode == "percent")
            {
                var total = dto.Protein + dto.Carbs + dto.Fat;
                if (Math.Abs(total - 100) > 0.01)
                    return BadRequest("Macro percentages must total 100%");
            }

            var entity = await db.UserGoalSettings
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (entity == null)
            {
                entity = new UserGoalSettings { UserId = userId };
                db.UserGoalSettings.Add(entity);
            }

            Apply(dto, entity);
            await db.SaveChangesAsync();

            return Ok(new GoalSettingsResponseDto { IsSet = true, Settings = Map(entity) });
        }

        [HttpDelete]
        public async Task<IActionResult> DeleteGoalSettings()
        {
            var userId = HttpContext.GetCurrentUserId();

            var entity = await db.UserGoalSettings
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (entity != null)
            {
                db.UserGoalSettings.Remove(entity);
                await db.SaveChangesAsync();
            }

            return NoContent();
        }

        private static GoalSettingsDto Map(UserGoalSettings e)
        {
            return new GoalSettingsDto
            {
                Calories = e.Calories,
                MacroMode = e.MacroMode == MacroMode.Percent ? "percent" : "grams",
                Protein = e.Protein,
                Carbs = e.Carbs,
                Fat = e.Fat,
                ConfirmDeleteFood = e.ConfirmDeleteFood,
                ShowMacroPercent = e.ShowMacroPercent
            };
        }

        private static void Apply(GoalSettingsDto dto, UserGoalSettings e)
        {
            e.Calories = dto.Calories;
            e.MacroMode = dto.MacroMode == "percent" ? MacroMode.Percent : MacroMode.Grams;
            e.Protein = dto.Protein;
            e.Carbs = dto.Carbs;
            e.Fat = dto.Fat;
            e.ConfirmDeleteFood = dto.ConfirmDeleteFood;
            e.ShowMacroPercent = dto.ShowMacroPercent;
        }
    }
}
