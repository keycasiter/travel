package main

import (
	"errors"
	"flag"
	"fmt"
	"log"

	"travel/apps/api/internal/config"
	appmigration "travel/apps/api/internal/migration"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/mysql"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	direction := flag.String("direction", "up", "migration direction: up or down")
	steps := flag.Int("steps", 1, "number of down steps when direction=down")
	path := flag.String("path", "migrations", "migration directory")
	flag.Parse()

	cfg := config.Load()
	databaseURL, err := appmigration.DatabaseURL(cfg.MySQLDSN)
	if err != nil {
		log.Fatal(err)
	}

	instance, err := migrate.New("file://"+*path, databaseURL)
	if err != nil {
		log.Fatalf("create migrator: %v", err)
	}

	switch *direction {
	case "up":
		err = instance.Up()
	case "down":
		err = instance.Steps(-*steps)
	default:
		log.Fatalf("unsupported direction %q", *direction)
	}

	if errors.Is(err, migrate.ErrNoChange) {
		fmt.Println("migration no change")
		return
	}
	if err != nil {
		log.Fatalf("run migration: %v", err)
	}
	fmt.Printf("migration %s complete\n", *direction)
}
