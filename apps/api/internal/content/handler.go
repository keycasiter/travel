package content

import (
	"errors"

	"travel/apps/api/internal/httpx"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) ListRegions(c *gin.Context) {
	regions, err := h.repo.ListRegions(c.Request.Context(), optionalQuery(c, "parentId"), optionalQuery(c, "level"))
	if err != nil {
		httpx.Fail(c, 500, "CONTENT_QUERY_FAILED", err.Error())
		return
	}
	httpx.OK(c, regions)
}

func (h *Handler) GetOverview(c *gin.Context) {
	overview, err := h.repo.GetOverview(c.Request.Context(), c.Param("id"))
	respondContent(c, overview, err)
}

func (h *Handler) ListServices(c *gin.Context) {
	services, err := h.repo.ListServices(c.Request.Context(), c.Param("id"), optionalQuery(c, "type"))
	respondContent(c, services, err)
}

func (h *Handler) ListPOIs(c *gin.Context) {
	pois, err := h.repo.ListPOIs(c.Request.Context(), c.Param("id"), optionalQuery(c, "type"))
	respondContent(c, pois, err)
}

func (h *Handler) ListGuides(c *gin.Context) {
	guides, err := h.repo.ListGuides(c.Request.Context(), c.Param("id"))
	respondContent(c, guides, err)
}

func optionalQuery(c *gin.Context, key string) *string {
	value := c.Query(key)
	if value == "" {
		return nil
	}
	return &value
}

func respondContent(c *gin.Context, data any, err error) {
	if err == nil {
		httpx.OK(c, data)
		return
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		httpx.Fail(c, 404, "CONTENT_NOT_FOUND", "content not found")
		return
	}
	httpx.Fail(c, 500, "CONTENT_QUERY_FAILED", err.Error())
}
