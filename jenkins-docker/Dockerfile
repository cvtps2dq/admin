FROM jenkins/jenkins:lts

# Switch to root to install packages
USER root

# Install prerequisites
RUN apt-get update && \
    apt-get install -y lsb-release curl

# Add Docker's official GPG key
RUN curl -fsSLo /usr/share/keyrings/docker-archive-keyring.asc \
  https://download.docker.com/linux/debian/gpg

# Set up the stable repository
RUN echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/usr/share/keyrings/docker-archive-keyring.asc] \
  https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list

# Install Docker CLI and Docker Compose Plugin
RUN apt-get update && \
    apt-get install -y docker-ce-cli docker-compose-plugin

# Switch back to root (required for your current setup to access the socket permissions easily)
# Note: In production, you would add the jenkins user to the docker group instead.
USER root