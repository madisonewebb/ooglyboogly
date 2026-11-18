# `task dev` runs `tilt up`. Tilt drives docker-compose; the containers
# bind-mount the source, so tsx (server) and Vite (web) live-reload.
docker_compose('docker-compose.yml')

dc_resource('server', labels=['app'], links=[link('http://localhost:8080/health', 'health')])
dc_resource('web', labels=['app'], links=[link('http://localhost:5173', 'client')])
