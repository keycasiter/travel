package seed

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"travel/apps/api/internal/model"

	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type RegionSeed struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Level     string  `json:"level"`
	ParentID  *string `json:"parentId"`
	CenterLat float64 `json:"centerLat"`
	CenterLng float64 `json:"centerLng"`
	Enabled   bool    `json:"enabled"`
	SortOrder int     `json:"sortOrder"`
}

type ServiceSeed struct {
	ID       string   `json:"id"`
	RegionID string   `json:"regionId"`
	Type     string   `json:"type"`
	Title    string   `json:"title"`
	Summary  string   `json:"summary"`
	Tips     []string `json:"tips"`
}

type POISeed struct {
	ID              string   `json:"id"`
	RegionID        string   `json:"regionId"`
	Type            string   `json:"type"`
	Name            string   `json:"name"`
	Summary         string   `json:"summary"`
	Lat             float64  `json:"lat"`
	Lng             float64  `json:"lng"`
	Tags            []string `json:"tags"`
	DurationMinutes int      `json:"durationMinutes"`
	CostLevel       int      `json:"costLevel"`
	HotScore        int      `json:"hotScore"`
}

type GuideSeed struct {
	ID       string   `json:"id"`
	RegionID string   `json:"regionId"`
	Title    string   `json:"title"`
	Content  string   `json:"content"`
	Tags     []string `json:"tags"`
	CoverURL string   `json:"coverUrl"`
	Official bool     `json:"official"`
}

type WeatherSeed struct {
	RegionID         string   `json:"regionId"`
	Summary          string   `json:"summary"`
	TemperatureRange string   `json:"temperatureRange"`
	Tips             []string `json:"tips"`
}

type Bundle struct {
	Regions  []RegionSeed
	Services []ServiceSeed
	POIs     []POISeed
	Guides   []GuideSeed
	Weather  []WeatherSeed
}

type ImportResult struct {
	Regions  int
	Services int
	POIs     int
	Guides   int
	Weather  int
}

func LoadBundle(dir string) (*Bundle, error) {
	var bundle Bundle
	if err := readJSON(filepath.Join(dir, "regions.json"), &bundle.Regions); err != nil {
		return nil, err
	}
	if err := readJSON(filepath.Join(dir, "services.json"), &bundle.Services); err != nil {
		return nil, err
	}
	if err := readJSON(filepath.Join(dir, "pois.json"), &bundle.POIs); err != nil {
		return nil, err
	}
	if err := readJSON(filepath.Join(dir, "guides.json"), &bundle.Guides); err != nil {
		return nil, err
	}
	if err := readJSON(filepath.Join(dir, "weather.json"), &bundle.Weather); err != nil {
		return nil, err
	}
	return &bundle, nil
}

func ImportBundle(db *gorm.DB, bundle *Bundle) (ImportResult, error) {
	result := ImportResult{
		Regions:  len(bundle.Regions),
		Services: len(bundle.Services),
		POIs:     len(bundle.POIs),
		Guides:   len(bundle.Guides),
		Weather:  len(bundle.Weather),
	}

	regions := make([]model.Region, 0, len(bundle.Regions))
	for _, item := range bundle.Regions {
		regions = append(regions, model.Region{
			ID:        item.ID,
			Name:      item.Name,
			Level:     item.Level,
			ParentID:  item.ParentID,
			CenterLat: item.CenterLat,
			CenterLng: item.CenterLng,
			Enabled:   item.Enabled,
			SortOrder: item.SortOrder,
		})
	}

	services := make([]model.TravelService, 0, len(bundle.Services))
	for _, item := range bundle.Services {
		tips, err := jsonBytes(item.Tips)
		if err != nil {
			return ImportResult{}, err
		}
		services = append(services, model.TravelService{
			ID:       item.ID,
			RegionID: item.RegionID,
			Type:     item.Type,
			Title:    item.Title,
			Summary:  item.Summary,
			Tips:     tips,
		})
	}

	pois := make([]model.Poi, 0, len(bundle.POIs))
	for _, item := range bundle.POIs {
		tags, err := jsonBytes(item.Tags)
		if err != nil {
			return ImportResult{}, err
		}
		pois = append(pois, model.Poi{
			ID:              item.ID,
			RegionID:        item.RegionID,
			Type:            item.Type,
			Name:            item.Name,
			Summary:         item.Summary,
			Lat:             item.Lat,
			Lng:             item.Lng,
			Tags:            tags,
			DurationMinutes: item.DurationMinutes,
			CostLevel:       item.CostLevel,
			HotScore:        item.HotScore,
		})
	}

	guides := make([]model.Guide, 0, len(bundle.Guides))
	for _, item := range bundle.Guides {
		tags, err := jsonBytes(item.Tags)
		if err != nil {
			return ImportResult{}, err
		}
		guides = append(guides, model.Guide{
			ID:       item.ID,
			RegionID: item.RegionID,
			Title:    item.Title,
			Content:  item.Content,
			Tags:     tags,
			CoverURL: item.CoverURL,
			Official: item.Official,
		})
	}

	weather := make([]model.WeatherSummary, 0, len(bundle.Weather))
	for _, item := range bundle.Weather {
		tips, err := jsonBytes(item.Tips)
		if err != nil {
			return ImportResult{}, err
		}
		weather = append(weather, model.WeatherSummary{
			RegionID:         item.RegionID,
			Summary:          item.Summary,
			TemperatureRange: item.TemperatureRange,
			Tips:             tips,
		})
	}

	return result, db.Transaction(func(tx *gorm.DB) error {
		for _, batch := range []any{regions, services, pois, guides, weather} {
			if err := tx.Clauses(clause.OnConflict{UpdateAll: true}).Create(batch).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func readJSON(path string, out any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read %s: %w", path, err)
	}
	if err := json.Unmarshal(data, out); err != nil {
		return fmt.Errorf("parse %s: %w", path, err)
	}
	return nil
}

func jsonBytes(value any) (datatypes.JSON, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("marshal json: %w", err)
	}
	return datatypes.JSON(data), nil
}
