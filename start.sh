#!/bin/sh
set -e
set +x

# starts dbus session
eval "$(dbus-launch --sh-syntax)"

# clean up old vnc locks
[ -f /tmp/.X0-lock ] && rm -f /tmp/.X0-lock
[ -S /tmp/.X11-unix/X0 ] && rm -f /tmp/.X11-unix/X0

DISPLAY_NUM=0
DISPLAY=":${DISPLAY_NUM}"

echo '#!/bin/sh
startxfce4 &
devilspie &
xclock -digital -update 0 -bg black &' > ~/.vnc/xstartup
chmod +x ~/.vnc/xstartup


# starts tigerVnc server
nohup vncserver :0 -localhost yes -rfbauth ~/.vnc/passwd -rfbport 5900 &

# starts noVNC webserver
nohup /opt/bin/noVNC/utils/launch.sh --listen 7900 --vnc localhost:5900 &

yarn start