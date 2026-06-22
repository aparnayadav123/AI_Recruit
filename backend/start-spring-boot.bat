@echo off
echo 🚀 Starting RecruitAI Spring Boot Backend with MongoDB...
echo.

REM Set environment variables
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot
set MAVEN_HOME=C:\maven\apache-maven-3.9.5
set PATH=%JAVA_HOME%\bin;%MAVEN_HOME\bin;%PATH%

REM Stop any existing processes
echo 🔄 Stopping existing processes...
taskkill /f /im java.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1

REM Start Spring Boot backend
echo 🗄️  Starting Spring Boot with MongoDB...
mvn clean spring-boot:run

pause
