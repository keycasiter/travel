package auth

import (
	"testing"

	"travel/apps/api/internal/model"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestServiceLocalLoginCreatesAndReusesUser(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&model.User{}); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	service := NewService(db)

	first, err := service.LocalLogin("dev-code")
	if err != nil {
		t.Fatalf("first login returned error: %v", err)
	}
	second, err := service.LocalLogin("dev-code")
	if err != nil {
		t.Fatalf("second login returned error: %v", err)
	}

	if first.UserID == 0 {
		t.Fatal("expected user id")
	}
	if first.UserID != second.UserID {
		t.Fatalf("expected reused user id %d, got %d", first.UserID, second.UserID)
	}
	if first.Token != "local-dev-code" {
		t.Fatalf("expected local token, got %q", first.Token)
	}
}
