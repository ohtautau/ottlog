package model

import "time"

type Note struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"index;not null"`
	Title     string    `json:"title" gorm:"size:255;not null"`
	Content   string    `json:"content" gorm:"type:text"`
	Summary   string    `json:"summary" gorm:"size:500"`
	IsPublic  bool      `json:"is_public" gorm:"default:false"`
	ViewCount int       `json:"view_count" gorm:"default:0"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Tags []Tag `json:"tags" gorm:"many2many:note_tags;"`
}

type Tag struct {
	ID    uint   `json:"id" gorm:"primaryKey"`
	Name  string `json:"name" gorm:"uniqueIndex;size:50;not null"`
	Color string `json:"color" gorm:"size:20"`
}

type Category struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"index;not null"`
	Name      string    `json:"name" gorm:"size:100;not null"`
	SortOrder int       `json:"sort_order" gorm:"default:0"`
	CreatedAt time.Time `json:"created_at"`
}
