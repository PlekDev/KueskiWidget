import { useState } from "react";
import { Zap, Check, Info, Calendar } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { IdentityValidation } from "./IdentityValidation";

export function SimuladorPago() {
  const [montoTotal, setMontoTotal] = useState<number>(6000.00);
  const [showValidation, setShowValidation] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);

  const formatMXN = (monto: number) => {
    return '$' + monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calculateFirstPaymentDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 15);
    return today.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const kueskiOptions = [
    { periods: 4, amount: montoTotal / 4, total: montoTotal, interest: '0% interés', commision: 0 },
    { periods: 6, amount: montoTotal / 6, total: montoTotal, interest: '0% interés', commision: 0 },
    { periods: 8, amount: montoTotal / 8, total: montoTotal, interest: '0% interés', commision: 0 },
  ];

  if (showValidation) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" onClick={() => setShowValidation(false)} className="self-start text-xs text-gray-500 mb-2">
          ← Volver al simulador
        </Button>
        <IdentityValidation onComplete={() => {
          setShowValidation(false);
          setValidationComplete(true);
        }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-2">
        <label className="text-sm font-semibold text-gray-700 block mb-2">Simula tu compra</label>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-gray-500 font-medium">$</span>
          <input
            type="number"
            className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-200 text-gray-900 font-bold focus:ring-2 focus:ring-[#8b5cf6] focus:border-transparent outline-none"
            value={montoTotal}
            onChange={(e) => setMontoTotal(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      {kueskiOptions.map((opt, i) => (
        <Card key={i} className={i === 0 ? "border-2 border-[#8b5cf6] shadow-md relative overflow-hidden" : "border border-gray-200"}>
          {i === 0 && (
             <div className="absolute top-0 right-0 bg-[#a855f7] text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1">
               <Zap className="h-3 w-3 fill-white" /> Recomendado
             </div>
          )}
          <div className="p-4">
            <div className="flex items-center flex-wrap gap-2 mb-2">
              <span className="font-bold text-lg text-gray-900">Kueski Pay</span>
              {opt.interest && (
                <Badge className="bg-[#00E59B] hover:bg-[#00E59B] text-gray-900 border-none font-bold ml-auto">
                  {opt.interest}
                </Badge>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 flex flex-col justify-center border border-gray-100">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-[#8b5cf6]">{formatMXN(opt.amount)}</span>
                <span className="text-gray-500 text-sm font-medium">/ quincena</span>
              </div>
              <div className="text-sm text-gray-600 mt-1">Total: {formatMXN(opt.total)} ({opt.periods} quincenas)</div>

              <div className="w-full h-px bg-gray-200 my-3"></div>

              <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                <Calendar className="h-4 w-4 text-[#8b5cf6]" />
                Primer cobro: <span className="font-bold text-gray-900">{calculateFirstPaymentDate()}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                <span>Comisiones adicionales:</span>
                <span className="font-bold">{formatMXN(opt.commision)}</span>
              </div>
            </div>

            {i === 0 && (
              <>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-[#00E59B] font-bold" /> Aprobación inmediata
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-[#00E59B] font-bold" /> Sin tarjeta de crédito
                  </div>
                </div>
                {validationComplete ? (
                  <Button className="w-full bg-[#00E59B] hover:bg-[#00c585] text-gray-900 font-bold h-12 text-base gap-2 rounded-lg mt-2">
                    <Check className="h-5 w-5" /> Identidad Verificada - Pagar
                  </Button>
                ) : (
                  <Button onClick={() => setShowValidation(true)} className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold h-12 text-base gap-2 rounded-lg">
                    <Zap className="h-5 w-5" /> Continuar con Kueski
                  </Button>
                )}
              </>
            )}
          </div>
        </Card>
      ))}
      <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">
        <div className="flex items-center gap-2 font-bold mb-1">
          <Info className="h-4 w-4 text-blue-600" />
          Sin costos ocultos
        </div>
        <p className="text-blue-800/80 leading-relaxed text-xs">
          Kueski Pay te muestra exactamente cuánto vas a pagar. Las comisiones por pago tardío solo aplican si no cumples con las fechas establecidas.
        </p>
      </div>
    </div>
  );
}
