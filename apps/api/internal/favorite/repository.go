package favorite

import (
	"context"

	"travel/apps/api/internal/model"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListByUser(ctx context.Context, userID uint64) ([]model.Favorite, error) {
	var favorites []model.Favorite
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at DESC").Find(&favorites).Error; err != nil {
		return nil, err
	}
	return favorites, nil
}

func (r *Repository) Create(ctx context.Context, userID uint64, targetType string, targetID string) (*model.Favorite, error) {
	fav := model.Favorite{UserID: userID, TargetType: targetType, TargetID: targetID}
	if err := r.db.WithContext(ctx).Where("user_id = ? AND target_type = ? AND target_id = ?", userID, targetType, targetID).FirstOrCreate(&fav).Error; err != nil {
		return nil, err
	}
	return &fav, nil
}

func (r *Repository) Delete(ctx context.Context, userID uint64, favoriteID uint64) error {
	return r.db.WithContext(ctx).Where("id = ? AND user_id = ?", favoriteID, userID).Delete(&model.Favorite{}).Error
}
