
export type CustomerType = 'account' | 'trade' | 'residential';

export interface CustomerTypeColors {
  card: string;
  border: string;
  hoverBorder: string;
  leftBorder: string;
}

export const getCustomerTypeColors = (customerType?: string | null): CustomerTypeColors => {
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
