package service

import (
	"errors"
	"life-station/internal/model"
	"life-station/internal/repository"
	"time"
)

type PomodoroService struct {
	pomodoroRepo *repository.PomodoroRepo
}

func NewPomodoroService(pomodoroRepo *repository.PomodoroRepo) *PomodoroService {
	return &PomodoroService{pomodoroRepo: pomodoroRepo}
}

type StartPomodoroRequest struct {
	Duration  int   `json:"duration" binding:"required,min=1"`
	BreakTime int   `json:"break_time"`
	TodoID    *uint `json:"todo_id"`
}

func (s *PomodoroService) Start(userID uint, req *StartPomodoroRequest) (*model.Pomodoro, error) {
	if req.BreakTime == 0 {
		req.BreakTime = 5
	}

	p := &model.Pomodoro{
		UserID:    userID,
		Duration:  req.Duration,
		BreakTime: req.BreakTime,
		TodoID:    req.TodoID,
		Status:    "running",
		StartedAt: time.Now(),
	}

	if err := s.pomodoroRepo.Create(p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *PomodoroService) Complete(id, userID uint) (*model.Pomodoro, error) {
	p, err := s.pomodoroRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if p.UserID != userID {
		return nil, errors.New("not authorized")
	}

	now := time.Now()
	p.Status = "completed"
	p.EndedAt = &now

	if err := s.pomodoroRepo.Update(p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *PomodoroService) Cancel(id, userID uint) (*model.Pomodoro, error) {
	p, err := s.pomodoroRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if p.UserID != userID {
		return nil, errors.New("not authorized")
	}

	now := time.Now()
	p.Status = "cancelled"
	p.EndedAt = &now

	if err := s.pomodoroRepo.Update(p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *PomodoroService) ListByDate(userID uint, date string) ([]model.Pomodoro, error) {
	return s.pomodoroRepo.ListByDate(userID, date)
}
