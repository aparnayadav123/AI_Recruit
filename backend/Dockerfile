# RecruitAI backend — container image for Render (or any Docker host).
# Multi-stage: build the Spring Boot fat jar with Maven, then run it on a small JRE.

# ---- Stage 1: build ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mkdir -p data
RUN mvn -B clean package -DskipTests

# ---- Stage 2: run ----
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN mkdir -p data
COPY --from=build /app/target/agent-0.0.1-SNAPSHOT.jar app.jar
ENV JAVA_OPTS="-XX:MaxRAMPercentage=50.0 -XX:+UseSerialGC -XX:MaxMetaspaceSize=128m -Xss512k -XX:+ExitOnOutOfMemoryError"
EXPOSE 8089
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
