package app

import (
	"travel/apps/api/internal/config"

	"gorm.io/gorm"
)

type App struct {
	Config config.Config
	DB     *gorm.DB
}

func New(cfg config.Config, db *gorm.DB) *App {
	return &App{Config: cfg, DB: db}
}
