
export type CustomerType = 'account' | 'trade' | 'residential';
export type DeliveryMethod = 'delivery' | 'pickup' | 'pickup_delivery';

export interface CustomerTypeColors {
  card: string;
  border: string;
  hoverBorder: string;
  leftBorder: string;
}

export const getCustomerTypeColors = (customerType?: string | null, paymentStatus?: string | null): CustomerTypeColors => {
  // If payment is pending, override with red highlighting
  if (paymentStatus === 'pending') {
    return {
      card: 'bg-red-50',
      border: 'border-red-200',
      hoverBorder: 'hover:border-red-300',
      leftBorder: 'border-l-4 border-l-red-500'
    };
  }

  const normalizedType = customerType?.toLowerCase() as CustomerType;
  
  switch (normalizedType) {
    case 'account':
      return {
        card: 'bg-green-50',
        border: 'border-green-200',
        hoverBorder: 'hover:border-green-300',
        leftBorder: 'border-l-4 border-l-green-400'
      };
    case 'trade':
      return {
        card: 'bg-blue-50',
        border: 'border-blue-200',
        hoverBorder: 'hover:border-blue-300',
        leftBorder: 'border-l-4 border-l-blue-400'
      };
    case 'residential':
    default:
      return {
        card: 'bg-white',
        border: 'border-slate-200',
        hoverBorder: 'hover:border-slate-300',
        leftBorder: 'border-l-4 border-l-slate-300'
      };
  }
};

export const getDeliveryMethodColors = (deliveryMethod?: string | null): CustomerTypeColors => {
  const normalizedMethod = deliveryMethod?.toLowerCase() as DeliveryMethod;
  
  switch (normalizedMethod) {
    case 'pickup_delivery':
      return {
        card: 'bg-purple-50',
        border: 'border-purple-200',
        hoverBorder: 'hover:border-purple-300',
        leftBorder: 'border-l-4 border-l-purple-500'
      };
    case 'pickup':
      return {
        card: 'bg-orange-50',
        border: 'border-orange-200',
        hoverBorder: 'hover:border-orange-300',
        leftBorder: 'border-l-4 border-l-orange-400'
      };
    case 'delivery':
    default:
      return {
        card: 'bg-white',
        border: 'border-slate-200',
        hoverBorder: 'hover:border-slate-300',
        leftBorder: 'border-l-4 border-l-slate-300'
      };
  }
};

export const getCustomerTypeLabel = (customerType?: string | null): string => {
  const normalizedType = customerType?.toLowerCase();
  
  switch (normalizedType) {
    case 'account':
      return 'Account';
    case 'trade':
      return 'Trade';
    case 'residential':
      return 'Residential';
    default:
      return 'Residential';
  }
};

export const getDeliveryMethodLabel = (deliveryMethod?: string | null): string => {
  const normalizedMethod = deliveryMethod?.toLowerCase();
  
  switch (normalizedMethod) {
    case 'pickup_delivery':
      return 'Pickup & Delivery';
    case 'pickup':
      return 'Pickup';
    case 'delivery':
    default:
      return 'Delivery';
  }
};
