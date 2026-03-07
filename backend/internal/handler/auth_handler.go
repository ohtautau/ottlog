package handler

import (
	"life-station/internal/middleware"
	"life-station/internal/service"
	"life-station/pkg/response"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req service.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	result, err := h.authService.Register(&req)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.OK(c, result)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req service.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	result, err := h.authService.Login(&req)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.OK(c, result)
}

func (h *AuthHandler) Profile(c *gin.Context) {
	userID := middleware.GetUserID(c)
	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		response.NotFound(c, "user not found")
		return
	}
	response.OK(c, user)
}
