package itinerary

import (
	"fmt"
	"sort"
)

type GenerateInput struct {
	UserID              uint64
	DestinationRegionID string
	Days                int
	Preferences         []string
}

type CandidatePOI struct {
	ID              string
	Name            string
	RegionID        string
	Tags            []string
	DurationMinutes int
	HotScore        int
}

type GeneratedPlan struct {
	Title string
	Days  []GeneratedDay
}

type GeneratedDay struct {
	DayIndex int
	Summary  string
	Items    []GeneratedItem
}

type GeneratedItem struct {
	POIID           string
	StartHint       string
	DurationMinutes int
	TransportHint   string
}

func GeneratePlan(input GenerateInput, pois []CandidatePOI) (GeneratedPlan, error) {
	if input.Days < 1 || input.Days > 14 {
		return GeneratedPlan{}, fmt.Errorf("days must be between 1 and 14")
	}
	if len(pois) == 0 {
		return GeneratedPlan{}, fmt.Errorf("at least one POI is required")
	}

	ranked := append([]CandidatePOI(nil), pois...)
	preferences := preferenceSet(input.Preferences)
	sort.SliceStable(ranked, func(i, j int) bool {
		return scorePOI(ranked[i], preferences) > scorePOI(ranked[j], preferences)
	})

	plan := GeneratedPlan{
		Title: fmt.Sprintf("%s %d日行程", input.DestinationRegionID, input.Days),
		Days:  make([]GeneratedDay, input.Days),
	}
	for day := range plan.Days {
		plan.Days[day] = GeneratedDay{
			DayIndex: day + 1,
			Summary:  fmt.Sprintf("第%d天精选路线", day+1),
		}
	}

	for index, poi := range ranked {
		dayIndex := index % input.Days
		itemIndex := len(plan.Days[dayIndex].Items)
		plan.Days[dayIndex].Items = append(plan.Days[dayIndex].Items, GeneratedItem{
			POIID:           poi.ID,
			StartHint:       startHint(itemIndex),
			DurationMinutes: poi.DurationMinutes,
			TransportHint:   "同片区步行或公共交通衔接，跨片区建议地铁或打车。",
		})
	}

	return plan, nil
}

func preferenceSet(preferences []string) map[string]struct{} {
	set := make(map[string]struct{}, len(preferences))
	for _, preference := range preferences {
		set[preference] = struct{}{}
	}
	return set
}

func scorePOI(poi CandidatePOI, preferences map[string]struct{}) int {
	score := poi.HotScore
	for _, tag := range poi.Tags {
		if _, ok := preferences[tag]; ok {
			score += 20
		}
	}
	return score
}

func startHint(index int) string {
	switch index {
	case 0:
		return "上午"
	case 1:
		return "下午"
	default:
		return "傍晚"
	}
}
