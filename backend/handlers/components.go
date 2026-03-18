package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/noa-santo/invent-ory/backend/database"
	"github.com/noa-santo/invent-ory/backend/models"
)

// ListComponents returns all components
func ListComponents(c *gin.Context) {
	var components []models.Component
	if result := database.DB.Find(&components); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   result.Error.Error(),
			"message": "failed to retrieve components",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": components})
}

// GetComponent returns a single component by ID
func GetComponent(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id", "message": "id must be a positive integer"})
		return
	}

	var component models.Component
	if result := database.DB.First(&component, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": result.Error.Error(), "message": "component not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": component})
}

// CreateComponent creates a new component
func CreateComponent(c *gin.Context) {
	var input models.Component
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "message": "invalid request body"})
		return
	}

	if result := database.DB.Create(&input); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   result.Error.Error(),
			"message": "failed to create component",
		})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": input, "message": "component created"})
}

// UpdateComponent updates an existing component by ID
func UpdateComponent(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id", "message": "id must be a positive integer"})
		return
	}

	var component models.Component
	if result := database.DB.First(&component, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": result.Error.Error(), "message": "component not found"})
		return
	}

	var input models.Component
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "message": "invalid request body"})
		return
	}

	// Prevent changing the primary key
	input.ID = component.ID
	if result := database.DB.Save(&input); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   result.Error.Error(),
			"message": "failed to update component",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": input, "message": "component updated"})
}

// DeleteComponent removes a component by ID
func DeleteComponent(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id", "message": "id must be a positive integer"})
		return
	}

	if result := database.DB.Delete(&models.Component{}, id); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   result.Error.Error(),
			"message": "failed to delete component",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "component deleted"})
}
