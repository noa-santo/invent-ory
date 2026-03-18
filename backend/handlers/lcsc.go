package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const lcscAPIURL = "https://wmsc.lcsc.com/ftps/wm/product/detail?productCode=%s"

// lcscLookupRequest is the expected JSON body for the LookupLCSC endpoint
type lcscLookupRequest struct {
	ScanData string `json:"scan_data" binding:"required"`
}

// lcscComponentDetail is the normalised component detail returned to the caller
type lcscComponentDetail struct {
	LCSCPartNo   string `json:"lcsc_part_no"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	Manufacturer string `json:"manufacturer"`
	Footprint    string `json:"footprint"`
	Value        string `json:"value"`
	Quantity     int    `json:"quantity,omitempty"` // parsed from scan data when present
}

// lcscAPIResponse mirrors the relevant parts of the LCSC product-detail API response
type lcscAPIResponse struct {
	Code   int    `json:"code"`
	Result struct {
		ProductCode    string `json:"productCode"`
		ProductModel   string `json:"productModel"`
		ProductIntroEn string `json:"productIntroEn"`
		BrandNameEn    string `json:"brandNameEn"`
		ParamVOList    []struct {
			ParamNameEn  string `json:"paramNameEn"`
			ParamValueEn string `json:"paramValueEn"`
		} `json:"paramVOList"`
	} `json:"result"`
}

// parseScanData extracts an LCSC part number (and optional quantity) from raw
// barcode / QR-code scan data.
//
// Supported formats:
//   - Plain part number:              "C123456"
//   - Comma-separated reel format:   "C123456,100,..."
//   - Key:value format:              "{pbn:PICK...,on:WM...,pc:C2913206,pm:ESP32...,qty:3,...}"
func parseScanData(raw string) (partNo string, quantity int) {
	raw = strings.TrimSpace(raw)

	// Try to parse key:value style payloads like:
	// {pbn:PICK...,on:WM...,pc:C2913206,pm:ESP32...,qty:3,...}
	// or JSON-like: {"pc":"C2913206","qty":3}
	// Look for pc:<value> and qty:<num>
	lower := strings.ToLower(raw)
	if idx := strings.Index(lower, "pc:"); idx != -1 {
		sub := raw[idx+3:]
		sub = strings.TrimLeft(sub, " \t\n\r{\"'")
		tokEnd := len(sub)
		for i, ch := range sub {
			if ch == ',' || ch == '}' || ch == '\n' || ch == '\r' || ch == ' ' || ch == '\t' {
				tokEnd = i
				break
			}
		}
		if tokEnd > 0 {
			partNo = strings.TrimSpace(sub[:tokEnd])
			partNo = strings.Trim(partNo, "\"'")
		}

		if qidx := strings.Index(lower, "qty:"); qidx != -1 {
			subq := lower[qidx+4:]
			subq = strings.TrimLeft(subq, " \t\n\r{\"'")
			qEnd := len(subq)
			for i, ch := range subq {
				if ch == ',' || ch == '}' || ch == '\n' || ch == '\r' || ch == ' ' || ch == '\t' {
					qEnd = i
					break
				}
			}
			if qEnd > 0 {
				qstr := strings.TrimSpace(subq[:qEnd])
				qstr = strings.Trim(qstr, "\"'")
				fmt.Sscanf(qstr, "%d", &quantity)
			}
		}
		if partNo != "" {
			for i := 0; i < len(partNo); i++ {
				if (partNo[i] == 'C' || partNo[i] == 'c') && i+1 < len(partNo) {
					j := i + 1
					for j < len(partNo) && partNo[j] >= '0' && partNo[j] <= '9' {
						j++
					}
					if j > i+1 {
						partNo = strings.ToUpper(partNo[i:j])
						break
					}
				}
			}
		}
		return partNo, quantity
	}
	parts := strings.Split(raw, ",")
	partNo = strings.TrimSpace(parts[0])
	if len(parts) >= 2 {
		_, _ = fmt.Sscanf(strings.TrimSpace(parts[1]), "%d", &quantity)
	}
	return partNo, quantity
}

func LookupLCSC(c *gin.Context) {
	var req lcscLookupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "message": "invalid request body"})
		return
	}

	partNo, quantity := parseScanData(req.ScanData)
	if partNo == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "empty part number", "message": "could not parse part number from scan data"})
		return
	}

	detail, err := fetchLCSCComponent(partNo)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"data": lcscComponentDetail{
				LCSCPartNo: partNo,
				Quantity:   quantity,
			},
			"message": fmt.Sprintf("LCSC API unavailable, returning partial data: %v", err),
		})
		return
	}

	detail.Quantity = quantity
	c.JSON(http.StatusOK, gin.H{"data": detail})
}

// fetchLCSCComponent queries the LCSC product detail API and returns a
// normalised lcscComponentDetail.
func fetchLCSCComponent(partNo string) (*lcscComponentDetail, error) {
	url := fmt.Sprintf(lcscAPIURL, partNo)

	resp, err := http.Get(url) //nolint:gosec // URL is constructed from a validated part number
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("LCSC API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var apiResp lcscAPIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to parse LCSC response: %w", err)
	}

	if apiResp.Code != 200 {
		return nil, fmt.Errorf("LCSC API error code: %d", apiResp.Code)
	}

	detail := &lcscComponentDetail{
		LCSCPartNo:   apiResp.Result.ProductCode,
		Name:         apiResp.Result.ProductModel,
		Description:  apiResp.Result.ProductIntroEn,
		Manufacturer: apiResp.Result.BrandNameEn,
	}

	for _, param := range apiResp.Result.ParamVOList {
		switch strings.ToLower(param.ParamNameEn) {
		case "package", "footprint", "case/package":
			detail.Footprint = param.ParamValueEn
		case "resistance", "capacitance", "inductance", "voltage", "current", "value":
			if detail.Value == "" {
				detail.Value = param.ParamValueEn
			}
		}
	}

	return detail, nil
}
