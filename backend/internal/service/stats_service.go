package service

import (
	"life-station/internal/repository"
	"time"
)

type StatsService struct {
	todoRepo     *repository.TodoRepo
	pomodoroRepo *repository.PomodoroRepo
	noteRepo     *repository.NoteRepo
}

func NewStatsService(todoRepo *repository.TodoRepo, pomodoroRepo *repository.PomodoroRepo, noteRepo *repository.NoteRepo) *StatsService {
	return &StatsService{
		todoRepo:     todoRepo,
		pomodoroRepo: pomodoroRepo,
		noteRepo:     noteRepo,
	}
}

type OverviewStats struct {
	TodayTodos       int   `json:"today_todos"`
	CompletedTodos   int   `json:"completed_todos"`
	TotalNotes       int64 `json:"total_notes"`
	TodayPomodoros   int64 `json:"today_pomodoros"`
	WeeklyPomodoros  int64 `json:"weekly_pomodoros"`
}

func (s *StatsService) Overview(userID uint) (*OverviewStats, error) {
	stats := &OverviewStats{}

	// Today's todos
	todos, err := s.todoRepo.ListToday(userID)
	if err == nil {
		stats.TodayTodos = len(todos)
		for _, t := range todos {
			if t.Completed {
				stats.CompletedTodos++
			}
		}
	}

	// Total notes
	_, total, err := s.noteRepo.List(userID, 1, 1, "")
	if err == nil {
		stats.TotalNotes = total
	}

	// Today's pomodoros
	todayStart := time.Now().Truncate(24 * time.Hour)
	count, err := s.pomodoroRepo.CountCompleted(userID, todayStart)
	if err == nil {
		stats.TodayPomodoros = count
	}

	// Weekly pomodoros
	weekStart := todayStart.AddDate(0, 0, -int(todayStart.Weekday()))
	count, err = s.pomodoroRepo.CountCompleted(userID, weekStart)
	if err == nil {
		stats.WeeklyPomodoros = count
	}

	return stats, nil
}
