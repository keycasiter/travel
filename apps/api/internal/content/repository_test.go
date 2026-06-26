package content

import (
	"context"
	"testing"

	"travel/apps/api/internal/model"

	"github.com/glebarez/sqlite"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

func TestRepositoryListRegionsFiltersEnabledAndParent(t *testing.T) {
	db := newTestDB(t)
	parentID := "city-hangzhou"
	disabledParent := "city-disabled"
	insertRegions(t, db,
		model.Region{ID: "city-hangzhou", Name: "杭州", Level: "city", CenterLat: 30.2741, CenterLng: 120.1551, Enabled: true, SortOrder: 10},
		model.Region{ID: "area-hangzhou-westlake", Name: "西湖热门片区", Level: "district", ParentID: &parentID, CenterLat: 30.2426, CenterLng: 120.1503, Enabled: true, SortOrder: 11},
		model.Region{ID: "area-hidden", Name: "隐藏片区", Level: "district", ParentID: &disabledParent, CenterLat: 0, CenterLng: 0, Enabled: false, SortOrder: 99},
	)

	repo := NewRepository(db)
	level := "district"
	got, err := repo.ListRegions(context.Background(), &parentID, &level)
	if err != nil {
		t.Fatalf("ListRegions returned error: %v", err)
	}

	if len(got) != 1 {
		t.Fatalf("expected 1 enabled child region, got %d", len(got))
	}
	if got[0].ID != "area-hangzhou-westlake" {
		t.Fatalf("expected area-hangzhou-westlake, got %s", got[0].ID)
	}
}

func TestRepositoryRegionOverviewIncludesServicesPOIsAndGuides(t *testing.T) {
	db := newTestDB(t)
	parentID := "city-hangzhou"
	insertRegions(t, db,
		model.Region{ID: "city-hangzhou", Name: "杭州", Level: "city", CenterLat: 30.2741, CenterLng: 120.1551, Enabled: true, SortOrder: 10},
		model.Region{ID: "area-hangzhou-westlake", Name: "西湖热门片区", Level: "district", ParentID: &parentID, CenterLat: 30.2426, CenterLng: 120.1503, Enabled: true, SortOrder: 11},
	)
	mustCreate(t, db, &model.TravelService{ID: "svc-hangzhou-transport", RegionID: "city-hangzhou", Type: "transport", Title: "地铁 + 步行", Summary: "核心区适合公共交通。", Tips: datatypes.JSON([]byte(`["避开高峰"]`))})
	mustCreate(t, db, &model.Poi{ID: "poi-hangzhou-westlake", RegionID: "area-hangzhou-westlake", Type: "landmark", Name: "西湖苏堤", Summary: "经典湖景步行线。", Lat: 30.2444, Lng: 120.1436, Tags: datatypes.JSON([]byte(`["城市漫步"]`)), DurationMinutes: 120, CostLevel: 0, HotScore: 99})
	mustCreate(t, db, &model.Guide{ID: "guide-hangzhou-48h", RegionID: "city-hangzhou", Title: "杭州 48 小时", Content: "西湖和灵隐寺组合。", Tags: datatypes.JSON([]byte(`["2日游"]`)), CoverURL: "seed://cover", Official: true})

	repo := NewRepository(db)
	overview, err := repo.GetOverview(context.Background(), "city-hangzhou")
	if err != nil {
		t.Fatalf("GetOverview returned error: %v", err)
	}

	if overview.Region.ID != "city-hangzhou" {
		t.Fatalf("expected city-hangzhou, got %s", overview.Region.ID)
	}
	if len(overview.Services) != 1 {
		t.Fatalf("expected 1 service, got %d", len(overview.Services))
	}
	if len(overview.POIs) != 1 {
		t.Fatalf("expected child area POI in overview, got %d", len(overview.POIs))
	}
	if len(overview.Guides) != 1 {
		t.Fatalf("expected 1 guide, got %d", len(overview.Guides))
	}
}

func newTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&model.Region{}, &model.TravelService{}, &model.Poi{}, &model.Guide{}); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	return db
}

func insertRegions(t *testing.T, db *gorm.DB, regions ...model.Region) {
	t.Helper()
	for i := range regions {
		mustCreate(t, db, &regions[i])
	}
}

func mustCreate(t *testing.T, db *gorm.DB, value any) {
	t.Helper()
	if err := db.Create(value).Error; err != nil {
		t.Fatalf("create fixture: %v", err)
	}
}
