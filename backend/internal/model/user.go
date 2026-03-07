package model

import "time"

type User struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Username  string    `json:"username" gorm:"uniqueIndex;size:50;not null"`
	Password  string    `json:"-" gorm:"size:255;not null"`
	Nickname  string    `json:"nickname" gorm:"size:100"`
	Avatar    string    `json:"avatar" gorm:"size:500"`
	Email     string    `json:"email" gorm:"size:255"`
	WechatID  string    `json:"-" gorm:"size:100;index"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
