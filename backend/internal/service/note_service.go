package service

import (
	"life-station/internal/model"
	"life-station/internal/repository"
)

type NoteService struct {
	noteRepo *repository.NoteRepo
}

func NewNoteService(noteRepo *repository.NoteRepo) *NoteService {
	return &NoteService{noteRepo: noteRepo}
}

type CreateNoteRequest struct {
	Title    string   `json:"title" binding:"required"`
	Content  string   `json:"content"`
	Summary  string   `json:"summary"`
	IsPublic bool     `json:"is_public"`
	Tags     []string `json:"tags"`
}

type UpdateNoteRequest struct {
	Title    *string  `json:"title"`
	Content  *string  `json:"content"`
	Summary  *string  `json:"summary"`
	IsPublic *bool    `json:"is_public"`
	Tags     []string `json:"tags"`
}

func (s *NoteService) Create(userID uint, req *CreateNoteRequest) (*model.Note, error) {
	note := &model.Note{
		UserID:   userID,
		Title:    req.Title,
		Content:  req.Content,
		Summary:  req.Summary,
		IsPublic: req.IsPublic,
	}

	if err := s.noteRepo.Create(note); err != nil {
		return nil, err
	}
	return note, nil
}

func (s *NoteService) GetByID(id uint) (*model.Note, error) {
	return s.noteRepo.FindByID(id)
}

func (s *NoteService) List(userID uint, page, size int, keyword string) ([]model.Note, int64, error) {
	if page < 1 {
		page = 1
	}
	if size < 1 || size > 50 {
		size = 20
	}
	return s.noteRepo.List(userID, page, size, keyword)
}

func (s *NoteService) ListPublic(page, size int) ([]model.Note, int64, error) {
	if page < 1 {
		page = 1
	}
	if size < 1 || size > 50 {
		size = 20
	}
	return s.noteRepo.ListPublic(page, size)
}

func (s *NoteService) Update(id, userID uint, req *UpdateNoteRequest) (*model.Note, error) {
	note, err := s.noteRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if note.UserID != userID {
		return nil, err
	}

	if req.Title != nil {
		note.Title = *req.Title
	}
	if req.Content != nil {
		note.Content = *req.Content
	}
	if req.Summary != nil {
		note.Summary = *req.Summary
	}
	if req.IsPublic != nil {
		note.IsPublic = *req.IsPublic
	}

	if err := s.noteRepo.Update(note); err != nil {
		return nil, err
	}
	return note, nil
}

func (s *NoteService) Delete(id, userID uint) error {
	return s.noteRepo.Delete(id, userID)
}
