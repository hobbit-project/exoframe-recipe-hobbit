FROM busybox

# create a config folder
RUN mkdir -p /config
# copy a config file into it
ADD keycloak.h2.db /config/keycloak.h2.db

# upon execution - copy config to volume
CMD [ "cp", "/config/keycloak.h2.db", "/cfg-volume/keycloak.h2.db" ]
