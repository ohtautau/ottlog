package model

import "time"

type Pomodoro struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	UserID    uint       `json:"user_id" gorm:"index;not null"`
	TodoID    *uint      `json:"todo_id" gorm:"index"` // linked task
	Duration  int        `json:"duration" gorm:"not null"`  // in minutes
	BreakTime int        `json:"break_time" gorm:"default:5"` // break duration in minutes
	Status    string     `json:"status" gorm:"size:20;default:'running'"` // running, completed, cancelled
	StartedAt time.Time  `json:"started_at"`
	EndedAt   *time.Time `json:"ended_at"`
	CreatedAt time.Time  `json:"created_at"`
}

type TimeBlock struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"index;not null"`
	Title     string    `json:"title" gorm:"size:255;not null"`
	Category  string    `json:"category" gorm:"size:50"` // work, study, exercise, rest, etc.
	Color     string    `json:"color" gorm:"size:20"`
	StartTime time.Time `json:"start_time" gorm:"not null"`
	EndTime   time.Time `json:"end_time" gorm:"not null"`
	TodoID    *uint     `json:"todo_id" gorm:"index"`
	CreatedAt time.Time `json:"created_at"`
}
