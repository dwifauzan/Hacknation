FROM python:3.10-slim

WORKDIR /app

# Pastikan file requirements.txt berisi: fastapi, uvicorn, instagrapi
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]