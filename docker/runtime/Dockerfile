# NovusIDE workspace runtime image.
# Every project container is created from this image with the project
# workspace bind-mounted at /workspace.
FROM node:20-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    python3 \
    python3-pip \
    python3-venv \
    bash \
    zsh \
    curl \
    wget \
    vim \
    nano \
    unzip \
    zip \
    ca-certificates \
    build-essential \
    procps \
    htop \
    && rm -rf /var/lib/apt/lists/*

# Package managers on top of npm
RUN npm install -g pnpm yarn --force \
    && curl -fsSL https://bun.sh/install | bash \
    && ln -s /root/.bun/bin/bun /usr/local/bin/bun

# A pleasant default shell experience
RUN echo 'export PS1="\\[\\e[38;5;69m\\]novus\\[\\e[0m\\]:\\[\\e[38;5;105m\\]\\w\\[\\e[0m\\]$ "' >> /root/.bashrc \
    && echo 'alias ll="ls -alF"' >> /root/.bashrc \
    && git config --global init.defaultBranch main \
    && git config --global user.email "workspace@novuside.local" \
    && git config --global user.name "NovusIDE"

WORKDIR /workspace

# Keep the container alive; shells are attached via docker exec.
CMD ["sleep", "infinity"]
