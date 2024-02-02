FROM harbor.1000kit.org/1000kit/spa-base:v1

# Copy locations config
COPY nginx/locations.conf $DIR_LOCATION/locations.conf
# Copy application build
COPY dist/onecx-workspace-ui/ $DIR_HTML

#Optional extend list of application environments
#ENV CONFIG_ENV_LIST BFF_URL,APP_BASE_HREF

# Application environments default values
ENV BFF_URL http://onecx-workspace-management-bff:8080/
ENV APP_BASE_HREF /workspace-mgmt/

RUN chmod 775 -R $DIR_HTML/assets
USER 1001
