package tencentmap

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"
)

const (
	placeSearchPath     = "/ws/place/v1/search"
	placeSuggestionPath = "/ws/place/v1/suggestion"
)

var (
	ErrMissingConfig = errors.New("tencent map key and secret are required")
	ErrInvalidInput  = errors.New("invalid tencent map search input")
)

type Config struct {
	Key        string
	Secret     string
	BaseURL    string
	HTTPClient *http.Client
}

type Client struct {
	key        string
	secret     string
	baseURL    string
	httpClient *http.Client
}

type SearchPlacesInput struct {
	Keyword      string
	CenterLat    float64
	CenterLng    float64
	RadiusMeters int
	PageSize     int
	Boundary     SearchBoundary
	Categories   []string
	AutoExtend   bool
}

type BoundaryMode string

const (
	BoundaryNearby    BoundaryMode = "nearby"
	BoundaryRectangle BoundaryMode = "rectangle"
)

type SearchBoundary struct {
	Mode      BoundaryMode
	Southwest Location
	Northeast Location
}

type SuggestPlacesInput struct {
	Keyword    string
	Center     *Location
	Region     string
	RegionFix  bool
	Categories []string
	PageSize   int
}

type Place struct {
	ID       string   `json:"id"`
	Title    string   `json:"title"`
	Address  string   `json:"address"`
	Category string   `json:"category"`
	Location Location `json:"location"`
	Distance *float64 `json:"distance,omitempty"`
}

type Location struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type tencentPlaceSearchResponse struct {
	Status  int            `json:"status"`
	Message string         `json:"message"`
	Data    []tencentPlace `json:"data"`
}

type tencentPlace struct {
	ID       string   `json:"id"`
	Title    string   `json:"title"`
	Address  string   `json:"address"`
	Category string   `json:"category"`
	Location Location `json:"location"`
	Distance *float64 `json:"_distance"`
}

func NewClient(cfg Config) *Client {
	baseURL := strings.TrimRight(cfg.BaseURL, "/")
	if baseURL == "" {
		baseURL = "https://apis.map.qq.com"
	}
	httpClient := cfg.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 5 * time.Second}
	}
	return &Client{
		key:        strings.TrimSpace(cfg.Key),
		secret:     strings.TrimSpace(cfg.Secret),
		baseURL:    baseURL,
		httpClient: httpClient,
	}
}

func (c *Client) SearchPlaces(ctx context.Context, input SearchPlacesInput) ([]Place, error) {
	params, err := c.searchParams(input)
	if err != nil {
		return nil, err
	}

	return c.requestPlaces(ctx, placeSearchPath, params)
}

func (c *Client) SuggestPlaces(ctx context.Context, input SuggestPlacesInput) ([]Place, error) {
	params, err := c.suggestionParams(input)
	if err != nil {
		return nil, err
	}

	return c.requestPlaces(ctx, placeSuggestionPath, params)
}

func (c *Client) requestPlaces(ctx context.Context, path string, params map[string]string) ([]Place, error) {
	endpoint, err := url.Parse(c.baseURL + path)
	if err != nil {
		return nil, fmt.Errorf("parse tencent map url: %w", err)
	}
	query := url.Values{}
	for key, value := range params {
		query.Set(key, value)
	}
	query.Set("sig", signQuery(path, params, c.secret))
	endpoint.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("build tencent map request: %w", err)
	}
	req.Header.Set("x-legacy-url-decode", "no")

	res, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request tencent map: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode >= 400 {
		return nil, fmt.Errorf("tencent map http %d", res.StatusCode)
	}
	var body tencentPlaceSearchResponse
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("decode tencent map response: %w", err)
	}
	if body.Status != 0 {
		return nil, fmt.Errorf("tencent map status %d: %s", body.Status, body.Message)
	}
	return normalizePlaces(body.Data), nil
}

