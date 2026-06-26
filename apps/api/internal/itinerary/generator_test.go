package itinerary

import "testing"

func TestGeneratePlanDistributesPOIsAcrossDays(t *testing.T) {
	input := GenerateInput{
		DestinationRegionID: "city-hangzhou",
		Days:                2,
		Preferences:         []string{"城市漫步", "历史文化"},
	}
	pois := []CandidatePOI{
		{ID: "poi-1", Name: "西湖", RegionID: "area-hangzhou-westlake", Tags: []string{"城市漫步"}, DurationMinutes: 120, HotScore: 99},
		{ID: "poi-2", Name: "灵隐寺", RegionID: "area-hangzhou-westlake", Tags: []string{"历史文化"}, DurationMinutes: 120, HotScore: 95},
		{ID: "poi-3", Name: "南宋御街", RegionID: "area-hangzhou-shangcheng", Tags: []string{"城市漫步"}, DurationMinutes: 90, HotScore: 88},
	}

	plan, err := GeneratePlan(input, pois)
	if err != nil {
		t.Fatalf("GeneratePlan returned error: %v", err)
	}

	if len(plan.Days) != 2 {
		t.Fatalf("expected 2 days, got %d", len(plan.Days))
	}
	if len(plan.Days[0].Items) == 0 || len(plan.Days[1].Items) == 0 {
		t.Fatalf("expected both days to contain items: %+v", plan.Days)
	}
}
