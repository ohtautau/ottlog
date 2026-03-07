package repository

import (
	"life-station/internal/model"
	"math/rand"
	"time"

	"gorm.io/gorm"
)

type PoolRepo struct {
	db *gorm.DB
}

func NewPoolRepo(db *gorm.DB) *PoolRepo {
	return &PoolRepo{db: db}
}

func (r *PoolRepo) Create(item *model.PoolItem) error {
	return r.db.Create(item).Error
}

func (r *PoolRepo) FindByID(id uint) (*model.PoolItem, error) {
	var item model.PoolItem
	err := r.db.First(&item, id).Error
	return &item, err
}

func (r *PoolRepo) List(userID uint) ([]model.PoolItem, error) {
	var items []model.PoolItem
	err := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&items).Error
	return items, err
}

func (r *PoolRepo) RandomPick(userID uint, maxMinutes int) (*model.PoolItem, error) {
	var items []model.PoolItem
	query := r.db.Where("user_id = ?", userID)
	if maxMinutes > 0 {
		query = query.Where("estimated_min <= ?", maxMinutes)
	}
	if err := query.Find(&items).Error; err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	// Weighted random selection
	totalWeight := 0
	for _, item := range items {
		totalWeight += item.Weight
	}

	r_ := rand.New(rand.NewSource(time.Now().UnixNano()))
	pick := r_.Intn(totalWeight)
	cumulative := 0
	for _, item := range items {
		cumulative += item.Weight
		if pick < cumulative {
			return &item, nil
		}
	}
	return &items[0], nil
}

func (r *PoolRepo) Update(item *model.PoolItem) error {
	return r.db.Save(item).Error
}

func (r *PoolRepo) Delete(id, userID uint) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.PoolItem{}).Error
}
