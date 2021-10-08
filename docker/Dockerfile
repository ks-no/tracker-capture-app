
FROM bitnami/tomcat:9.0.45

ENV DHIS2_HOME=/opt/dhis2

COPY tomcat/conf/server.xml /opt/bitnami/tomcat/conf/server.xml

COPY ./dhis.war /opt/bitnami/tomcat/webapps/ROOT.war

RUN mkdir -p ${DHIS2_HOME}/logs && chmod o+rx ${DHIS2_HOME}/logs

CMD ["catalina.sh", "run"]
