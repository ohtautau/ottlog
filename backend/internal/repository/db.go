package repository

import (
	"life-station/internal/model"
	"life-station/pkg/config"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func InitDB(cfg *config.DatabaseConfig) (*gorm.DB, error) {
	var db *gorm.DB
	var err error

	gormCfg := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	}

	switch cfg.Driver {
	case "sqlite":
		db, err = gorm.Open(sqlite.Open(cfg.DSN), gormCfg)
	default:
		db, err = gorm.Open(sqlite.Open(cfg.DSN), gormCfg)
	}

	if err != nil {
		return nil, err
	}

	// Auto migrate
	err = db.AutoMigrate(
		&model.User{},
		&model.Note{},
		&model.Tag{},
		&model.Category{},
		&model.Todo{},
		&model.Pomodoro{},
		&model.TimeBlock{},
		&model.PoolItem{},
	)
	if err != nil {
		return nil, err
	}

	return db, nil
}
