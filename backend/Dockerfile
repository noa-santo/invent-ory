# ---- Build stage ----
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install git for module downloads
RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Use buildkit args for cross-compilation
ARG TARGETOS TARGETARCH
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o server ./main.go

# ---- Final stage ----
FROM alpine:3.19

WORKDIR /app

# ca-certificates needed for outbound HTTPS (LCSC API calls)
RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /app/server .

EXPOSE 8080

CMD ["./server"]
