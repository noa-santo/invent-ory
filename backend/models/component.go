package models

import "time"

// Component represents an electronic component from LCSC
type Component struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	LCSCPartNo   string    `gorm:"uniqueIndex;not null" json:"lcsc_part_no"`
	Name         string    `json:"name"`
	Value        string    `json:"value"`
	Footprint    string    `json:"footprint"`
	Description  string    `json:"description"`
	Manufacturer string    `json:"manufacturer"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
