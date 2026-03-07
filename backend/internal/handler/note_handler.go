package handler

import (
	"strconv"

	"life-station/internal/middleware"
	"life-station/internal/service"
	"life-station/pkg/response"

	"github.com/gin-gonic/gin"
)

type NoteHandler struct {
	noteService *service.NoteService
}

func NewNoteHandler(noteService *service.NoteService) *NoteHandler {
	return &NoteHandler{noteService: noteService}
}

func (h *NoteHandler) Create(c *gin.Context) {
	var req service.CreateNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	userID := middleware.GetUserID(c)
	note, err := h.noteService.Create(userID, &req)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, note)
}

func (h *NoteHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	note, err := h.noteService.GetByID(uint(id))
	if err != nil {
		response.NotFound(c, "note not found")
		return
	}

	response.OK(c, note)
}

func (h *NoteHandler) List(c *gin.Context) {
	userID := middleware.GetUserID(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	keyword := c.Query("keyword")

	notes, total, err := h.noteService.List(userID, page, size, keyword)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OKWithPage(c, notes, total, page, size)
}

func (h *NoteHandler) ListPublic(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))

	notes, total, err := h.noteService.ListPublic(page, size)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OKWithPage(c, notes, total, page, size)
}

func (h *NoteHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	var req service.UpdateNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	userID := middleware.GetUserID(c)
	note, err := h.noteService.Update(uint(id), userID, &req)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, note)
}

func (h *NoteHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	userID := middleware.GetUserID(c)
	if err := h.noteService.Delete(uint(id), userID); err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.OK(c, nil)
}
