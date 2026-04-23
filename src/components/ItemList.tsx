import React from 'react';

interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  createdAt: string;
  updatedAt: string;
}

interface ItemListProps {
  items: Item[];
  onEdit?: (item: Item) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

/**
 * ItemList Component
 * Displays a list of items with Tailwind CSS styling
 */
const ItemList: React.FC<ItemListProps> = ({ 
  items, 
  onEdit, 
  onDelete, 
  isLoading = false 
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'Electronics': 'bg-blue-100 text-blue-800',
      'Clothing': 'bg-purple-100 text-purple-800',
      'Books': 'bg-green-100 text-green-800',
      'Home & Garden': 'bg-yellow-100 text-yellow-800',
      'Sports': 'bg-red-100 text-red-800',
      'Toys': 'bg-pink-100 text-pink-800',
      'Food': 'bg-orange-100 text-orange-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors['Other'];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
        <p className="text-gray-500">Get started by adding your first item.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Items ({items.length})
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6"
          >
            {/* Item Header */}
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">
                {item.name}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                {item.category}
              </span>
            </div>

            {/* Item Description */}
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
              {item.description}
            </p>

            {/* Item Price */}
            <div className="text-xl font-bold text-blue-600 mb-4">
              {formatPrice(item.price)}
            </div>

            {/* Item Footer */}
            <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
              <span>Created: {formatDate(item.createdAt)}</span>
              {item.updatedAt !== item.createdAt && (
                <span>Updated: {formatDate(item.updatedAt)}</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(item)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
                      onDelete(item.id);
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItemList;
