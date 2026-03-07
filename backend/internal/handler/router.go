package handler

import (
	"life-station/internal/middleware"
	"life-station/internal/repository"
	"life-station/internal/service"
	"life-station/pkg/config"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRouter(db *gorm.DB, cfg *config.Config) *gin.Engine {
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Repositories
	userRepo := repository.NewUserRepo(db)
	noteRepo := repository.NewNoteRepo(db)
	todoRepo := repository.NewTodoRepo(db)
	pomodoroRepo := repository.NewPomodoroRepo(db)
	poolRepo := repository.NewPoolRepo(db)
	timelineRepo := repository.NewTimelineRepo(db)

	// Services
	authService := service.NewAuthService(userRepo, &cfg.JWT)
	noteService := service.NewNoteService(noteRepo)
	todoService := service.NewTodoService(todoRepo)
	pomodoroService := service.NewPomodoroService(pomodoroRepo)
	poolService := service.NewPoolService(poolRepo)
	timelineService := service.NewTimelineService(timelineRepo)
	statsService := service.NewStatsService(todoRepo, pomodoroRepo, noteRepo)

	// Handlers
	authHandler := NewAuthHandler(authService)
	noteHandler := NewNoteHandler(noteService)
	todoHandler := NewTodoHandler(todoService)
	pomodoroHandler := NewPomodoroHandler(pomodoroService)
	poolHandler := NewPoolHandler(poolService)
	timelineHandler := NewTimelineHandler(timelineService)
	statsHandler := NewStatsHandler(statsService)

	// Health check
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Public routes
	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// Public blog
		api.GET("/blog", noteHandler.ListPublic)
		api.GET("/blog/:id", noteHandler.Get)
	}

	// Protected routes
	protected := r.Group("/api")
	protected.Use(middleware.JWTAuth(authService))
	{
		// User
		protected.GET("/user/profile", authHandler.Profile)

		// Notes
		notes := protected.Group("/notes")
		{
			notes.GET("", noteHandler.List)
			notes.POST("", noteHandler.Create)
			notes.GET("/:id", noteHandler.Get)
			notes.PUT("/:id", noteHandler.Update)
			notes.DELETE("/:id", noteHandler.Delete)
		}

		// Todos
		todos := protected.Group("/todos")
		{
			todos.GET("/today", todoHandler.ListToday)
			todos.GET("", todoHandler.ListAll)
			todos.POST("", todoHandler.Create)
			todos.PUT("/:id", todoHandler.Update)
			todos.PATCH("/:id/toggle", todoHandler.ToggleComplete)
			todos.DELETE("/:id", todoHandler.Delete)
		}

		// Pomodoro
		pomodoro := protected.Group("/pomodoro")
		{
			pomodoro.POST("/start", pomodoroHandler.Start)
			pomodoro.PATCH("/:id/complete", pomodoroHandler.Complete)
			pomodoro.PATCH("/:id/cancel", pomodoroHandler.Cancel)
			pomodoro.GET("", pomodoroHandler.ListByDate)
		}

		// Pool
		pool := protected.Group("/pool")
		{
			pool.GET("", poolHandler.List)
			pool.POST("", poolHandler.Create)
			pool.GET("/random", poolHandler.Random)
			pool.DELETE("/:id", poolHandler.Delete)
		}

		// Timeline
		timeline := protected.Group("/timeline")
		{
			timeline.POST("", timelineHandler.Create)
			timeline.GET("/:date", timelineHandler.ListByDate)
			timeline.DELETE("/:id", timelineHandler.Delete)
		}

		// Stats
		protected.GET("/stats/overview", statsHandler.Overview)
	}

	return r
}
