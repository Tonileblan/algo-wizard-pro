-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_tier text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  ai_generations_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_plan_tier_check CHECK (plan_tier IN ('free','pro','elite')),
  CONSTRAINT subscriptions_status_check CHECK (status IN ('active','canceled','past_due'))
);
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own subscription" ON public.subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI generated strategies
CREATE TABLE public.ai_generated_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_original text NOT NULL,
  ai_model_used text NOT NULL,
  generated_logic jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_generated_strategies_user_idx ON public.ai_generated_strategies (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_generated_strategies TO authenticated;
GRANT ALL ON public.ai_generated_strategies TO service_role;
ALTER TABLE public.ai_generated_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own strategies" ON public.ai_generated_strategies FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Advanced backtests
CREATE TABLE public.advanced_backtests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid REFERENCES public.ai_generated_strategies(id) ON DELETE SET NULL,
  symbol text NOT NULL,
  interval text NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  friction jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  equity_curve jsonb NOT NULL DEFAULT '[]'::jsonb,
  trade_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX advanced_backtests_user_idx ON public.advanced_backtests (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advanced_backtests TO authenticated;
GRANT ALL ON public.advanced_backtests TO service_role;
ALTER TABLE public.advanced_backtests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own backtests" ON public.advanced_backtests FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Market data cache
CREATE TABLE public.market_candles (
  symbol text NOT NULL,
  interval text NOT NULL,
  ts timestamptz NOT NULL,
  open double precision NOT NULL,
  high double precision NOT NULL,
  low double precision NOT NULL,
  close double precision NOT NULL,
  volume double precision NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'provider',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (symbol, interval, ts)
);
GRANT SELECT ON public.market_candles TO anon, authenticated;
GRANT ALL ON public.market_candles TO service_role;
ALTER TABLE public.market_candles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "market candles are public" ON public.market_candles FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER subscriptions_touch BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();