# ── Build stage ──────────────────────────────────────────────
FROM golang:alpine AS builder
WORKDIR /app
ENV GOTOOLCHAIN=auto

# Install build deps (git untuk go mod, wget untuk healthcheck)
RUN apk add --no-cache git wget

COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Build static binary (modernc.org/sqlite = pure Go, no CGO)
RUN CGO_ENABLED=0 go build -o /whatsapp-service .

# ── Runtime stage (kecil, tanpa toolchain Go) ────────────────────
FROM alpine:latest
WORKDIR /app

RUN apk add --no-cache wget ca-certificates

COPY --from=builder /whatsapp-service /app/whatsapp-service

# Folder session SQLite (di-mount sebagai named volume wa-sessions)
RUN mkdir -p /app/sessions

EXPOSE 8080

ENV PORT=8080

CMD ["/app/whatsapp-service"]
