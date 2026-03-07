package main

import (
	"fmt"
	"log"

	"life-station/internal/handler"
	"life-station/internal/repository"
	"life-station/pkg/config"
)

func main() {
	// Load config
	cfg, err := config.Load("config.yaml")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Init database
	db, err := repository.InitDB(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to init database: %v", err)
	}

	log.Println("Database initialized successfully")

	// Setup router
	r := handler.SetupRouter(db, cfg)

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("Server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
