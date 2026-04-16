import { ExternalLink } from "lucide-react";
import { Card } from "./ui/card";   // Coincide con card.tsx
import { Badge } from "./ui/badge"; // Coincide con badge.tsx

export interface Product {
  id: string;
  name: string;
  image: string;
  currentPrice: number;
  originalPrice: number;
  store: string;
  rating: number;
  reviews: number;
}

interface ProductCardProps {
  product: Product;
  onHover?: () => void;
}

export function ProductCard({ product, onHover }: ProductCardProps) {
  const discount = Math.round(
    ((product.originalPrice - product.currentPrice) / product.originalPrice) * 100
  );

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onMouseEnter={onHover}>
      <div className="relative">
        <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
        {discount > 0 && (
          <Badge className="absolute top-2 right-2 bg-red-500 text-white">-{discount}%</Badge>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium mb-2 line-clamp-2">{product.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">${product.currentPrice}</span>
          <ExternalLink className="size-3 text-gray-400" />
        </div>
      </div>
    </Card>
  );
}