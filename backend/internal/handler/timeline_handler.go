package handler

import (
	"strconv"
	"time"

	"life-station/internal/middleware"
	"life-station/internal/service"
	"life-station/pkg/response"

	"github.com/gin-gonic/gin"
)

type TimelineHandler struct {
	timelineService *service.TimelineService
}

func NewTimelineHandler(timelineService *service.TimelineService) *TimelineHandler {
	return &TimelineHandler{timelineService: timelineService}
}

func (h *TimelineHandler) Create(c *gin.Context) {
	var req service.CreateTimeBlockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	userID := middleware.GetUserID(c)
	block, err := h.timelineService.Create(userID, &req)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, block)
}

func (h *TimelineHandler) ListByDate(c *gin.Context) {
	userID := middleware.GetUserID(c)
	date := c.Param("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	blocks, err := h.timelineService.ListByDate(userID, date)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, blocks)
}

func (h *TimelineHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	userID := middleware.GetUserID(c)
	if err := h.timelineService.Delete(uint(id), userID); err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, nil)
}
