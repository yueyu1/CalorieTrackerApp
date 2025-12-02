using System.Security.Claims;

namespace API.Extensions;

public static class HttpContextExtensions
{
    public static string GetCurrentUserId(this HttpContext httpContext)
    {
        var idClaim = httpContext.User?.FindFirst(ClaimTypes.NameIdentifier);
        return idClaim?.Value ?? throw new Exception("User id not found.");
    }
}
