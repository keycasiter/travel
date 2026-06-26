package app

import (
	"errors"
	"fmt"
	"net/url"
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
	input, err := searchPlacesInputFromQuery(c.Request.URL.Query())
	if err != nil {
		httpx.Fail(c, 400, "BAD_REQUEST", err.Error())
		return
	}

	places, err := h.client.SearchPlaces(c.Request.Context(), input)
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

func (h *mapHandler) suggestPlaces(c *gin.Context) {
	input, err := suggestPlacesInputFromQuery(c.Request.URL.Query())
	if err != nil {
		httpx.Fail(c, 400, "BAD_REQUEST", err.Error())
		return
	}

	places, err := h.client.SuggestPlaces(c.Request.Context(), input)
	if err == nil {
		httpx.OK(c, places)
		return
	}
	if errors.Is(err, tencentmap.ErrInvalidInput) {
		httpx.Fail(c, 400, "BAD_REQUEST", "keyword is required")
		return
	}
	if errors.Is(err, tencentmap.ErrMissingConfig) {
		httpx.Fail(c, 503, "MAP_CONFIG_MISSING", "TENCENT_MAP_KEY and TENCENT_MAP_SECRET are required")
		return
	}
	httpx.Fail(c, 502, "TENCENT_MAP_SUGGEST_FAILED", err.Error())
}

func (h *mapHandler) locationContext(c *gin.Context) {
	input, err := locationContextInputFromQuery(c.Request.URL.Query())
	if err != nil {
		httpx.Fail(c, 400, "BAD_REQUEST", err.Error())
		return
	}

	context, err := h.client.DescribeLocation(c.Request.Context(), input)
	if err == nil {
		httpx.OK(c, context)
		return
	}
	if errors.Is(err, tencentmap.ErrInvalidInput) {
		httpx.Fail(c, 400, "BAD_REQUEST", "lat and lng are required")
		return
	}
	if errors.Is(err, tencentmap.ErrMissingConfig) {
		httpx.Fail(c, 503, "MAP_CONFIG_MISSING", "TENCENT_MAP_KEY and TENCENT_MAP_SECRET are required")
		return
	}
	httpx.Fail(c, 502, "TENCENT_MAP_GEOCODER_FAILED", err.Error())
}

func (h *mapHandler) routePreview(c *gin.Context) {
	input, err := routePreviewInputFromQuery(c.Request.URL.Query())
	if err != nil {
		httpx.Fail(c, 400, "BAD_REQUEST", err.Error())
		return
	}

	routes, err := h.client.PreviewRoutes(c.Request.Context(), input)
	if err == nil {
		httpx.OK(c, routes)
		return
	}
	if errors.Is(err, tencentmap.ErrInvalidInput) {
		httpx.Fail(c, 400, "BAD_REQUEST", "fromLat, fromLng, toLat and toLng are required")
		return
	}
	if errors.Is(err, tencentmap.ErrMissingConfig) {
		httpx.Fail(c, 503, "MAP_CONFIG_MISSING", "TENCENT_MAP_KEY and TENCENT_MAP_SECRET are required")
		return
	}
	httpx.Fail(c, 502, "TENCENT_MAP_ROUTE_FAILED", err.Error())
}

func searchPlacesInputFromQuery(values url.Values) (tencentmap.SearchPlacesInput, error) {
	keyword := strings.TrimSpace(values.Get("keyword"))
	if keyword == "" {
		return tencentmap.SearchPlacesInput{}, fmt.Errorf("keyword is required")
	}
	pageSize, err := parseOptionalIntValue(values, "pageSize")
	if err != nil {
		return tencentmap.SearchPlacesInput{}, err
	}
	categories := parseCategories(values)
	mode := strings.TrimSpace(values.Get("boundary"))
	if mode == "" || mode == string(tencentmap.BoundaryNearby) {
		lat, err := parseRequiredFloatValue(values, "lat")
		if err != nil {
			return tencentmap.SearchPlacesInput{}, err
		}
		lng, err := parseRequiredFloatValue(values, "lng")
		if err != nil {
			return tencentmap.SearchPlacesInput{}, err
		}
		radiusMeters, err := parseOptionalIntValue(values, "radiusMeters")
		if err != nil {
			return tencentmap.SearchPlacesInput{}, err
		}
		return tencentmap.SearchPlacesInput{
			Keyword:      keyword,
			CenterLat:    lat,
			CenterLng:    lng,
			RadiusMeters: radiusMeters,
			PageSize:     pageSize,
			Categories:   categories,
			Boundary:     tencentmap.SearchBoundary{Mode: tencentmap.BoundaryNearby},
		}, nil
	}
	if mode == string(tencentmap.BoundaryRectangle) {
		swLat, err := parseRequiredFloatValue(values, "swLat")
		if err != nil {
			return tencentmap.SearchPlacesInput{}, err
		}
		swLng, err := parseRequiredFloatValue(values, "swLng")
		if err != nil {
			return tencentmap.SearchPlacesInput{}, err
		}
		neLat, err := parseRequiredFloatValue(values, "neLat")
		if err != nil {
			return tencentmap.SearchPlacesInput{}, err
		}
		neLng, err := parseRequiredFloatValue(values, "neLng")
		if err != nil {
			return tencentmap.SearchPlacesInput{}, err
		}
		return tencentmap.SearchPlacesInput{
			Keyword:    keyword,
			PageSize:   pageSize,
			Categories: categories,
			Boundary: tencentmap.SearchBoundary{
				Mode:      tencentmap.BoundaryRectangle,
				Southwest: tencentmap.Location{Lat: swLat, Lng: swLng},
				Northeast: tencentmap.Location{Lat: neLat, Lng: neLng},
			},
		}, nil
	}
	return tencentmap.SearchPlacesInput{}, fmt.Errorf("boundary must be nearby or rectangle")
}

func locationContextInputFromQuery(values url.Values) (tencentmap.LocationContextInput, error) {
	lat, err := parseRequiredFloatValue(values, "lat")
	if err != nil {
		return tencentmap.LocationContextInput{}, err
	}
	lng, err := parseRequiredFloatValue(values, "lng")
	if err != nil {
		return tencentmap.LocationContextInput{}, err
	}
	radiusMeters, err := parseOptionalIntValue(values, "radiusMeters")
	if err != nil {
		return tencentmap.LocationContextInput{}, err
	}
	pageSize, err := parseOptionalIntValue(values, "pageSize")
	if err != nil {
		return tencentmap.LocationContextInput{}, err
	}
	return tencentmap.LocationContextInput{
		Location:     tencentmap.Location{Lat: lat, Lng: lng},
		RadiusMeters: radiusMeters,
		PageSize:     pageSize,
	}, nil
}

func routePreviewInputFromQuery(values url.Values) (tencentmap.RoutePreviewInput, error) {
	fromLat, err := parseRequiredFloatValue(values, "fromLat")
	if err != nil {
		return tencentmap.RoutePreviewInput{}, err
	}
	fromLng, err := parseRequiredFloatValue(values, "fromLng")
	if err != nil {
		return tencentmap.RoutePreviewInput{}, err
	}
	toLat, err := parseRequiredFloatValue(values, "toLat")
	if err != nil {
		return tencentmap.RoutePreviewInput{}, err
	}
	toLng, err := parseRequiredFloatValue(values, "toLng")
	if err != nil {
		return tencentmap.RoutePreviewInput{}, err
	}
	return tencentmap.RoutePreviewInput{
		From:  tencentmap.Location{Lat: fromLat, Lng: fromLng},
		To:    tencentmap.Location{Lat: toLat, Lng: toLng},
		Modes: parseRouteModes(values),
	}, nil
}

func suggestPlacesInputFromQuery(values url.Values) (tencentmap.SuggestPlacesInput, error) {
	keyword := strings.TrimSpace(values.Get("keyword"))
	if keyword == "" {
		return tencentmap.SuggestPlacesInput{}, fmt.Errorf("keyword is required")
	}
	pageSize, err := parseOptionalIntValue(values, "pageSize")
	if err != nil {
		return tencentmap.SuggestPlacesInput{}, err
	}
	input := tencentmap.SuggestPlacesInput{
		Keyword:    keyword,
		Region:     strings.TrimSpace(values.Get("region")),
		RegionFix:  parseBoolValue(values.Get("regionFix")),
		Categories: parseCategories(values),
		PageSize:   pageSize,
	}
	latValue := strings.TrimSpace(values.Get("lat"))
	lngValue := strings.TrimSpace(values.Get("lng"))
	if latValue == "" && lngValue == "" {
		return input, nil
	}
	if latValue == "" || lngValue == "" {
		return tencentmap.SuggestPlacesInput{}, fmt.Errorf("lat and lng must be provided together")
	}
	lat, err := parseRequiredFloatValue(values, "lat")
	if err != nil {
		return tencentmap.SuggestPlacesInput{}, err
	}
	lng, err := parseRequiredFloatValue(values, "lng")
	if err != nil {
		return tencentmap.SuggestPlacesInput{}, err
	}
	input.Center = &tencentmap.Location{Lat: lat, Lng: lng}
	return input, nil
}

func parseRequiredFloatValue(values url.Values, key string) (float64, error) {
	value := strings.TrimSpace(values.Get(key))
	if value == "" {
		return 0, fmt.Errorf("%s is required", key)
	}
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return 0, fmt.Errorf("%s must be numeric", key)
	}
	return parsed, nil
}

