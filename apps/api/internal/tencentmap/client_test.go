package tencentmap

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
)

func TestSignQuerySortsRawParams(t *testing.T) {
	params := map[string]string{
		"page_size":  "20",
		"keyword":    "美食",
		"boundary":   "nearby(30.2,120.1,6000)",
		"orderby":    "_distance",
		"key":        "test-key",
		"page_index": "1",
	}

	got := signQuery("/ws/place/v1/search", params, "test-secret")
	if got != "b9805a44f4f812079a9f3387ac81d5b5" {
		t.Fatalf("unexpected signature: %s", got)
	}
}

func TestClientSearchPlacesSignsTencentRequest(t *testing.T) {
	const expectedSig = "c713c820cf3714c154ce33ff2360eb2a"
	var gotPath string
	var gotSig string
	var gotKeyword string
	httpClient := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		query := req.URL.Query()
		gotPath = req.URL.Path
		gotSig = query.Get("sig")
		gotKeyword = query.Get("keyword")
		payload, err := json.Marshal(map[string]any{
			"status": 0,
			"data": []map[string]any{
				{
					"id":        "poi-1",
					"title":     "西湖",
					"address":   "杭州西湖区",
					"category":  "旅游景点",
					"location":  map[string]float64{"lat": 30.2, "lng": 120.1},
					"_distance": 14300.64,
				},
			},
		})
		if err != nil {
			return nil, err
		}
		return &http.Response{
			StatusCode: 200,
			Header:     http.Header{"Content-Type": []string{"application/json"}},
			Body:       io.NopCloser(strings.NewReader(string(payload))),
		}, nil
	})}

	client := NewClient(Config{
		Key:        "test-key",
		Secret:     "test-secret",
		BaseURL:    "https://example.test",
		HTTPClient: httpClient,
	})
	results, err := client.SearchPlaces(context.Background(), SearchPlacesInput{
		Keyword:      "美食",
		CenterLat:    30.2,
		CenterLng:    120.1,
		RadiusMeters: 6000,
		PageSize:     20,
	})
	if err != nil {
		t.Fatalf("SearchPlaces returned error: %v", err)
	}
	if gotPath != "/ws/place/v1/search" {
		t.Fatalf("unexpected upstream path: %s", gotPath)
	}
	if gotSig != expectedSig {
		t.Fatalf("expected sig %s, got %s", expectedSig, gotSig)
	}
	if gotKeyword != "美食" {
		t.Fatalf("expected decoded keyword, got %q", gotKeyword)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].Title != "西湖" || results[0].Location.Lat != 30.2 || results[0].Location.Lng != 120.1 {
		t.Fatalf("unexpected result: %+v", results[0])
	}
	if results[0].Distance == nil || *results[0].Distance != 14300.64 {
		t.Fatalf("expected decimal distance, got %+v", results[0].Distance)
	}
}

func TestClientSearchPlacesUsesRectangleBoundaryAndCategoryFilter(t *testing.T) {
	var gotQuery map[string]string
	httpClient := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		query := req.URL.Query()
		gotQuery = map[string]string{
			"boundary":   query.Get("boundary"),
			"filter":     query.Get("filter"),
			"keyword":    query.Get("keyword"),
			"orderby":    query.Get("orderby"),
			"page_size":  query.Get("page_size"),
			"sig":        query.Get("sig"),
			"page_index": query.Get("page_index"),
		}
		return jsonResponse(map[string]any{"status": 0, "data": []map[string]any{}})
	})}

	client := NewClient(Config{
		Key:        "test-key",
		Secret:     "test-secret",
		BaseURL:    "https://example.test",
		HTTPClient: httpClient,
	})
	_, err := client.SearchPlaces(context.Background(), SearchPlacesInput{
		Keyword: "景点",
		Boundary: SearchBoundary{
			Mode:      BoundaryRectangle,
			Southwest: Location{Lat: 30.1, Lng: 120},
			Northeast: Location{Lat: 30.4, Lng: 120.3},
		},
		Categories: []string{"旅游景点", "文化场馆"},
		PageSize:   10,
	})
	if err != nil {
		t.Fatalf("SearchPlaces returned error: %v", err)
	}

	expectedParams := map[string]string{
		"boundary":   "rectangle(30.1,120,30.4,120.3)",
		"filter":     "category=旅游景点,文化场馆",
		"key":        "test-key",
		"keyword":    "景点",
		"page_index": "1",
		"page_size":  "10",
	}
	if gotQuery["boundary"] != expectedParams["boundary"] {
		t.Fatalf("expected rectangle boundary, got %q", gotQuery["boundary"])
	}
	if gotQuery["filter"] != expectedParams["filter"] {
		t.Fatalf("expected category filter, got %q", gotQuery["filter"])
	}
	if gotQuery["orderby"] != "" {
		t.Fatalf("rectangle search should not send orderby, got %q", gotQuery["orderby"])
	}
	if gotQuery["sig"] != signQuery(placeSearchPath, expectedParams, "test-secret") {
		t.Fatalf("unexpected signed query: %+v", gotQuery)
	}
}

