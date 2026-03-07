package repository

import (
	"life-station/internal/model"
	"time"

	"gorm.io/gorm"
)

type PomodoroRepo struct {
	db *gorm.DB
}

func NewPomodoroRepo(db *gorm.DB) *PomodoroRepo {
	return &PomodoroRepo{db: db}
}

func (r *PomodoroRepo) Create(p *model.Pomodoro) error {
	return r.db.Create(p).Error
}

func (r *PomodoroRepo) FindByID(id uint) (*model.Pomodoro, error) {
	var p model.Pomodoro
	err := r.db.First(&p, id).Error
	return &p, err
}

func (r *PomodoroRepo) Update(p *model.Pomodoro) error {
	return r.db.Save(p).Error
}

func (r *PomodoroRepo) ListByDate(userID uint, date string) ([]model.Pomodoro, error) {
	var items []model.Pomodoro
	err := r.db.Where("user_id = ? AND DATE(started_at) = ?", userID, date).
		Order("started_at DESC").
		Find(&items).Error
	return items, err
}

func (r *PomodoroRepo) CountCompleted(userID uint, since time.Time) (int64, error) {
	var count int64
	err := r.db.Model(&model.Pomodoro{}).
		Where("user_id = ? AND status = 'completed' AND started_at >= ?", userID, since).
		Count(&count).Error
	return count, err
}
