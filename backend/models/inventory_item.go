package models

import "time"

// InventoryItem represents a component stored in a box with a quantity
type InventoryItem struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	ComponentID uint      `gorm:"not null" json:"component_id"`
	BoxID       uint      `gorm:"not null" json:"box_id"`
	Quantity    int       `gorm:"default:0" json:"quantity"`
	Component   Component `gorm:"foreignKey:ComponentID" json:"component,omitempty"`
	Box         Box       `gorm:"foreignKey:BoxID" json:"box,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
