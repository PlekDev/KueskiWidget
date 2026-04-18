import { useState, useEffect } from "react";
import kueskiLogo from '../../../assets/kueski-logo.png';
import {
  Zap, X, Store, ExternalLink, TrendingDown, Check, Tag,
  LayoutTemplate, Copy, Info, Wallet, Bell, CheckCircle, Loader2,
  ShoppingCart, ArrowRight, RefreshCw
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import '../style.css';

import { supabase } from 'shared/supabase';
import { PromotionMapper, MerchantMapper, KueskiUserMapper } from 'shared/mappers';
import type { Promotion, Merchant, KueskiUser } from 'shared/models';

type Tab = 'panel' | 'pago' | 'precios' | 'cupones';
type PayFlow = 'options' | 'form' | 'loading' | 'success';

const formatCurrency = (amount: number) =>
  amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

// ─── Producto demo (en producción vendrá del content script via messaging) ───
const DEMO_PRODUCT = { name: 'Apple iPhone 15 128GB', price: 18999 };

// ─── Price comparison (generada desde merchants de Supabase) ─────────────────
interface PriceResult {
  store: string;
  price: number;
  shipping: string;
  cashback: string;
  inStock: boolean;
  url: string;
  flag: string;
}

const buildComparisons = (basePrice: number, productName: string, merchants: Merchant[]): PriceResult[] => {
  const variance = (pct: number) => Math.round(basePrice * (1 + pct / 100));
  const flagMap: Record<string, string> = {
    'liverpool.com.mx':  '🔴',
    'elektra.com.mx':    '⚡',
    'officedepot.com.mx':'📦',
    'mx.puma.com':       '🐾',
    'amazon.com.mx':     '🇲🇽',
    'mercadolibre.com.mx':'🛒',
  };
  const variances = [-3, -8, 2, 8, 12, -12];

  const fromDB: PriceResult[] = merchants.map((m, i) => ({
    store:    m.name,
    price:    variance(variances[i] ?? 0),
    shipping: 'Ver tienda',
    cashback: m.cashbackPercent > 0
      ? formatCurrency(variance(variances[i] ?? 0) * (m.cashbackPercent / 100))
      : '—',
    inStock: true,
    url:     `https://${m.domain}/search?q=${encodeURIComponent(productName)}`,
    flag:    flagMap[m.domain] ?? '🏪',
  }));

  // Siempre incluir Amazon como referencia base
  return [
    { store: 'Amazon MX', price: basePrice, shipping: 'Gratis Prime',
      cashback: formatCurrency(basePrice * 0.025), inStock: true,
      url: `https://www.amazon.com.mx/s?k=${encodeURIComponent(productName)}`, flag: '🇲🇽' },
    ...fromDB,
  ];
};

export function ExtensionPopup({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab]         = useState<Tab>('pago');
  const [payFlow, setPayFlow]             = useState<PayFlow>('options');
  const [selectedPeriods, setSelectedPeriods] = useState(4);
  const [copiedCode, setCopiedCode]       = useState<string | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [pricesLoaded, setPricesLoaded]   = useState(false);

  // ─── Supabase state ──────────────────────────────────────────────────────
  const [promotions, setPromotions]   = useState<Promotion[]>([]);
  const [merchants, setMerchants]     = useState<Merchant[]>([]);
  const [kueskiUser, setKueskiUser]   = useState<KueskiUser | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const product = DEMO_PRODUCT;
  const price   = product.price;

  const kueskiOptions = [
    { periods: 4,  amount: price / 4  },
    { periods: 6,  amount: price / 6  },
    { periods: 8,  amount: price / 8  },
    { periods: 12, amount: price / 12 },
  ];
  const selectedOption = kueskiOptions.find(o => o.periods === selectedPeriods) || kueskiOptions[0];

  // ─── Fetch inicial desde Supabase ────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      setLoadingData(true);
      try {
        // Cupones/promociones verificadas
        const { data: promoData } = await supabase
          .from('promotions')
          .select('*')
          .order('created_at', { ascending: false });
        if (promoData) setPromotions(promoData.map(PromotionMapper.toDomain));

        // Merchants activos
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('*')
          .eq('is_active', true);
        if (merchantData) setMerchants(merchantData.map(MerchantMapper.toDomain));

        // Usuario demo (primer usuario activo)
        const { data: userData } = await supabase
          .from('kueski_users')
          .select('*')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        if (userData) setKueskiUser(KueskiUserMapper.toDomain(userData));
      } catch (err) {
        console.error('[KueskiWidget] Error fetching data:', err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchAll();
  }, []);

  // ─── Precios: se cargan al abrir el tab ─────────────────────────────────
  useEffect(() => {
    if (activeTab === 'precios' && !pricesLoaded && merchants.length > 0) {
      setLoadingPrices(true);
      setTimeout(() => { setLoadingPrices(false); setPricesLoaded(true); }, 1200);
    }
  }, [activeTab, merchants]);

  const comparisons = buildComparisons(price, product.name, merchants);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handlePay      = () => setPayFlow('form');
  const handleVerify   = () => { setPayFlow('loading'); setTimeout(() => setPayFlow('success'), 2500); };
  const handleRedirect = () => window.open('https://www.kueski.com/', '_blank');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'panel',   label: 'Panel',   icon: <Wallet className="h-3.5 w-3.5" /> },
    { id: 'pago',    label: 'Pago',    icon: <LayoutTemplate className="h-3.5 w-3.5" /> },
    { id: 'precios', label: 'Precios', icon: <TrendingDown className="h-3.5 w-3.5" /> },
    { id: 'cupones', label: 'Cupones', icon: <Tag className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="popup-container">

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="kueski-header">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1.5 text-white font-bold text-base tracking-wide">
            <img src={kueskiLogo} className="h-5 w-5" alt="Kueski" />
            <span>Kueski Widget</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full h-7 w-7">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="kueski-header-card">
          <div className="flex items-center gap-1.5 mb-2 text-yellow-300 font-semibold text-xs">
            <Zap className="h-3.5 w-3.5 fill-yellow-300" />
            Mejor Opción · {selectedPeriods} quincenas a 0% interés
          </div>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-2xl font-extrabold text-white">{formatCurrency(selectedOption.amount)}</span>
              <span className="text-white/80 text-xs ml-1">/ quincena</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/70">Total producto</div>
              <div className="text-sm font-bold text-white">{formatCurrency(price)}</div>
            </div>
            <Badge className="bg-[#00E59B] text-gray-900 hover:bg-[#00E59B] font-bold border-none px-2 py-0.5 text-xs">
              0% interés
            </Badge>
          </div>
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      <div className="tabs-container">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`tab-button gap-1 text-xs ${activeTab === tab.id ? 'data-[state=active]:bg-gray-50' : ''}`}
            data-state={activeTab === tab.id ? 'active' : 'inactive'}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────────── */}
      <div className="overflow-y-auto flex-1 bg-white p-3 styled-scrollbar">

        {/* Loading global */}
        {loadingData && (
          <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando datos...
          </div>
        )}

        {/* ━━━ TAB: PANEL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {!loadingData && activeTab === 'panel' && (
          <div className="space-y-3">
            <Card className="p-4 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 text-white border-0">
              <p className="text-xs text-gray-400 mb-1">Crédito Disponible</p>
              <p className="text-3xl font-extrabold mb-3">
                {kueskiUser ? formatCurrency(kueskiUser.creditAvailable) : '—'}
              </p>
              <div className="grid grid-cols-2 gap-3 border-t border-gray-700 pt-3">
                <div>
                  <p className="text-xs text-gray-400">Usado</p>
                  <p className="font-bold text-[#00E59B]">
                    {kueskiUser ? formatCurrency(kueskiUser.creditUsed) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Límite</p>
                  <p className="font-bold">
                    {kueskiUser ? formatCurrency(kueskiUser.creditLimit) : '—'}
                  </p>
                </div>
              </div>
            </Card>

            {kueskiUser && (
              <div className="text-xs text-gray-500 text-center">
                Hola, <strong>{kueskiUser.fullName}</strong> · máx. {kueskiUser.maxInstallments} quincenas
              </div>
            )}

            <Card className="p-3 border-l-4 border-l-yellow-400 border-y border-r border-gray-200 bg-white">
              <div className="flex gap-2 mb-2">
                <div className="bg-yellow-100 p-1.5 rounded-full h-fit">
                  <Bell className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Próximo pago</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {formatCurrency(selectedOption.amount)} vence el <strong>5 de Mayo</strong>
                  </p>
                </div>
              </div>
              <Button onClick={() => { setActiveTab('pago'); setPayFlow('options'); }}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold h-9 text-xs gap-1.5 rounded-lg">
                <ShoppingCart className="h-3.5 w-3.5" /> Realizar Pago
              </Button>
            </Card>

            <Card className="p-3 border border-gray-200">
              <p className="text-xs font-bold text-gray-700 mb-2">Tiendas con Kueski Pay</p>
              {merchants.map(m => (
                <div key={m.id} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-gray-800">{m.name}</p>
                    <p className="text-[10px] text-gray-400">{m.category}</p>
                  </div>
                  {m.cashbackPercent > 0 && (
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      {m.cashbackPercent}% cashback
                    </span>
                  )}
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* ━━━ TAB: PAGO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {!loadingData && activeTab === 'pago' && (
          <>
            {payFlow === 'options' && (
              <div className="flex flex-col gap-3">
                <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3 border border-blue-100">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 shrink-0">
                    <ShoppingCart className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">Precio: <strong className="text-[#0075FF]">{formatCurrency(price)}</strong></p>
                  </div>
                </div>

                <p className="text-xs font-bold text-gray-700">Elige tu plan de pago:</p>

                {kueskiOptions
                  .filter(o => !kueskiUser || o.periods <= kueskiUser.maxInstallments)
                  .map(opt => (
                  <div key={opt.periods}
                    onClick={() => setSelectedPeriods(opt.periods)}
                    className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
                      selectedPeriods === opt.periods ? 'border-[#0075FF] bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900">{opt.periods} quincenas</span>
                          {opt.periods === 4 && (
                            <span className="text-[10px] bg-[#0075FF] text-white px-2 py-0.5 rounded-full font-bold">Recomendado</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">Total: {formatCurrency(price)} · 0 comisiones</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-extrabold text-[#0075FF]">{formatCurrency(opt.amount)}</div>
                        <div className="text-[10px] text-green-600 font-bold">0% interés</div>
                      </div>
                    </div>
                    {selectedPeriods === opt.periods && (
                      <div className="mt-2 pt-2 border-t border-blue-200 grid grid-cols-3 gap-1 text-[10px] text-gray-600">
                        <span className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500"/>Sin tarjeta</span>
                        <span className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500"/>Aprobación inmediata</span>
                        <span className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500"/>100% digital</span>
                      </div>
                    )}
                  </div>
                ))}

                <Button onClick={handlePay}
                  className="w-full bg-[#0075FF] hover:bg-[#0050CC] text-white font-bold h-11 text-sm gap-2 rounded-xl mt-1">
                  <Zap className="h-4 w-4" /> Solicitar con Kueski Pay
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Info className="h-3.5 w-3.5 text-blue-500" /> ¿Cómo funciona Kueski Pay?
                  </div>
                  <p className="text-blue-700/80 leading-relaxed">
                    Kueski Pay divide tu compra en pagos quincenales sin intereses. Sin tarjeta de crédito, aprobación en minutos.
                  </p>
                </div>
              </div>
            )}

            {payFlow === 'form' && (
              <div className="flex flex-col gap-3">
                <div className="text-center mb-1">
                  <h3 className="font-bold text-base text-gray-900">Validación de Identidad</h3>
                  <p className="text-xs text-gray-500">Proceso rápido · menos de 2 minutos</p>
                </div>
                <div className="bg-[#0075FF]/8 border border-[#0075FF]/20 rounded-xl p-3 text-xs text-[#0050CC] font-medium">
                  Plan: <strong>{selectedPeriods} quincenas de {formatCurrency(selectedOption.amount)}</strong>
                </div>
                <div className="flex flex-col gap-2">
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0075FF] outline-none"
                    placeholder="Nombre completo"
                    defaultValue={kueskiUser?.fullName ?? ''} />
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0075FF] outline-none"
                    placeholder="Correo electrónico" type="email"
                    defaultValue={kueskiUser?.email ?? ''} />
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0075FF] outline-none"
                    placeholder="Teléfono celular" type="tel" />
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center gap-2 text-gray-400 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="text-2xl">📷</div>
                  <p className="text-xs font-medium text-gray-600">Toca para fotografiar tu INE</p>
                  <p className="text-[10px] text-gray-400">También acepta Pasaporte o Cédula</p>
                </div>
                <Button onClick={handleVerify}
                  className="w-full bg-[#0075FF] hover:bg-[#0050CC] text-white font-bold h-11 text-sm rounded-xl">
                  Verificar y solicitar crédito
                </Button>
                <Button variant="ghost" onClick={() => setPayFlow('options')}
                  className="w-full text-gray-500 text-xs h-8">← Regresar</Button>
              </div>
            )}

            {payFlow === 'loading' && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-[#0075FF] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-[#0075FF]" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-900">Verificando identidad…</p>
                  <p className="text-xs text-gray-500 mt-1">Analizando tu historial crediticio</p>
                </div>
                <div className="w-full space-y-2 px-4">
                  {['Verificando datos personales', 'Consultando buró de crédito', 'Aprobando solicitud'].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <Loader2 className="h-3 w-3 animate-spin text-[#0075FF] shrink-0" /> {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {payFlow === 'success' && (
              <div className="flex flex-col items-center justify-center py-6 gap-4 text-center">
                <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircle className="h-12 w-12 text-[#00E59B]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-gray-900">¡Crédito Aprobado!</h3>
                  <p className="text-sm text-gray-500 mt-1">Tu solicitud ha sido aprobada con Kueski Pay</p>
                </div>
                <div className="w-full bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100 text-left">
                  <p className="text-xs font-bold text-gray-700 mb-2">Resumen:</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between"><span>Monto total</span><strong>{formatCurrency(price)}</strong></div>
                    <div className="flex justify-between"><span>Quincenas</span><strong>{selectedPeriods}</strong></div>
                    <div className="flex justify-between"><span>Pago quincenal</span><strong className="text-[#0075FF]">{formatCurrency(selectedOption.amount)}</strong></div>
                    <div className="flex justify-between"><span>Intereses</span><strong className="text-green-600">$0.00</strong></div>
                    <div className="flex justify-between"><span>Primer cobro</span><strong>5 de Mayo, 2026</strong></div>
                  </div>
                </div>
                <Button onClick={handleRedirect}
                  className="w-full bg-[#0075FF] hover:bg-[#0050CC] text-white font-bold h-11 text-sm rounded-xl gap-2">
                  Completar compra en Kueski <ExternalLink className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => setPayFlow('options')} className="text-gray-500 text-xs">
                  Volver al inicio
                </Button>
              </div>
            )}
          </>
        )}

        {/* ━━━ TAB: PRECIOS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {!loadingData && activeTab === 'precios' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-gray-700">Comparando: {product.name.slice(0, 28)}…</p>
              <button onClick={() => { setPricesLoaded(false); setLoadingPrices(true); setTimeout(() => { setLoadingPrices(false); setPricesLoaded(true); }, 1000); }}
                className="text-[#0075FF] text-[10px] flex items-center gap-1 font-semibold">
                <RefreshCw className="h-3 w-3" /> Actualizar
              </button>
            </div>

            {loadingPrices ? (
              <div className="flex flex-col items-center py-10 gap-3 text-gray-400">
                <div className="w-8 h-8 border-[3px] border-blue-200 border-t-[#0075FF] rounded-full animate-spin" />
                <p className="text-xs">Buscando mejores precios…</p>
              </div>
            ) : (
              <>
                {(() => {
                  const best = comparisons.filter(c => c.inStock).sort((a, b) => a.price - b.price)[0];
                  const savings = price - best.price;
                  return savings > 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                      <p className="font-bold">💡 Mejor precio: {best.store}</p>
                      <p className="mt-0.5">Ahorras <strong>{formatCurrency(savings)}</strong> vs. Amazon</p>
                    </div>
                  ) : null;
                })()}

                {comparisons.map((item, i) => (
                  <Card key={i} className={`p-3 rounded-xl border ${!item.inStock ? 'opacity-60' : ''} ${i === 0 ? 'border-[#0075FF]/40 bg-blue-50/30' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.flag}</span>
                        <div>
                          <span className="font-semibold text-sm text-gray-900">{item.store}</span>
                          {i === 0 && <span className="ml-1.5 text-[10px] bg-[#0075FF] text-white px-1.5 py-0.5 rounded font-bold">Actual</span>}
                        </div>
                      </div>
                      <a href={item.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-700">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-400 text-[10px]">Precio</p>
                        <p className="font-extrabold text-gray-900">{formatCurrency(item.price)}</p>
                        {item.price < price && (
                          <p className="text-green-600 text-[10px] font-bold">▼ {formatCurrency(price - item.price)}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-400 text-[10px]">Envío</p>
                        <p className="font-semibold text-gray-700">{item.shipping}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-[10px]">Cashback</p>
                        <p className="font-semibold text-[#00b87a]">{item.cashback}</p>
                      </div>
                    </div>
                  </Card>
                ))}

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                  <p className="font-bold mb-1">💳 Con Kueski Pay en cualquier tienda</p>
                  <p>Financia en {selectedPeriods} quincenas de <strong>{formatCurrency(selectedOption.amount)}</strong> a 0% interés.</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ━━━ TAB: CUPONES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {!loadingData && activeTab === 'cupones' && (
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-gray-700 mb-1">
              Códigos activos ({promotions.length})
            </p>

            {promotions.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">No hay cupones disponibles por el momento.</p>
            )}

            {promotions.map((promo) => (
              <div key={promo.id} className="border border-dashed border-gray-300 rounded-xl p-3 bg-white">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="bg-gray-100 text-gray-800 font-mono font-bold text-xs px-2 py-0.5 rounded border border-gray-200">
                      {promo.code}
                    </code>
                    {promo.isVerified ? (
                      <span className="flex items-center gap-0.5 text-[10px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded font-bold">
                        <Check className="h-2.5 w-2.5" /> Verificado
                      </span>
                    ) : (
                      <span className="text-[10px] text-yellow-700 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded font-bold">
                        Sin verificar
                      </span>
                    )}
                  </div>
                  <Button size="sm"
                    onClick={() => handleCopy(promo.code)}
                    className={`shrink-0 h-7 px-2.5 rounded-lg text-[11px] gap-1 font-bold transition-all ${
                      copiedCode === promo.code
                        ? 'bg-green-500 hover:bg-green-500 text-white'
                        : 'bg-gray-900 hover:bg-gray-700 text-white'
                    }`}>
                    {copiedCode === promo.code
                      ? <><Check className="h-3 w-3" /> ¡Copiado!</>
                      : <><Copy className="h-3 w-3" /> Copiar</>
                    }
                  </Button>
                </div>
                <p className="text-xs text-gray-700 font-medium">{promo.description}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-gray-400">
                    {promo.expiresAt ? `Vence: ${promo.expiresAt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Sin vencimiento'}
                  </p>
                  <p className="text-[10px] font-bold text-[#0075FF] uppercase">{promo.discountType}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <div className="footer-info text-center justify-center">
        <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1 justify-center">
          <img src={kueskiLogo} className="h-3 w-3" alt="" />
          Financiamiento disponible · kueski.com/kueski-pay
        </span>
      </div>
    </div>
  );
}