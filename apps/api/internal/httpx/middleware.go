package httpx

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

const userIDKey = "userID"

func UserIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		raw := c.GetHeader("X-User-ID")
		if raw == "" {
			c.Next()
			return
		}
		userID, err := strconv.ParseUint(raw, 10, 64)
		if err != nil || userID == 0 {
			Fail(c, 401, "AUTH_REQUIRED", "invalid X-User-ID")
			c.Abort()
			return
		}
		c.Set(userIDKey, userID)
		c.Next()
	}
}

func RequireUserID(c *gin.Context) (uint64, bool) {
	value, ok := c.Get(userIDKey)
	if !ok {
		Fail(c, 401, "AUTH_REQUIRED", "X-User-ID is required")
		return 0, false
	}
	userID, ok := value.(uint64)
	if !ok || userID == 0 {
		Fail(c, 401, "AUTH_REQUIRED", "X-User-ID is required")
		return 0, false
	}
	return userID, true
}
