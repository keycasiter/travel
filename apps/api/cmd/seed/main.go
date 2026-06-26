package main

import (
	"flag"
	"fmt"
	"log"

	"travel/apps/api/internal/config"
	"travel/apps/api/internal/database"
	"travel/apps/api/internal/seed"
)

func main() {
	seedDir := flag.String("seed-dir", "../../data/seeds", "path to seed data directory")
	flag.Parse()

	bundle, err := seed.LoadBundle(*seedDir)
	if err != nil {
		log.Fatalf("load seed bundle: %v", err)
	}

	cfg := config.Load()
	db, err := database.Open(cfg)
	if err != nil {
		log.Fatalf("open database from MYSQL_DSN: %v", err)
	}

	result, err := seed.ImportBundle(db, bundle)
	if err != nil {
		log.Fatalf("import seed bundle: %v", err)
	}

	fmt.Printf("imported regions=%d services=%d pois=%d guides=%d weather=%d\n",
		result.Regions,
		result.Services,
		result.POIs,
		result.Guides,
		result.Weather,
	)
}
