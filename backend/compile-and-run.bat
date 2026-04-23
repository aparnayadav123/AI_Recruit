@echo off
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%
echo Java Home: %JAVA_HOME%
echo Java Version:
java -version
echo.
echo Current Directory: %CD%
echo.
echo Compiling Spring Boot Application...
call mvn clean compile spring-boot:run
pause
