package auth

import (
	"travel/apps/api/internal/httpx"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

type LoginRequest struct {
	Code string `json:"code"`
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) WechatLogin(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Fail(c, 400, "BAD_REQUEST", "invalid login request")
		return
	}
	result, err := h.service.LocalLogin(req.Code)
	if err != nil {
		httpx.Fail(c, 400, "BAD_REQUEST", err.Error())
		return
	}
	httpx.OK(c, result)
}
