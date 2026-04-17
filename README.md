# KueskiWidget

Chrome/Firefox/Edge extension tipo widget financiero (Kueski Pay style).

## Stack

- **Extension:** TypeScript + React + WXT + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **DB:** Supabase (PostgreSQL)
- **Auth:** Auth0 (PKCE flow)
- **Package manager:** pnpm (NO usar npm ni yarn)

## Setup

```bash
# 1. Clonar
git clone git@github.com:ORG/KueskiWidget.git
cd KueskiWidget

# 2. Instalar pnpm si no lo tienes
curl -fsSL https://get.pnpm.io/install.sh | sh -

en caso de windows usa estos desde el poweshell te lo intala igual 
npm install -g pnpm

# 3. Instalar dependencias (desde la raiz, siempre)
pnpm install
```

## Desarrollo

Correr la extension segun tu browser:

```bash
# Firefox
pnpm --filter kueski-extension dev:firefox

# Chrome
pnpm --filter kueski-extension dev:chrome

# Edge (usa el de Chrome, es Chromium)
pnpm --filter kueski-extension dev:chrome
```

Correr el backend:

```bash
pnpm --filter kueski-server dev
```

## Build

```bash
pnpm --filter kueski-extension build:firefox
pnpm --filter kueski-extension build:chrome
```

Output queda en `packages/extension/.output/`.

## Estructura

```
packages/
  extension/   → widget (WXT + React)
  server/      → API (Express + TS)
  shared/      → tipos compartidos
```

## Reglas

- Siempre usar `pnpm`, nunca `npm install`
- Instalar dependencias desde la raiz: `pnpm --filter <package> add <dep>`
- No commitear `node_modules/`, `.output/`, ni `.wxt/`


## problemas con chrome en windows solucion :D

## Troubleshooting

### Windows: error `Invalid regular expression` con WXT

Si tu carpeta de usuario tiene caracteres especiales (paréntesis, espacios, etc.), WXT falla al construir rutas internas. Ejemplo de ruta problemática:


**Solución:** mover el proyecto a una ruta limpia sin caracteres especiales.

```powershell
mkdir C:\Dev
xcopy /E /I "C:\Users\TU_USUARIO\Desktop\KueskiWidget" "C:\Dev\KueskiWidget"
cd C:\Dev\KueskiWidget
pnpm install
pnpm --filter kueski-extension dev:chrome
```

Rutas recomendadas en Windows: `C:\Dev\`, `C:\Projects\`



