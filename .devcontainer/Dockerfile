# .devcontainer/Dockerfile
FROM node:20-bookworm-slim

# Instalar git y utilidades básicas
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Configurar directorio de trabajo
WORKDIR /workspace

# El usuario node ya existe en la imagen base
USER node
