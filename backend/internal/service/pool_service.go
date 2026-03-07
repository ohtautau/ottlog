package service

import (
	"life-station/internal/model"
	"life-station/internal/repository"
	"time"
)

type PoolService struct {
	poolRepo *repository.PoolRepo
}

func NewPoolService(poolRepo *repository.PoolRepo) *PoolService {
	return &PoolService{poolRepo: poolRepo}
}

type CreatePoolItemRequest struct {
	Title        string `json:"title" binding:"required"`
	Description  string `json:"description"`
	Category     string `json:"category"`
	EstimatedMin int    `json:"estimated_min"`
	Weight       int    `json:"weight"`
}

func (s *PoolService) Create(userID uint, req *CreatePoolItemRequest) (*model.PoolItem, error) {
	item := &model.PoolItem{
		UserID:       userID,
		Title:        req.Title,
		Description:  req.Description,
		Category:     req.Category,
		EstimatedMin: req.EstimatedMin,
		Weight:       req.Weight,
	}
	if item.EstimatedMin == 0 {
		item.EstimatedMin = 30
	}
	if item.Weight == 0 {
		item.Weight = 1
	}

	if err := s.poolRepo.Create(item); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *PoolService) List(userID uint) ([]model.PoolItem, error) {
	return s.poolRepo.List(userID)
}

func (s *PoolService) RandomPick(userID uint, maxMinutes int) (*model.PoolItem, error) {
	item, err := s.poolRepo.RandomPick(userID, maxMinutes)
	if err != nil {
		return nil, err
	}

	// Update stats
	item.TimesChosen++
	now := time.Now()
	item.LastChosenAt = &now
	s.poolRepo.Update(item)

	return item, nil
}

func (s *PoolService) Delete(id, userID uint) error {
	return s.poolRepo.Delete(id, userID)
}
