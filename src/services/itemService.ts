import api from '../api';

// Item interface matching backend model
export interface Item {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  createdAt?: string;
  updatedAt?: string;
}

// API Response interface
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Item Service
 * Handles all API calls to the Spring Boot backend
 * Uses centralized api instance
 */
class ItemService {
  /**
   * Get all items from the backend
   * GET /api/items
   */
  async getAllItems(): Promise<ApiResponse<Item[]>> {
    try {
      const response = await api.get('/items');
      return { data: response.data };
    } catch (error: any) {
      return {
        error: error.response?.data?.message || 'Failed to fetch items'
      };
    }
  }

  /**
   * Get a single item by ID
   * GET /api/items/{id}
   */
  async getItemById(id: string): Promise<ApiResponse<Item>> {
    try {
      const response = await api.get(`/items/${id}`);
      return { data: response.data };
    } catch (error: any) {
      return {
        error: error.response?.data?.message || 'Failed to fetch item'
      };
    }
  }

  /**
   * Create a new item
   * POST /api/items
   */
  async createItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Item>> {
    try {
      const response = await api.post('/items', item);
      return { data: response.data };
    } catch (error: any) {
      return {
        error: error.response?.data?.message || 'Failed to create item'
      };
    }
  }

  /**
   * Update an existing item
   * PUT /api/items/{id}
   */
  async updateItem(id: string, item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Item>> {
    try {
      const response = await api.put(`/items/${id}`, item);
      return { data: response.data };
    } catch (error: any) {
      return {
        error: error.response?.data?.message || 'Failed to update item'
      };
    }
  }

  /**
   * Delete an item
   * DELETE /api/items/{id}
   */
  async deleteItem(id: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/items/${id}`);
      return { data: undefined };
    } catch (error: any) {
      return {
        error: error.response?.data?.message || 'Failed to delete item'
      };
    }
  }

  /**
   * Search items by name
   * GET /api/items/search?name={name}
   */
  async searchItemsByName(name: string): Promise<ApiResponse<Item[]>> {
    try {
      const response = await api.get(`/items/search?name=${encodeURIComponent(name)}`);
      return { data: response.data };
    } catch (error: any) {
      return {
        error: error.response?.data?.message || 'Failed to search items'
      };
    }
  }

  /**
   * Get items by category
   * GET /api/items/category/{category}
   */
  async getItemsByCategory(category: string): Promise<ApiResponse<Item[]>> {
    try {
      const response = await api.get(`/items/category/${encodeURIComponent(category)}`);
      return { data: response.data };
    } catch (error: any) {
      return {
        error: error.response?.data?.message || 'Failed to fetch items by category'
      };
    }
  }

  /**
   * Get items by price range
   * GET /api/items/price-range?min={min}&max={max}
   */
  async getItemsByPriceRange(min: number, max: number): Promise<ApiResponse<Item[]>> {
    try {
      const response = await api.get(`/items/price-range?min=${min}&max=${max}`);
      return { data: response.data };
    } catch (error: any) {
      return {
        error: error.response?.data?.message || 'Failed to fetch items by price range'
      };
    }
  }

  /**
   * Get total count of items
   * GET /api/items/count
   */
  async getTotalItemCount(): Promise<ApiResponse<number>> {
    try {
      const response = await api.get('/items/count');
      return { data: response.data };
    } catch (error: any) {
      return {
        error: error.response?.data?.message || 'Failed to fetch item count'
      };
    }
  }
}

// Export singleton instance
export const itemService = new ItemService();

export default itemService;
