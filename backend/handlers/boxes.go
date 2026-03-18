package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/noa-santo/invent-ory/backend/database"
	"github.com/noa-santo/invent-ory/backend/models"
)

// ListBoxes returns all boxes
func ListBoxes(c *gin.Context) {
	var boxes []models.Box
	if result := database.DB.Find(&boxes); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   result.Error.Error(),
			"message": "failed to retrieve boxes",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": boxes})
}

// GetBox returns a single box by ID
func GetBox(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id", "message": "id must be a positive integer"})
		return
	}

	var box models.Box
	if result := database.DB.First(&box, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": result.Error.Error(), "message": "box not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": box})
}

// CreateBox creates a new box
func CreateBox(c *gin.Context) {
	var input models.Box
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "message": "invalid request body"})
		return
	}

	if result := database.DB.Create(&input); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   result.Error.Error(),
			"message": "failed to create box",
		})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": input, "message": "box created"})
}

// UpdateBox updates an existing box by ID
func UpdateBox(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id", "message": "id must be a positive integer"})
		return
	}

	var box models.Box
	if result := database.DB.First(&box, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": result.Error.Error(), "message": "box not found"})
		return
	}

	var input models.Box
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "message": "invalid request body"})
		return
	}

	input.ID = box.ID
	if result := database.DB.Save(&input); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   result.Error.Error(),
			"message": "failed to update box",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": input, "message": "box updated"})
}

// DeleteBox removes a box by ID
func DeleteBox(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id", "message": "id must be a positive integer"})
		return
	}

	if result := database.DB.Delete(&models.Box{}, id); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   result.Error.Error(),
			"message": "failed to delete box",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "box deleted"})
}

// GetBoxContents returns all inventory items stored in a specific box
func GetBoxContents(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id", "message": "id must be a positive integer"})
		return
	}

	// Verify the box exists
	var box models.Box
	if result := database.DB.First(&box, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": result.Error.Error(), "message": "box not found"})
		return
	}

	var items []models.InventoryItem
	if result := database.DB.Preload("Component").Preload("Box").Where("box_id = ?", id).Find(&items); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   result.Error.Error(),
			"message": "failed to retrieve box contents",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}
