import { useState } from "react";
import kueskiLogo from '../../../assets/kueski-logo.png';
import {
  Zap, X, Store, ExternalLink, TrendingDown, Check, Tag, LayoutTemplate, Copy, Info, Wallet, Bell
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import '../style.css';

type Tab = 'panel' | 'pago' | 'precios' | 'cupones';

interface PaymentOption {
  provider: string;
  periods: number;
  amount: number;
  total: number;
  featured: boolean;
  recommended: boolean;
  interest: string | null;
  benefits: string[];
  commission?: string;
  firstPaymentDate?: string;
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

interface PriceComparison {
  store: string;
  price: number;
  shipping: string;
  cashback: string;
  status: string;
  link: string;
}

interface Coupon {
  code: string;
  discount: string;
  expires: string;
  verified: boolean;
}

export function ExtensionPopup({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('pago');
  const [mockValidationState, setMockValidationState] = useState<'idle' | 'form' | 'loading' | 'success'>('idle');

  const handlePayClick = () => {
    setMockValidationState('form');
  };

  const handleVerifyIdentity = () => {
    setMockValidationState('loading');
    setTimeout(() => {
      setMockValidationState('success');
    }, 2000);
  };

  const kueskiOptions: PaymentOption[] = [
    { provider: 'Kueski Pay', periods: 4, amount: 62.50, total: 250.00, featured: true, recommended: true, interest: '0% interés', benefits: ['Aprobación inmediata', 'Sin tarjeta de crédito', '100% digital'], commission: '0 comisiones ocultas', firstPaymentDate: 'Hoy' },
    { provider: 'Kueski Pay', periods: 6, amount: 41.67, total: 250.00, featured: false, recommended: false, interest: '0% interés', benefits: [], commission: '0 comisiones ocultas', firstPaymentDate: 'Hoy' },
    { provider: 'Kueski Pay', periods: 8, amount: 31.25, total: 250.00, featured: false, recommended: false, interest: '0% interés', benefits: [], commission: '0 comisiones ocultas', firstPaymentDate: 'Hoy' },
    { provider: 'Tarjeta de Crédito', periods: 1, amount: 250.00, total: 250.00, featured: false, recommended: false, interest: null, benefits: [] },
    { provider: 'PayPal', periods: 1, amount: 250.00, total: 250.00, featured: false, recommended: false, interest: null, benefits: [] },
  ];

  const priceComparisons: PriceComparison[] = [
    { store: 'Amazon', price: 199.99, shipping: 'Free', cashback: '$4.99', status: 'In Stock', link: '#' },
    { store: 'Best Buy', price: 219.99, shipping: 'Free', cashback: '$6.59', status: 'In Stock', link: '#' },
  ];

  const coupons: Coupon[] = [
    { code: 'SAVE20', discount: '20% off your purchase', expires: 'Apr 20, 2026', verified: true },
    { code: 'FREESHIP', discount: 'Free shipping on orders over $50', expires: 'Apr 30, 2026', verified: true },
    { code: 'SPRING15', discount: '15% off electronics', expires: 'May 1, 2026', verified: false },
  ];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'panel', label: 'Panel', icon: <Wallet className="h-4 w-4" /> },
    { id: 'pago', label: 'Pago', icon: <LayoutTemplate className="h-4 w-4" /> },
    { id: 'precios', label: 'Precios', icon: <TrendingDown className="h-4 w-4" /> },
    { id: 'cupones', label: 'Cupones', icon: <Tag className="h-4 w-4" /> },
  ];

  return (
    <div className="popup-container">
      {/* HEADER */}
      <div className="kueski-header">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-1.5 text-white font-bold text-lg tracking-wide">
            <img src={kueskiLogo} className="h-5 w-5" alt="Kueski" />
            <span>Kueski-Widget</span>
          </div>
          <Button
            variant="ghost" size="icon" onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="kueski-header-card">
          <div className="flex items-center gap-1.5 mb-2 text-yellow-300 font-semibold text-sm">
            <Zap className="h-4 w-4 fill-yellow-300" />
            Mejor Opción de Pago
          </div>
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold text-white leading-none mb-1">{formatCurrency(62.50)}</span>
              <span className="text-[11px] text-white/90">por quincena</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-white leading-none mb-1">4</span>
              <span className="text-[11px] text-white/90">quincenas</span>
            </div>
            <Badge className="bg-[#00E59B] text-gray-900 hover:bg-[#00E59B] font-bold border-none px-3 py-1 rounded-md">
              0% interés
            </Badge>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-button gap-2 ${activeTab === tab.id ? 'data-[state=active]:bg-gray-50' : ''}`}
            data-state={activeTab === tab.id ? 'active' : 'inactive'}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="overflow-y-auto flex-1 bg-white p-4 styled-scrollbar">

        {/* TAB: PANEL */}
        {activeTab === 'panel' && (
          <div className="space-y-4">
            <Card className="p-4 rounded-xl border border-gray-200 shadow-sm bg-gradient-to-br from-gray-900 to-gray-800 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Wallet className="h-24 w-24" />
              </div>
              <h3 className="text-sm font-medium text-gray-300 mb-1 relative z-10">Panel de Control de Deuda</h3>
              <div className="text-3xl font-extrabold mb-4 relative z-10">{formatCurrency(1250.50)}</div>

              <div className="grid grid-cols-2 gap-4 border-t border-gray-700 pt-4 relative z-10">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Crédito Disponible</div>
                  <div className="text-lg font-bold text-[#00E59B]">{formatCurrency(8749.50)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Límite Total</div>
                  <div className="text-lg font-bold">{formatCurrency(10000.00)}</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 rounded-xl border-l-4 border-l-yellow-400 border-y border-r border-gray-200 shadow-sm bg-white">
              <div className="flex gap-3 mb-3">
                <div className="bg-yellow-100 p-2 rounded-full h-fit">
                  <Bell className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Recordatorio de Cobro</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Tu próximo pago de {formatCurrency(250.00)} vence en 48 horas.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => { setActiveTab('pago'); setMockValidationState('idle'); }}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold h-10 text-sm gap-2 rounded-lg"
              >
                Realizar Pago
              </Button>
            </Card>
          </div>
        )}

        {/* TAB: PAGO */}
        {activeTab === 'pago' && mockValidationState === 'idle' && (
          <div className="flex flex-col gap-4">
            {kueskiOptions.map((opt, i) => (
              <Card key={i} className={opt.featured ? "option-card-featured" : "option-card-default"}>
                {opt.featured ? (
                  <>
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span className="font-bold text-lg text-gray-900">{opt.provider}</span>
                      {opt.recommended && (
                        <Badge className="bg-[#0075FF] hover:bg-[#0075FF] text-white border-none gap-1 py-0.5">
                          <Zap className="h-3 w-3 fill-white" /> Recomendado
                        </Badge>
                      )}
                      {opt.interest && (
                        <Badge className="bg-[#00E59B] hover:bg-[#00E59B] text-gray-900 border-none font-bold ml-auto">
                          {opt.interest}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-4">{opt.periods} quincenas</div>
                    <div className="bg-gray-50 rounded-xl p-4 mb-4 flex flex-col justify-center border border-gray-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-[#4def6a]">{formatCurrency(opt.amount)}</span>
                        <span className="text-gray-500 text-sm font-medium">/ quincena</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Total: {formatCurrency(opt.total)}</div>
                      {opt.commission && (
                        <div className="text-xs text-gray-500 mt-1">{opt.commission}</div>
                      )}
                      {opt.firstPaymentDate && (
                        <div className="text-xs font-bold text-gray-700 mt-1">Primer cobro: {opt.firstPaymentDate}</div>
                      )}
                    </div>
                    <div className="space-y-2 mb-4">
                      {opt.benefits.map((b, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="h-4 w-4 text-[#00E59B] font-bold" />
                          {b}
                        </div>
                      ))}
                    </div>
                    <Button onClick={handlePayClick} className="w-full bg-[#0075FF] hover:bg-[#0050CC] text-white font-bold h-12 text-base gap-2 rounded-lg">
                      <Zap className="h-5 w-5" /> Pagar con Kueski Pay
                    </Button>
                  </>
                ) : (
                  <div className="flex justify-between items-center p-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800">{opt.provider}</span>
                      <span className="text-xs text-gray-500">
                        {opt.interest
                          ? `${opt.periods} quincenas · ${opt.interest}`
                          : `1 pago de ${formatCurrency(opt.total)}`}
                      </span>
                      {opt.commission && (
                        <span className="text-[10px] text-gray-400">{opt.commission}</span>
                      )}
                      {opt.firstPaymentDate && (
                        <span className="text-[10px] text-gray-500 font-medium mt-0.5">Primer cobro: {opt.firstPaymentDate}</span>
                      )}
                    </div>
                    <span className="font-bold text-gray-800">
                      {opt.interest ? formatCurrency(opt.amount) : formatCurrency(opt.total)}
                    </span>
                  </div>
                )}
              </Card>
            ))}
            <div className="mt-2 bg-[#2596be]/10 border border-[#2596be]/20 rounded-xl p-4 text-sm text-[#1a5f78]">
              <div className="flex items-center gap-2 font-bold mb-1">
                <Info className="h-4 w-4 text-[#2596be]" />
                ¿Qué son los pagos quincenales?
              </div>
              <p className="text-[#1a5f78]/80 leading-relaxed text-xs">
                Kueski Pay divide el total de tu compra en fracciones que pagas cada 15 días.
                Eliges el plazo que mejor se adapte a ti. ¡Sin necesidad de tarjeta de crédito!
              </p>
            </div>
          </div>
        )}

        {/* VALIDATION FLOW */}
        {activeTab === 'pago' && mockValidationState !== 'idle' && (
          <div className="flex flex-col gap-4 p-2 items-center justify-center text-center">
            {mockValidationState === 'form' && (
              <>
                <h3 className="font-bold text-lg mb-2">Validación de Identidad</h3>
                <p className="text-sm text-gray-500 mb-4">Completa tu registro con pocos datos para aprobar tu compra.</p>
                <input className="w-full border rounded-md p-2 mb-2" placeholder="Nombre completo" />
                <input className="w-full border rounded-md p-2 mb-2" placeholder="Email" />
                <div className="w-full border rounded-md p-6 bg-gray-50 border-dashed text-gray-400 text-sm mb-4 cursor-pointer">
                  📸 Toma foto de tu ID y selfie
                </div>
                <Button onClick={handleVerifyIdentity} className="w-full bg-[#0075FF] hover:bg-[#0050CC] text-white">
                  Verificar Identidad
                </Button>
                <Button variant="ghost" onClick={() => setMockValidationState('idle')} className="w-full mt-2 text-gray-500">
                  Cancelar
                </Button>
              </>
            )}
            {mockValidationState === 'loading' && (
              <div className="py-10 flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0075FF] mb-4"></div>
                <p className="font-medium text-gray-600">Verificando identidad...</p>
              </div>
            )}
            {mockValidationState === 'success' && (
              <div className="py-10 flex flex-col items-center">
                <div className="bg-[#00E59B]/20 p-4 rounded-full mb-4">
                  <Check className="h-10 w-10 text-[#00E59B]" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-1">Identidad Verificada</h3>
                <p className="text-sm text-gray-500 mb-6">Tu compra ha sido aprobada con Kueski Pay.</p>
                <Button onClick={() => setMockValidationState('idle')} className="w-full bg-gray-900 text-white">
                  Volver al inicio
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB: PRECIOS */}
        {activeTab === 'precios' && (
          <div className="space-y-4">
            {priceComparisons.map((item, i) => (
              <Card key={i} className="p-4 rounded-xl border border-gray-200 shadow-sm bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-gray-500" />
                    <span className="font-semibold text-base text-gray-900">{item.store}</span>
                  </div>
                  <ExternalLink className="h-5 w-5 text-gray-500 cursor-pointer hover:text-gray-900" />
                </div>
                <div className="w-full h-px bg-gray-200 mb-4"></div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-gray-500 font-medium">Precio</span>
                    <span className="font-bold text-gray-900 text-[15px]">{formatCurrency(item.price)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-gray-500 font-medium">Envío</span>
                    <span className="font-bold text-gray-900 text-sm">{item.shipping}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-gray-500 font-medium">Cashback</span>
                    <span className="font-bold text-[#00E59B] text-sm">{item.cashback}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-gray-500 font-medium">Status</span>
                    <span className="font-bold text-[#00E59B] text-sm">{item.status}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* TAB: CUPONES */}
        {activeTab === 'cupones' && (
          <div className="space-y-4">
            {coupons.map((coupon, i) => (
              <div key={i} className="p-4 border border-dashed border-gray-300 bg-white rounded-xl relative">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-none font-bold px-2 py-0.5 rounded text-xs">
                      {coupon.code}
                    </Badge>
                    {coupon.verified && (
                      <Badge className="bg-[#00E59B] text-white hover:bg-[#00E59B] border-none font-bold px-2 py-0.5 rounded flex items-center gap-1 text-[10px]">
                        <Check className="h-3 w-3" /> Verified
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" className="bg-[#0f172a] hover:bg-[#1e293b] text-white h-8 px-3 rounded-lg font-semibold text-xs gap-1.5 flex items-center">
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                </div>
                <div className="text-[15px] font-medium text-gray-900 mb-1">{coupon.discount}</div>
                <div className="text-xs text-gray-500">Expires: {coupon.expires}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="footer-info text-center justify-center">
        <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5 justify-center">
          Financiamiento disponible al momento de compra
        </span>
      </div>
    </div>
  );
}