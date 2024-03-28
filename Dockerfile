# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=16.15.0

# Get the latest version of Playwright
FROM mcr.microsoft.com/playwright:v1.36.0-focal as base
 
# Set the work directory for the application
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install Python 3.8

RUN apt-get update && apt-get install -y python3.8 python3-pip && \
    update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1 && \
    update-alternatives --install /usr/bin/python python /usr/bin/python3 1 && \
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.8 1

# Install VNC & noVNC

ARG NOVNC_REF="1.2.0"
ARG WEBSOCKIFY_REF="0.10.0"
ENV DISPLAY_NUM=99
ENV DISPLAY=":${DISPLAY_NUM}"

RUN mkdir -p /opt/bin && chmod +x /dev/shm \
  && apt-get update && apt-get install -y --no-install-recommends xfce4 xfce4-terminal dbus-x11 devilspie x11-apps \
  && apt-get update && apt-get install -y unzip tigervnc-standalone-server tigervnc-common \
  && curl -L -o noVNC.zip "https://github.com/novnc/noVNC/archive/v${NOVNC_REF}.zip" \
  && unzip -x noVNC.zip \
  && mv noVNC-${NOVNC_REF} /opt/bin/noVNC \
#  && cp /opt/bin/noVNC/vnc.html /opt/bin/noVNC/index.html \
  && rm noVNC.zip \
  && curl -L -o websockify.zip "https://github.com/novnc/websockify/archive/v${WEBSOCKIFY_REF}.zip" \
  && unzip -x websockify.zip \
  && rm websockify.zip \
  && mv websockify-${WEBSOCKIFY_REF} /opt/bin/noVNC/utils/websockify

# Throw-away build stage to reduce size of final image
FROM base as build

# Get the needed libraries to run Playwright
RUN apt-get update && apt-get -y install libnss3 libatk-bridge2.0-0 libdrm-dev libxkbcommon-dev libgbm-dev libasound-dev libatspi2.0-0 libxshmfence-dev python3-numpy python-numpy

# Install the dependencies in Node environment
COPY yarn.lock package.json ./
RUN yarn install --production=false

# COPY the needed files to the app folder in Docker image
COPY . .

# Build application
RUN yarn build

# Final stage for app image
FROM base

# Install nginx
RUN apt-get update && apt-get install -y nginx

# Remove the default nginx configuration file
RUN rm /etc/nginx/sites-enabled/default

# Add our own nginx configuration file
COPY ./nginx.conf /etc/nginx/sites-enabled/

# Copy built application
COPY --from=build /app ./

RUN mkdir -p ~/.vnc && \
    echo "vyPKmskZ" | vncpasswd -f > ~/.vnc/passwd && \
    chmod 600 ~/.vnc/passwd

RUN mkdir /root/.devilspie
RUN echo '(if (is (application_name) "xclock") (begin (maximize) (undecorate)))' > /root/.devilspie/xclock_fullscreen.ds
RUN echo '(if (is (window_role) "browser") (begin (fullscreen) ))' > /root/.devilspie/browser_fullscreen.ds

# Modify workspaces in XFCE4 to one 
RUN mkdir -p ~/.config/xfce4/xfconf/xfce-perchannel-xml && \
    echo '<?xml version="1.0" encoding="UTF-8"?>\n\
<channel name="xfwm4" version="1.0">\n\
    <property name="general" type="empty">\n\
        <property name="workspace_count" type="int" value="1"/>\n\
    </property>\n\
</channel>' > ~/.config/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml

EXPOSE 9010

CMD service nginx start && /bin/sh ./start.sh
