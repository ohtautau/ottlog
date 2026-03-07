package handler

import (
	"strconv"

	"life-station/internal/middleware"
	"life-station/internal/service"
	"life-station/pkg/response"

	"github.com/gin-gonic/gin"
)

type TodoHandler struct {
	todoService *service.TodoService
}

func NewTodoHandler(todoService *service.TodoService) *TodoHandler {
	return &TodoHandler{todoService: todoService}
}

func (h *TodoHandler) Create(c *gin.Context) {
	var req service.CreateTodoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	userID := middleware.GetUserID(c)
	todo, err := h.todoService.Create(userID, &req)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, todo)
}

func (h *TodoHandler) ListToday(c *gin.Context) {
	userID := middleware.GetUserID(c)
	todos, err := h.todoService.ListToday(userID)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, todos)
}

func (h *TodoHandler) ListAll(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var completed *bool
	if v := c.Query("completed"); v != "" {
		b := v == "true"
		completed = &b
	}

	todos, err := h.todoService.ListAll(userID, completed)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, todos)
}

func (h *TodoHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	var req service.UpdateTodoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	userID := middleware.GetUserID(c)
	todo, err := h.todoService.Update(uint(id), userID, &req)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, todo)
}

func (h *TodoHandler) ToggleComplete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	userID := middleware.GetUserID(c)
	todo, err := h.todoService.ToggleComplete(uint(id), userID)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, todo)
}

func (h *TodoHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	userID := middleware.GetUserID(c)
	if err := h.todoService.Delete(uint(id), userID); err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, nil)
}
