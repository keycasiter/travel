package itinerary

import "testing"

func TestCopyShareCreatesIndependentItinerary(t *testing.T) {
	original := ShareItinerarySnapshot{
		Title:               "杭州 2 日",
		DestinationRegionID: "city-hangzhou",
		Days: []ShareDay{
			{DayIndex: 1, Items: []ShareItem{{POIID: "poi-hangzhou-westlake"}}},
		},
	}

	copyInput := CopySnapshotToInput(42, original)

	if copyInput.UserID != 42 {
		t.Fatalf("expected user 42, got %d", copyInput.UserID)
	}
	if copyInput.Title != "杭州 2 日 副本" {
		t.Fatalf("unexpected title %q", copyInput.Title)
	}
	if len(copyInput.Days) != 1 || len(copyInput.Days[0].Items) != 1 {
		t.Fatalf("copy lost day items: %+v", copyInput)
	}
}
