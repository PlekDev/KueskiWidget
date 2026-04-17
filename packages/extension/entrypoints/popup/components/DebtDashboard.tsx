import { useState } from "react";
import { BellRing, CheckCircle2, ChevronRight, AlertCircle, CreditCard } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export function DebtDashboard() {
  const [paid, setPaid] = useState(false);

  const handlePay = () => {
    setPaid(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center mb-2">
        <h3 className="font-bold text-gray-900 text-lg">Panel de Deuda</h3>
        <p className="text-xs text-gray-500">Controla tus pagos quincenales</p>
      </div>

      <Card className="p-4 border-2 border-[#8b5cf6] bg-purple-50 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1 animate-pulse">
          <BellRing className="h-3 w-3 fill-white" /> Vence en 48h
        </div>

        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="font-bold text-gray-900">Pago Próximo</div>
            <div className="text-sm text-gray-600">Amazon - iPhone 13</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-extrabold text-[#8b5cf6]">$1,500.00</div>
            <div className="text-[10px] text-gray-500">Quincena 1 de 4</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium text-red-600 bg-red-100 p-2 rounded-lg mb-4">
          <AlertCircle className="h-4 w-4" /> Vence el 20 de Abril
        </div>

        {paid ? (
          <div className="flex items-center justify-center gap-2 bg-[#00E59B]/20 text-[#00E59B] font-bold h-10 rounded-lg">
            <CheckCircle2 className="h-5 w-5" /> Pago Confirmado
          </div>
        ) : (
          <Button onClick={handlePay} className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold h-10 gap-2 rounded-lg">
            <CreditCard className="h-4 w-4" /> Realizar Pago
          </Button>
        )}
      </Card>

      <div className="font-bold text-gray-900 mt-2 mb-1">Próximos Pagos</div>

      <Card className="p-3 border border-gray-200 flex justify-between items-center opacity-70">
        <div className="flex flex-col">
          <span className="font-semibold text-gray-800 text-sm">Quincena 2</span>
          <span className="text-xs text-gray-500">5 de Mayo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-800">$1,500.00</span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </Card>

      <Card className="p-3 border border-gray-200 flex justify-between items-center opacity-70">
        <div className="flex flex-col">
          <span className="font-semibold text-gray-800 text-sm">Quincena 3</span>
          <span className="text-xs text-gray-500">20 de Mayo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-800">$1,500.00</span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </Card>

      <div className="mt-2 text-center text-xs text-gray-500">
        Te enviaremos un recordatorio vía App o Correo 48 horas antes de cada pago.
      </div>
    </div>
  );
}
