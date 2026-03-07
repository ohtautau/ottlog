package service

import (
	"life-station/internal/model"
	"life-station/internal/repository"
	"time"
)

type TodoService struct {
	todoRepo *repository.TodoRepo
}

func NewTodoService(todoRepo *repository.TodoRepo) *TodoService {
	return &TodoService{todoRepo: todoRepo}
}

type CreateTodoRequest struct {
	Title       string     `json:"title" binding:"required"`
	Description string     `json:"description"`
	Priority    int        `json:"priority"`
	DueDate     *time.Time `json:"due_date"`
	ParentID    *uint      `json:"parent_id"`
	IsRecurring bool       `json:"is_recurring"`
	RecurRule   string     `json:"recur_rule"`
}

type UpdateTodoRequest struct {
	Title       *string    `json:"title"`
	Description *string    `json:"description"`
	Priority    *int       `json:"priority"`
	DueDate     *time.Time `json:"due_date"`
	SortOrder   *int       `json:"sort_order"`
}

func (s *TodoService) Create(userID uint, req *CreateTodoRequest) (*model.Todo, error) {
	todo := &model.Todo{
		UserID:      userID,
		Title:       req.Title,
		Description: req.Description,
		Priority:    req.Priority,
		DueDate:     req.DueDate,
		ParentID:    req.ParentID,
		IsRecurring: req.IsRecurring,
		RecurRule:   req.RecurRule,
	}

	if err := s.todoRepo.Create(todo); err != nil {
		return nil, err
	}
	return todo, nil
}

func (s *TodoService) GetByID(id uint) (*model.Todo, error) {
	return s.todoRepo.FindByID(id)
}

func (s *TodoService) ListToday(userID uint) ([]model.Todo, error) {
	return s.todoRepo.ListToday(userID)
}

func (s *TodoService) ListAll(userID uint, completed *bool) ([]model.Todo, error) {
	return s.todoRepo.ListAll(userID, completed)
}

func (s *TodoService) Update(id, userID uint, req *UpdateTodoRequest) (*model.Todo, error) {
	todo, err := s.todoRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if todo.UserID != userID {
		return nil, err
	}

	if req.Title != nil {
		todo.Title = *req.Title
	}
	if req.Description != nil {
		todo.Description = *req.Description
	}
	if req.Priority != nil {
		todo.Priority = *req.Priority
	}
	if req.DueDate != nil {
		todo.DueDate = req.DueDate
	}
	if req.SortOrder != nil {
		todo.SortOrder = *req.SortOrder
	}

	if err := s.todoRepo.Update(todo); err != nil {
		return nil, err
	}
	return todo, nil
}

func (s *TodoService) ToggleComplete(id, userID uint) (*model.Todo, error) {
	return s.todoRepo.ToggleComplete(id, userID)
}

func (s *TodoService) Delete(id, userID uint) error {
	return s.todoRepo.Delete(id, userID)
}
