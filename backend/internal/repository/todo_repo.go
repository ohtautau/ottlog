package repository

import (
	"time"

	"life-station/internal/model"

	"gorm.io/gorm"
)

type TodoRepo struct {
	db *gorm.DB
}

func NewTodoRepo(db *gorm.DB) *TodoRepo {
	return &TodoRepo{db: db}
}

func (r *TodoRepo) Create(todo *model.Todo) error {
	return r.db.Create(todo).Error
}

func (r *TodoRepo) FindByID(id uint) (*model.Todo, error) {
	var todo model.Todo
	err := r.db.Preload("SubTasks").First(&todo, id).Error
	if err != nil {
		return nil, err
	}
	return &todo, nil
}

func (r *TodoRepo) ListToday(userID uint) ([]model.Todo, error) {
	var todos []model.Todo
	today := time.Now().Format("2006-01-02")

	err := r.db.Where("user_id = ? AND parent_id IS NULL AND (DATE(created_at) = ? OR (completed = ? AND DATE(completed_at) = ?) OR due_date IS NOT NULL)",
		userID, today, true, today).
		Preload("SubTasks").
		Order("sort_order ASC, created_at ASC").
		Find(&todos).Error

	return todos, err
}

func (r *TodoRepo) ListAll(userID uint, completed *bool) ([]model.Todo, error) {
	var todos []model.Todo
	query := r.db.Where("user_id = ? AND parent_id IS NULL", userID)
	if completed != nil {
		query = query.Where("completed = ?", *completed)
	}

	err := query.Preload("SubTasks").
		Order("sort_order ASC, created_at DESC").
		Find(&todos).Error

	return todos, err
}

func (r *TodoRepo) Update(todo *model.Todo) error {
	return r.db.Save(todo).Error
}

func (r *TodoRepo) Delete(id, userID uint) error {
	// Delete sub-tasks first
	r.db.Where("parent_id = ? AND user_id = ?", id, userID).Delete(&model.Todo{})
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.Todo{}).Error
}

func (r *TodoRepo) ToggleComplete(id, userID uint) (*model.Todo, error) {
	var todo model.Todo
	if err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&todo).Error; err != nil {
		return nil, err
	}

	todo.Completed = !todo.Completed
	if todo.Completed {
		now := time.Now()
		todo.CompletedAt = &now
	} else {
		todo.CompletedAt = nil
	}

	if err := r.db.Save(&todo).Error; err != nil {
		return nil, err
	}
	return &todo, nil
}
