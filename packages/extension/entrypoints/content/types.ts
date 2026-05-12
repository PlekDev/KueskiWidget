export interface PriceExtractor {
  priceSelectors: string[];
  titleSelectors: string[];
  fallbackTitle: string;
}

export interface ExtractedData {
  price: number;
  productName: string;
  currency: string;
  isCart?: false;
}

export interface CartItem {
  name: string;
  quantity: number;
  price: number;
}

export interface CartData {
  isCart: true;
  items: CartItem[];
  total: number;
  currency: string;
  productName: string;
  price: number;
}
