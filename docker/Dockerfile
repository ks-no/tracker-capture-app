
FROM bitnami/tomcat:9.0.45

COPY server.xml /opt/bitnami/tomcat/conf/server.xml

COPY ./dhis.war /opt/bitnami/tomcat/webapps/ROOT.war

CMD ["catalina.sh", "run"]
