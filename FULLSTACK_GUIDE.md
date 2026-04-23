# React + Spring Boot + MongoDB Full-Stack CRUD Application

A production-ready full-stack application demonstrating the integration of React frontend with Spring Boot backend and MongoDB database.

## 🚀 Tech Stack

### Frontend
- **React 19** - Modern React with hooks
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and dev server

### Backend
- **Spring Boot 3.2.0** - Java framework for REST APIs
- **MongoDB** - NoSQL document database
- **Spring Data MongoDB** - MongoDB integration
- **Lombok** - Reduces boilerplate code
- **Maven** - Build and dependency management

## 📋 Features

- ✅ **CRUD Operations**: Create, Read, Update, Delete items
- ✅ **Form Validation**: Client-side and server-side validation
- ✅ **Responsive Design**: Mobile-first UI with Tailwind CSS
- ✅ **Error Handling**: Comprehensive error management
- ✅ **Loading States**: User feedback during API calls
- ✅ **CORS Support**: Cross-origin requests enabled
- ✅ **Search & Filter**: Advanced item search capabilities
- ✅ **Category Management**: Organize items by categories

## 🏗️ Project Structure

```
recruitai-agent/
├── backend/                          # Spring Boot Backend
│   ├── pom.xml                       # Maven configuration
│   └── src/main/
│       ├── java/com/example/demobackend/
│       │   ├── DemoBackendApplication.java    # Main application class
│       │   ├── config/
│       │   │   └── CorsConfig.java           # CORS configuration
│       │   ├── controller/
│       │   │   └── ItemController.java      # REST API endpoints
│       │   ├── model/
│       │   │   └── Item.java                 # Entity/Model
│       │   ├── repository/
│       │   │   └── ItemRepository.java       # Data access layer
│       │   └── service/
│       │       └── ItemService.java          # Business logic
│       └── resources/
│           └── application.yml               # Application configuration
├── src/                              # React Frontend
│   ├── components/
│   │   ├── ItemForm.tsx              # Form component
│   │   └── ItemList.tsx              # List display component
│   ├── services/
│   │   └── itemService.ts            # API service layer
│   └── App.tsx                       # Main application component
└── FULLSTACK_GUIDE.md                # This file
```

## 🛠️ Setup Instructions

### Prerequisites

1. **Java 17+** - Required for Spring Boot
2. **Node.js 18+** - Required for React development
3. **MongoDB** - Database server
4. **Maven 3.6+** - Build tool for Spring Boot

### 1. Database Setup

Install and start MongoDB:

```bash
# On Windows (using Chocolatey)
choco install mongodb
mongod

# On macOS (using Homebrew)
brew install mongodb-community
brew services start mongodb-community

# On Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongodb
```

### 2. Backend Setup

Navigate to the backend directory and run the Spring Boot application:

```bash
cd backend

# Build and run the application
mvn clean install
mvn spring-boot:run

# Or run directly from IDE
# Run DemoBackendApplication.java
```

The backend will start on `http://localhost:8080`

### 3. Frontend Setup

Install dependencies and start the React development server:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or build for production
npm run build
```

The frontend will start on `http://localhost:3000`

## 📡 API Endpoints

### Base URL: `http://localhost:8080/api/items`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| `GET` | `/` | Get all items | - | `Item[]` |
| `GET` | `/{id}` | Get item by ID | - | `Item` |
| `POST` | `/` | Create new item | `Item` | `Item` |
| `PUT` | `/{id}` | Update existing item | `Item` | `Item` |
| `DELETE` | `/{id}` | Delete item | - | `204 No Content` |
| `GET` | `/search?name={name}` | Search items by name | - | `Item[]` |
| `GET` | `/category/{category}` | Get items by category | - | `Item[]` |
| `GET` | `/price-range?min={min}&max={max}` | Get items by price range | - | `Item[]` |
| `GET` | `/count` | Get total item count | - | `number` |

## 📝 Data Models

### Item Model

```typescript
interface Item {
  id?: string;           // MongoDB ObjectId
  name: string;          // Item name (2-100 chars)
  description: string;   // Item description (max 500 chars)
  price: number;         // Item price (positive number)
  category: string;      // Item category
  createdAt?: string;    // ISO timestamp
  updatedAt?: string;    // ISO timestamp
}
```

