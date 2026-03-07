package repository

import (
	"life-station/internal/model"

	"gorm.io/gorm"
)

type TimelineRepo struct {
	db *gorm.DB
}

func NewTimelineRepo(db *gorm.DB) *TimelineRepo {
	return &TimelineRepo{db: db}
}

func (r *TimelineRepo) Create(block *model.TimeBlock) error {
	return r.db.Create(block).Error
}

func (r *TimelineRepo) FindByID(id uint) (*model.TimeBlock, error) {
	var block model.TimeBlock
	err := r.db.First(&block, id).Error
	return &block, err
}

func (r *TimelineRepo) ListByDate(userID uint, date string) ([]model.TimeBlock, error) {
	var blocks []model.TimeBlock
	err := r.db.Where("user_id = ? AND DATE(start_time) = ?", userID, date).
		Order("start_time ASC").
		Find(&blocks).Error
	return blocks, err
}

func (r *TimelineRepo) Update(block *model.TimeBlock) error {
	return r.db.Save(block).Error
}

func (r *TimelineRepo) Delete(id, userID uint) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.TimeBlock{}).Error
}
