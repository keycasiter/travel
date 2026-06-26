package itinerary

import (
	"errors"
	"strconv"

	"travel/apps/api/internal/httpx"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	repo *Repository
}

type GenerateRequest struct {
	DestinationRegionID string   `json:"destinationRegionId"`
	Days                int      `json:"days"`
	Preferences         []string `json:"preferences"`
}

type PatchItineraryRequest struct {
	Title       *string `json:"title"`
	Status      *string `json:"status"`
	BudgetCents *int    `json:"budgetCents"`
}

type PatchItemRequest struct {
	SortOrder *int    `json:"sortOrder"`
	Note      *string `json:"note"`
	Done      *bool   `json:"done"`
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) Generate(c *gin.Context) {
	userID, ok := httpx.RequireUserID(c)
	if !ok {
		return
	}
	var req GenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Fail(c, 400, "BAD_REQUEST", "invalid itinerary request")
		return
	}

	candidates, err := h.repo.ListCandidatePOIs(c.Request.Context(), req.DestinationRegionID)
	if err != nil {
		respondItinerary(c, nil, err)
		return
	}
	input := GenerateInput{
		UserID:              userID,
		DestinationRegionID: req.DestinationRegionID,
		Days:                req.Days,
		Preferences:         req.Preferences,
	}
	plan, err := GeneratePlan(input, candidates)
	if err != nil {
		httpx.Fail(c, 400, "BAD_REQUEST", err.Error())
		return
	}
	detail, err := h.repo.CreateGenerated(c.Request.Context(), userID, input, plan)
	respondItinerary(c, detail, err)
}

func (h *Handler) List(c *gin.Context) {
	userID, ok := httpx.RequireUserID(c)
	if !ok {
		return
	}
	itineraries, err := h.repo.ListByUser(c.Request.Context(), userID)
	respondItinerary(c, itineraries, err)
}

func (h *Handler) Detail(c *gin.Context) {
	userID, ok := httpx.RequireUserID(c)
	if !ok {
		return
	}
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}
	detail, err := h.repo.GetDetail(c.Request.Context(), userID, id)
	respondItinerary(c, detail, err)
}

func (h *Handler) PatchItinerary(c *gin.Context) {
	userID, ok := httpx.RequireUserID(c)
	if !ok {
		return
	}
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}
	var req PatchItineraryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Fail(c, 400, "BAD_REQUEST", "invalid itinerary patch")
		return
	}
	detail, err := h.repo.UpdateItinerary(c.Request.Context(), userID, id, ItineraryPatch(req))
	respondItinerary(c, detail, err)
}

func (h *Handler) PatchItem(c *gin.Context) {
	userID, ok := httpx.RequireUserID(c)
	if !ok {
		return
	}
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}
	var req PatchItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Fail(c, 400, "BAD_REQUEST", "invalid itinerary item patch")
		return
	}
	item, err := h.repo.UpdateItem(c.Request.Context(), userID, id, ItemPatch(req))
	respondItinerary(c, item, err)
}

func parseUintParam(c *gin.Context, key string) (uint64, bool) {
	id, err := strconv.ParseUint(c.Param(key), 10, 64)
	if err != nil || id == 0 {
		httpx.Fail(c, 400, "BAD_REQUEST", "invalid id")
		return 0, false
	}
	return id, true
}

func respondItinerary(c *gin.Context, data any, err error) {
	if err == nil {
		httpx.OK(c, data)
		return
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		httpx.Fail(c, 404, "ITINERARY_NOT_FOUND", "itinerary not found")
		return
	}
	httpx.Fail(c, 500, "ITINERARY_ERROR", err.Error())
}
