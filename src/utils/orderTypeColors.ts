export type DeliveryMethod = 'delivery' | 'pickup';

export interface OrderTypeColors {
  card: string;
  border: string;
  hoverBorder: string;
  leftBorder: string;
  badge: string;
  badgeText: string;
}

export const getOrderTypeColors = (deliveryMethod?: string | null): OrderTypeColors => {
  const normalizedMethod = deliveryMethod?.toLowerCase() as DeliveryMethod;
  
  switch (normalizedMethod) {
    case 'delivery':
      return {
        card: 'bg-blue-50/30',
        border: 'border-blue-200',
        hoverBorder: 'hover:border-blue-300',
        leftBorder: 'border-l-4 border-l-blue-400',
        badge: 'bg-blue-100 text-blue-800',
        badgeText: 'text-blue-800'
      };
    case 'pickup':
      return {
        card: 'bg-orange-50/30',
        border: 'border-orange-200',
        hoverBorder: 'hover:border-orange-300',
        leftBorder: 'border-l-4 border-l-orange-400',
        badge: 'bg-orange-100 text-orange-800',
        badgeText: 'text-orange-800'
      };
    default:
      return {
        card: 'bg-slate-50/30',
        border: 'border-slate-200',
        hoverBorder: 'hover:border-slate-300',
        leftBorder: 'border-l-4 border-l-slate-300',
        badge: 'bg-slate-100 text-slate-800',
        badgeText: 'text-slate-800'
      };
  }
};

export const getOrderTypeLabel = (deliveryMethod?: string | null): string => {
  const normalizedMethod = deliveryMethod?.toLowerCase();
  
  switch (normalizedMethod) {
    case 'delivery':
      return 'DELIVERY';
    case 'pickup':
      return 'PICKUP';
    default:
      return 'DELIVERY';
  }
};

export const getOrderTypeIcon = (deliveryMethod?: string | null): string => {
  const normalizedMethod = deliveryMethod?.toLowerCase();
  
  switch (normalizedMethod) {
    case 'delivery':
      return 'Truck';
    case 'pickup':
      return 'ShoppingBag';
    default:
      return 'Truck';
  }
};