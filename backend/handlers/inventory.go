package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/noa-santo/invent-ory/backend/database"
	"github.com/noa-santo/invent-ory/backend/models"
	"gorm.io/gorm"
)

// ListInventory returns all inventory items with their Component and Box associations
func ListInventory(c *gin.Context) {
	var items []models.InventoryItem
	if result := database.DB.Preload("Component").Preload("Box").Find(&items); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   result.Error.Error(),
			"message": "failed to retrieve inventory",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

// GetInventoryItem returns a single inventory item by ID
func GetInventoryItem(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id", "message": "id must be a positive integer"})
		return
	}

	var item models.InventoryItem
	if result := database.DB.Preload("Component").Preload("Box").First(&item, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": result.Error.Error(), "message": "inventory item not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": item})
}

// CreateInventoryItem creates a new inventory item
func CreateInventoryItem(c *gin.Context) {
	var input models.InventoryItem
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "message": "invalid request body"})
		return
	}

	if result := database.DB.Create(&input); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   result.Error.Error(),
			"message": "failed to create inventory item",
		})
		return
	}

	// Reload with associations
	database.DB.Preload("Component").Preload("Box").First(&input, input.ID)
	c.JSON(http.StatusCreated, gin.H{"data": input, "message": "inventory item created"})
}

// UpdateInventoryItem updates an existing inventory item by ID
func UpdateInventoryItem(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id", "message": "id must be a positive integer"})
		return
	}

	var item models.InventoryItem
	if result := database.DB.First(&item, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": result.Error.Error(), "message": "inventory item not found"})
		return
	}

	// Use a request struct with pointer fields so we can distinguish omitted fields from zero values
	type updateInventoryRequest struct {
		ComponentID *uint `json:"component_id"`
		BoxID       *uint `json:"box_id"`
		Quantity    *int  `json:"quantity"`
	}

	var req updateInventoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "message": "invalid request body"})
		return
	}

	// Apply only provided fields to the fetched item
	if req.ComponentID != nil {
		item.ComponentID = *req.ComponentID
	}
	if req.BoxID != nil {
		item.BoxID = *req.BoxID
	}
	if req.Quantity != nil {
		item.Quantity = *req.Quantity
	}

	if result := database.DB.Save(&item); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   result.Error.Error(),
			"message": "failed to update inventory item",
		})
		return
	}

	database.DB.Preload("Component").Preload("Box").First(&item, item.ID)
	c.JSON(http.StatusOK, gin.H{"data": item, "message": "inventory item updated"})
}

// DeleteInventoryItem removes an inventory item by ID
func DeleteInventoryItem(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id", "message": "id must be a positive integer"})
		return
	}

	if result := database.DB.Delete(&models.InventoryItem{}, id); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   result.Error.Error(),
			"message": "failed to delete inventory item",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "inventory item deleted"})
}

type upsertRequest struct {
	LCSCPartNo string `json:"lcsc_part_no" binding:"required"`
	BoxID      uint   `json:"box_id" binding:"required"`
	Quantity   int    `json:"quantity" binding:"min=0"`
	Component  *struct {
		Name         string `json:"name"`
		Value        string `json:"value"`
		Footprint    string `json:"footprint"`
		Description  string `json:"description"`
		Manufacturer string `json:"manufacturer"`
	} `json:"component"`
}

func UpsertByLCSC(c *gin.Context) {
	var req upsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "message": "invalid request body"})
		return
	}

	var component models.Component
	if result := database.DB.Where("lcsc_part_no = ?", req.LCSCPartNo).FirstOrCreate(&component, models.Component{
		LCSCPartNo: req.LCSCPartNo,
	}); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   result.Error.Error(),
			"message": "failed to find or create component",
		})
		return
	}

	if req.Component != nil {
		updated := false
		if req.Component.Name != "" {
			component.Name = req.Component.Name
			updated = true
		}
		if req.Component.Value != "" {
			component.Value = req.Component.Value
			updated = true
		}
		if req.Component.Footprint != "" {
			component.Footprint = req.Component.Footprint
			updated = true
		}
		if req.Component.Description != "" {
			component.Description = req.Component.Description
			updated = true
		}
		if req.Component.Manufacturer != "" {
			component.Manufacturer = req.Component.Manufacturer
			updated = true
		}
		if updated {
			if saveRes := database.DB.Save(&component); saveRes.Error != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": saveRes.Error.Error(), "message": "failed to update component"})
				return
			}
		}
	}

	var box models.Box
	if result := database.DB.First(&box, req.BoxID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": result.Error.Error(), "message": "box not found"})
		return
	}

	var item models.InventoryItem
	result := database.DB.Where("component_id = ? AND box_id = ?", component.ID, box.ID).First(&item)
	if result.Error != nil {
		item = models.InventoryItem{
			ComponentID: component.ID,
			BoxID:       box.ID,
			Quantity:    req.Quantity,
		}
		if createResult := database.DB.Create(&item); createResult.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   createResult.Error.Error(),
				"message": "failed to create inventory item",
			})
			return
		}
	} else {
		newQty := item.Quantity + req.Quantity
		if newQty < item.Quantity {
			c.JSON(http.StatusBadRequest, gin.H{"error": "integer overflow", "message": "resulting quantity exceeds maximum value"})
			return
		}
		item.Quantity = newQty
		if saveResult := database.DB.Save(&item); saveResult.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   saveResult.Error.Error(),
				"message": "failed to update inventory item",
			})
			return
		}
	}

	database.DB.Preload("Component").Preload("Box").First(&item, item.ID)
	c.JSON(http.StatusOK, gin.H{"data": item, "message": "inventory item upserted"})
}

type batchSubtractRequest struct {
	Items []struct {
		InventoryItemID uint `json:"inventory_item_id"`
		Quantity        int  `json:"quantity"`
	} `json:"items"`
}

// BatchSubtractInventory updates multiple inventory items by subtracting quantities
func BatchSubtractInventory(c *gin.Context) {
	var req batchSubtractRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "message": "invalid request body"})
		return
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, reqItem := range req.Items {
		var item models.InventoryItem
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&item, reqItem.InventoryItemID).Error; err != nil {
			tx.Rollback()
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "item not found", "message": "one or more inventory items not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "message": "database error"})
			return
		}

		if item.Quantity < reqItem.Quantity {
			tx.Rollback()
			c.JSON(http.StatusConflict, gin.H{
				"error":   "insufficient stock",
				"message": "insufficient stock for item ID " + strconv.Itoa(int(item.ID)),
			})
			return
		}

		item.Quantity -= reqItem.Quantity
		if err := tx.Save(&item).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "message": "failed to save item"})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "message": "transaction commit failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "inventory updated successfully"})
}
