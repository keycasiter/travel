package migration

import "testing"

func TestDatabaseURLAddsMultiStatements(t *testing.T) {
	got, err := DatabaseURL("travel:travel@tcp(127.0.0.1:3306)/travel_app?charset=utf8mb4&parseTime=True&loc=Local")
	if err != nil {
		t.Fatalf("DatabaseURL returned error: %v", err)
	}
	want := "mysql://travel:travel@tcp(127.0.0.1:3306)/travel_app?charset=utf8mb4&loc=Local&multiStatements=true&parseTime=True"
	if got != want {
		t.Fatalf("unexpected database URL\nwant: %s\n got: %s", want, got)
	}
}

func TestDatabaseURLRejectsEmptyDSN(t *testing.T) {
	_, err := DatabaseURL("")
	if err == nil {
		t.Fatal("expected error for empty DSN")
	}
}
