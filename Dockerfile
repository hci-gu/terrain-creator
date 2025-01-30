# Use a Node.js image to build the Vite project
FROM node:20-slim AS build-stage
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package.json ./
COPY pnpm-lock.yaml ./

# Install project dependencies
RUN pnpm install

# Copy the project files into the container
COPY . .

# Build the project (this will create the 'dist' folder)
RUN pnpm run build

# Use an NGINX image to serve the built project
FROM nginx:alpine as production-stage

# Set ownership and permissions for Nginx directories
RUN chown -R 1001:0 /var/cache/nginx \
    && chmod -R g+w /var/cache/nginx \
    && chown -R 1001:0 /var/run \
    && chmod -R g+w /var/run \
    && chown -R 1001:0 /usr/share/nginx/html \
    && chmod -R g+w /usr/share/nginx/html

# Copy the built files from the build stage
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Remove the default NGINX configuration file
RUN rm /etc/nginx/conf.d/default.conf

# Copy a custom NGINX configuration file
# This file needs to be created separately
COPY nginx.conf /etc/nginx/conf.d