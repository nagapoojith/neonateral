CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: alert_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alert_type AS ENUM (
    'normal',
    'high',
    'critical'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'doctor',
    'nurse',
    'senior_doctor'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'full_name', 'User'), new.email);
  RETURN new;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


SET default_table_access_method = heap;

--
-- Name: alert_acknowledgements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_acknowledgements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT alert_acknowledgements_action_check CHECK ((action = ANY (ARRAY['acknowledged'::text, 'escalated'::text, 'missed'::text])))
);


--
-- Name: alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    baby_id uuid NOT NULL,
    alert_type public.alert_type NOT NULL,
    message text NOT NULL,
    is_acknowledged boolean DEFAULT false,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    escalation_level integer DEFAULT 0,
    escalated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: babies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.babies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    baby_name text NOT NULL,
    bed_number text NOT NULL,
    date_of_birth timestamp with time zone NOT NULL,
    parent_names text NOT NULL,
    parent_contact text NOT NULL,
    status text DEFAULT 'normal'::text,
    registered_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT babies_status_check CHECK ((status = ANY (ARRAY['normal'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: behavior_baselines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.behavior_baselines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    baby_id uuid NOT NULL,
    avg_heart_rate numeric(5,2),
    avg_spo2 numeric(5,2),
    avg_temperature numeric(4,2),
    avg_movement numeric(5,2),
    learning_started_at timestamp with time zone DEFAULT now() NOT NULL,
    is_baseline_complete boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);


--
-- Name: vitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vitals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    baby_id uuid NOT NULL,
    heart_rate integer NOT NULL,
    spo2 numeric(5,2) NOT NULL,
    temperature numeric(4,2) NOT NULL,
    movement integer DEFAULT 0,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: alert_acknowledgements alert_acknowledgements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_acknowledgements
    ADD CONSTRAINT alert_acknowledgements_pkey PRIMARY KEY (id);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: babies babies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.babies
    ADD CONSTRAINT babies_pkey PRIMARY KEY (id);


--
-- Name: behavior_baselines behavior_baselines_baby_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.behavior_baselines
    ADD CONSTRAINT behavior_baselines_baby_id_key UNIQUE (baby_id);


--
-- Name: behavior_baselines behavior_baselines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.behavior_baselines
    ADD CONSTRAINT behavior_baselines_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: vitals vitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_pkey PRIMARY KEY (id);


--
-- Name: alert_acknowledgements alert_acknowledgements_alert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_acknowledgements
    ADD CONSTRAINT alert_acknowledgements_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.alerts(id) ON DELETE CASCADE;


--
-- Name: alert_acknowledgements alert_acknowledgements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_acknowledgements
    ADD CONSTRAINT alert_acknowledgements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: alerts alerts_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id);


--
-- Name: alerts alerts_baby_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_baby_id_fkey FOREIGN KEY (baby_id) REFERENCES public.babies(id) ON DELETE CASCADE;


--
-- Name: babies babies_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.babies
    ADD CONSTRAINT babies_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES auth.users(id);


--
-- Name: behavior_baselines behavior_baselines_baby_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.behavior_baselines
    ADD CONSTRAINT behavior_baselines_baby_id_fkey FOREIGN KEY (baby_id) REFERENCES public.babies(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: vitals vitals_baby_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_baby_id_fkey FOREIGN KEY (baby_id) REFERENCES public.babies(id) ON DELETE CASCADE;


--
-- Name: alert_acknowledgements Authenticated users can insert acknowledgements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert acknowledgements" ON public.alert_acknowledgements FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: alerts Authenticated users can insert alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: behavior_baselines Authenticated users can insert baselines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert baselines" ON public.behavior_baselines FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: vitals Authenticated users can insert vitals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert vitals" ON public.vitals FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: alerts Authenticated users can update alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update alerts" ON public.alerts FOR UPDATE TO authenticated USING (true);


--
-- Name: behavior_baselines Authenticated users can update baselines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update baselines" ON public.behavior_baselines FOR UPDATE TO authenticated USING (true);


--
-- Name: alert_acknowledgements Authenticated users can view acknowledgements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view acknowledgements" ON public.alert_acknowledgements FOR SELECT TO authenticated USING (true);


--
-- Name: alerts Authenticated users can view alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view alerts" ON public.alerts FOR SELECT TO authenticated USING (true);


--
-- Name: babies Authenticated users can view babies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view babies" ON public.babies FOR SELECT TO authenticated USING (true);


--
-- Name: behavior_baselines Authenticated users can view baselines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view baselines" ON public.behavior_baselines FOR SELECT TO authenticated USING (true);


--
-- Name: vitals Authenticated users can view vitals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view vitals" ON public.vitals FOR SELECT TO authenticated USING (true);


--
-- Name: babies Doctors can insert babies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Doctors can insert babies" ON public.babies FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'doctor'::public.app_role) OR public.has_role(auth.uid(), 'senior_doctor'::public.app_role)));


--
-- Name: babies Doctors can update babies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Doctors can update babies" ON public.babies FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'doctor'::public.app_role) OR public.has_role(auth.uid(), 'senior_doctor'::public.app_role)));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_roles Users can insert own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: alert_acknowledgements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alert_acknowledgements ENABLE ROW LEVEL SECURITY;

--
-- Name: alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: babies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.babies ENABLE ROW LEVEL SECURITY;

--
-- Name: behavior_baselines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.behavior_baselines ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: vitals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;