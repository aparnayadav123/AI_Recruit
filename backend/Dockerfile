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
RUN mkdir -p data
RUN mvn -B -q clean package -DskipTests

# ---- Stage 2: run ----
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN mkdir -p data
COPY --from=build /app/target/agent-0.0.1-SNAPSHOT.jar app.jar
# Render sets $PORT and the app binds to it (see application.properties: server.port=${PORT:8089}).
# Render's free tier caps the container at 512 MB RAM. The previous "-XX:MaxRAMPercentage=75"
# let the heap grow to ~384 MB, and with the default G1 GC plus an uncapped metaspace the
# total RSS blew past 512 MB — the kernel OOM-killed the process (Render event: "Exited with
# status 137"). Fit comfortably under 512 MB instead:
#   * heap capped at ~50% (~256 MB),
#   * SerialGC — lowest memory/CPU overhead, ideal for the single shared CPU of the free tier,
#   * metaspace + thread stacks bounded so native memory can't creep over the limit,
#   * exit on a true heap OOM so Render restarts cleanly instead of thrashing.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=50.0 -XX:+UseSerialGC -XX:MaxMetaspaceSize=128m -Xss512k -XX:+ExitOnOutOfMemoryError"
EXPOSE 8089
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
