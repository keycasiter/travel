package auth

import (
	"fmt"
	"strings"

	"travel/apps/api/internal/model"

	"gorm.io/gorm"
)

type Service struct {
	db *gorm.DB
}

type LoginResult struct {
	UserID uint64 `json:"userId"`
	Token  string `json:"token"`
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

func (s *Service) LocalLogin(code string) (LoginResult, error) {
	code = strings.TrimSpace(code)
	if code == "" {
		return LoginResult{}, fmt.Errorf("code is required")
	}

	openID := "local-" + code
	user := model.User{OpenID: openID}
	if err := s.db.Where("openid = ?", openID).FirstOrCreate(&user).Error; err != nil {
		return LoginResult{}, fmt.Errorf("find or create local user: %w", err)
	}

	return LoginResult{
		UserID: user.ID,
		Token:  openID,
	}, nil
}
