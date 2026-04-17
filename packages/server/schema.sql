-- DB Schema based on user requirements

CREATE TABLE merchants (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL DEFAULT '',
    category VARCHAR(255) DEFAULT '',
    domain VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT false,
    cashback_percent NUMERIC(5,2) DEFAULT 0,
    logo_url VARCHAR(500) DEFAULT '',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
COMMENT ON TABLE merchants IS 'Paginas que acepta Kueski Pay';

CREATE TABLE promotions (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(uid),
    code VARCHAR(255) DEFAULT '',
    description VARCHAR(580) DEFAULT '',
    discount_type VARCHAR(50) NOT NULL DEFAULT '',
    discount_value NUMERIC(10,2) DEFAULT 0,
    expires_at TIMESTAMP,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
COMMENT ON TABLE promotions IS 'Promociones por tienda';

CREATE TABLE blacklist (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) NOT NULL UNIQUE,
    reason VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT now()
);
COMMENT ON TABLE blacklist IS 'Dominios maliciosos o phishing';

-- SIMULADOR PARA USUARIOS KUESKI

CREATE TABLE kueski_users (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    credit_limit DECIMAL(10,2) NOT NULL DEFAULT 0,
    credit_used DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_installments INT NOT NULL DEFAULT 8,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
COMMENT ON TABLE kueski_users IS 'Usuarios simulados de Kueski Pay. Simula la API que Kueski nos daria.';
