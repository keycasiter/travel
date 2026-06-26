package app

import (
	"net/url"
	"testing"

	"travel/apps/api/internal/tencentmap"
)

func TestSearchPlacesInputFromQueryParsesRectangleAndCategories(t *testing.T) {
	values, err := url.ParseQuery("keyword=景点&boundary=rectangle&swLat=30.1&swLng=120&neLat=30.4&neLng=120.3&categories=旅游景点,文化场馆&pageSize=10")
	if err != nil {
		t.Fatalf("parse query: %v", err)
	}

	input, err := searchPlacesInputFromQuery(values)
	if err != nil {
		t.Fatalf("searchPlacesInputFromQuery returned error: %v", err)
	}

	if input.Keyword != "景点" {
		t.Fatalf("unexpected keyword: %q", input.Keyword)
	}
	if input.Boundary.Mode != tencentmap.BoundaryRectangle {
		t.Fatalf("expected rectangle boundary, got %q", input.Boundary.Mode)
	}
	if input.Boundary.Southwest.Lat != 30.1 || input.Boundary.Southwest.Lng != 120 {
		t.Fatalf("unexpected southwest: %+v", input.Boundary.Southwest)
	}
	if input.Boundary.Northeast.Lat != 30.4 || input.Boundary.Northeast.Lng != 120.3 {
		t.Fatalf("unexpected northeast: %+v", input.Boundary.Northeast)
	}
	if len(input.Categories) != 2 || input.Categories[0] != "旅游景点" || input.Categories[1] != "文化场馆" {
		t.Fatalf("unexpected categories: %+v", input.Categories)
	}
	if input.PageSize != 10 {
		t.Fatalf("unexpected page size: %d", input.PageSize)
	}
}

func TestSearchPlacesInputFromQueryDefaultsToNearby(t *testing.T) {
	values, err := url.ParseQuery("keyword=美食&lat=30.2&lng=120.1&radiusMeters=6000&pageSize=20")
	if err != nil {
		t.Fatalf("parse query: %v", err)
	}

	input, err := searchPlacesInputFromQuery(values)
	if err != nil {
		t.Fatalf("searchPlacesInputFromQuery returned error: %v", err)
	}

	if input.Boundary.Mode != tencentmap.BoundaryNearby {
		t.Fatalf("expected nearby boundary, got %q", input.Boundary.Mode)
	}
	if input.CenterLat != 30.2 || input.CenterLng != 120.1 {
		t.Fatalf("unexpected center: %f,%f", input.CenterLat, input.CenterLng)
	}
	if input.RadiusMeters != 6000 {
		t.Fatalf("unexpected radius: %d", input.RadiusMeters)
	}
}

func TestSearchPlacesInputFromQueryRequiresKeyword(t *testing.T) {
	values, err := url.ParseQuery("lat=30.2&lng=120.1")
	if err != nil {
		t.Fatalf("parse query: %v", err)
	}

	_, err = searchPlacesInputFromQuery(values)
	if err == nil || err.Error() != "keyword is required" {
		t.Fatalf("expected keyword error, got %v", err)
	}
}

func TestSuggestPlacesInputFromQueryParsesLocationAndCategories(t *testing.T) {
	values, err := url.ParseQuery("keyword=西湖&lat=30.2&lng=120.1&categories=旅游景点&pageSize=5")
	if err != nil {
		t.Fatalf("parse query: %v", err)
	}

	input, err := suggestPlacesInputFromQuery(values)
	if err != nil {
		t.Fatalf("suggestPlacesInputFromQuery returned error: %v", err)
	}

	if input.Keyword != "西湖" {
		t.Fatalf("unexpected keyword: %q", input.Keyword)
	}
	if input.Center == nil || input.Center.Lat != 30.2 || input.Center.Lng != 120.1 {
		t.Fatalf("unexpected center: %+v", input.Center)
	}
	if len(input.Categories) != 1 || input.Categories[0] != "旅游景点" {
		t.Fatalf("unexpected categories: %+v", input.Categories)
	}
	if input.PageSize != 5 {
		t.Fatalf("unexpected page size: %d", input.PageSize)
	}
}

func TestSuggestPlacesInputFromQueryRequiresKeyword(t *testing.T) {
	values, err := url.ParseQuery("lat=30.2&lng=120.1")
	if err != nil {
		t.Fatalf("parse query: %v", err)
	}

	_, err = suggestPlacesInputFromQuery(values)
	if err == nil || err.Error() != "keyword is required" {
		t.Fatalf("expected keyword error, got %v", err)
	}
}

func TestLocationContextInputFromQueryParsesLocation(t *testing.T) {
	values, err := url.ParseQuery("lat=30.2&lng=120.1&radiusMeters=5000&pageSize=6")
	if err != nil {
		t.Fatalf("parse query: %v", err)
	}

	input, err := locationContextInputFromQuery(values)
	if err != nil {
		t.Fatalf("locationContextInputFromQuery returned error: %v", err)
	}

	if input.Location.Lat != 30.2 || input.Location.Lng != 120.1 {
		t.Fatalf("unexpected location: %+v", input.Location)
	}
	if input.RadiusMeters != 5000 || input.PageSize != 6 {
		t.Fatalf("unexpected context options: %+v", input)
	}
}

func TestRoutePreviewInputFromQueryParsesModes(t *testing.T) {
	values, err := url.ParseQuery("fromLat=30.2&fromLng=120.1&toLat=30.221378&toLng=120.121431&modes=walking,transit,driving")
	if err != nil {
		t.Fatalf("parse query: %v", err)
	}

	input, err := routePreviewInputFromQuery(values)
	if err != nil {
		t.Fatalf("routePreviewInputFromQuery returned error: %v", err)
	}

	if input.From.Lat != 30.2 || input.From.Lng != 120.1 {
		t.Fatalf("unexpected from location: %+v", input.From)
	}
	if input.To.Lat != 30.221378 || input.To.Lng != 120.121431 {
		t.Fatalf("unexpected to location: %+v", input.To)
	}
	if len(input.Modes) != 3 || input.Modes[0] != tencentmap.RouteModeWalking || input.Modes[1] != tencentmap.RouteModeTransit || input.Modes[2] != tencentmap.RouteModeDriving {
		t.Fatalf("unexpected modes: %+v", input.Modes)
	}
}
