package app

import (
	"travel/apps/api/internal/auth"
	"travel/apps/api/internal/httpx"

	"github.com/gin-gonic/gin"
)

func (a *App) Router() *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), httpx.UserIDMiddleware())

	router.GET("/healthz", func(c *gin.Context) {
		httpx.OK(c, gin.H{"status": "ok"})
	})

	api := router.Group("/api/v1")
	authHandler := auth.NewHandler(auth.NewService(a.DB))
	api.POST("/auth/wechat-login", authHandler.WechatLogin)

	return router
}
