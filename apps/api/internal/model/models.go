package model

import (
	"time"

	"gorm.io/datatypes"
)

type User struct {
	ID        uint64  `gorm:"primaryKey" json:"id"`
	OpenID    string  `gorm:"column:openid;uniqueIndex;size:128" json:"openid"`
	Nickname  *string `json:"nickname"`
	AvatarURL *string `json:"avatarUrl"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Region struct {
	ID         string         `gorm:"primaryKey;size:64" json:"id"`
	Name       string         `json:"name"`
	Level      string         `json:"level"`
	ParentID   *string        `json:"parentId"`
	CenterLat  float64        `json:"centerLat"`
	CenterLng  float64        `json:"centerLng"`
	BoundsJSON datatypes.JSON `json:"bounds"`
	Enabled    bool           `json:"enabled"`
	SortOrder  int            `json:"sortOrder"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type TravelService struct {
	ID        string         `gorm:"primaryKey;size:64" json:"id"`
	RegionID  string         `json:"regionId"`
	Type      string         `json:"type"`
	Title     string         `json:"title"`
	Summary   string         `json:"summary"`
	Tips      datatypes.JSON `json:"tips"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Poi struct {
	ID              string         `gorm:"primaryKey;size:64" json:"id"`
	RegionID        string         `json:"regionId"`
	Type            string         `json:"type"`
	Name            string         `json:"name"`
	Summary         string         `json:"summary"`
	Lat             float64        `json:"lat"`
	Lng             float64        `json:"lng"`
	Tags            datatypes.JSON `json:"tags"`
	DurationMinutes int            `json:"durationMinutes"`
	CostLevel       int            `json:"costLevel"`
	HotScore        int            `json:"hotScore"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type Guide struct {
	ID        string         `gorm:"primaryKey;size:64" json:"id"`
	RegionID  string         `json:"regionId"`
	Title     string         `json:"title"`
	Content   string         `json:"content"`
	Tags      datatypes.JSON `json:"tags"`
	CoverURL  string         `json:"coverUrl"`
	Official  bool           `json:"official"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Itinerary struct {
	ID                  uint64  `gorm:"primaryKey" json:"id"`
	UserID              uint64  `json:"userId"`
	DestinationRegionID string  `json:"destinationRegionId"`
	Title               string  `json:"title"`
	Days                int     `json:"days"`
	Status              string  `json:"status"`
	BudgetCents         int     `json:"budgetCents"`
	ShareCode           *string `json:"shareCode"`
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type ItineraryDay struct {
	ID          uint64     `gorm:"primaryKey" json:"id"`
	ItineraryID uint64     `json:"itineraryId"`
	DayIndex    int        `json:"dayIndex"`
	Date        *time.Time `json:"date"`
	Summary     string     `json:"summary"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type ItineraryItem struct {
	ID              uint64 `gorm:"primaryKey" json:"id"`
	DayID           uint64 `json:"dayId"`
	PoiID           string `json:"poiId"`
	SortOrder       int    `json:"sortOrder"`
	StartHint       string `json:"startHint"`
	DurationMinutes int    `json:"durationMinutes"`
	TransportHint   string `json:"transportHint"`
	Note            string `json:"note"`
	Done            bool   `json:"done"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type Favorite struct {
	ID         uint64 `gorm:"primaryKey" json:"id"`
	UserID     uint64 `json:"userId"`
	TargetType string `json:"targetType"`
	TargetID   string `json:"targetId"`
	CreatedAt  time.Time
}

type ShareSnapshot struct {
	ID                uint64         `gorm:"primaryKey" json:"id"`
	ShareCode         string         `json:"shareCode"`
	SourceItineraryID uint64         `json:"sourceItineraryId"`
	ItinerarySnapshot datatypes.JSON `json:"itinerarySnapshot"`
	ExpiresAt         *time.Time     `json:"expiresAt"`
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type WeatherSummary struct {
	ID               uint64         `gorm:"primaryKey" json:"id"`
	RegionID         string         `json:"regionId"`
	Summary          string         `json:"summary"`
	TemperatureRange string         `json:"temperatureRange"`
	Tips             datatypes.JSON `json:"tips"`
	CreatedAt        time.Time
	UpdatedAt        time.Time
}
