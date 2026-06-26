package app

import (
	"travel/apps/api/internal/auth"
	"travel/apps/api/internal/content"
	"travel/apps/api/internal/favorite"
	"travel/apps/api/internal/httpx"
	"travel/apps/api/internal/itinerary"
	"travel/apps/api/internal/tencentmap"
	"travel/apps/api/internal/weather"

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

	contentHandler := content.NewHandler(content.NewRepository(a.DB))
	api.GET("/regions", contentHandler.ListRegions)
	api.GET("/regions/:id/overview", contentHandler.GetOverview)
	api.GET("/regions/:id/services", contentHandler.ListServices)
	api.GET("/regions/:id/pois", contentHandler.ListPOIs)
	api.GET("/regions/:id/guides", contentHandler.ListGuides)

	mapHandler := newMapHandler(tencentmap.NewClient(tencentmap.Config{
		Key:     a.Config.TencentMapKey,
		Secret:  a.Config.TencentMapSecret,
		BaseURL: a.Config.TencentMapBaseURL,
	}))
	api.GET("/map/places/search", mapHandler.searchPlaces)
	api.GET("/map/places/suggest", mapHandler.suggestPlaces)

	itineraryHandler := itinerary.NewHandler(itinerary.NewRepository(a.DB))
	api.POST("/itineraries/generate", itineraryHandler.Generate)
	api.GET("/itineraries", itineraryHandler.List)
	api.GET("/itineraries/:id", itineraryHandler.Detail)
	api.PATCH("/itineraries/:id", itineraryHandler.PatchItinerary)
	api.PATCH("/itinerary-items/:id", itineraryHandler.PatchItem)
	api.POST("/itineraries/:id/share", itineraryHandler.CreateShare)
	api.GET("/shares/:shareCode", itineraryHandler.GetShare)
	api.POST("/shares/:shareCode/copy", itineraryHandler.CopyShare)

	favoriteHandler := favorite.NewHandler(favorite.NewRepository(a.DB))
	api.GET("/favorites", favoriteHandler.List)
	api.POST("/favorites", favoriteHandler.Create)
	api.DELETE("/favorites/:id", favoriteHandler.Delete)

	weatherHandler := weather.NewHandler(a.DB)
	api.GET("/weather/summary", weatherHandler.Summary)

	return router
}
