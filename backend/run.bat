@echo off
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%
cd /d "%~dp0"
echo Java version:
java -version
echo.
echo Starting Spring Boot Application...
mvn spring-boot:run