func TestClientSearchPlacesClampsNearbyRadiusAndDisablesAutoExtend(t *testing.T) {
	var gotBoundary string
	var gotAutoExtend string
	httpClient := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		query := req.URL.Query()
		gotBoundary = query.Get("boundary")
		gotAutoExtend = query.Get("auto_extend")
		return jsonResponse(map[string]any{"status": 0, "data": []map[string]any{}})
	})}

	client := NewClient(Config{
		Key:        "test-key",
		Secret:     "test-secret",
		BaseURL:    "https://example.test",
		HTTPClient: httpClient,
	})
	_, err := client.SearchPlaces(context.Background(), SearchPlacesInput{
		Keyword:      "美食",
		CenterLat:    30.2,
		CenterLng:    120.1,
		RadiusMeters: 6000,
		PageSize:     20,
	})
	if err != nil {
		t.Fatalf("SearchPlaces returned error: %v", err)
	}
	if gotBoundary != "nearby(30.2,120.1,1000,0)" {
		t.Fatalf("expected nearby radius to clamp to Tencent limit, got %q", gotBoundary)
	}
	if gotAutoExtend != "" {
		t.Fatalf("nearby auto_extend should be encoded in boundary, got query param %q", gotAutoExtend)
	}
}

func TestClientSuggestPlacesSignsTencentRequest(t *testing.T) {
	var gotPath string
	var gotQuery map[string]string
	httpClient := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		query := req.URL.Query()
		gotPath = req.URL.Path
		gotQuery = map[string]string{
			"keyword":   query.Get("keyword"),
			"location":  query.Get("location"),
			"filter":    query.Get("filter"),
			"page_size": query.Get("page_size"),
			"sig":       query.Get("sig"),
		}
		return jsonResponse(map[string]any{
			"status": 0,
			"data": []map[string]any{
				{
					"id":       "suggest-1",
					"title":    "西湖风景名胜区",
					"address":  "杭州市西湖区",
					"category": "旅游景点",
					"location": map[string]float64{"lat": 30.244, "lng": 120.141},
				},
			},
		})
	})}

	client := NewClient(Config{
		Key:        "test-key",
		Secret:     "test-secret",
		BaseURL:    "https://example.test",
		HTTPClient: httpClient,
	})
	results, err := client.SuggestPlaces(context.Background(), SuggestPlacesInput{
		Keyword:    "西湖",
		Center:     &Location{Lat: 30.2, Lng: 120.1},
		Categories: []string{"旅游景点"},
		PageSize:   5,
	})
	if err != nil {
		t.Fatalf("SuggestPlaces returned error: %v", err)
	}

	expectedParams := map[string]string{
		"filter":    "category=旅游景点",
		"key":       "test-key",
		"keyword":   "西湖",
		"location":  "30.2,120.1",
		"page_size": "5",
	}
	if gotPath != placeSuggestionPath {
		t.Fatalf("unexpected upstream path: %s", gotPath)
	}
	if gotQuery["sig"] != signQuery(placeSuggestionPath, expectedParams, "test-secret") {
		t.Fatalf("unexpected signed suggestion query: %+v", gotQuery)
	}
	if len(results) != 1 || results[0].Title != "西湖风景名胜区" {
		t.Fatalf("unexpected suggestion results: %+v", results)
	}
}

