import { useState } from "react";
import { Camera, Upload, CheckCircle2, User, Loader2 } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

export function IdentityValidation({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        onComplete();
      }, 1500); // simulate < 2 min response
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center mb-2">
        <h3 className="font-bold text-gray-900 text-lg">Validación Ágil</h3>
        <p className="text-xs text-gray-500">Proceso rápido, sin trámites bancarios.</p>
      </div>

      <div className="flex justify-between items-center mb-4 px-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-[#8b5cf6] text-white' : 'bg-gray-200 text-gray-500'}`}>
              {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
            </div>
          </div>
        ))}
        <div className="absolute w-[calc(100%-4rem)] h-0.5 bg-gray-200 left-8 top-[4.5rem] -z-10">
          <div className="h-full bg-[#8b5cf6] transition-all" style={{ width: `${(step - 1) * 50}%` }}></div>
        </div>
      </div>

      {step === 1 && (
        <Card className="p-4 border border-gray-200 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-gray-800">
            <User className="w-5 h-5 text-[#8b5cf6]" /> Datos Básicos
          </div>
          <div className="space-y-3">
            <input type="text" placeholder="Nombre completo" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8b5cf6] outline-none" defaultValue="Valeria M." />
            <input type="email" placeholder="Correo electrónico" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8b5cf6] outline-none" defaultValue="valeria@example.com" />
            <input type="tel" placeholder="Teléfono celular" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8b5cf6] outline-none" />
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-4 border border-gray-200 space-y-4 text-center">
          <div className="font-semibold text-gray-800">Sube tu Identificación</div>
          <p className="text-xs text-gray-500">INE, Pasaporte o Cédula Profesional</p>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
            <Upload className="w-8 h-8 text-gray-400" />
            <span className="text-sm font-medium text-[#8b5cf6]">Seleccionar archivo</span>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-4 border border-gray-200 space-y-4 text-center">
          <div className="font-semibold text-gray-800">Tómate una Selfie</div>
          <p className="text-xs text-gray-500">Asegúrate de tener buena iluminación</p>
          <div className="bg-gray-100 rounded-xl p-6 flex flex-col items-center gap-2">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </Card>
      )}

      <Button
        onClick={handleNext}
        disabled={loading}
        className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold h-12 rounded-lg mt-2"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (step === 3 ? 'Verificar Identidad' : 'Continuar')}
      </Button>
    </div>
  );
}
