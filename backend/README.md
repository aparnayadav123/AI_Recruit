# RecruitAI Agent Backend - Spring Boot

## Prerequisites

1. **Java 17+** - Download and install from [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) or [OpenJDK](https://adoptium.net/)
2. **Maven 3.6+** - Download from [Apache Maven](https://maven.apache.org/download.cgi) or use the included Maven wrapper

## Setup Instructions

### 1. Set JAVA_HOME Environment Variable

**Windows:**
```cmd
set JAVA_HOME=C:\Program Files\Java\jdk-17
set PATH=%JAVA_HOME%\bin;%PATH%
```

**Or set permanently:**
- Go to System Properties → Advanced → Environment Variables
- Add JAVA_HOME pointing to your JDK installation directory
- Add %JAVA_HOME%\bin to PATH

### 2. Run the Backend

**Using Maven Wrapper (Recommended):**
```cmd
.\mvnw.cmd spring-boot:run
```

**Using Maven (if installed globally):**
```cmd
mvn spring-boot:run
```

### 3. Verify Backend is Running

The backend will start on `http://localhost:8080`

Test the health endpoint:
```cmd
curl http://localhost:8080/api/health
```

Expected response:
```json
{
  "ok": true,
  "service": "recruitai-agent-server",
  "timestamp": "2024-01-02T09:20:00"
}
```

## API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/health/echo` - Echo endpoint for testing

## Frontend Integration

The backend is configured to accept requests from `http://localhost:5173` (default Vite dev server).

Make sure your frontend is running and can access:
- `http://localhost:8080/api/health`
- `http://localhost:8080/api/health/echo`

## Project Structure

```
backend/
├── src/main/java/com/recruitai/agent/
│   ├── RecruitAiAgentApplication.java    # Main application class
│   ├── config/
│   │   └── CorsConfig.java               # CORS configuration
│   └── controller/
│       └── HealthController.java         # Health check endpoints
├── src/main/resources/
│   └── application.properties            # Application configuration
├── pom.xml                               # Maven dependencies
└── README.md                             # This file
```

## Configuration

The application uses:
- **Port:** 8080
- **Context Path:** /api
- **Database:** H2 (in-memory for development)
- **CORS:** Enabled for localhost:5173

## Next Steps

1. Install Java 17+ and set JAVA_HOME
2. Run the backend using the commands above
3. Test the endpoints
4. Your frontend should now be able to connect to the Spring Boot backend
