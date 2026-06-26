package seed

import (
	"path/filepath"
	"testing"
)

func TestLoadBundleReadsSeedFiles(t *testing.T) {
	bundle, err := LoadBundle(filepath.Join("..", "..", "..", "..", "data", "seeds"))
	if err != nil {
		t.Fatalf("LoadBundle returned error: %v", err)
	}
	if len(bundle.Regions) < 4 {
		t.Fatalf("expected at least 4 region records for the vertical slice, got %d", len(bundle.Regions))
	}
	if len(bundle.POIs) == 0 {
		t.Fatal("expected POIs")
	}
	if len(bundle.Guides) == 0 {
		t.Fatal("expected guides")
	}
}

func TestSeedBundleCoversEightCities(t *testing.T) {
	bundle, err := LoadBundle(filepath.Join("..", "..", "..", "..", "data", "seeds"))
	if err != nil {
		t.Fatalf("LoadBundle returned error: %v", err)
	}

	required := map[string]bool{
		"city-beijing":   false,
		"city-shanghai":  false,
		"city-hangzhou":  false,
		"city-chengdu":   false,
		"city-xian":      false,
		"city-guangzhou": false,
		"city-shenzhen":  false,
		"city-xiamen":    false,
	}
	for _, region := range bundle.Regions {
		if _, ok := required[region.ID]; ok {
			required[region.ID] = true
		}
	}
	for id, found := range required {
		if !found {
			t.Fatalf("missing seed city %s", id)
		}
	}
}
