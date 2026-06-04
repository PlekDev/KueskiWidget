-- ─────────────────────────────────────────────────────────────────────────────
-- Seed de usuarios de prueba para kueski_users
-- Cada fila representa un estado distinto de historial crediticio.
-- El "historial" se deriva de: credit_limit, credit_used (disponible = limit - used)
-- y max_installments. No hay columna de score.
--
-- IMPORTANTE: para que el widget muestre a un usuario, además de esta fila debe
-- existir una cuenta en Authentication → Users con el MISMO email (y is_active=true).
-- El popup cruza el email de la sesión de Supabase Auth contra esta tabla.
--
-- Idempotente: se puede correr varias veces (ON CONFLICT por email).
-- Correr en: Supabase → SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO kueski_users
  (email, first_name, last_name, credit_limit, credit_used, max_installments, is_active)
VALUES
  -- 1. EXCELENTE: historial impecable, casi sin usar, máximo de quincenas
  ('excelente@kueski.test',  'Ana',     'Reyes',     50000, 0,     12, true),

  -- 2. BUENO: buen historial, uso moderado (~17%)
  ('bueno@kueski.test',      'Carlos',  'Mendoza',   30000, 5000,  8,  true),

  -- 3. REGULAR: uso medio (~60%), quincenas intermedias
  ('regular@kueski.test',    'Lucia',   'Hernandez', 15000, 9000,  6,  true),

  -- 4. LIMITADO: muy endeudado, casi al tope (~90%), pocas quincenas
  ('limitado@kueski.test',   'Jorge',   'Ramirez',   8000,  7200,  4,  true),

  -- 5. SIN CRÉDITO: al 100%, disponible = 0 (no podrá comprar)
  ('topado@kueski.test',     'Marina',  'Flores',    10000, 10000, 4,  true),

  -- 6. NUEVO: sin historial, límite inicial bajo, nada usado
  ('nuevo@kueski.test',      'Diego',   'Lopez',     5000,  0,     3,  true),

  -- 7. SUSPENDIDO / MOROSO: is_active = false → el widget NO lo carga
  ('suspendido@kueski.test', 'Pedro',   'Gomez',     20000, 18000, 6,  false)

ON CONFLICT (email) DO UPDATE SET
  first_name       = EXCLUDED.first_name,
  last_name        = EXCLUDED.last_name,
  credit_limit     = EXCLUDED.credit_limit,
  credit_used      = EXCLUDED.credit_used,
  max_installments = EXCLUDED.max_installments,
  is_active        = EXCLUDED.is_active,
  updated_at       = now();

-- Verificación: disponible calculado por usuario
SELECT
  email,
  first_name || ' ' || last_name AS nombre,
  credit_limit                   AS limite,
  credit_used                    AS usado,
  credit_limit - credit_used     AS disponible,
  max_installments               AS quincenas,
  is_active                      AS activo
FROM kueski_users
ORDER BY credit_limit DESC;
