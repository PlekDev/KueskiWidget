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