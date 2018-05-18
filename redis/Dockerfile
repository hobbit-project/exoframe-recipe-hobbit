FROM busybox

# create a config folder
RUN mkdir -p /config
# copy a config file into it
ADD redis.conf /config/redis.conf

# upon execution - copy config to volume
CMD cp /config/redis.conf /cfg-volume/redis.conf
