FROM jetpackio/devbox:latest

# Switch to root to install Apache and dependencies
USER root:root

# Install Apache and required modules, plus zsh and dependencies
RUN apt-get update && apt-get install -y \
    apache2 \
    apache2-utils \
    libapache2-mod-security2 \
    libapache2-mod-evasive \
    sudo \
    zsh \
    curl \
    git \
    locales \
    locales-all \
    && rm -rf /var/lib/apt/lists/* \
    && sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen \
    && locale-gen en_US.UTF-8 \
    && update-locale LANG=en_US.UTF-8

# Set locale environment variables
ENV LANG=en_US.UTF-8 \
    LANGUAGE=en_US:en \
    LC_ALL=en_US.UTF-8

# Allow devbox user to run service commands without password
RUN echo "devbox ALL=(ALL) NOPASSWD: /usr/sbin/service" >> /etc/sudoers

# Enable necessary Apache modules
RUN a2enmod rewrite \
    && a2enmod proxy \
    && a2enmod proxy_http \
    && a2enmod proxy_wstunnel \
    && a2enmod headers \
    && a2enmod ssl \
    && a2enmod deflate \
    && a2enmod expires \
    && a2enmod mime \
    && a2enmod filter \
    && a2enmod substitute

# Create directories for Apache logs
RUN mkdir -p /var/log/apache2 \
    && chown -R www-data:www-data /var/log/apache2

# Create directory for the Angular app
RUN mkdir -p /var/www/hr-seats-angular \
    && chown -R www-data:www-data /var/www

# Copy Apache configuration
COPY --chown=root:root .devcontainer/apache-dev.conf /etc/apache2/sites-available/hr-seats-dev.conf

# Disable default site and enable the development site
RUN a2dissite 000-default.conf \
    && a2ensite hr-seats-dev.conf

# Generate self-signed certificates for development
RUN mkdir -p /etc/ssl/certs /etc/ssl/private \
    && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/local-desk.services.siag.it.key \
    -out /etc/ssl/certs/local-desk.services.siag.it.crt \
    -subj "/C=IT/ST=Italy/L=Milan/O=SIAG/CN=local-desk.services.siag.it" \
    && cp /etc/ssl/certs/local-desk.services.siag.it.crt /etc/ssl/certs/intermediate.crt \
    && chmod 600 /etc/ssl/private/local-desk.services.siag.it.key \
    && chmod 644 /etc/ssl/certs/local-desk.services.siag.it.crt

# Installing your devbox project
WORKDIR /code
RUN mkdir -p /code && chown ${DEVBOX_USER}:${DEVBOX_USER} /code

# Switch to devbox user for development environment
USER ${DEVBOX_USER}:${DEVBOX_USER}
COPY --chown=${DEVBOX_USER}:${DEVBOX_USER} devbox.json devbox.json
COPY --chown=${DEVBOX_USER}:${DEVBOX_USER} devbox.lock devbox.lock

RUN devbox run -- echo "Installed Packages."

# Configure devbox for zsh (default shell)
RUN devbox shellenv --init-hook >> ~/.profile

# Install oh-my-zsh for better terminal experience
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \
    && sed -i 's/ZSH_THEME="robbyrussell"/ZSH_THEME="robbyrussell"/' ~/.zshrc \
    && echo 'export LANG=en_US.UTF-8' >> ~/.zshrc \
    && echo 'export LC_ALL=en_US.UTF-8' >> ~/.zshrc \
    && echo 'export PATH=$HOME/bin:/usr/local/bin:$PATH' >> ~/.zshrc \
    && devbox shellenv --init-hook >> ~/.zshrc

# Switch back to root to set up startup script
USER root:root

# Set zsh as the default shell for devbox user
RUN chsh -s /usr/bin/zsh ${DEVBOX_USER}

# Create startup script to run Apache only
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Check and regenerate SSL certificates if missing\n\
if [ ! -f /etc/ssl/private/local-desk.services.siag.it.key ] || [ ! -f /etc/ssl/certs/local-desk.services.siag.it.crt ]; then\n\
    echo "SSL certificates not found. Generating new self-signed certificates..."\n\
    mkdir -p /etc/ssl/certs /etc/ssl/private\n\
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\\n\
        -keyout /etc/ssl/private/local-desk.services.siag.it.key \\\n\
        -out /etc/ssl/certs/local-desk.services.siag.it.crt \\\n\
        -subj "/C=IT/ST=Italy/L=Milan/O=SIAG/CN=local-desk.services.siag.it"\n\
    chmod 600 /etc/ssl/private/local-desk.services.siag.it.key\n\
    chmod 644 /etc/ssl/certs/local-desk.services.siag.it.crt\n\
    echo "SSL certificates generated successfully"\n\
fi\n\
\n\
echo "Starting Apache2 reverse proxy..."\n\
service apache2 start\n\
\n\
# Check if Apache is running\n\
if service apache2 status > /dev/null 2>&1; then\n\
    echo "Apache2 started successfully"\n\
    echo ""\n\
    echo "Apache reverse proxy is running. To start the Angular dev server, run:"\n\
    echo "  npm start"\n\
    echo ""\n\
    echo "Access points:"\n\
    echo "  - https://local-desk.services.siag.it:8443 (Apache reverse proxy with built files)"\n\
    echo "  - http://localhost:4200 (direct Angular dev server when running)"\n\
else\n\
    echo "Failed to start Apache2"\n\
    exit 1\n\
fi\n\
\n\
# Keep container running\n\
tail -f /dev/null\n\
' > /usr/local/bin/start-services.sh \
&& chmod +x /usr/local/bin/start-services.sh

# Expose ports
EXPOSE 80 4200 8443

# Set the default command
CMD ["/usr/local/bin/start-services.sh"]