### JSON Request/Response Examples

#### Create Item (POST)
```json
// Request
{
  "name": "Laptop",
  "description": "High-performance laptop for development",
  "price": 1299.99,
  "category": "Electronics"
}

// Response
{
  "id": "65a1b2c3d4e5f6789012345",
  "name": "Laptop",
  "description": "High-performance laptop for development",
  "price": 1299.99,
  "category": "Electronics",
  "createdAt": "2024-01-14T10:30:00",
  "updatedAt": "2024-01-14T10:30:00"
}
```

#### Get All Items (GET)
```json
// Response
[
  {
    "id": "65a1b2c3d4e5f6789012345",
    "name": "Laptop",
    "description": "High-performance laptop for development",
    "price": 1299.99,
    "category": "Electronics",
    "createdAt": "2024-01-14T10:30:00",
    "updatedAt": "2024-01-14T10:30:00"
  }
]
```

## 🔧 Configuration

### Backend Configuration (`application.yml`)

```yaml
server:
  port: 8080

spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/itemdb

  web:
    cors:
      allowed-origins: "http://localhost:3000"
      allowed-methods: GET, POST, PUT, DELETE, OPTIONS
      allowed-headers: "*"
      allow-credentials: true
```

### Frontend Configuration

The frontend API service is configured in `src/services/itemService.ts`:

```typescript
const API_BASE_URL = 'http://localhost:8080/api';
```

## 🎯 How Frontend Connects to Backend

### 1. API Service Layer
The `itemService.ts` file handles all HTTP requests using the native `fetch` API:

```typescript
// Example: Creating an item
async createItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Item>> {
  const response = await fetch(`${API_BASE_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  return this.handleResponse<Item>(response);
}
```

### 2. React Component Integration
Components use the service through React hooks:

```typescript
// In App.tsx
const handleFormSubmit = async (itemData) => {
  setIsLoading(true);
  const response = await itemService.createItem(itemData);
  if (response.data) {
    setSuccess('Item created successfully!');
    await fetchItems(); // Refresh the list
  }
  setIsLoading(false);
};
```

### 3. Error Handling
Both frontend and backend implement comprehensive error handling:

- **Frontend**: User-friendly error messages, loading states
- **Backend**: HTTP status codes, validation errors, logging

## 🚀 Running the Application

### Development Mode

1. **Start MongoDB**: Make sure MongoDB is running on `localhost:27017`
2. **Start Backend**: `cd backend && mvn spring-boot:run`
3. **Start Frontend**: `npm run dev`
4. **Access Application**: Open `http://localhost:3000`

### Production Mode

1. **Build Frontend**: `npm run build`
2. **Build Backend**: `mvn clean package`
3. **Run Backend JAR**: `java -jar target/demo-backend-0.0.1-SNAPSHOT.jar`

## 🧪 Testing

### Backend Testing
```bash
cd backend
mvn test
```

### Frontend Testing
```bash
npm test
```

## 🔍 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure CORS is properly configured in `CorsConfig.java`
2. **MongoDB Connection**: Check MongoDB is running and connection string is correct
3. **Port Conflicts**: Ensure ports 3000 and 8080 are available
4. **Build Errors**: Verify Java 17+ and Node.js 18+ are installed

### Error Messages

- **"Failed to fetch items"**: Backend not running or incorrect URL
- **"Network error"**: CORS issues or backend unreachable
- **"Validation failed"**: Invalid form data

## 📚 Additional Features

### Advanced Search
The application supports multiple search methods:

```typescript
// Search by name
const items = await itemService.searchItemsByName('laptop');

// Filter by category
const electronics = await itemService.getItemsByCategory('Electronics');

// Price range filter
const affordable = await itemService.getItemsByPriceRange(0, 100);
```

### Form Validation
Both client-side and server-side validation:

- **Client-side**: Real-time validation with user feedback
- **Server-side**: Spring validation annotations with error responses

### Responsive Design
- Mobile-first approach with Tailwind CSS
- Adaptive layouts for different screen sizes
- Touch-friendly interface elements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Create an issue in the repository

---

**Happy Coding! 🎉**
