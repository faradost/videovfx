# backend/Dockerfile

# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app/backend

# Install system dependencies (if any, e.g., for Pillow or other C extensions)
# RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev

# Install Python dependencies
# Copy only requirements.txt first to leverage Docker cache
COPY ./freelance_platform/requirements.txt /app/backend/freelance_platform/
RUN pip install --no-cache-dir -r /app/backend/freelance_platform/requirements.txt

# Copy the rest of the backend application code
COPY . /app/backend/

# Expose port 8000 for Gunicorn
EXPOSE 8000

# Collect static files (if Django admin static files are used directly by Django, though often served by Nginx)
# RUN python freelance_platform/manage.py collectstatic --noinput

# Command to run the application using Gunicorn
# Ensure Gunicorn is in requirements.txt
# The number of workers can be adjusted based on your server resources
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "freelance_platform.wsgi:application"]
