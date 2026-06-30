package itinerary

import (
	"context"
	"encoding/json"
	"strings"

	"travel/apps/api/internal/model"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type ShareItinerarySnapshot struct {
	Title               string     `json:"title"`
	DestinationRegionID string     `json:"destinationRegionId"`
	BudgetCents         int        `json:"budgetCents"`
	Days                []ShareDay `json:"days"`
}

type ShareDay struct {
	DayIndex int         `json:"dayIndex"`
	Summary  string      `json:"summary"`
	Items    []ShareItem `json:"items"`
}

type ShareItem struct {
	POIID           string `json:"poiId"`
	POIName         string `json:"poiName"`
	POISummary      string `json:"poiSummary"`
	StartHint       string `json:"startHint"`
	DurationMinutes int    `json:"durationMinutes"`
	TransportHint   string `json:"transportHint"`
	Note            string `json:"note"`
}

type CopyItineraryInput struct {
	UserID              uint64
	Title               string
	DestinationRegionID string
	BudgetCents         int
	Days                []ShareDay
}

type ShareView struct {
	ShareCode string                 `json:"shareCode"`
	Snapshot  ShareItinerarySnapshot `json:"snapshot"`
}

func CopySnapshotToInput(userID uint64, snapshot ShareItinerarySnapshot) CopyItineraryInput {
	return CopyItineraryInput{
		UserID:              userID,
		Title:               snapshot.Title + " 副本",
		DestinationRegionID: snapshot.DestinationRegionID,
		BudgetCents:         snapshot.BudgetCents,
		Days:                snapshot.Days,
	}
}

func (r *Repository) CreateShare(ctx context.Context, userID uint64, itineraryID uint64) (*ShareView, error) {
	detail, err := r.GetDetail(ctx, userID, itineraryID)
	if err != nil {
		return nil, err
	}

	snapshot := detailToSnapshot(detail)
	data, err := json.Marshal(snapshot)
	if err != nil {
		return nil, err
	}
	shareCode := newShareCode()
	record := model.ShareSnapshot{
		ShareCode:         shareCode,
		SourceItineraryID: itineraryID,
		ItinerarySnapshot: datatypes.JSON(data),
	}
	if err := r.db.WithContext(ctx).Create(&record).Error; err != nil {
		return nil, err
	}
	if err := r.db.WithContext(ctx).Model(&model.Itinerary{}).Where("id = ? AND user_id = ?", itineraryID, userID).Update("share_code", shareCode).Error; err != nil {
		return nil, err
	}
	return &ShareView{ShareCode: shareCode, Snapshot: snapshot}, nil
}

func (r *Repository) GetShare(ctx context.Context, shareCode string) (*ShareView, error) {
	var record model.ShareSnapshot
	if err := r.db.WithContext(ctx).Where("share_code = ?", shareCode).First(&record).Error; err != nil {
		return nil, err
	}
	var snapshot ShareItinerarySnapshot
	if err := json.Unmarshal(record.ItinerarySnapshot, &snapshot); err != nil {
		return nil, err
	}
	return &ShareView{ShareCode: record.ShareCode, Snapshot: snapshot}, nil
}

func (r *Repository) CopyShare(ctx context.Context, userID uint64, shareCode string) (*Detail, error) {
	share, err := r.GetShare(ctx, shareCode)
	if err != nil {
		return nil, err
	}
	input := CopySnapshotToInput(userID, share.Snapshot)

	var itineraryID uint64
	err = r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		itinerary := model.Itinerary{
			UserID:              input.UserID,
			DestinationRegionID: input.DestinationRegionID,
			Title:               input.Title,
			Days:                len(input.Days),
			Status:              "draft",
			BudgetCents:         input.BudgetCents,
		}
		if err := tx.Create(&itinerary).Error; err != nil {
			return err
		}
		itineraryID = itinerary.ID
		for _, snapshotDay := range input.Days {
			day := model.ItineraryDay{
				ItineraryID: itinerary.ID,
				DayIndex:    snapshotDay.DayIndex,
				Summary:     snapshotDay.Summary,
			}
			if err := tx.Create(&day).Error; err != nil {
				return err
			}
			for index, snapshotItem := range snapshotDay.Items {
				item := model.ItineraryItem{
					DayID:           day.ID,
					PoiID:           snapshotItem.POIID,
					SortOrder:       index + 1,
					StartHint:       snapshotItem.StartHint,
					DurationMinutes: snapshotItem.DurationMinutes,
					TransportHint:   snapshotItem.TransportHint,
					Note:            snapshotItem.Note,
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

func detailToSnapshot(detail *Detail) ShareItinerarySnapshot {
	snapshot := ShareItinerarySnapshot{
		Title:               detail.Itinerary.Title,
		DestinationRegionID: detail.Itinerary.DestinationRegionID,
		BudgetCents:         detail.Itinerary.BudgetCents,
		Days:                make([]ShareDay, 0, len(detail.Days)),
	}
	for _, day := range detail.Days {
		shareDay := ShareDay{
			DayIndex: day.Day.DayIndex,
			Summary:  day.Day.Summary,
			Items:    make([]ShareItem, 0, len(day.Items)),
		}
		for _, item := range day.Items {
			shareDay.Items = append(shareDay.Items, ShareItem{
				POIID:           item.Item.PoiID,
				POIName:         item.POI.Name,
				POISummary:      item.POI.Summary,
				StartHint:       item.Item.StartHint,
				DurationMinutes: item.Item.DurationMinutes,
				TransportHint:   item.Item.TransportHint,
				Note:            item.Item.Note,
			})
		}
		snapshot.Days = append(snapshot.Days, shareDay)
	}
	return snapshot
}

func newShareCode() string {
	return strings.ReplaceAll(uuid.NewString(), "-", "")[:12]
}
