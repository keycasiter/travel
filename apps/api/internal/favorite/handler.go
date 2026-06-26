package favorite

import (
	"strconv"

	"travel/apps/api/internal/httpx"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	repo *Repository
}

type CreateRequest struct {
	TargetType string `json:"targetType"`
	TargetID   string `json:"targetId"`
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) List(c *gin.Context) {
	userID, ok := httpx.RequireUserID(c)
	if !ok {
		return
	}
	favorites, err := h.repo.ListByUser(c.Request.Context(), userID)
	if err != nil {
		httpx.Fail(c, 500, "FAVORITE_ERROR", err.Error())
		return
	}
	httpx.OK(c, favorites)
}

func (h *Handler) Create(c *gin.Context) {
	userID, ok := httpx.RequireUserID(c)
	if !ok {
		return
	}
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.TargetType == "" || req.TargetID == "" {
		httpx.Fail(c, 400, "BAD_REQUEST", "targetType and targetId are required")
		return
	}
	fav, err := h.repo.Create(c.Request.Context(), userID, req.TargetType, req.TargetID)
	if err != nil {
		httpx.Fail(c, 500, "FAVORITE_ERROR", err.Error())
		return
	}
	httpx.OK(c, fav)
}

func (h *Handler) Delete(c *gin.Context) {
	userID, ok := httpx.RequireUserID(c)
	if !ok {
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		httpx.Fail(c, 400, "BAD_REQUEST", "invalid favorite id")
		return
	}
	if err := h.repo.Delete(c.Request.Context(), userID, id); err != nil {
		httpx.Fail(c, 500, "FAVORITE_ERROR", err.Error())
		return
	}
	httpx.OK(c, gin.H{"deleted": true})
}