func TestClientDescribeLocationSignsTencentRequest(t *testing.T) {
	var gotPath string
	var gotQuery map[string]string
	httpClient := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		query := req.URL.Query()
		gotPath = req.URL.Path
		gotQuery = map[string]string{
			"location":    query.Get("location"),
			"get_poi":     query.Get("get_poi"),
			"poi_options": query.Get("poi_options"),
			"sig":         query.Get("sig"),
		}
		return jsonResponse(map[string]any{
			"status": 0,
			"result": map[string]any{
				"address": "浙江省杭州市西湖区龙井路1号",
				"formatted_addresses": map[string]string{
					"recommend": "西湖风景名胜区附近",
				},
				"address_component": map[string]string{
					"province": "浙江省",
					"city":     "杭州市",
					"district": "西湖区",
				},
				"pois": []map[string]any{
					{
						"id":        "poi-1",
						"title":     "西湖风景名胜区",
						"address":   "龙井路1号",
						"category":  "旅游景点:国家级景点",
						"location":  map[string]float64{"lat": 30.221378, "lng": 120.121431},
						"_distance": 318,
					},
				},
			},
		})
	})}

	client := NewClient(Config{
		Key:        "test-key",
		Secret:     "test-secret",
		BaseURL:    "https://example.test",
		HTTPClient: httpClient,
	})
	result, err := client.DescribeLocation(context.Background(), LocationContextInput{
		Location:     Location{Lat: 30.2, Lng: 120.1},
		RadiusMeters: 5000,
		PageSize:     5,
	})
	if err != nil {
		t.Fatalf("DescribeLocation returned error: %v", err)
	}

	expectedParams := map[string]string{
		"get_poi":     "1",
		"key":         "test-key",
		"location":    "30.2,120.1",
		"poi_options": "radius=5000;page_size=5;page_index=1;policy=2",
	}
	if gotPath != geocoderPath {
		t.Fatalf("unexpected upstream path: %s", gotPath)
	}
	if gotQuery["sig"] != signQuery(geocoderPath, expectedParams, "test-secret") {
		t.Fatalf("unexpected signed geocoder query: %+v", gotQuery)
	}
	if result.RecommendAddress != "西湖风景名胜区附近" || result.City != "杭州市" || result.District != "西湖区" {
		t.Fatalf("unexpected location context: %+v", result)
	}
	if len(result.POIs) != 1 || result.POIs[0].Title != "西湖风景名胜区" {
		t.Fatalf("unexpected context POIs: %+v", result.POIs)
	}
}

func TestClientPreviewRoutesSignsTencentRequest(t *testing.T) {
	var gotPath string
	var gotQuery map[string]string
	httpClient := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		query := req.URL.Query()
		gotPath = req.URL.Path
		gotQuery = map[string]string{
			"from": query.Get("from"),
			"to":   query.Get("to"),
			"sig":  query.Get("sig"),
		}
		return jsonResponse(map[string]any{
			"status": 0,
			"result": map[string]any{
				"routes": []map[string]any{
					{
						"mode":      "WALKING",
						"distance":  980,
						"duration":  12,
						"direction": "东",
					},
				},
			},
		})
	})}

	client := NewClient(Config{
		Key:        "test-key",
		Secret:     "test-secret",
		BaseURL:    "https://example.test",
		HTTPClient: httpClient,
	})
	routes, err := client.PreviewRoutes(context.Background(), RoutePreviewInput{
		From:  Location{Lat: 30.2, Lng: 120.1},
		To:    Location{Lat: 30.221378, Lng: 120.121431},
		Modes: []RouteMode{RouteModeWalking},
	})
	if err != nil {
		t.Fatalf("PreviewRoutes returned error: %v", err)
	}

	expectedParams := map[string]string{
		"from": "30.2,120.1",
		"key":  "test-key",
		"to":   "30.221378,120.121431",
	}
	if gotPath != "/ws/direction/v1/walking/" {
		t.Fatalf("unexpected upstream path: %s", gotPath)
	}
	if gotQuery["sig"] != signQuery("/ws/direction/v1/walking/", expectedParams, "test-secret") {
		t.Fatalf("unexpected signed direction query: %+v", gotQuery)
	}
	if len(routes) != 1 || routes[0].Mode != RouteModeWalking || routes[0].DistanceMeters != 980 || routes[0].DurationMinutes != 12 {
		t.Fatalf("unexpected route preview: %+v", routes)
	}
}

func jsonResponse(payload map[string]any) (*http.Response, error) {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return &http.Response{
		StatusCode: 200,
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(strings.NewReader(string(encoded))),
	}, nil
}

type roundTripFunc func(req *http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}
