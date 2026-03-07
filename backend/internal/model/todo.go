package model

import "time"

type Todo struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	UserID      uint       `json:"user_id" gorm:"index;not null"`
	Title       string     `json:"title" gorm:"size:255;not null"`
	Description string     `json:"description" gorm:"type:text"`
	Priority    int        `json:"priority" gorm:"default:0"` // 0=none, 1=low, 2=medium, 3=high
	Completed   bool       `json:"completed" gorm:"default:false"`
	CompletedAt *time.Time `json:"completed_at"`
	DueDate     *time.Time `json:"due_date"`
	SortOrder   int        `json:"sort_order" gorm:"default:0"`
	ParentID    *uint      `json:"parent_id" gorm:"index"` // sub-task support
	IsRecurring bool       `json:"is_recurring" gorm:"default:false"`
	RecurRule   string     `json:"recur_rule" gorm:"size:100"` // daily, weekly, etc.
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	SubTasks []Todo `json:"sub_tasks,omitempty" gorm:"foreignKey:ParentID"`
}