func (c *Client) searchParams(input SearchPlacesInput) (map[string]string, error) {
	if c.key == "" || c.secret == "" {
		return nil, ErrMissingConfig
	}
	keyword := strings.TrimSpace(input.Keyword)
	if keyword == "" {
		return nil, ErrInvalidInput
	}
	pageSize := clampInt(input.PageSize, 1, 20, 20)
	params := map[string]string{
		"key":        c.key,
		"keyword":    keyword,
		"page_index": "1",
		"page_size":  strconv.Itoa(pageSize),
	}
	if categories := normalizeCategories(input.Categories); len(categories) > 0 {
		params["filter"] = "category=" + strings.Join(categories, ",")
	}

	switch input.Boundary.Mode {
	case BoundaryRectangle:
		if !isFiniteCoord(input.Boundary.Southwest.Lat) ||
			!isFiniteCoord(input.Boundary.Southwest.Lng) ||
			!isFiniteCoord(input.Boundary.Northeast.Lat) ||
			!isFiniteCoord(input.Boundary.Northeast.Lng) {
			return nil, ErrInvalidInput
		}
		params["boundary"] = fmt.Sprintf(
			"rectangle(%s,%s,%s,%s)",
			formatFloat(input.Boundary.Southwest.Lat),
			formatFloat(input.Boundary.Southwest.Lng),
			formatFloat(input.Boundary.Northeast.Lat),
			formatFloat(input.Boundary.Northeast.Lng),
		)
	case "", BoundaryNearby:
		if !isFiniteCoord(input.CenterLat) || !isFiniteCoord(input.CenterLng) {
			return nil, ErrInvalidInput
		}
		radiusMeters := clampInt(input.RadiusMeters, 100, 1000, 1000)
		autoExtend := 0
		if input.AutoExtend {
			autoExtend = 1
		}
		params["boundary"] = fmt.Sprintf(
			"nearby(%s,%s,%d,%d)",
			formatFloat(input.CenterLat),
			formatFloat(input.CenterLng),
			radiusMeters,
			autoExtend,
		)
		params["orderby"] = "_distance"
	default:
		return nil, ErrInvalidInput
	}

	return params, nil
}

func (c *Client) suggestionParams(input SuggestPlacesInput) (map[string]string, error) {
	if c.key == "" || c.secret == "" {
		return nil, ErrMissingConfig
	}
	keyword := strings.TrimSpace(input.Keyword)
	if keyword == "" {
		return nil, ErrInvalidInput
	}
	pageSize := clampInt(input.PageSize, 1, 20, 10)
	params := map[string]string{
		"key":       c.key,
		"keyword":   keyword,
		"page_size": strconv.Itoa(pageSize),
	}
	if input.Center != nil {
		if !isFiniteCoord(input.Center.Lat) || !isFiniteCoord(input.Center.Lng) {
			return nil, ErrInvalidInput
		}
		params["location"] = formatFloat(input.Center.Lat) + "," + formatFloat(input.Center.Lng)
	}
	if region := strings.TrimSpace(input.Region); region != "" {
		params["region"] = region
		if input.RegionFix {
			params["region_fix"] = "1"
		}
	}
	if categories := normalizeCategories(input.Categories); len(categories) > 0 {
		params["filter"] = "category=" + strings.Join(categories, ",")
	}
	return params, nil
}

func signQuery(path string, params map[string]string, secret string) string {
	keys := make([]string, 0, len(params))
	for key := range params {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, key+"="+params[key])
	}
	sum := md5.Sum([]byte(path + "?" + strings.Join(parts, "&") + secret))
	return hex.EncodeToString(sum[:])
}

func normalizePlaces(items []tencentPlace) []Place {
	places := make([]Place, 0, len(items))
	for _, item := range items {
		if item.Location.Lat == 0 && item.Location.Lng == 0 {
			continue
		}
		places = append(places, Place{
			ID:       item.ID,
			Title:    item.Title,
			Address:  item.Address,
			Category: item.Category,
			Location: item.Location,
			Distance: item.Distance,
		})
	}
	return places
}

func clampInt(value int, min int, max int, fallback int) int {
	if value == 0 {
		return fallback
	}
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func normalizeCategories(categories []string) []string {
	seen := make(map[string]struct{}, len(categories))
	normalized := make([]string, 0, len(categories))
	for _, category := range categories {
		value := strings.TrimSpace(category)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		normalized = append(normalized, value)
		if len(normalized) == 5 {
			break
		}
	}
	return normalized
}

func formatFloat(value float64) string {
	return strconv.FormatFloat(value, 'f', -1, 64)
}

func isFiniteCoord(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}
