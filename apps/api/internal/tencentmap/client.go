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
	geocoderPath        = "/ws/geocoder/v1/"
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

type LocationContextInput struct {
	Location     Location
	RadiusMeters int
	PageSize     int
}

type LocationContext struct {
	Location         Location `json:"location"`
	Address          string   `json:"address"`
	RecommendAddress string   `json:"recommendAddress"`
	Province         string   `json:"province"`
	City             string   `json:"city"`
	District         string   `json:"district"`
	Street           string   `json:"street"`
	POIs             []Place  `json:"pois"`
}

type RouteMode string

const (
	RouteModeWalking RouteMode = "walking"
	RouteModeDriving RouteMode = "driving"
	RouteModeTransit RouteMode = "transit"
)

type RoutePreviewInput struct {
	From  Location
	To    Location
	Modes []RouteMode
}

type RoutePlan struct {
	Mode            RouteMode `json:"mode"`
	DistanceMeters  int       `json:"distanceMeters"`
	DurationMinutes int       `json:"durationMinutes"`
	Direction       string    `json:"direction,omitempty"`
	TaxiFareYuan    *float64  `json:"taxiFareYuan,omitempty"`
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

type tencentGeocoderResponse struct {
	Status  int                   `json:"status"`
	Message string                `json:"message"`
	Result  tencentGeocoderResult `json:"result"`
}

type tencentGeocoderResult struct {
	Location           Location                  `json:"location"`
	Address            string                    `json:"address"`
	FormattedAddresses tencentFormattedAddresses `json:"formatted_addresses"`
	AddressComponent   tencentAddressComponent   `json:"address_component"`
	POIs               []tencentPlace            `json:"pois"`
}

type tencentFormattedAddresses struct {
	Recommend string `json:"recommend"`
	Rough     string `json:"rough"`
}

type tencentAddressComponent struct {
	Province string `json:"province"`
	City     string `json:"city"`
	District string `json:"district"`
	Street   string `json:"street"`
}

type tencentDirectionResponse struct {
	Status  int                    `json:"status"`
	Message string                 `json:"message"`
	Result  tencentDirectionResult `json:"result"`
}

type tencentDirectionResult struct {
	Routes []tencentRoute `json:"routes"`
}

type tencentRoute struct {
	Mode      string           `json:"mode"`
	Distance  int              `json:"distance"`
	Duration  int              `json:"duration"`
	Direction string           `json:"direction"`
	TaxiFare  *tencentTaxiFare `json:"taxi_fare"`
}

type tencentTaxiFare struct {
	Fare float64 `json:"fare"`
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

func (c *Client) DescribeLocation(ctx context.Context, input LocationContextInput) (LocationContext, error) {
	params, err := c.locationContextParams(input)
	if err != nil {
		return LocationContext{}, err
	}

	var body tencentGeocoderResponse
	if err := c.requestJSON(ctx, geocoderPath, params, &body); err != nil {
		return LocationContext{}, err
	}
	if body.Status != 0 {
		return LocationContext{}, fmt.Errorf("tencent map status %d: %s", body.Status, body.Message)
	}
	return normalizeLocationContext(body.Result), nil
}

func (c *Client) PreviewRoutes(ctx context.Context, input RoutePreviewInput) ([]RoutePlan, error) {
	if c.key == "" || c.secret == "" {
		return nil, ErrMissingConfig
	}
	if !isFiniteCoord(input.From.Lat) ||
		!isFiniteCoord(input.From.Lng) ||
		!isFiniteCoord(input.To.Lat) ||
		!isFiniteCoord(input.To.Lng) {
		return nil, ErrInvalidInput
	}
	modes := normalizeRouteModes(input.Modes)
	routes := make([]RoutePlan, 0, len(modes))
	for _, mode := range modes {
		plan, err := c.previewRoute(ctx, input.From, input.To, mode)
		if err != nil {
			continue
		}
		routes = append(routes, plan)
	}
	if len(routes) == 0 {
		return nil, fmt.Errorf("no tencent map route preview available")
	}
	return routes, nil
}

func (c *Client) previewRoute(ctx context.Context, from Location, to Location, mode RouteMode) (RoutePlan, error) {
	path := directionPath(mode)
	if path == "" {
		return RoutePlan{}, ErrInvalidInput
	}
	params := map[string]string{
		"from": formatLocation(from),
		"key":  c.key,
		"to":   formatLocation(to),
	}
	if mode == RouteModeTransit {
		params["policy"] = "LEAST_TIME"
	}
	var body tencentDirectionResponse
	if err := c.requestJSON(ctx, path, params, &body); err != nil {
		return RoutePlan{}, err
	}
	if body.Status != 0 {
		return RoutePlan{}, fmt.Errorf("tencent map status %d: %s", body.Status, body.Message)
	}
	if len(body.Result.Routes) == 0 {
		return RoutePlan{}, fmt.Errorf("tencent map route empty")
	}
	return normalizeRoutePlan(mode, body.Result.Routes[0]), nil
}

func (c *Client) requestPlaces(ctx context.Context, path string, params map[string]string) ([]Place, error) {
	var body tencentPlaceSearchResponse
	if err := c.requestJSON(ctx, path, params, &body); err != nil {
		return nil, err
	}
	if body.Status != 0 {
		return nil, fmt.Errorf("tencent map status %d: %s", body.Status, body.Message)
	}
	return normalizePlaces(body.Data), nil
}

func (c *Client) requestJSON(ctx context.Context, path string, params map[string]string, out any) error {
	endpoint, err := url.Parse(c.baseURL + path)
	if err != nil {
		return fmt.Errorf("parse tencent map url: %w", err)
	}
	query := url.Values{}
	for key, value := range params {
		query.Set(key, value)
	}
	query.Set("sig", signQuery(path, params, c.secret))
	endpoint.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return fmt.Errorf("build tencent map request: %w", err)
	}
	req.Header.Set("x-legacy-url-decode", "no")

	res, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request tencent map: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode >= 400 {
		return fmt.Errorf("tencent map http %d", res.StatusCode)
	}
	if err := json.NewDecoder(res.Body).Decode(out); err != nil {
		return fmt.Errorf("decode tencent map response: %w", err)
	}
	return nil
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

func (c *Client) locationContextParams(input LocationContextInput) (map[string]string, error) {
	if c.key == "" || c.secret == "" {
		return nil, ErrMissingConfig
	}
	if !isFiniteCoord(input.Location.Lat) || !isFiniteCoord(input.Location.Lng) {
		return nil, ErrInvalidInput
	}
	radiusMeters := clampInt(input.RadiusMeters, 1, 5000, 3000)
	pageSize := clampInt(input.PageSize, 1, 20, 10)
	return map[string]string{
		"get_poi":     "1",
		"key":         c.key,
		"location":    formatLocation(input.Location),
		"poi_options": fmt.Sprintf("radius=%d;page_size=%d;page_index=1;policy=2", radiusMeters, pageSize),
	}, nil
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

func normalizeLocationContext(result tencentGeocoderResult) LocationContext {
	return LocationContext{
		Location:         result.Location,
		Address:          result.Address,
		RecommendAddress: result.FormattedAddresses.Recommend,
		Province:         result.AddressComponent.Province,
		City:             result.AddressComponent.City,
		District:         result.AddressComponent.District,
		Street:           result.AddressComponent.Street,
		POIs:             normalizePlaces(result.POIs),
	}
}

func normalizeRoutePlan(mode RouteMode, route tencentRoute) RoutePlan {
	plan := RoutePlan{
		Mode:            mode,
		DistanceMeters:  route.Distance,
		DurationMinutes: route.Duration,
		Direction:       route.Direction,
	}
	if route.TaxiFare != nil {
		plan.TaxiFareYuan = &route.TaxiFare.Fare
	}
	return plan
}

func normalizeRouteModes(modes []RouteMode) []RouteMode {
	if len(modes) == 0 {
		return []RouteMode{RouteModeWalking, RouteModeTransit, RouteModeDriving}
	}
	allowed := map[RouteMode]struct{}{
		RouteModeWalking: {},
		RouteModeDriving: {},
		RouteModeTransit: {},
	}
	seen := make(map[RouteMode]struct{}, len(modes))
	normalized := make([]RouteMode, 0, len(modes))
	for _, mode := range modes {
		if _, ok := allowed[mode]; !ok {
			continue
		}
		if _, ok := seen[mode]; ok {
			continue
		}
		seen[mode] = struct{}{}
		normalized = append(normalized, mode)
	}
	if len(normalized) == 0 {
		return []RouteMode{RouteModeWalking, RouteModeTransit, RouteModeDriving}
	}
	return normalized
}

func directionPath(mode RouteMode) string {
	switch mode {
	case RouteModeWalking:
		return "/ws/direction/v1/walking/"
	case RouteModeDriving:
		return "/ws/direction/v1/driving/"
	case RouteModeTransit:
		return "/ws/direction/v1/transit/"
	default:
		return ""
	}
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

func formatLocation(location Location) string {
	return formatFloat(location.Lat) + "," + formatFloat(location.Lng)
}

func isFiniteCoord(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}
