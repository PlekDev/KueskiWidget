import { useState, useEffect } from "react";
import kueskiLogo from '../../../assets/kueski-logo.png';
import {
  Zap, X, Store, ExternalLink, TrendingDown, Check, Tag,
  LayoutTemplate, Copy, Info, Wallet, Bell, CheckCircle, Loader2,
  ShoppingCart, ArrowRight, RefreshCw, CreditCard
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import '../style.css';

import { supabase } from 'shared/supabase';
import { PromotionMapper, MerchantMapper, KueskiUserMapper } from 'shared/mappers';
import type { Promotion, Merchant, KueskiUser } from 'shared/models';

type Tab = 'panel' | 'pago' | 'precios' | 'cupones' | 'tarjeta';
type PayFlow = 'options' | 'form' | 'loading' | 'success';

const formatCurrency = (amount: number) =>
  amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

const genCvv = () => {
  const slot = Math.floor(Date.now() / 30_000);
  return String((slot * 7919 + 1337) % 900 + 100);
};

// ─── Cupones de respaldo (se muestran cuando Supabase no tiene promos) ────────
const FALLBACK_PROMOS = [
  { id: 'f1', code: 'KUESKI10', description: '10% de descuento en tu primera compra con Kueski Pay', discountType: 'percentage', isVerified: true, expiresAt: null },
  { id: 'f2', code: 'ENVIOGRATIS', description: 'Envío gratis en compras mayores a $500 MXN en tiendas seleccionadas', discountType: 'shipping', isVerified: true, expiresAt: null },
  { id: 'f3', code: 'CASHBACK2', description: '2% de cashback en todas tus compras con Kueski Pay', discountType: 'percentage', isVerified: true, expiresAt: null },
  { id: 'f4', code: 'BIENVENIDO', description: 'Descuento de $100 MXN en tu primera compra financiada', discountType: 'fixed', isVerified: false, expiresAt: null },
];

// ─── Tiendas partner hardcodeadas (siempre visibles aunque Supabase esté vacío) ─
const HARDCODED_STORES = [
  { id: 'h1', name: 'Walmart', domain: 'walmart.com.mx', cashbackPercent: 0, category: 'Supermercado · Retail' },
  { id: 'h2', name: 'Liverpool', domain: 'liverpool.com.mx', cashbackPercent: 0, category: 'Departamental · Moda' },
  { id: 'h3', name: 'Coppel', domain: 'coppel.com', cashbackPercent: 0, category: 'Retail · Hogar' },
];

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

  // ─── Login State ──────────────────────────────────────────────────────────
  const [checkingSession, setCheckingSession] = useState(true); // true mientras verificamos sesión guardada
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [allUsers, setAllUsers] = useState<KueskiUser[]>([]);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // ─── Producto / carrito detectado de la página activa ───────────────────────
  const [product, setProduct] = useState<{ name: string; price: number; isCart?: boolean; isPartner?: boolean; cartItems?: { name: string; quantity: number; price: number }[] } | null>(null);
  const price = product?.price ?? 0;

  const [cvv, setCvv] = useState(genCvv);
  const [cvvTick, setCvvTick] = useState(() => 30 - (Math.floor(Date.now() / 1000) % 30));
  useEffect(() => {
    const id = setInterval(() => {
      setCvv(genCvv());
      setCvvTick(30 - (Math.floor(Date.now() / 1000) % 30));
    }, 1000);
    return () => clearInterval(id);
  }, []);

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
        // Verificar sesión PRIMERO — no depende de que los otros fetches tengan éxito.
        // Si hay sesión válida el usuario está autenticado, independientemente de kueski_users.
        const { data: { session } } = await supabase.auth.getSession();
        const sessionEmail = session?.user?.email?.toLowerCase() ?? null;
        if (sessionEmail) setIsLoggedIn(true);
        setCheckingSession(false); // ya sabemos si hay sesión, mostramos la UI correcta

        if (!sessionEmail) return; // sin sesión no cargamos datos privados

        // Fetch paralelo de todos los datos necesarios
        const [promoRes, merchantRes, usersRes] = await Promise.all([
          supabase.from('promotions').select('*').order('created_at', { ascending: false }),
          supabase.from('merchants').select('*').eq('is_active', true),
          supabase.from('kueski_users').select('*').eq('is_active', true),
        ]);

        if (promoRes.data)    setPromotions(promoRes.data.map(PromotionMapper.toDomain));
        if (merchantRes.data) setMerchants(merchantRes.data.map(MerchantMapper.toDomain));

        if (usersRes.data) {
          const mappedUsers = usersRes.data.map(KueskiUserMapper.toDomain);
          setAllUsers(mappedUsers);
          // Matching case-insensitive para evitar problemas si el email tiene mayúsculas
          const kueskiRecord = mappedUsers.find(
            u => u.email.toLowerCase() === sessionEmail,
          );
          if (kueskiRecord) setKueskiUser(kueskiRecord);
        }
      } catch (err) {
        console.error('[KueskiWidget] Error fetching data:', err);
      } finally {
        setLoadingData(false);
        setCheckingSession(false); // garantiza que el spinner siempre desaparece
      }
    };
    fetchAll();

    const getActiveTabProduct = async () => {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          const response = await browser.tabs.sendMessage(tab.id, { action: 'GET_PRODUCT_INFO' });
          if (response && response.productName && response.price) {
            setProduct({
              name: response.productName,
              price: response.price,
              isCart: response.isCart ?? false,
              isPartner: response.isPartner ?? false,
              cartItems: response.items ?? [],
            });
          }
        }
      } catch (err) {
        console.log('No content script / not a supported domain');
      }
    };
    getActiveTabProduct();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const { data, error } = authMode === 'login'
        ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
        : await supabase.auth.signUp({ email: authEmail, password: authPassword });

      if (error) { setAuthError(error.message); return; }
      if (!data.session) { setAuthError('Revisa tu correo para confirmar la cuenta.'); return; }

      const user = allUsers.find(u => u.email === authEmail);
      if (user) setKueskiUser(user);
      setIsLoggedIn(true);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setKueskiUser(null);
    setIsLoggedIn(false);
    setAuthEmail('');
    setAuthPassword('');
    setActiveTab('panel');
    setPayFlow('options');
  };

  // ─── Precios: se cargan al abrir el tab ─────────────────────────────────
  useEffect(() => {
    if (activeTab === 'precios' && !pricesLoaded && merchants.length > 0) {
      setLoadingPrices(true);
      setTimeout(() => { setLoadingPrices(false); setPricesLoaded(true); }, 1200);
    }
  }, [activeTab, merchants]);

  const comparisons = buildComparisons(price, product?.name ?? '', merchants);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handlePay      = () => setPayFlow('form');
  const handleVerify   = () => { setPayFlow('loading'); setTimeout(() => setPayFlow('success'), 2500); };
  const handleRedirect = () => window.open('https://www.kueski.com', '_blank');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'panel',   label: 'Panel',   icon: <Wallet className="h-3.5 w-3.5" /> },
    { id: 'pago',    label: 'Pago',    icon: <LayoutTemplate className="h-3.5 w-3.5" /> },
    { id: 'precios', label: 'Precios', icon: <TrendingDown className="h-3.5 w-3.5" /> },
    { id: 'cupones', label: 'Cupones', icon: <Tag className="h-3.5 w-3.5" /> },
    { id: 'tarjeta', label: 'Tarjeta', icon: <Store className="h-3.5 w-3.5" /> },
  ];

  const handleClose = () => {
    if (onClose) onClose();
    else window.close();
  };

  // Mientras verificamos si hay sesión guardada mostramos un spinner.
  // Esto evita el flash del login form en cada apertura del popup.
  if (checkingSession) {
    return (
      <div className="popup-container flex flex-col justify-center items-center bg-gray-50">
        <div className="w-8 h-8 border-[3px] border-blue-200 border-t-[#0075FF] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="popup-container flex flex-col justify-center items-center bg-gray-50 text-gray-900">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-full max-w-[320px]">
          <div className="flex justify-center mb-6">
            <div className="bg-[#0075FF] p-2 rounded-lg">
              <Zap className="h-6 w-6 text-white" fill="currentColor" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
            {authMode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            {authMode === 'login' ? 'Accede a tu crédito Kueski' : 'Regístrate para continuar'}
          </p>

          <form onSubmit={handleAuth} className="space-y-3">
            <input
              type="email"
              required
              placeholder="correo@ejemplo.com"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0075FF]"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Contraseña"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0075FF]"
            />

            {authError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
                {authError}
              </p>
            )}

            <Button type="submit" disabled={authLoading}
              className="w-full bg-[#0075FF] hover:bg-[#0050CC] text-white font-bold h-10 text-sm rounded-lg">
              {authLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : (authMode === 'login' ? 'Entrar' : 'Registrarme')}
            </Button>

            <button type="button"
              onClick={() => { setAuthMode(m => m === 'login' ? 'signup' : 'login'); setAuthError(null); }}
              className="w-full text-xs text-[#0075FF] hover:underline">
              {authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-container">

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="kueski-header">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1.5 text-white font-bold text-base tracking-wide">
            <img src={kueskiLogo} className="h-5 w-5" alt="Kueski" />
            <span>Kueski Widget</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleLogout}
              className="text-white hover:bg-white/20 rounded-full h-7 px-2 text-[10px]">
              Salir
            </Button>
          </div>
        </div>
        <div className="kueski-header-card">
          {product ? (
            <>
              <div className="flex items-center gap-1.5 mb-2 text-yellow-300 font-semibold text-xs">
                <Zap className="h-3.5 w-3.5 fill-yellow-300" />
                Mejor Opción · {selectedPeriods} quincenas a 0% interés
              </div>
              <div className="flex items-baseline gap-1.5 mb-1.5">
                <span className="text-2xl font-extrabold text-white leading-none">{formatCurrency(selectedOption.amount)}</span>
                <span className="text-white/70 text-xs">/ quincena</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70">
                  {product?.isCart ? 'Total carrito' : 'Total producto'}
                  <span className="font-bold text-white ml-1">{formatCurrency(price)}</span>
                </span>
                <Badge className="bg-[#54C08B] text-white hover:bg-[#54C08B] font-bold border-none px-2 py-0.5 text-[10px] shrink-0">
                  0% interés
                </Badge>
              </div>
              <p className="text-white/50 text-[10px] mt-1.5 truncate">{product.name}</p>
            </>
          ) : (
            <div className="flex items-center gap-2 text-white/70 text-xs">
              <ShoppingCart className="h-4 w-4 shrink-0" />
              <span>Navega a un producto para ver opciones de pago</span>
            </div>
          )}
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
                {kueskiUser ? formatCurrency(kueskiUser.creditAvailable) : '$ 1923'}
              </p>
              <div className="grid grid-cols-2 gap-3 border-t border-gray-700 pt-3">
                <div>
                  <p className="text-xs text-gray-400">Usado</p>
                  <p className="font-bold text-[#54C08B]">
                    {kueskiUser ? formatCurrency(kueskiUser.creditUsed) : '$ 782'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Límite</p>
                  <p className="font-bold">
                    {kueskiUser ? formatCurrency(kueskiUser.creditLimit) : '$ 7433'}
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
              {(() => {
                const supabaseDomains = new Set(merchants.map(m => m.domain));
                const extra = HARDCODED_STORES.filter(s => !supabaseDomains.has(s.domain));
                const allStores = [...merchants, ...extra];
                return allStores.map(m => (
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
                ));
              })()}
            </Card>
          </div>
        )}

        {/* ━━━ TAB: PAGO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {!loadingData && activeTab === 'pago' && !product && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <ShoppingCart className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-bold text-gray-500">Sin producto detectado</p>
            <p className="text-xs text-gray-400 max-w-[200px]">
              Navega a la página de un producto en una tienda en línea y abre el widget.
            </p>
          </div>
        )}
        {!loadingData && activeTab === 'pago' && !!product && (
          <>
            {payFlow === 'options' && (
              <div className="flex flex-col gap-3">
                {/* Producto individual */}
                {!product?.isCart && (
                  <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3 border border-blue-100">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 shrink-0">
                      <ShoppingCart className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{product?.name}</p>
                      <p className="text-xs text-gray-500">Precio: <strong className="text-[#0075FF]">{formatCurrency(price)}</strong></p>
                    </div>
                  </div>
                )}

                {/* Carrito de compras */}
                {product?.isCart && (
                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="h-4 w-4 text-[#0075FF]" />
                      <span className="text-xs font-bold text-gray-900">{product.name}</span>
                    </div>
                    {(product.cartItems ?? []).length > 0 && (
                      <div className="space-y-1 mb-2 max-h-[80px] overflow-y-auto styled-scrollbar">
                        {(product.cartItems ?? []).map((item, i) => (
                          <div key={i} className="flex justify-between text-[10px] text-gray-600">
                            <span className="truncate flex-1 mr-2">{item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}</span>
                            <span className="font-semibold shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between text-xs border-t border-blue-200 pt-1.5">
                      <span className="text-gray-500">Total carrito</span>
                      <strong className="text-[#0075FF]">{formatCurrency(price)}</strong>
                    </div>
                  </div>
                )}

                {/* Banner tarjeta digital para sitios no afiliados */}
                {product && !product.isPartner && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3">
                    <div className="bg-[#0075FF] p-1.5 rounded-lg shrink-0 mt-0.5">
                      <CreditCard className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-900 mb-0.5">Puedes pagar con tu tarjeta digital Kueski</p>
                      <p className="text-[10px] text-gray-500 leading-relaxed">Esta tienda no acepta Kueski Pay directamente. Usa tu tarjeta virtual en el checkout como si fuera una tarjeta de débito normal.</p>
                      <button onClick={() => setActiveTab('tarjeta')}
                        className="mt-1.5 text-[10px] font-bold text-[#0075FF] hover:underline">
                        Ver mi tarjeta →
                      </button>
                    </div>
                  </div>
                )}

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
                        <div className="text-[10px] text-[#54C08B] font-bold">0% interés</div>
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
                  <h3 className="font-bold text-base text-gray-900">Confirma tu solicitud</h3>
                  <p className="text-xs text-gray-500">Autorizas usar tu crédito Kueski para esta compra.</p>
                </div>

                <div className="bg-[#0075FF]/8 border border-[#0075FF]/20 rounded-xl p-3 text-xs text-[#0050CC] font-medium">
                  Plan: <strong>{selectedPeriods} quincenas de {formatCurrency(selectedOption.amount)}</strong>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Usuario</span>
                    <span className="font-bold text-gray-900">{kueskiUser?.fullName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Correo</span>
                    <span className="font-bold text-gray-900">{kueskiUser?.email}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-gray-200 pt-2">
                    <span className="text-gray-500">Crédito Disponible</span>
                    <span className="font-bold text-[#0075FF]">{kueskiUser ? formatCurrency(kueskiUser.creditAvailable) : ''}</span>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-[9px] text-gray-500 leading-tight">
                  <Check className="h-3 w-3 text-green-500 inline mr-1" />
                  La compra se descontará de tu límite de crédito en Kueski Pay.
                </div>

                <div className="flex gap-2 mt-1">
                  <Button variant="outline" onClick={() => setPayFlow('options')} className="flex-1 h-10 text-xs rounded-xl">Atrás</Button>
                  <Button onClick={handleVerify} className="flex-1 h-10 bg-[#0075FF] hover:bg-[#0050CC] text-white text-xs font-bold rounded-xl">
                    Autorizar pago
                  </Button>
                </div>
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
                  <CheckCircle className="h-12 w-12 text-[#54C08B]" />
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
                    <div className="flex justify-between"><span>Intereses</span><strong className="text-[#54C08B]">$0.00</strong></div>
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
        {!loadingData && activeTab === 'precios' && !product && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <TrendingDown className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-bold text-gray-500">Sin producto detectado</p>
            <p className="text-xs text-gray-400 max-w-[200px]">
              Abre el widget desde la página de un producto para comparar precios entre tiendas.
            </p>
          </div>
        )}
        {!loadingData && activeTab === 'precios' && !!product && (
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
                        <p className="font-semibold text-[#54C08B]">{item.cashback}</p>
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

            {(() => {
              const visiblePromos = promotions.length > 0 ? promotions : FALLBACK_PROMOS;
              return visiblePromos.map((promo) => (
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
            ));
            })()}
          </div>
        )}

        {/* ━━━ TAB: TARJETA VIRTUAL (Kueski Cast) ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {!loadingData && activeTab === 'tarjeta' && (() => {
          const CARD_NUMBER = '5572 1234 5678 9012';
          const CARD_EXPIRY = '12/28';
          const circ = 2 * Math.PI * 9;
          return (
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-sm text-gray-900">Kueski Cast</h3>
                <p className="text-[10px] text-gray-400">Úsala en cualquier tienda como si fuera una tarjeta de débito</p>
              </div>

              {/* ── Tarjeta visual ─────────────────────────────────────── */}
              <div className="relative rounded-2xl overflow-hidden shadow-xl"
                style={{ height: 200, background: 'linear-gradient(135deg, #0E1214 0%, #1a2d3d 60%, #0E1214 100%)' }}>

                {/* Glow verde superior-derecha */}
                <div className="absolute rounded-full pointer-events-none"
                  style={{ width: 200, height: 200, top: -80, right: -60,
                    background: 'radial-gradient(circle, rgba(0,229,155,0.25) 0%, transparent 70%)' }} />
                {/* Glow azul inferior-izquierda */}
                <div className="absolute rounded-full pointer-events-none"
                  style={{ width: 160, height: 160, bottom: -60, left: -40,
                    background: 'radial-gradient(circle, rgba(0,117,255,0.2) 0%, transparent 70%)' }} />
                {/* Línea gradiente decorativa */}
                <div className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, #00E59B, #0075FF, transparent)' }} />

                <div className="relative z-10 p-5 h-full flex flex-col justify-between">
                  {/* Header: logo + badge */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="bg-white/10 backdrop-blur-sm p-1 rounded-md border border-white/10">
                        <img src={kueskiLogo} className="h-4 w-4" alt="" />
                      </div>
                      <span className="font-bold text-white text-sm tracking-wide">Kueski</span>
                    </div>
                    <span className="text-[9px] font-bold tracking-[2px] uppercase border border-white/20 text-white/50 px-2 py-0.5 rounded-full">
                      VIRTUAL
                    </span>
                  </div>

                  {/* Chip + número */}
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-8 h-5 rounded"
                        style={{ background: 'linear-gradient(135deg, #f6d365, #fda085)' }} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-white font-bold tracking-[2px] text-[15px]">
                        {CARD_NUMBER}
                      </span>
                      <button onClick={() => handleCopy(CARD_NUMBER)} title="Copiar número"
                        className="shrink-0 text-white/40 hover:text-[#00E59B] transition-colors">
                        {copiedCode === CARD_NUMBER
                          ? <Check className="h-4 w-4 text-[#00E59B]" />
                          : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Footer: nombre + vence + CVV */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[8px] text-white/35 uppercase tracking-widest mb-0.5">Titular</p>
                      <p className="text-xs font-bold text-white">{kueskiUser?.fullName || 'Usuario Kueski'}</p>
                    </div>
                    <div className="flex gap-5 items-end">
                      <div>
                        <p className="text-[8px] text-white/35 uppercase tracking-widest mb-0.5">Vence</p>
                        <p className="font-mono text-sm font-bold text-white">{CARD_EXPIRY}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-white/35 uppercase tracking-widest mb-0.5">CVV</p>
                        <div className="flex items-center gap-1.5">
                          <p className="font-mono text-sm font-bold text-white">{cvv}</p>
                          <svg width="18" height="18" viewBox="0 0 24 24" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
                            <circle cx="12" cy="12" r="9" fill="none" stroke="#00E59B" strokeWidth="2.5"
                              strokeLinecap="round" strokeDasharray={circ}
                              strokeDashoffset={circ * (1 - cvvTick / 30)} />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Botones de copia rápida ─────────────────────────── */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Número', value: CARD_NUMBER, id: CARD_NUMBER },
                  { label: 'Vencimiento', value: CARD_EXPIRY, id: CARD_EXPIRY },
                  { label: 'CVV', value: cvv, id: cvv },
                ].map(f => (
                  <button key={f.label} onClick={() => handleCopy(f.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-3 border transition-all text-center ${
                      copiedCode === f.id
                        ? 'bg-green-50 border-green-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-[#f0fdf9] hover:border-[#00E59B]'
                    }`}>
                    {copiedCode === f.id
                      ? <Check className="h-4 w-4 text-green-500" />
                      : <Copy className="h-4 w-4 text-[#0075FF]" />}
                    <span className={`text-[9px] font-bold ${copiedCode === f.id ? 'text-green-600' : 'text-gray-500'}`}>
                      {copiedCode === f.id ? '¡Copiado!' : f.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* ── Info ───────────────────────────────────────────── */}
              <div className="rounded-xl p-3 border text-xs flex items-start gap-2"
                style={{ background: 'linear-gradient(135deg, rgba(0,229,155,0.06), rgba(0,117,255,0.06))', borderColor: 'rgba(0,229,155,0.25)' }}>
                <Info className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#00E59B' }} />
                <p className="text-gray-600 leading-relaxed">
                  Copia cada dato con los botones y pégalo en el formulario de la tienda. El CVV se renueva cada 30 segundos.
                  Crédito disponible: <strong className="text-[#0075FF]">{kueskiUser ? formatCurrency(kueskiUser.creditAvailable) : '—'}</strong>.
                </p>
              </div>
            </div>
          );
        })()}
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