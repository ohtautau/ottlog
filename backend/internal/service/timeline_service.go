package service

import (
	"life-station/internal/model"
	"life-station/internal/repository"
	"time"
)

type TimelineService struct {
	timelineRepo *repository.TimelineRepo
}

func NewTimelineService(timelineRepo *repository.TimelineRepo) *TimelineService {
	return &TimelineService{timelineRepo: timelineRepo}
}

type CreateTimeBlockRequest struct {
	Title     string    `json:"title" binding:"required"`
	Category  string    `json:"category"`
	Color     string    `json:"color"`
	StartTime time.Time `json:"start_time" binding:"required"`
	EndTime   time.Time `json:"end_time" binding:"required"`
	TodoID    *uint     `json:"todo_id"`
}

func (s *TimelineService) Create(userID uint, req *CreateTimeBlockRequest) (*model.TimeBlock, error) {
	block := &model.TimeBlock{
		UserID:    userID,
		Title:     req.Title,
		Category:  req.Category,
		Color:     req.Color,
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
		TodoID:    req.TodoID,
	}

	if err := s.timelineRepo.Create(block); err != nil {
		return nil, err
	}
	return block, nil
}

func (s *TimelineService) ListByDate(userID uint, date string) ([]model.TimeBlock, error) {
	return s.timelineRepo.ListByDate(userID, date)
}

func (s *TimelineService) Delete(id, userID uint) error {
	return s.timelineRepo.Delete(id, userID)
}
