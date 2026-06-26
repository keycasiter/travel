package content

import (
	"context"

	"travel/apps/api/internal/model"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

type Overview struct {
	Region   model.Region          `json:"region"`
	Services []model.TravelService `json:"services"`
	POIs     []model.Poi           `json:"pois"`
	Guides   []model.Guide         `json:"guides"`
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListRegions(ctx context.Context, parentID *string, level *string) ([]model.Region, error) {
	query := r.db.WithContext(ctx).Where("enabled = ?", true)
	if parentID != nil {
		query = query.Where("parent_id = ?", *parentID)
	}
	if level != nil {
		query = query.Where("level = ?", *level)
	}

	var regions []model.Region
	if err := query.Order("sort_order ASC").Find(&regions).Error; err != nil {
		return nil, err
	}
	return regions, nil
}

func (r *Repository) GetOverview(ctx context.Context, regionID string) (*Overview, error) {
	var region model.Region
	if err := r.db.WithContext(ctx).Where("id = ? AND enabled = ?", regionID, true).First(&region).Error; err != nil {
		return nil, err
	}

	regionIDs, err := r.regionAndChildIDs(ctx, regionID)
	if err != nil {
		return nil, err
	}

	services, err := r.listServicesForRegions(ctx, regionIDs, nil)
	if err != nil {
		return nil, err
	}
	pois, err := r.listPOIsForRegions(ctx, regionIDs, nil)
	if err != nil {
		return nil, err
	}
	guides, err := r.listGuidesForRegions(ctx, regionIDs)
	if err != nil {
		return nil, err
	}

	return &Overview{
		Region:   region,
		Services: services,
		POIs:     pois,
		Guides:   guides,
	}, nil
}

func (r *Repository) ListServices(ctx context.Context, regionID string, serviceType *string) ([]model.TravelService, error) {
	regionIDs, err := r.regionAndChildIDs(ctx, regionID)
	if err != nil {
		return nil, err
	}
	return r.listServicesForRegions(ctx, regionIDs, serviceType)
}

func (r *Repository) ListPOIs(ctx context.Context, regionID string, poiType *string) ([]model.Poi, error) {
	regionIDs, err := r.regionAndChildIDs(ctx, regionID)
	if err != nil {
		return nil, err
	}
	return r.listPOIsForRegions(ctx, regionIDs, poiType)
}

func (r *Repository) ListGuides(ctx context.Context, regionID string) ([]model.Guide, error) {
	regionIDs, err := r.regionAndChildIDs(ctx, regionID)
	if err != nil {
		return nil, err
	}
	return r.listGuidesForRegions(ctx, regionIDs)
}

func (r *Repository) regionAndChildIDs(ctx context.Context, regionID string) ([]string, error) {
	ids := []string{regionID}
	var children []model.Region
	if err := r.db.WithContext(ctx).Where("parent_id = ? AND enabled = ?", regionID, true).Find(&children).Error; err != nil {
		return nil, err
	}
	for _, child := range children {
		ids = append(ids, child.ID)
	}
	return ids, nil
}

func (r *Repository) listServicesForRegions(ctx context.Context, regionIDs []string, serviceType *string) ([]model.TravelService, error) {
	query := r.db.WithContext(ctx).Where("region_id IN ?", regionIDs)
	if serviceType != nil {
		query = query.Where("type = ?", *serviceType)
	}
	var services []model.TravelService
	if err := query.Order("id ASC").Find(&services).Error; err != nil {
		return nil, err
	}
	return services, nil
}

func (r *Repository) listPOIsForRegions(ctx context.Context, regionIDs []string, poiType *string) ([]model.Poi, error) {
	query := r.db.WithContext(ctx).Where("region_id IN ?", regionIDs)
	if poiType != nil {
		query = query.Where("type = ?", *poiType)
	}
	var pois []model.Poi
	if err := query.Order("hot_score DESC").Find(&pois).Error; err != nil {
		return nil, err
	}
	return pois, nil
}

func (r *Repository) listGuidesForRegions(ctx context.Context, regionIDs []string) ([]model.Guide, error) {
	var guides []model.Guide
	if err := r.db.WithContext(ctx).Where("region_id IN ?", regionIDs).Order("id ASC").Find(&guides).Error; err != nil {
		return nil, err
	}
	return guides, nil
}
