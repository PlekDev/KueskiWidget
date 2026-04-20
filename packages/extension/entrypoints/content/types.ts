export interface PriceExtractor {
  priceSelectors: string[];
  titleSelectors: string[];
  fallbackTitle: string;
}

export interface ExtractedData {
  price: number;
  productName: string;
  currency: string;
}