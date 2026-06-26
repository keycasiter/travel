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
	const expectedSig = "b9805a44f4f812079a9f3387ac81d5b5"
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

type roundTripFunc func(req *http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}
