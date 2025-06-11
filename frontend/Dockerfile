# frontend/Dockerfile

# Stage 1: Build the React application
FROM node:16-alpine as build-stage

WORKDIR /app/frontend

# Copy package.json and package-lock.json (or yarn.lock)
COPY ./freelance-app/package.json ./freelance-app/package-lock.json* ./freelance-app/
# If using yarn, copy yarn.lock instead of package-lock.json

# Install dependencies
RUN cd freelance-app && npm install --legacy-peer-deps

# Copy the rest of the application code
COPY ./freelance-app /app/frontend/freelance-app

# Build the application
RUN cd freelance-app && npm run build

# Stage 2: Serve the built application with Nginx
FROM nginx:1.21-alpine

# Remove default Nginx server configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration (will be created in the next step)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React application from the build stage
COPY --from=build-stage /app/frontend/freelance-app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Command to start Nginx
CMD ["nginx", "-g", "daemon off;"]
