package model

import "time"

type PoolItem struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	UserID       uint      `json:"user_id" gorm:"index;not null"`
	Title        string    `json:"title" gorm:"size:255;not null"`
	Description  string    `json:"description" gorm:"type:text"`
	Category     string    `json:"category" gorm:"size:50"`
	EstimatedMin int       `json:"estimated_min" gorm:"default:30"` // estimated time in minutes
	Weight       int       `json:"weight" gorm:"default:1"`         // higher = more likely to be picked
	TimesChosen  int       `json:"times_chosen" gorm:"default:0"`
	TimesSkipped int       `json:"times_skipped" gorm:"default:0"`
	LastChosenAt *time.Time `json:"last_chosen_at"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
