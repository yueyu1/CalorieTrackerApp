using System.Security.Claims;
using API.Dtos;
using API.Entities;
using API.Extensions;
using API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
  [Route("api/[controller]")]
  [ApiController]
  public class AccountController(UserManager<AppUser> userManager, ITokenService tokenService) : ControllerBase
  {
    [HttpPost("register")]
    public async Task<ActionResult<UserDto>> Register(RegisterDto registerDto)
    {
      var user = new AppUser
      {
        DisplayName = registerDto.DisplayName,
        Email = registerDto.Email,
        UserName = registerDto.Email
      };

      var result = await userManager.CreateAsync(user, registerDto.Password);
      if (!result.Succeeded) return BadRequest(result.Errors);

      await SetRefreshTokenCookie(user);

      return await user.ToDto(tokenService);
    }

    [HttpPost("login")]
    public async Task<ActionResult<UserDto>> Login(LoginDto loginDto)
    {
      var user = await userManager.FindByEmailAsync(loginDto.Email);
      if (user == null) return Unauthorized("Invalid email");

      var result = await userManager.CheckPasswordAsync(user, loginDto.Password);
      if (!result) return Unauthorized("Invalid password");

      await SetRefreshTokenCookie(user);

      return await user.ToDto(tokenService);
    }

    [HttpPost("refresh-token")]
    public async Task<ActionResult<UserDto>> RefreshToken()
    {
      var refreshToken = Request.Cookies["refreshToken"];
      if (string.IsNullOrEmpty(refreshToken)) return NoContent();

      var user = await userManager.Users
          .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken
              && u.RefreshTokenExpiry > DateTime.UtcNow);
      if (user == null) return Unauthorized("Invalid refresh token");

      await SetRefreshTokenCookie(user);

      return await user.ToDto(tokenService);
    }

    private async Task SetRefreshTokenCookie(AppUser user)
    {
      var refreshToken = tokenService.GenerateRefreshToken();
      user.RefreshToken = refreshToken;
      user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);

      await userManager.UpdateAsync(user);

      var cookieOptions = new CookieOptions
      {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Expires = DateTime.UtcNow.AddDays(7)
      };

      Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
    }

    [HttpPost("logout")]
    public async Task<ActionResult> Logout()
    {
      var refreshToken = Request.Cookies["refreshToken"];
      if (!string.IsNullOrEmpty(refreshToken))
      {
        var user = await userManager.Users
            .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);

        if (user != null)
        {
          user.RefreshToken = null;
          user.RefreshTokenExpiry = null;
          await userManager.UpdateAsync(user);
        }
      }

      // Delete cookie (must match cookie options you used when setting it)
      Response.Cookies.Delete("refreshToken", new CookieOptions
      {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict
      });

      return Ok();
    }
  }
}
