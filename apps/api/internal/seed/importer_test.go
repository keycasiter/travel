package seed

import (
	"path/filepath"
	"testing"
)

func TestLoadBundleReadsSeedFiles(t *testing.T) {
	bundle, err := LoadBundle(filepath.Join("..", "..", "..", "..", "data", "seeds"))
	if err != nil {
		t.Fatalf("LoadBundle returned error: %v", err)
	}
	if len(bundle.Regions) < 4 {
		t.Fatalf("expected at least 4 region records for the vertical slice, got %d", len(bundle.Regions))
	}
	if len(bundle.POIs) == 0 {
		t.Fatal("expected POIs")
	}
	if len(bundle.Guides) == 0 {
		t.Fatal("expected guides")
	}
}
