//go:build integration

package app

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"testing"

	"travel/apps/api/internal/config"
	"travel/apps/api/internal/model"
	"travel/apps/api/internal/seed"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestAPIVerticalTravelFlow(t *testing.T) {
	db := newVerticalFlowDB(t)
	router := New(config.Config{Env: "test", HTTPAddr: ":0"}, db).Router()

	loginBody := postJSON(t, router, "/api/v1/auth/wechat-login", "", map[string]string{"code": "integration"})
	userID := intFromPath(t, loginBody, "data.userId")
	if userID == 0 {
		t.Fatalf("expected login user id in response: %s", loginBody)
	}

	regionsBody := getJSON(t, router, "/api/v1/regions?level=city", "")
	if countFromPath(t, regionsBody, "data") != 8 {
		t.Fatalf("expected 8 city regions, got response: %s", regionsBody)
	}

	overviewBody := getJSON(t, router, "/api/v1/regions/city-hangzhou/overview", "")
	if countFromPath(t, overviewBody, "data.pois") == 0 {
		t.Fatalf("expected Hangzhou overview POIs: %s", overviewBody)
	}

	itineraryBody := postJSON(t, router, "/api/v1/itineraries/generate", userHeader(userID), map[string]any{
		"destinationRegionId": "city-hangzhou",
		"days":                2,
		"preferences":         []string{"城市漫步"},
	})
	itineraryID := intFromPath(t, itineraryBody, "data.itinerary.id")
	if itineraryID == 0 {
		t.Fatalf("expected itinerary id in response: %s", itineraryBody)
	}
	itemID := intFromPath(t, itineraryBody, "data.days.0.items.0.item.id")
	if itemID == 0 {
		t.Fatalf("expected itinerary item id in response: %s", itineraryBody)
	}

	patchBody := patchJSON(t, router, "/api/v1/itinerary-items/"+itoa(itemID), userHeader(userID), map[string]any{
		"done": true,
		"note": "雨天改室内备选",
	})
	if !boolFromPath(t, patchBody, "data.done") {
		t.Fatalf("expected patched item to be done: %s", patchBody)
	}

	shareBody := postJSON(t, router, "/api/v1/itineraries/"+itoa(itineraryID)+"/share", userHeader(userID), map[string]any{})
	shareCode := stringFromPath(t, shareBody, "data.shareCode")
	if shareCode == "" {
		t.Fatalf("expected shareCode in response: %s", shareBody)
	}

	copyBody := postJSON(t, router, "/api/v1/shares/"+shareCode+"/copy", userHeader(userID), map[string]any{})
	if stringFromPath(t, copyBody, "data.itinerary.title") != "city-hangzhou 2日行程 副本" {
		t.Fatalf("expected copied itinerary title: %s", copyBody)
	}
}

func newVerticalFlowDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(
		&model.User{},
		&model.Region{},
		&model.TravelService{},
		&model.Poi{},
		&model.Guide{},
		&model.Itinerary{},
		&model.ItineraryDay{},
		&model.ItineraryItem{},
		&model.Favorite{},
		&model.ShareSnapshot{},
		&model.WeatherSummary{},
	); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	bundle, err := seed.LoadBundle(filepath.Join("..", "..", "..", "..", "data", "seeds"))
	if err != nil {
		t.Fatalf("load bundle: %v", err)
	}
	if _, err := seed.ImportBundle(db, bundle); err != nil {
		t.Fatalf("import bundle: %v", err)
	}
	return db
}

func getJSON(t *testing.T, handler http.Handler, path string, userHeader string) map[string]any {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	if userHeader != "" {
		req.Header.Set("X-User-ID", userHeader)
	}
	return executeJSON(t, handler, req)
}

func postJSON(t *testing.T, handler http.Handler, path string, userHeader string, payload any) map[string]any {
	t.Helper()
	return bodyJSON(t, handler, http.MethodPost, path, userHeader, payload)
}

func patchJSON(t *testing.T, handler http.Handler, path string, userHeader string, payload any) map[string]any {
	t.Helper()
	return bodyJSON(t, handler, http.MethodPatch, path, userHeader, payload)
}

func bodyJSON(t *testing.T, handler http.Handler, method string, path string, userHeader string, payload any) map[string]any {
	t.Helper()
	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	req := httptest.NewRequest(method, path, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	if userHeader != "" {
		req.Header.Set("X-User-ID", userHeader)
	}
	return executeJSON(t, handler, req)
}

func executeJSON(t *testing.T, handler http.Handler, req *http.Request) map[string]any {
	t.Helper()
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code < 200 || rec.Code >= 300 {
		t.Fatalf("%s %s returned %d: %s", req.Method, req.URL.String(), rec.Code, rec.Body.String())
	}
	var decoded map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode response: %v\nbody: %s", err, rec.Body.String())
	}
	return decoded
}

func valueAt(t *testing.T, root map[string]any, path string) any {
	t.Helper()
	var current any = root
	for _, part := range splitPath(path) {
		switch typed := current.(type) {
		case map[string]any:
			current = typed[part.key]
		case []any:
			if part.index < 0 || part.index >= len(typed) {
				t.Fatalf("index %d out of range for path %s", part.index, path)
			}
			current = typed[part.index]
		default:
			t.Fatalf("cannot navigate %s through %T", path, current)
		}
	}
	return current
}

type pathPart struct {
	key   string
	index int
}

func splitPath(path string) []pathPart {
	raw := bytes.Split([]byte(path), []byte("."))
	parts := make([]pathPart, 0, len(raw))
	for _, item := range raw {
		text := string(item)
		switch text {
		case "0":
			parts = append(parts, pathPart{index: 0})
		default:
			parts = append(parts, pathPart{key: text, index: -1})
		}
	}
	return parts
}

func intFromPath(t *testing.T, root map[string]any, path string) int {
	t.Helper()
	value, ok := valueAt(t, root, path).(float64)
	if !ok {
		t.Fatalf("expected numeric value at %s", path)
	}
	return int(value)
}

func countFromPath(t *testing.T, root map[string]any, path string) int {
	t.Helper()
	value, ok := valueAt(t, root, path).([]any)
	if !ok {
		t.Fatalf("expected array value at %s", path)
	}
	return len(value)
}

func stringFromPath(t *testing.T, root map[string]any, path string) string {
	t.Helper()
	value, ok := valueAt(t, root, path).(string)
	if !ok {
		t.Fatalf("expected string value at %s", path)
	}
	return value
}

func boolFromPath(t *testing.T, root map[string]any, path string) bool {
	t.Helper()
	value, ok := valueAt(t, root, path).(bool)
	if !ok {
		t.Fatalf("expected bool value at %s", path)
	}
	return value
}

func userHeader(userID int) string {
	return itoa(userID)
}

func itoa(value int) string {
	return strconv.Itoa(value)
}
