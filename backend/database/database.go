package database

import (
	"log"

	"github.com/noa-santo/invent-ory/backend/config"
	"github.com/noa-santo/invent-ory/backend/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect(cfg *config.Config) {
	var err error

	DB, err = gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	log.Println("database connection established")

	if err = DB.AutoMigrate(
		&models.Component{},
		&models.Box{},
		&models.InventoryItem{},
	); err != nil {
		log.Fatalf("failed to auto-migrate models: %v", err)
	}

	log.Println("database migration completed")
}
