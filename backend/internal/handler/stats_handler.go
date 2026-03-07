package handler

import (
	"life-station/internal/middleware"
	"life-station/internal/service"
	"life-station/pkg/response"

	"github.com/gin-gonic/gin"
)

type StatsHandler struct {
	statsService *service.StatsService
}

func NewStatsHandler(statsService *service.StatsService) *StatsHandler {
	return &StatsHandler{statsService: statsService}
}

func (h *StatsHandler) Overview(c *gin.Context) {
	userID := middleware.GetUserID(c)
	stats, err := h.statsService.Overview(userID)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, stats)
}
