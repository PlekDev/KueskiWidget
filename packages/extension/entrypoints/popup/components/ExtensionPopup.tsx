import { useState } from "react";
import {
  Tag,
  TrendingDown,
  Check,
  X,
  Sparkles,
  CreditCard,
  Zap,
} from "lucide-react";

// Asegúrate de que estos nombres coincidan con tus archivos en la carpeta ui/
import { Card } from "./ui/card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/Tabs";

export function ExtensionPopup({ onClose }: { onClose?: () => void }) {
  return (
    <div className="w-[380px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col font-sans">
      {/* Header con Gradiente DealFinder */}
      <div className="bg-gradient-to-br from-[#6366f1] via-[#8b5cf6] to-[#3b82f6] text-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-6 fill-white/20" />
            <h2 className="font-extrabold text-xl tracking-tight">DealFinder</h2>
          </div>
          {onClose && (
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
              <X className="size-5" />
            </button>
          )}
        </div>
        
        {/* Banner "Mejor Opción de Pago" */}
        <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-md border border-white/10 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="size-4 text-yellow-300 fill-yellow-300" />
            <p className="text-xs font-bold uppercase tracking-wider opacity-90">Mejor Opción de Pago</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-4xl font-black">$62.50</span>
              <span className="text-[10px] uppercase font-bold opacity-80 mt-1">por quincena</span>
            </div>
            <div className="flex flex-col items-center border-x border-white/20 px-4">
              <span className="text-3xl font-black">4</span>
              <span className="text-[10px] uppercase font-bold opacity-80">quincenas</span>
            </div>
            <div className="bg-[#00e676] text-[#004d40] px-3 py-1 rounded-full text-xs font-black shadow-sm">
              0% interés
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Estilo Figma */}
      <Tabs defaultValue="payment" className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-gray-100 rounded-none h-14 p-0">
          <TabsTrigger value="payment" className="data-[state=active]:bg-white data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 h-full gap-2 font-bold text-gray-600">
            <CreditCard className="size-4" /> Pago
          </TabsTrigger>
          <TabsTrigger value="prices" className="data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 h-full gap-2 font-bold text-gray-600">
            <TrendingDown className="size-4" /> Precios
          </TabsTrigger>
          <TabsTrigger value="coupons" className="data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 h-full gap-2 font-bold text-gray-600">
            <Tag className="size-4" /> Cupones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payment" className="p-5 space-y-4">
          {/* Card de Kueski Pay */}
          <Card className="p-5 border-2 border-purple-200 bg-white rounded-2xl shadow-sm relative overflow-hidden">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-2xl text-gray-900">Kueski Pay</h3>
                  <div className="bg-[#9c27b0] text-white px-2 py-0.5 rounded-lg flex items-center gap-1 text-[10px] font-bold">
                    <Sparkles className="size-3" /> RECOMENDADO
                  </div>
                </div>
                <div className="bg-[#00e676] text-white px-2 py-1 rounded-lg text-[10px] font-black">
                  0% INTERÉS
                </div>
             </div>
             
             <p className="text-sm text-gray-500 font-medium mb-4">4 quincenas</p>

             <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#6200ea]">$62.50</span>
                  <span className="text-sm text-gray-400 font-bold">/ quincena</span>
                </div>
                <p className="text-sm text-gray-400 font-bold mt-2">Total: $250.00</p>
             </div>

             <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm font-semibold text-gray-600">
                  <Check className="size-4 text-green-500 stroke-[3px]" /> Aprobación inmediata
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold text-gray-600">
                  <Check className="size-4 text-green-500 stroke-[3px]" /> Sin tarjeta de crédito
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold text-gray-600">
                  <Check className="size-4 text-green-500 stroke-[3px]" /> 100% digital
                </div>
             </div>

             <Button className="w-full bg-[#6200ea] hover:bg-[#4500a0] text-white rounded-xl py-7 text-lg font-black transition-all shadow-lg shadow-purple-100">
                <Zap className="size-5 mr-2 fill-current" /> Pagar con Kueski Pay
             </Button>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="bg-gray-50 p-4 text-center border-t">
        <p className="text-xs font-bold text-gray-400 flex items-center justify-center gap-2">
          <span className="text-lg">💡</span> FINANCIAMIENTO DISPONIBLE AL MOMENTO DE COMPRA
        </p>
      </div>
    </div>
  );
}