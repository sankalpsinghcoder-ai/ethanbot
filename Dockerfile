# Use a standard Ubuntu image
FROM ubuntu:22.04

# Stop interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js, Python, GCC (C/C++), and Java
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    gcc \
    g++ \
    openjdk-17-jdk \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean

# Set up the working directory
WORKDIR /app

# Copy package files and install discord.js etc.
COPY package*.json ./
RUN npm install

# Copy the rest of your bot code
COPY . .

# Start the bot
CMD ["node", "index.js"]