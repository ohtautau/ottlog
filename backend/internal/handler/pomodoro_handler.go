package handler

import (
	"strconv"
	"time"

	"life-station/internal/middleware"
	"life-station/internal/service"
	"life-station/pkg/response"

	"github.com/gin-gonic/gin"
)

type PomodoroHandler struct {
	pomodoroService *service.PomodoroService
}

func NewPomodoroHandler(pomodoroService *service.PomodoroService) *PomodoroHandler {
	return &PomodoroHandler{pomodoroService: pomodoroService}
}

func (h *PomodoroHandler) Start(c *gin.Context) {
	var req service.StartPomodoroRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	userID := middleware.GetUserID(c)
	p, err := h.pomodoroService.Start(userID, &req)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, p)
}

func (h *PomodoroHandler) Complete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	userID := middleware.GetUserID(c)
	p, err := h.pomodoroService.Complete(uint(id), userID)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, p)
}

func (h *PomodoroHandler) Cancel(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	userID := middleware.GetUserID(c)
	p, err := h.pomodoroService.Cancel(uint(id), userID)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, p)
}

func (h *PomodoroHandler) ListByDate(c *gin.Context) {
	userID := middleware.GetUserID(c)
	date := c.DefaultQuery("date", time.Now().Format("2006-01-02"))

	items, err := h.pomodoroService.ListByDate(userID, date)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, items)
}
