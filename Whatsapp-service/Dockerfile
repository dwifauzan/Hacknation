FROM golang:1.26-alpine

WORKDIR /app

COPY . .

RUN go mod tidy
RUN CGO_ENABLED=0 go build -o main .

EXPOSE 8080

CMD ["./main"]
