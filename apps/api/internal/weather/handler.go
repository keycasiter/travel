package weather

import (
	"travel/apps/api/internal/httpx"
	"travel/apps/api/internal/model"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

func (h *Handler) Summary(c *gin.Context) {
	regionID := c.Query("regionId")
	if regionID == "" {
		httpx.Fail(c, 400, "BAD_REQUEST", "regionId is required")
		return
	}

	var summary model.WeatherSummary
	if err := h.db.WithContext(c.Request.Context()).Where("region_id = ?", regionID).First(&summary).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			httpx.Fail(c, 404, "WEATHER_NOT_FOUND", "weather summary not found")
			return
		}
		httpx.Fail(c, 500, "WEATHER_ERROR", err.Error())
		return
	}
	httpx.OK(c, summary)
}
