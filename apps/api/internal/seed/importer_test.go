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

func TestHangzhouMVPSeedIsDeepEnoughForVerticalFlow(t *testing.T) {
	bundle, err := LoadBundle(filepath.Join("..", "..", "..", "..", "data", "seeds"))
	if err != nil {
		t.Fatalf("LoadBundle returned error: %v", err)
	}

	hangzhouRegionIDs := map[string]bool{"city-hangzhou": true}
	childAreas := 0
	for _, region := range bundle.Regions {
		if region.ParentID != nil && *region.ParentID == "city-hangzhou" {
			hangzhouRegionIDs[region.ID] = true
			childAreas++
		}
	}
	if childAreas < 5 {
		t.Fatalf("expected Hangzhou MVP to include at least 5 areas, got %d", childAreas)
	}

	pois := 0
	poiTypes := map[string]bool{}
	for _, poi := range bundle.POIs {
		if hangzhouRegionIDs[poi.RegionID] {
			pois++
			poiTypes[poi.Type] = true
		}
	}
	if pois < 12 {
		t.Fatalf("expected Hangzhou MVP to include at least 12 POIs, got %d", pois)
	}
	for _, poiType := range []string{"landmark", "scenic", "food", "street", "museum", "tea", "night-view"} {
		if !poiTypes[poiType] {
			t.Fatalf("expected Hangzhou MVP POI type %s", poiType)
		}
	}

	guides := 0
	for _, guide := range bundle.Guides {
		if hangzhouRegionIDs[guide.RegionID] {
			guides++
		}
	}
	if guides < 4 {
		t.Fatalf("expected Hangzhou MVP to include at least 4 guides, got %d", guides)
	}

	serviceTypes := map[string]bool{}
	for _, service := range bundle.Services {
		if hangzhouRegionIDs[service.RegionID] {
			serviceTypes[service.Type] = true
		}
	}
	for _, serviceType := range []string{"food", "accommodation", "transport", "pitfall", "reminder"} {
		if !serviceTypes[serviceType] {
			t.Fatalf("expected Hangzhou MVP service type %s", serviceType)
		}
	}
}
