# RecruitAI backend — container image for Render (or any Docker host).
# Multi-stage: build the Spring Boot fat jar with Maven, then run it on a small JRE.

# ---- Stage 1: build ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
# Cache dependencies first (only re-downloads when pom.xml changes).
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
# Then build the app.
COPY src ./src
RUN mvn -B -q clean package -DskipTests

# ---- Stage 2: run ----
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/agent-0.0.1-SNAPSHOT.jar app.jar
# Render sets $PORT and the app binds to it (see application.properties: server.port=${PORT:8089}).
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
EXPOSE 8089
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
