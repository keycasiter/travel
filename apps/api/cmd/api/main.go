package main

import (
	"log"

	"travel/apps/api/internal/app"
	"travel/apps/api/internal/config"
	"travel/apps/api/internal/database"
)

func main() {
	cfg := config.Load()
	db, err := database.Open(cfg)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}

	router := app.New(cfg, db).Router()
	if err := router.Run(cfg.HTTPAddr); err != nil {
		log.Fatalf("run api: %v", err)
	}
}
