FROM busybox

# create a config folder
RUN mkdir -p /config
# copy a config file into it
ADD virtuoso.ini /config/virtuoso.ini
ADD storage-init.sh /config/storage-init.sh

# upon execution - copy config to volume
CMD cp /config/virtuoso.ini /cfg-volume/virtuoso.ini; cp /config/storage-init.sh /cfg-volume/storage-init.sh