func parseOptionalIntValue(values url.Values, key string) (int, error) {
	value := strings.TrimSpace(values.Get(key))
	if value == "" {
		return 0, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("%s must be numeric", key)
	}
	return parsed, nil
}

func parseCategories(values url.Values) []string {
	rawValues := append([]string{}, values["category"]...)
	rawValues = append(rawValues, values["categories"]...)
	categories := make([]string, 0, len(rawValues))
	for _, raw := range rawValues {
		for _, part := range strings.Split(raw, ",") {
			value := strings.TrimSpace(part)
			if value != "" {
				categories = append(categories, value)
			}
		}
	}
	return categories
}

func parseRouteModes(values url.Values) []tencentmap.RouteMode {
	rawValues := append([]string{}, values["mode"]...)
	rawValues = append(rawValues, values["modes"]...)
	modes := make([]tencentmap.RouteMode, 0, len(rawValues))
	for _, raw := range rawValues {
		for _, part := range strings.Split(raw, ",") {
			switch strings.ToLower(strings.TrimSpace(part)) {
			case string(tencentmap.RouteModeWalking):
				modes = append(modes, tencentmap.RouteModeWalking)
			case string(tencentmap.RouteModeTransit):
				modes = append(modes, tencentmap.RouteModeTransit)
			case string(tencentmap.RouteModeDriving):
				modes = append(modes, tencentmap.RouteModeDriving)
			}
		}
	}
	return modes
}

func parseBoolValue(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes":
		return true
	default:
		return false
	}
}
