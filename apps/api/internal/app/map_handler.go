package app

import (
	"errors"
	"strconv"
	"strings"

	"travel/apps/api/internal/httpx"
	"travel/apps/api/internal/tencentmap"

	"github.com/gin-gonic/gin"
)

type mapHandler struct {
	client *tencentmap.Client
}

func newMapHandler(client *tencentmap.Client) *mapHandler {
	return &mapHandler{client: client}
}

func (h *mapHandler) searchPlaces(c *gin.Context) {
	keyword := strings.TrimSpace(c.Query("keyword"))
	lat, ok := parseRequiredFloat(c, "lat")
	if !ok {
		return
	}
	lng, ok := parseRequiredFloat(c, "lng")
	if !ok {
		return
	}
	radiusMeters, ok := parseOptionalInt(c, "radiusMeters")
	if !ok {
		return
	}
	pageSize, ok := parseOptionalInt(c, "pageSize")
	if !ok {
		return
	}

	places, err := h.client.SearchPlaces(c.Request.Context(), tencentmap.SearchPlacesInput{
		Keyword:      keyword,
		CenterLat:    lat,
		CenterLng:    lng,
		RadiusMeters: radiusMeters,
		PageSize:     pageSize,
	})
	if err == nil {
		httpx.OK(c, places)
		return
	}
	if errors.Is(err, tencentmap.ErrInvalidInput) {
		httpx.Fail(c, 400, "BAD_REQUEST", "keyword, lat and lng are required")
		return
	}
	if errors.Is(err, tencentmap.ErrMissingConfig) {
		httpx.Fail(c, 503, "MAP_CONFIG_MISSING", "TENCENT_MAP_KEY and TENCENT_MAP_SECRET are required")
		return
	}
	httpx.Fail(c, 502, "TENCENT_MAP_SEARCH_FAILED", err.Error())
}

func parseRequiredFloat(c *gin.Context, key string) (float64, bool) {
	value := strings.TrimSpace(c.Query(key))
	if value == "" {
		httpx.Fail(c, 400, "BAD_REQUEST", key+" is required")
		return 0, false
	}
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		httpx.Fail(c, 400, "BAD_REQUEST", key+" must be numeric")
		return 0, false
	}
	return parsed, true
}

func parseOptionalInt(c *gin.Context, key string) (int, bool) {
	value := strings.TrimSpace(c.Query(key))
	if value == "" {
		return 0, true
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		httpx.Fail(c, 400, "BAD_REQUEST", key+" must be numeric")
		return 0, false
	}
	return parsed, true
}
