package itinerary

import (
	"context"
	"encoding/json"
	"fmt"

	"travel/apps/api/internal/model"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

type Detail struct {
	Itinerary model.Itinerary `json:"itinerary"`
	Days      []DayDetail     `json:"days"`
}

type DayDetail struct {
	Day   model.ItineraryDay `json:"day"`
	Items []ItemDetail       `json:"items"`
}

type ItemDetail struct {
	Item model.ItineraryItem `json:"item"`
	POI  model.Poi           `json:"poi"`
}

type ItineraryPatch struct {
	Title       *string
	Status      *string
	BudgetCents *int
}

type ItemPatch struct {
	SortOrder *int
	Note      *string
	Done      *bool
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListCandidatePOIs(ctx context.Context, destinationRegionID string) ([]CandidatePOI, error) {
	regionIDs, err := r.regionAndChildIDs(ctx, destinationRegionID)
	if err != nil {
		return nil, err
	}

	var pois []model.Poi
	if err := r.db.WithContext(ctx).Where("region_id IN ?", regionIDs).Order("hot_score DESC").Find(&pois).Error; err != nil {
		return nil, err
	}

	candidates := make([]CandidatePOI, 0, len(pois))
	for _, poi := range pois {
		var tags []string
		if len(poi.Tags) > 0 {
			if err := json.Unmarshal(poi.Tags, &tags); err != nil {
				return nil, fmt.Errorf("parse poi tags for %s: %w", poi.ID, err)
			}
		}
		candidates = append(candidates, CandidatePOI{
			ID:              poi.ID,
			Name:            poi.Name,
			RegionID:        poi.RegionID,
			Tags:            tags,
			DurationMinutes: poi.DurationMinutes,
			HotScore:        poi.HotScore,
		})
	}
	return candidates, nil
}

func (r *Repository) CreateGenerated(ctx context.Context, userID uint64, input GenerateInput, plan GeneratedPlan) (*Detail, error) {
	var itineraryID uint64
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		itinerary := model.Itinerary{
			UserID:              userID,
			DestinationRegionID: input.DestinationRegionID,
			Title:               plan.Title,
			Days:                input.Days,
			Status:              "draft",
		}
		if err := tx.Create(&itinerary).Error; err != nil {
			return err
		}
		itineraryID = itinerary.ID

		for _, generatedDay := range plan.Days {
			day := model.ItineraryDay{
				ItineraryID: itinerary.ID,
				DayIndex:    generatedDay.DayIndex,
				Summary:     generatedDay.Summary,
			}
			if err := tx.Create(&day).Error; err != nil {
				return err
			}
			for index, generatedItem := range generatedDay.Items {
				item := model.ItineraryItem{
					DayID:           day.ID,
					PoiID:           generatedItem.POIID,
					SortOrder:       index + 1,
					StartHint:       generatedItem.StartHint,
					DurationMinutes: generatedItem.DurationMinutes,
					TransportHint:   generatedItem.TransportHint,
					Note:            "",
					Done:            false,
				}
				if err := tx.Create(&item).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return r.GetDetail(ctx, userID, itineraryID)
}

func (r *Repository) ListByUser(ctx context.Context, userID uint64) ([]model.Itinerary, error) {
	var itineraries []model.Itinerary
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("updated_at DESC").Find(&itineraries).Error; err != nil {
		return nil, err
	}
	return itineraries, nil
}

func (r *Repository) GetDetail(ctx context.Context, userID uint64, itineraryID uint64) (*Detail, error) {
	var itinerary model.Itinerary
	if err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", itineraryID, userID).First(&itinerary).Error; err != nil {
		return nil, err
	}

	var days []model.ItineraryDay
	if err := r.db.WithContext(ctx).Where("itinerary_id = ?", itinerary.ID).Order("day_index ASC").Find(&days).Error; err != nil {
		return nil, err
	}

	detail := Detail{Itinerary: itinerary, Days: make([]DayDetail, 0, len(days))}
	for _, day := range days {
		var items []model.ItineraryItem
		if err := r.db.WithContext(ctx).Where("day_id = ?", day.ID).Order("sort_order ASC").Find(&items).Error; err != nil {
			return nil, err
		}
		dayDetail := DayDetail{Day: day, Items: make([]ItemDetail, 0, len(items))}
		for _, item := range items {
			var poi model.Poi
			if err := r.db.WithContext(ctx).Where("id = ?", item.PoiID).First(&poi).Error; err != nil {
				return nil, err
			}
			dayDetail.Items = append(dayDetail.Items, ItemDetail{Item: item, POI: poi})
		}
		detail.Days = append(detail.Days, dayDetail)
	}
	return &detail, nil
}

func (r *Repository) UpdateItinerary(ctx context.Context, userID uint64, itineraryID uint64, patch ItineraryPatch) (*Detail, error) {
	updates := map[string]any{}
	if patch.Title != nil {
		updates["title"] = *patch.Title
	}
	if patch.Status != nil {
		updates["status"] = *patch.Status
	}
	if patch.BudgetCents != nil {
		updates["budget_cents"] = *patch.BudgetCents
	}
	if len(updates) > 0 {
		if err := r.db.WithContext(ctx).Model(&model.Itinerary{}).Where("id = ? AND user_id = ?", itineraryID, userID).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	return r.GetDetail(ctx, userID, itineraryID)
}

func (r *Repository) UpdateItem(ctx context.Context, userID uint64, itemID uint64, patch ItemPatch) (*model.ItineraryItem, error) {
	var item model.ItineraryItem
	err := r.db.WithContext(ctx).
		Table("itinerary_items").
		Select("itinerary_items.*").
		Joins("JOIN itinerary_days ON itinerary_days.id = itinerary_items.day_id").
		Joins("JOIN itineraries ON itineraries.id = itinerary_days.itinerary_id").
		Where("itinerary_items.id = ? AND itineraries.user_id = ?", itemID, userID).
		First(&item).Error
	if err != nil {
		return nil, err
	}

	updates := map[string]any{}
	if patch.SortOrder != nil {
		updates["sort_order"] = *patch.SortOrder
	}
	if patch.Note != nil {
		updates["note"] = *patch.Note
	}
	if patch.Done != nil {
		updates["done"] = *patch.Done
	}
	if len(updates) > 0 {
		if err := r.db.WithContext(ctx).Model(&item).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	if err := r.db.WithContext(ctx).First(&item, item.ID).Error; err != nil {
		return nil, err
	}
	return &item, nil
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
