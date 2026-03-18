package main

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/noa-santo/invent-ory/backend/config"
	"github.com/noa-santo/invent-ory/backend/database"
	"github.com/noa-santo/invent-ory/backend/handlers"
)

func main() {
	cfg := config.Load()
	database.Connect(cfg)

	router := gin.Default()

	// CORS middleware
	allowedOrigins := strings.Split(cfg.CORSOrigins, ",")
	router.Use(corsMiddleware(allowedOrigins))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	v1 := router.Group("/api/v1")
	{
		// Components
		components := v1.Group("/components")
		{
			components.GET("", handlers.ListComponents)
			components.GET("/:id", handlers.GetComponent)
			components.POST("", handlers.CreateComponent)
			components.PUT("/:id", handlers.UpdateComponent)
			components.DELETE("/:id", handlers.DeleteComponent)
		}

		// Boxes
		boxes := v1.Group("/boxes")
		{
			boxes.GET("", handlers.ListBoxes)
			boxes.GET("/:id", handlers.GetBox)
			boxes.POST("", handlers.CreateBox)
			boxes.PUT("/:id", handlers.UpdateBox)
			boxes.DELETE("/:id", handlers.DeleteBox)
			boxes.GET("/:id/contents", handlers.GetBoxContents)
		}

		// Inventory
		inventory := v1.Group("/inventory")
		{
			inventory.GET("", handlers.ListInventory)
			inventory.GET("/:id", handlers.GetInventoryItem)
			inventory.POST("", handlers.CreateInventoryItem)
			inventory.PUT("/:id", handlers.UpdateInventoryItem)
			inventory.DELETE("/:id", handlers.DeleteInventoryItem)
			inventory.POST("/upsert-by-lcsc", handlers.UpsertByLCSC)
		}

		// LCSC
		v1.POST("/lcsc/lookup", handlers.LookupLCSC)
	}

	router.Run(":" + cfg.ServerPort)
}

// corsMiddleware sets permissive CORS headers for the configured frontend origins.
func corsMiddleware(allowedOrigins []string) gin.HandlerFunc {
	originSet := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		originSet[strings.TrimSpace(o)] = struct{}{}
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if _, ok := originSet[origin]; ok {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
