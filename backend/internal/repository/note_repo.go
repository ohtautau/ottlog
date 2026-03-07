package repository

import (
	"life-station/internal/model"

	"gorm.io/gorm"
)

type NoteRepo struct {
	db *gorm.DB
}

func NewNoteRepo(db *gorm.DB) *NoteRepo {
	return &NoteRepo{db: db}
}

func (r *NoteRepo) Create(note *model.Note) error {
	return r.db.Create(note).Error
}

func (r *NoteRepo) FindByID(id uint) (*model.Note, error) {
	var note model.Note
	err := r.db.Preload("Tags").First(&note, id).Error
	if err != nil {
		return nil, err
	}
	return &note, nil
}

func (r *NoteRepo) List(userID uint, page, size int, keyword string) ([]model.Note, int64, error) {
	var notes []model.Note
	var total int64

	query := r.db.Where("user_id = ?", userID)
	if keyword != "" {
		query = query.Where("title LIKE ? OR content LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	query.Model(&model.Note{}).Count(&total)

	err := query.Preload("Tags").
		Order("created_at DESC").
		Offset((page - 1) * size).
		Limit(size).
		Find(&notes).Error

	return notes, total, err
}

func (r *NoteRepo) ListPublic(page, size int) ([]model.Note, int64, error) {
	var notes []model.Note
	var total int64

	query := r.db.Where("is_public = ?", true)
	query.Model(&model.Note{}).Count(&total)

	err := query.Preload("Tags").
		Order("created_at DESC").
		Offset((page - 1) * size).
		Limit(size).
		Find(&notes).Error

	return notes, total, err
}

func (r *NoteRepo) Update(note *model.Note) error {
	return r.db.Save(note).Error
}

func (r *NoteRepo) Delete(id, userID uint) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.Note{}).Error
}
