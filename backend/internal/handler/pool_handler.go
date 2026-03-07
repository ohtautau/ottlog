package handler

import (
	"strconv"

	"life-station/internal/middleware"
	"life-station/internal/service"
	"life-station/pkg/response"

	"github.com/gin-gonic/gin"
)

type PoolHandler struct {
	poolService *service.PoolService
}

func NewPoolHandler(poolService *service.PoolService) *PoolHandler {
	return &PoolHandler{poolService: poolService}
}

func (h *PoolHandler) Create(c *gin.Context) {
	var req service.CreatePoolItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	userID := middleware.GetUserID(c)
	item, err := h.poolService.Create(userID, &req)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, item)
}

func (h *PoolHandler) List(c *gin.Context) {
	userID := middleware.GetUserID(c)
	items, err := h.poolService.List(userID)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, items)
}

func (h *PoolHandler) Random(c *gin.Context) {
	userID := middleware.GetUserID(c)
	maxMin, _ := strconv.Atoi(c.DefaultQuery("max_minutes", "0"))

	item, err := h.poolService.RandomPick(userID, maxMin)
	if err != nil {
		response.NotFound(c, "no items available")
		return
	}

	response.OK(c, item)
}

func (h *PoolHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	userID := middleware.GetUserID(c)
	if err := h.poolService.Delete(uint(id), userID); err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, nil)
}
