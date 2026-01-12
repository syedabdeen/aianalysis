CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
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
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'manager',
    'buyer',
    'approver',
    'viewer'
);


--
-- Name: approval_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_category AS ENUM (
    'purchase_request',
    'purchase_order',
    'contracts',
    'capex',
    'payments',
    'float_cash'
);


--
-- Name: approval_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'escalated',
    'auto_approved'
);


--
-- Name: budget_transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.budget_transaction_type AS ENUM (
    'allocation',
    'commitment',
    'expense',
    'refund'
);


--
-- Name: goods_receipt_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.goods_receipt_status AS ENUM (
    'pending',
    'partial',
    'complete'
);


--
-- Name: milestone_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.milestone_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'delayed'
);


--
-- Name: override_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.override_type AS ENUM (
    'emergency_purchase',
    'single_source_justification',
    'capex_special',
    'float_cash_replenishment',
    'budget_override'
);


--
-- Name: petty_cash_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.petty_cash_status AS ENUM (
    'draft',
    'pending_gm_approval',
    'approved_pending_payment',
    'paid',
    'rejected'
);


--
-- Name: procurement_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.procurement_status AS ENUM (
    'draft',
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'cancelled',
    'completed'
);


--
-- Name: procurement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.procurement_type AS ENUM (
    'material',
    'service',
    'subcontract'
);


--
-- Name: project_alert_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_alert_type AS ENUM (
    'budget_warning',
    'budget_exceeded',
    'timeline_warning',
    'timeline_exceeded'
);


--
-- Name: project_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_status AS ENUM (
    'draft',
    'active',
    'on_hold',
    'completed',
    'cancelled'
);


--
-- Name: project_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_type AS ENUM (
    'construction',
    'maintenance',
    'capex',
    'service'
);


--
-- Name: quality_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quality_status AS ENUM (
    'pending',
    'passed',
    'failed',
    'partial'
);


--
-- Name: stock_movement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stock_movement_type AS ENUM (
    'goods_receipt',
    'issue',
    'adjustment',
    'transfer',
    'return'
);


--
-- Name: variation_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.variation_type AS ENUM (
    'addition',
    'deduction',
    'scope_change'
);


--
-- Name: vendor_document_classification; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vendor_document_classification AS ENUM (
    'trade_license',
    'establishment_card',
    'vat_certificate',
    'insurance',
    'bank_details',
    'compliance_certificate',
    'quality_certification',
    'identity_document',
    'contract_agreement',
    'miscellaneous'
);


--
-- Name: vendor_document_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vendor_document_type AS ENUM (
    'trade_license',
    'tax_certificate',
    'bank_letter',
    'insurance',
    'other'
);


--
-- Name: vendor_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vendor_status AS ENUM (
    'pending',
    'approved',
    'suspended',
    'blacklisted'
);


--
-- Name: vendor_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vendor_type AS ENUM (
    'material',
    'service',
    'subcontractor'
);


--
-- Name: apply_variation_to_budget(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_variation_to_budget() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        UPDATE public.projects
        SET revised_budget = CASE 
            WHEN NEW.variation_type = 'addition' THEN COALESCE(revised_budget, original_budget) + NEW.amount
            WHEN NEW.variation_type = 'deduction' THEN COALESCE(revised_budget, original_budget) - NEW.amount
            ELSE COALESCE(revised_budget, original_budget)
        END
        WHERE id = NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: check_low_stock_alert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_low_stock_alert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF NEW.current_stock < NEW.min_stock_level AND NEW.current_stock != OLD.current_stock THEN
        INSERT INTO public.project_alerts (
            project_id,
            alert_type,
            current_value,
            threshold_percentage,
            message_en,
            message_ar
        )
        SELECT 
            p.id,
            'budget_warning'::project_alert_type,
            NEW.current_stock,
            (NEW.current_stock / NULLIF(NEW.min_stock_level, 0) * 100)::integer,
            'Low stock alert for ' || NEW.name_en || ': ' || NEW.current_stock || ' ' || NEW.unit || ' remaining',
            'تنبيه انخفاض المخزون لـ ' || NEW.name_ar || ': ' || NEW.current_stock || ' ' || NEW.unit || ' متبقي'
        FROM public.projects p
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: check_project_alerts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_project_alerts() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    budget_percentage NUMERIC;
    days_remaining INTEGER;
BEGIN
    -- Calculate budget consumption percentage
    IF NEW.revised_budget > 0 THEN
        budget_percentage := ((NEW.budget_committed + NEW.budget_consumed) / NEW.revised_budget) * 100;
    ELSE
        budget_percentage := ((NEW.budget_committed + NEW.budget_consumed) / NULLIF(NEW.original_budget, 0)) * 100;
    END IF;
    
    -- Budget alerts
    IF budget_percentage >= 100 THEN
        INSERT INTO public.project_alerts (project_id, alert_type, threshold_percentage, current_value, message_en, message_ar)
        VALUES (NEW.id, 'budget_exceeded', 100, budget_percentage, 
                'Project budget has been exceeded', 'تم تجاوز ميزانية المشروع')
        ON CONFLICT DO NOTHING;
    ELSIF budget_percentage >= 90 THEN
        INSERT INTO public.project_alerts (project_id, alert_type, threshold_percentage, current_value, message_en, message_ar)
        VALUES (NEW.id, 'budget_warning', 90, budget_percentage,
                'Project budget is at 90% utilization', 'وصلت ميزانية المشروع إلى 90%')
        ON CONFLICT DO NOTHING;
    ELSIF budget_percentage >= 75 THEN
        INSERT INTO public.project_alerts (project_id, alert_type, threshold_percentage, current_value, message_en, message_ar)
        VALUES (NEW.id, 'budget_warning', 75, budget_percentage,
                'Project budget is at 75% utilization', 'وصلت ميزانية المشروع إلى 75%')
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Timeline alerts
    IF NEW.end_date IS NOT NULL AND NEW.status NOT IN ('completed', 'cancelled') THEN
        days_remaining := NEW.end_date - CURRENT_DATE;
        
        IF days_remaining < 0 THEN
            INSERT INTO public.project_alerts (project_id, alert_type, current_value, message_en, message_ar)
            VALUES (NEW.id, 'timeline_exceeded', days_remaining,
                    'Project timeline has been exceeded', 'تم تجاوز الجدول الزمني للمشروع')
            ON CONFLICT DO NOTHING;
        ELSIF days_remaining <= 7 THEN
            INSERT INTO public.project_alerts (project_id, alert_type, current_value, message_en, message_ar)
            VALUES (NEW.id, 'timeline_warning', days_remaining,
                    'Project deadline is within 7 days', 'الموعد النهائي للمشروع خلال 7 أيام')
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: check_trade_license_expiry(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_trade_license_expiry() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  company RECORD;
  days_until_expiry INTEGER;
BEGIN
  FOR company IN SELECT * FROM company_settings LOOP
    days_until_expiry := company.trade_license_expiry - CURRENT_DATE;
    
    IF days_until_expiry <= 15 AND days_until_expiry > 0 THEN
      -- Insert notification for admin (we'll handle this through the app)
      INSERT INTO project_alerts (
        project_id,
        alert_type,
        message_en,
        message_ar,
        threshold_percentage,
        current_value
      )
      SELECT 
        p.id,
        'budget_warning'::project_alert_type,
        'Trade License expires in ' || days_until_expiry || ' days',
        'تنتهي صلاحية الرخصة التجارية خلال ' || days_until_expiry || ' يوم',
        15,
        days_until_expiry
      FROM projects p
      LIMIT 1;
    END IF;
  END LOOP;
END;
$$;


--
-- Name: create_matrix_snapshot(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_matrix_snapshot(_change_summary text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _version_id uuid;
  _version_number integer;
  _snapshot jsonb;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO _version_number
  FROM public.approval_matrix_versions;
  
  SELECT jsonb_build_object(
    'rules', (SELECT jsonb_agg(row_to_json(r)) FROM public.approval_rules r WHERE is_active = true),
    'roles', (SELECT jsonb_agg(row_to_json(ro)) FROM public.approval_roles ro WHERE is_active = true),
    'overrides', (SELECT jsonb_agg(row_to_json(o)) FROM public.approval_overrides o WHERE is_active = true),
    'approvers', (SELECT jsonb_agg(row_to_json(a)) FROM public.approval_rule_approvers a)
  ) INTO _snapshot;
  
  INSERT INTO public.approval_matrix_versions (version_number, snapshot, change_summary, changed_by)
  VALUES (_version_number, _snapshot, _change_summary, auth.uid())
  RETURNING id INTO _version_id;
  
  RETURN _version_id;
END;
$$;


--
-- Name: find_approval_rule(public.approval_category, numeric, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_approval_rule(_category public.approval_category, _amount numeric, _department_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _rule_id uuid;
BEGIN
  SELECT id INTO _rule_id
  FROM public.approval_rules
  WHERE category = _category
    AND is_active = true
    AND _amount >= min_amount
    AND (_amount <= max_amount OR max_amount IS NULL)
    AND (department_id = _department_id OR department_id IS NULL)
  ORDER BY 
    CASE WHEN department_id IS NOT NULL THEN 0 ELSE 1 END,
    min_amount DESC
  LIMIT 1;
  
  RETURN _rule_id;
END;
$$;


--
-- Name: generate_document_expiry_alerts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_document_expiry_alerts() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Only generate alerts if document has expiry date
    IF NEW.expiry_date IS NOT NULL THEN
        -- Delete existing alerts for this document
        DELETE FROM public.vendor_document_alerts WHERE document_id = NEW.id;
        
        -- Create 30 days alert
        IF NEW.expiry_date - INTERVAL '30 days' > now() THEN
            INSERT INTO public.vendor_document_alerts (vendor_id, document_id, alert_type, alert_date)
            VALUES (NEW.vendor_id, NEW.id, '30_days', NEW.expiry_date - INTERVAL '30 days');
        END IF;
        
        -- Create 15 days alert
        IF NEW.expiry_date - INTERVAL '15 days' > now() THEN
            INSERT INTO public.vendor_document_alerts (vendor_id, document_id, alert_type, alert_date)
            VALUES (NEW.vendor_id, NEW.id, '15_days', NEW.expiry_date - INTERVAL '15 days');
        END IF;
        
        -- Create 7 days alert
        IF NEW.expiry_date - INTERVAL '7 days' > now() THEN
            INSERT INTO public.vendor_document_alerts (vendor_id, document_id, alert_type, alert_date)
            VALUES (NEW.vendor_id, NEW.id, '7_days', NEW.expiry_date - INTERVAL '7 days');
        END IF;
        
        -- Create expired alert if already expired
        IF NEW.expiry_date <= now()::date THEN
            INSERT INTO public.vendor_document_alerts (vendor_id, document_id, alert_type, alert_date)
            VALUES (NEW.vendor_id, NEW.id, 'expired', NEW.expiry_date);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: get_category_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_category_code(_name text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    _current INTEGER;
    _cat_prefix TEXT;
    _result TEXT;
BEGIN
    -- Get first 4 letters of category name
    _cat_prefix := UPPER(LEFT(regexp_replace(_name, '[^a-zA-Z]', '', 'g'), 4));
    
    -- Ensure we have at least 2 characters
    IF LENGTH(_cat_prefix) < 2 THEN
        _cat_prefix := 'CAT';
    END IF;
    
    -- Get and increment the counter for this category prefix
    UPDATE public.sequence_counters
    SET current_value = current_value + 1,
        updated_at = now()
    WHERE prefix = 'CAT-' || _cat_prefix
    RETURNING current_value INTO _current;
    
    -- If no counter exists, create one
    IF _current IS NULL THEN
        INSERT INTO public.sequence_counters (prefix, current_value, format_pattern)
        VALUES ('CAT-' || _cat_prefix, 1, '000')
        RETURNING current_value INTO _current;
    END IF;
    
    -- Format: CHEM-001
    _result := _cat_prefix || '-' || lpad(_current::TEXT, 3, '0');
    
    RETURN _result;
END;
$$;


--
-- Name: get_cost_center_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_cost_center_code(_name text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    _current INTEGER;
    _cc_prefix TEXT;
    _result TEXT;
BEGIN
    -- Get first 3 letters of cost center name
    _cc_prefix := UPPER(LEFT(regexp_replace(_name, '[^a-zA-Z]', '', 'g'), 3));
    
    -- Ensure we have at least 2 characters
    IF LENGTH(_cc_prefix) < 2 THEN
        _cc_prefix := 'CC';
    END IF;
    
    -- Get and increment the counter for this cost center prefix
    UPDATE public.sequence_counters
    SET current_value = current_value + 1,
        updated_at = now()
    WHERE prefix = 'CC-' || _cc_prefix
    RETURNING current_value INTO _current;
    
    -- If no counter exists, create one
    IF _current IS NULL THEN
        INSERT INTO public.sequence_counters (prefix, current_value, format_pattern)
        VALUES ('CC-' || _cc_prefix, 1, '000')
        RETURNING current_value INTO _current;
    END IF;
    
    -- Format: CC-FIN-001
    _result := 'CC-' || _cc_prefix || '-' || lpad(_current::TEXT, 3, '0');
    
    RETURN _result;
END;
$$;


--
-- Name: get_department_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_department_code(_name text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    _current INTEGER;
    _dept_prefix TEXT;
    _result TEXT;
BEGIN
    -- Get first 3 letters of department name
    _dept_prefix := UPPER(LEFT(regexp_replace(_name, '[^a-zA-Z]', '', 'g'), 3));
    
    -- Get and increment the counter for this department prefix
    UPDATE public.sequence_counters
    SET current_value = current_value + 1,
        updated_at = now()
    WHERE prefix = 'DEPT-' || _dept_prefix
    RETURNING current_value INTO _current;
    
    -- If no counter exists, create one
    IF _current IS NULL THEN
        INSERT INTO public.sequence_counters (prefix, current_value, format_pattern)
        VALUES ('DEPT-' || _dept_prefix, 1, '000')
        RETURNING current_value INTO _current;
    END IF;
    
    -- Format: FIN-001
    _result := _dept_prefix || '-' || lpad(_current::TEXT, 3, '0');
    
    RETURN _result;
END;
$$;


--
-- Name: get_material_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_material_code(_category_code text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    _current INTEGER;
    _prefix TEXT;
    _cat_prefix TEXT;
    _result TEXT;
BEGIN
    -- Generate 3-letter system prefix
    _prefix := 'PMD'; -- ProcureMind prefix
    
    -- Get first 3 letters of category or use 'GEN' as default
    _cat_prefix := UPPER(COALESCE(LEFT(_category_code, 3), 'GEN'));
    
    -- Get and increment the counter for this category
    UPDATE public.sequence_counters
    SET current_value = current_value + 1,
        updated_at = now()
    WHERE prefix = 'MAT-' || _cat_prefix
    RETURNING current_value INTO _current;
    
    -- If no counter exists, create one
    IF _current IS NULL THEN
        INSERT INTO public.sequence_counters (prefix, current_value, format_pattern)
        VALUES ('MAT-' || _cat_prefix, 1, '000')
        RETURNING current_value INTO _current;
    END IF;
    
    -- Format: PMD-CAT-001
    _result := _prefix || '-' || _cat_prefix || '-' || lpad(_current::TEXT, 3, '0');
    
    RETURN _result;
END;
$$;


--
-- Name: get_new_material_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_new_material_code(_category_name text DEFAULT NULL::text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    _current INTEGER;
    _cat_prefix TEXT;
    _result TEXT;
BEGIN
    -- Get first 3 letters of category or use 'GEN' as default
    IF _category_name IS NOT NULL AND LENGTH(_category_name) > 0 THEN
        _cat_prefix := UPPER(LEFT(regexp_replace(_category_name, '[^a-zA-Z]', '', 'g'), 3));
    ELSE
        _cat_prefix := 'GEN';
    END IF;
    
    -- Ensure we have exactly 3 characters
    IF LENGTH(_cat_prefix) < 3 THEN
        _cat_prefix := _cat_prefix || REPEAT('X', 3 - LENGTH(_cat_prefix));
    END IF;
    
    -- Get and increment the global material counter (starts from 100001)
    UPDATE public.sequence_counters
    SET current_value = current_value + 1,
        updated_at = now()
    WHERE prefix = 'MAT-GLOBAL'
    RETURNING current_value INTO _current;
    
    -- If no counter exists, create one starting at 100001
    IF _current IS NULL THEN
        INSERT INTO public.sequence_counters (prefix, current_value, format_pattern)
        VALUES ('MAT-GLOBAL', 100001, '000000')
        RETURNING current_value INTO _current;
    END IF;
    
    -- Format: MAT + CAT(3) + 6-digit number (e.g., MATELE100001)
    _result := 'MAT' || _cat_prefix || lpad(_current::TEXT, 6, '0');
    
    RETURN _result;
END;
$$;


--
-- Name: get_next_sequence_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_sequence_code(_prefix text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    _current INTEGER;
    _pattern TEXT;
    _result TEXT;
BEGIN
    -- Get and increment the counter
    UPDATE public.sequence_counters
    SET current_value = current_value + 1,
        updated_at = now()
    WHERE prefix = _prefix
    RETURNING current_value, format_pattern INTO _current, _pattern;
    
    -- If no counter exists, create one
    IF _current IS NULL THEN
        INSERT INTO public.sequence_counters (prefix, current_value, format_pattern)
        VALUES (_prefix, 1, '0000')
        RETURNING current_value, format_pattern INTO _current, _pattern;
    END IF;
    
    -- Format the result
    _result := _prefix || '-' || lpad(_current::TEXT, length(_pattern), '0');
    
    RETURN _result;
END;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, trial_started_at, trial_expires_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        now(),
        now() + interval '7 days'
    );
    RETURN NEW;
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


--
-- Name: lock_approved_pr(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lock_approved_pr() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        NEW.is_locked := true;
        NEW.locked_at := now();
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: log_approval_audit(text, text, uuid, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_approval_audit(_action text, _entity_type text, _entity_id uuid, _old_values jsonb DEFAULT NULL::jsonb, _new_values jsonb DEFAULT NULL::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.approval_audit_logs (action, entity_type, entity_id, old_values, new_values, performed_by)
  VALUES (_action, _entity_type, _entity_id, _old_values, _new_values, auth.uid());
END;
$$;


--
-- Name: log_system_audit(text, text, uuid, text, jsonb, jsonb, text, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_system_audit(_action text, _entity_type text, _entity_id uuid, _entity_code text DEFAULT NULL::text, _old_values jsonb DEFAULT NULL::jsonb, _new_values jsonb DEFAULT NULL::jsonb, _justification text DEFAULT NULL::text, _is_exception boolean DEFAULT false, _exception_type text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    _user_name text;
    _user_role text;
BEGIN
    -- Get user details
    SELECT p.full_name INTO _user_name
    FROM public.profiles p
    WHERE p.id = auth.uid();
    
    SELECT ur.role::text INTO _user_role
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    LIMIT 1;
    
    INSERT INTO public.system_audit_logs (
        action, entity_type, entity_id, entity_code,
        old_values, new_values, justification,
        is_exception, exception_type,
        performed_by, user_name, user_role
    )
    VALUES (
        _action, _entity_type, _entity_id, _entity_code,
        _old_values, _new_values, _justification,
        _is_exception, _exception_type,
        auth.uid(), _user_name, _user_role
    );
END;
$$;


--
-- Name: process_goods_receipt(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_goods_receipt(_receipt_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    _po_id uuid;
    _item record;
    _total_ordered numeric;
    _total_received numeric;
BEGIN
    -- Get PO ID
    SELECT po_id INTO _po_id FROM public.goods_receipts WHERE id = _receipt_id;
    
    -- Process each receipt item
    FOR _item IN 
        SELECT gri.*, poi.quantity as po_quantity
        FROM public.goods_receipt_items gri
        JOIN public.purchase_order_items poi ON gri.po_item_id = poi.id
        WHERE gri.receipt_id = _receipt_id
    LOOP
        -- Update PO item received quantity
        UPDATE public.purchase_order_items
        SET received_quantity = received_quantity + _item.quantity_received
        WHERE id = _item.po_item_id;
        
        -- Create stock movement if linked to inventory item
        IF _item.inventory_item_id IS NOT NULL THEN
            INSERT INTO public.stock_movements (
                inventory_item_id,
                movement_type,
                quantity,
                balance_after,
                reference_type,
                reference_id,
                reference_code
            )
            SELECT 
                _item.inventory_item_id,
                'goods_receipt',
                _item.quantity_received,
                ii.current_stock + _item.quantity_received,
                'GRN',
                _receipt_id,
                gr.receipt_code
            FROM public.inventory_items ii
            CROSS JOIN public.goods_receipts gr
            WHERE ii.id = _item.inventory_item_id AND gr.id = _receipt_id;
        END IF;
    END LOOP;
    
    -- Check if PO is fully received
    SELECT SUM(quantity), SUM(received_quantity)
    INTO _total_ordered, _total_received
    FROM public.purchase_order_items
    WHERE po_id = _po_id;
    
    -- Update goods receipt status
    IF _total_received >= _total_ordered THEN
        UPDATE public.goods_receipts SET status = 'complete' WHERE id = _receipt_id;
        UPDATE public.purchase_orders SET status = 'completed' WHERE id = _po_id;
    ELSE
        UPDATE public.goods_receipts SET status = 'partial' WHERE id = _receipt_id;
    END IF;
END;
$$;


--
-- Name: update_inventory_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_inventory_stock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    UPDATE public.inventory_items
    SET current_stock = NEW.balance_after,
        updated_at = now()
    WHERE id = NEW.inventory_item_id;
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: validate_po_amount(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_po_amount() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    variance NUMERIC;
BEGIN
    IF NEW.pr_total_amount > 0 THEN
        variance := ((NEW.total_amount - NEW.pr_total_amount) / NEW.pr_total_amount) * 100;
        IF variance > 5 THEN
            RAISE EXCEPTION 'PO total exceeds PR total by more than 5 percent. Variance: %', round(variance, 2);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: approval_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    old_values jsonb,
    new_values jsonb,
    performed_by uuid,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: approval_matrix_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_matrix_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version_number integer NOT NULL,
    snapshot jsonb NOT NULL,
    change_summary text,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: approval_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    override_type public.override_type NOT NULL,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    category public.approval_category,
    conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    bypass_levels integer[] DEFAULT '{}'::integer[],
    require_justification boolean DEFAULT true NOT NULL,
    max_amount numeric(15,2),
    valid_from timestamp with time zone,
    valid_until timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: approval_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    code text NOT NULL,
    description text,
    hierarchy_level integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: approval_rule_approvers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_rule_approvers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id uuid NOT NULL,
    approval_role_id uuid NOT NULL,
    sequence_order integer DEFAULT 1 NOT NULL,
    is_mandatory boolean DEFAULT true NOT NULL,
    can_delegate boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: approval_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category public.approval_category NOT NULL,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    min_amount numeric(15,2) DEFAULT 0 NOT NULL,
    max_amount numeric(15,2),
    currency text DEFAULT 'AED'::text NOT NULL,
    department_id uuid,
    requires_sequential boolean DEFAULT true NOT NULL,
    auto_approve_below numeric(15,2),
    escalation_hours integer DEFAULT 24,
    is_active boolean DEFAULT true NOT NULL,
    conditions jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: approval_thresholds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_thresholds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module text NOT NULL,
    min_amount numeric DEFAULT 0 NOT NULL,
    max_amount numeric,
    approver_role text NOT NULL,
    approver_role_ar text NOT NULL,
    sequence_order integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT approval_thresholds_module_check CHECK ((module = ANY (ARRAY['purchase_request'::text, 'purchase_order'::text])))
);


--
-- Name: approval_workflow_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_workflow_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    approval_role_id uuid,
    approver_id uuid,
    sequence_order integer NOT NULL,
    status public.approval_status DEFAULT 'pending'::public.approval_status NOT NULL,
    comments text,
    delegated_from uuid,
    acted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    rejection_reason text
);


--
-- Name: approval_workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category public.approval_category NOT NULL,
    reference_id uuid NOT NULL,
    reference_code text NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency text DEFAULT 'AED'::text NOT NULL,
    rule_id uuid,
    current_level integer DEFAULT 1 NOT NULL,
    status public.approval_status DEFAULT 'pending'::public.approval_status NOT NULL,
    override_id uuid,
    override_justification text,
    initiated_by uuid,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: company_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_type text NOT NULL,
    document_name text NOT NULL,
    file_path text NOT NULL,
    file_type text NOT NULL,
    extracted_data jsonb,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: company_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name_en text NOT NULL,
    company_name_ar text,
    trade_license_number text NOT NULL,
    trade_license_expiry date NOT NULL,
    address_en text,
    address_ar text,
    city text,
    country text DEFAULT 'UAE'::text,
    phone text,
    email text,
    website text,
    vat_number text,
    logo_url text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    region text DEFAULT 'middle_east'::text,
    default_currency text DEFAULT 'AED'::text
);


--
-- Name: cost_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_centers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    department_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: document_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_type text NOT NULL,
    document_id uuid NOT NULL,
    assigned_from uuid,
    assigned_to uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text
);


--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    base_currency character varying(3) NOT NULL,
    target_currency character varying(3) NOT NULL,
    rate numeric(18,8) NOT NULL,
    fetched_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: goods_receipt_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipt_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    receipt_id uuid NOT NULL,
    po_item_id uuid NOT NULL,
    inventory_item_id uuid,
    quantity_ordered numeric DEFAULT 0 NOT NULL,
    quantity_received numeric DEFAULT 0 NOT NULL,
    quantity_rejected numeric DEFAULT 0 NOT NULL,
    quality_status public.quality_status DEFAULT 'pending'::public.quality_status NOT NULL,
    inspection_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: goods_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    receipt_code text NOT NULL,
    po_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    receipt_date date DEFAULT CURRENT_DATE NOT NULL,
    status public.goods_receipt_status DEFAULT 'pending'::public.goods_receipt_status NOT NULL,
    notes text,
    received_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    description text,
    parent_category_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    description text,
    category_id uuid,
    unit text DEFAULT 'EA'::text NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    currency text DEFAULT 'AED'::text NOT NULL,
    min_stock_level numeric DEFAULT 0 NOT NULL,
    max_stock_level numeric,
    reorder_point numeric DEFAULT 0 NOT NULL,
    current_stock numeric DEFAULT 0 NOT NULL,
    warehouse_location text,
    is_active boolean DEFAULT true NOT NULL,
    is_stockable boolean DEFAULT true NOT NULL,
    lead_time_days integer DEFAULT 0,
    specifications text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: petty_cash_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.petty_cash_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    claim_code text NOT NULL,
    claim_date date DEFAULT CURRENT_DATE NOT NULL,
    project_id uuid,
    total_allocated numeric DEFAULT 0 NOT NULL,
    total_spent numeric DEFAULT 0 NOT NULL,
    balance_remaining numeric GENERATED ALWAYS AS ((total_allocated - total_spent)) STORED,
    replenishment_amount numeric DEFAULT 0 NOT NULL,
    status public.petty_cash_status DEFAULT 'draft'::public.petty_cash_status NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gm_approved_by uuid,
    gm_approved_at timestamp with time zone,
    gm_rejection_reason text,
    paid_by uuid,
    paid_at timestamp with time zone,
    payment_date date,
    payment_reference text,
    pdf_url text,
    pdf_generated_at timestamp with time zone,
    currency text DEFAULT 'AED'::text NOT NULL
);


--
-- Name: petty_cash_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.petty_cash_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    claim_id uuid NOT NULL,
    item_number integer NOT NULL,
    expense_date date,
    description text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    receipt_attached boolean DEFAULT false NOT NULL,
    receipt_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: po_copies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.po_copies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id uuid NOT NULL,
    po_code text NOT NULL,
    vendor_id uuid,
    vendor_name text,
    total_amount numeric DEFAULT 0 NOT NULL,
    currency text DEFAULT 'AED'::text NOT NULL,
    pdf_html text,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    generated_by uuid,
    email_sent_to text,
    email_sent_at timestamp with time zone,
    email_status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    email text,
    phone text,
    department_id uuid,
    preferred_language text DEFAULT 'en'::text NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    trial_started_at timestamp with time zone DEFAULT now(),
    trial_expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    is_subscribed boolean DEFAULT false,
    subscription_plan text,
    line_manager_id uuid,
    CONSTRAINT profiles_preferred_language_check CHECK ((preferred_language = ANY (ARRAY['en'::text, 'ar'::text])))
);


--
-- Name: project_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    alert_type public.project_alert_type NOT NULL,
    threshold_percentage integer,
    current_value numeric,
    message_en text NOT NULL,
    message_ar text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    is_dismissed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_budget_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_budget_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    reference_type text NOT NULL,
    reference_id uuid,
    reference_code text,
    transaction_type public.budget_transaction_type NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'AED'::text NOT NULL,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    description text,
    due_date date NOT NULL,
    completed_date date,
    status public.milestone_status DEFAULT 'pending'::public.milestone_status NOT NULL,
    weight_percentage integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT project_milestones_weight_percentage_check CHECK (((weight_percentage >= 0) AND (weight_percentage <= 100)))
);


--
-- Name: project_team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    added_by uuid,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_variations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_variations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    variation_code text NOT NULL,
    description_en text NOT NULL,
    description_ar text NOT NULL,
    variation_type public.variation_type NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'AED'::text NOT NULL,
    justification text,
    status public.approval_status DEFAULT 'pending'::public.approval_status NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    variation_date date DEFAULT CURRENT_DATE
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    description text,
    status public.project_status DEFAULT 'draft'::public.project_status NOT NULL,
    project_type public.project_type DEFAULT 'construction'::public.project_type NOT NULL,
    client_name text,
    client_reference text,
    start_date date,
    end_date date,
    actual_end_date date,
    original_budget numeric DEFAULT 0 NOT NULL,
    revised_budget numeric DEFAULT 0 NOT NULL,
    budget_committed numeric DEFAULT 0 NOT NULL,
    budget_consumed numeric DEFAULT 0 NOT NULL,
    currency text DEFAULT 'AED'::text NOT NULL,
    progress_percentage integer DEFAULT 0 NOT NULL,
    cost_center_id uuid,
    department_id uuid,
    manager_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    initial_start_date date,
    initial_end_date date,
    extension_reason text,
    extended_at timestamp with time zone,
    CONSTRAINT projects_progress_percentage_check CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100)))
);


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id uuid NOT NULL,
    pr_item_id uuid,
    item_number integer NOT NULL,
    description_en text NOT NULL,
    description_ar text NOT NULL,
    quantity numeric DEFAULT 1 NOT NULL,
    unit text DEFAULT 'EA'::text NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    total_price numeric DEFAULT 0 NOT NULL,
    specifications text,
    received_quantity numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    pr_id uuid NOT NULL,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    description text,
    procurement_type public.procurement_type NOT NULL,
    status public.procurement_status DEFAULT 'draft'::public.procurement_status NOT NULL,
    project_id uuid,
    cost_center_id uuid,
    department_id uuid,
    vendor_id uuid NOT NULL,
    subtotal numeric DEFAULT 0 NOT NULL,
    tax_amount numeric DEFAULT 0 NOT NULL,
    total_amount numeric DEFAULT 0 NOT NULL,
    currency text DEFAULT 'AED'::text NOT NULL,
    pr_total_amount numeric DEFAULT 0 NOT NULL,
    payment_terms text,
    delivery_terms text,
    delivery_date date,
    delivery_address text,
    terms_conditions text,
    issued_by uuid,
    issued_at timestamp with time zone,
    approved_by uuid,
    approved_at timestamp with time zone,
    workflow_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: purchase_request_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_request_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pr_id uuid NOT NULL,
    rfq_item_id uuid,
    item_number integer NOT NULL,
    description_en text NOT NULL,
    description_ar text NOT NULL,
    quantity numeric DEFAULT 1 NOT NULL,
    unit text DEFAULT 'EA'::text NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    total_price numeric DEFAULT 0 NOT NULL,
    specifications text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: purchase_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    rfq_id uuid,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    description text,
    procurement_type public.procurement_type NOT NULL,
    status public.procurement_status DEFAULT 'draft'::public.procurement_status NOT NULL,
    project_id uuid,
    cost_center_id uuid,
    department_id uuid,
    requested_by uuid,
    vendor_id uuid,
    subtotal numeric DEFAULT 0 NOT NULL,
    tax_amount numeric DEFAULT 0 NOT NULL,
    total_amount numeric DEFAULT 0 NOT NULL,
    currency text DEFAULT 'AED'::text NOT NULL,
    justification text,
    required_date date,
    delivery_address text,
    is_locked boolean DEFAULT false NOT NULL,
    locked_at timestamp with time zone,
    approved_by uuid,
    approved_at timestamp with time zone,
    workflow_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_exception boolean DEFAULT false,
    exception_reason text,
    exception_attachment text,
    rfq_id_linked uuid,
    non_recommended_justification text
);


--
-- Name: report_downloads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_downloads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_type text NOT NULL,
    report_name text NOT NULL,
    file_format text NOT NULL,
    file_path text,
    downloaded_by uuid,
    downloaded_at timestamp with time zone DEFAULT now() NOT NULL,
    parameters jsonb
);


--
-- Name: rfi_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfi_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rfi_id uuid NOT NULL,
    item_number integer NOT NULL,
    description_en text NOT NULL,
    description_ar text NOT NULL,
    quantity numeric DEFAULT 1 NOT NULL,
    unit text DEFAULT 'EA'::text NOT NULL,
    specifications text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rfi_vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfi_vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rfi_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    invited_at timestamp with time zone DEFAULT now() NOT NULL,
    response_received boolean DEFAULT false NOT NULL,
    response_date timestamp with time zone,
    response_notes text
);


--
-- Name: rfis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    description text,
    procurement_type public.procurement_type NOT NULL,
    status public.procurement_status DEFAULT 'draft'::public.procurement_status NOT NULL,
    project_id uuid,
    cost_center_id uuid,
    department_id uuid,
    requested_by uuid,
    due_date date,
    priority text DEFAULT 'medium'::text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_buyer_id uuid,
    service_description text,
    service_documents jsonb DEFAULT '[]'::jsonb,
    original_requester_id uuid,
    CONSTRAINT project_or_cost_center CHECK (((project_id IS NOT NULL) OR (cost_center_id IS NOT NULL))),
    CONSTRAINT rfis_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])))
);


--
-- Name: rfq_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfq_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rfq_id uuid NOT NULL,
    action text NOT NULL,
    action_details jsonb DEFAULT '{}'::jsonb,
    performed_by uuid,
    performed_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text
);


--
-- Name: rfq_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfq_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rfq_id uuid NOT NULL,
    rfi_item_id uuid,
    item_number integer NOT NULL,
    description_en text NOT NULL,
    description_ar text NOT NULL,
    quantity numeric DEFAULT 1 NOT NULL,
    unit text DEFAULT 'EA'::text NOT NULL,
    specifications text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rfq_vendor_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfq_vendor_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rfq_vendor_id uuid NOT NULL,
    rfq_item_id uuid NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    total_price numeric DEFAULT 0 NOT NULL,
    notes text
);


--
-- Name: rfq_vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfq_vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rfq_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    invited_at timestamp with time zone DEFAULT now() NOT NULL,
    quotation_received boolean DEFAULT false NOT NULL,
    quotation_date timestamp with time zone,
    total_amount numeric,
    currency text DEFAULT 'AED'::text,
    validity_days integer,
    delivery_days integer,
    payment_terms text,
    technical_score integer,
    commercial_score integer,
    is_selected boolean DEFAULT false NOT NULL,
    notes text,
    attachments jsonb DEFAULT '[]'::jsonb,
    quotation_issue_date timestamp with time zone,
    vendor_response_date timestamp with time zone,
    is_responsive boolean DEFAULT true,
    quotation_amount numeric,
    delivery_score integer,
    overall_score integer,
    is_recommended boolean DEFAULT false,
    deviation_notes text,
    email_sent boolean DEFAULT false,
    email_sent_at timestamp with time zone,
    email_error text,
    warranty_terms text,
    warranty_days integer,
    specification_compliance jsonb DEFAULT '{}'::jsonb,
    technical_deviations text,
    tax_amount numeric DEFAULT 0,
    landed_cost numeric,
    submission_token uuid DEFAULT gen_random_uuid(),
    token_expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
    submitted_at timestamp with time zone,
    submitted_by_name text,
    submitted_by_email text,
    CONSTRAINT rfq_vendors_commercial_score_check CHECK (((commercial_score >= 0) AND (commercial_score <= 100))),
    CONSTRAINT rfq_vendors_technical_score_check CHECK (((technical_score >= 0) AND (technical_score <= 100)))
);


--
-- Name: rfqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    rfi_id uuid,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    description text,
    procurement_type public.procurement_type NOT NULL,
    status public.procurement_status DEFAULT 'draft'::public.procurement_status NOT NULL,
    project_id uuid,
    cost_center_id uuid,
    department_id uuid,
    requested_by uuid,
    submission_deadline timestamp with time zone,
    valid_until date,
    terms_conditions text,
    evaluation_criteria jsonb DEFAULT '{}'::jsonb,
    ai_comparison jsonb,
    ai_recommendation text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_standalone boolean DEFAULT false,
    assigned_buyer_id uuid,
    recommended_vendor_id uuid,
    selected_vendor_id uuid,
    vendor_selection_justification text,
    is_vendor_override boolean DEFAULT false,
    email_dispatch_date timestamp with time zone,
    quotes_ready_notification_sent boolean DEFAULT false,
    analysis_triggered_at timestamp with time zone,
    analysis_triggered_by uuid,
    converted_to_pr_at timestamp with time zone,
    converted_to_pr_by uuid
);


--
-- Name: role_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    requested_role public.app_role NOT NULL,
    justification text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    line_manager_id uuid,
    line_manager_approved_at timestamp with time zone,
    line_manager_comments text,
    admin_approved_by uuid,
    admin_approved_at timestamp with time zone,
    admin_comments text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT role_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: sequence_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sequence_counters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prefix text NOT NULL,
    current_value integer DEFAULT 0 NOT NULL,
    format_pattern text DEFAULT '0000'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inventory_item_id uuid NOT NULL,
    movement_type public.stock_movement_type NOT NULL,
    quantity numeric NOT NULL,
    balance_after numeric NOT NULL,
    reference_type text,
    reference_id uuid,
    reference_code text,
    project_id uuid,
    cost_center_id uuid,
    notes text,
    performed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    warehouse_location text,
    approved_by uuid,
    approved_at timestamp with time zone
);


--
-- Name: system_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    entity_code text,
    old_values jsonb,
    new_values jsonb,
    justification text,
    is_exception boolean DEFAULT false,
    exception_type text,
    performed_by uuid,
    user_name text,
    user_role text,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_approvers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_approvers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    approver_role text NOT NULL,
    modules text[] DEFAULT '{}'::text[] NOT NULL,
    max_approval_amount numeric,
    is_active boolean DEFAULT true NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vendor_bank_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_bank_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    bank_name text NOT NULL,
    account_name text NOT NULL,
    account_number text NOT NULL,
    iban text,
    swift_code text,
    currency text DEFAULT 'AED'::text,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vendor_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vendor_category_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_category_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vendor_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    name text NOT NULL,
    designation text,
    email text,
    phone text,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vendor_document_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_document_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    document_id uuid NOT NULL,
    alert_type text NOT NULL,
    alert_date date NOT NULL,
    is_sent boolean DEFAULT false,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendor_document_alerts_alert_type_check CHECK ((alert_type = ANY (ARRAY['30_days'::text, '15_days'::text, '7_days'::text, 'expired'::text])))
);


--
-- Name: vendor_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    document_type public.vendor_document_type NOT NULL,
    file_path text NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    mime_type text,
    extracted_data jsonb DEFAULT '{}'::jsonb,
    expiry_date date,
    uploaded_by uuid,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.vendor_document_classification DEFAULT 'miscellaneous'::public.vendor_document_classification,
    ai_confidence_score integer DEFAULT 0,
    is_verified boolean DEFAULT false,
    verified_by uuid,
    verified_at timestamp with time zone,
    version integer DEFAULT 1,
    parent_document_id uuid,
    extraction_status text DEFAULT 'pending'::text,
    original_filename text
);


--
-- Name: vendor_due_diligence_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_due_diligence_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    vendor_name text NOT NULL,
    report_data jsonb NOT NULL,
    file_path text,
    generated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    company_name_en text NOT NULL,
    company_name_ar text NOT NULL,
    trade_license_no text,
    trade_license_expiry date,
    tax_registration_no text,
    email text NOT NULL,
    phone text,
    website text,
    address_en text,
    address_ar text,
    city text,
    country text DEFAULT 'UAE'::text,
    category_id uuid,
    vendor_type public.vendor_type DEFAULT 'material'::public.vendor_type NOT NULL,
    status public.vendor_status DEFAULT 'pending'::public.vendor_status NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    rating_score numeric(2,1) DEFAULT 0,
    risk_score integer DEFAULT 50,
    ai_insights jsonb DEFAULT '{}'::jsonb,
    notes text,
    created_by uuid,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    CONSTRAINT vendors_rating_score_check CHECK (((rating_score >= (0)::numeric) AND (rating_score <= (5)::numeric))),
    CONSTRAINT vendors_risk_score_check CHECK (((risk_score >= 0) AND (risk_score <= 100)))
);


--
-- Name: approval_audit_logs approval_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_audit_logs
    ADD CONSTRAINT approval_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: approval_matrix_versions approval_matrix_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_matrix_versions
    ADD CONSTRAINT approval_matrix_versions_pkey PRIMARY KEY (id);


--
-- Name: approval_overrides approval_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_overrides
    ADD CONSTRAINT approval_overrides_pkey PRIMARY KEY (id);


--
-- Name: approval_roles approval_roles_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_roles
    ADD CONSTRAINT approval_roles_code_key UNIQUE (code);


--
-- Name: approval_roles approval_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_roles
    ADD CONSTRAINT approval_roles_pkey PRIMARY KEY (id);


--
-- Name: approval_rule_approvers approval_rule_approvers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_rule_approvers
    ADD CONSTRAINT approval_rule_approvers_pkey PRIMARY KEY (id);


--
-- Name: approval_rule_approvers approval_rule_approvers_rule_id_approval_role_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_rule_approvers
    ADD CONSTRAINT approval_rule_approvers_rule_id_approval_role_id_key UNIQUE (rule_id, approval_role_id);


--
-- Name: approval_rules approval_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_rules
    ADD CONSTRAINT approval_rules_pkey PRIMARY KEY (id);


--
-- Name: approval_thresholds approval_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_thresholds
    ADD CONSTRAINT approval_thresholds_pkey PRIMARY KEY (id);


--
-- Name: approval_workflow_actions approval_workflow_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflow_actions
    ADD CONSTRAINT approval_workflow_actions_pkey PRIMARY KEY (id);


--
-- Name: approval_workflows approval_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflows
    ADD CONSTRAINT approval_workflows_pkey PRIMARY KEY (id);


--
-- Name: company_documents company_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_documents
    ADD CONSTRAINT company_documents_pkey PRIMARY KEY (id);


--
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


--
-- Name: cost_centers cost_centers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_code_key UNIQUE (code);


--
-- Name: cost_centers cost_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_pkey PRIMARY KEY (id);


--
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: document_assignments document_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_assignments
    ADD CONSTRAINT document_assignments_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_base_currency_target_currency_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_base_currency_target_currency_key UNIQUE (base_currency, target_currency);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: goods_receipt_items goods_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_pkey PRIMARY KEY (id);


--
-- Name: goods_receipts goods_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_pkey PRIMARY KEY (id);


--
-- Name: goods_receipts goods_receipts_receipt_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_receipt_code_key UNIQUE (receipt_code);


--
-- Name: inventory_categories inventory_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_code_key UNIQUE (code);


--
-- Name: inventory_categories inventory_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_code_key UNIQUE (code);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: petty_cash_claims petty_cash_claims_claim_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_claims
    ADD CONSTRAINT petty_cash_claims_claim_code_key UNIQUE (claim_code);


--
-- Name: petty_cash_claims petty_cash_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_claims
    ADD CONSTRAINT petty_cash_claims_pkey PRIMARY KEY (id);


--
-- Name: petty_cash_items petty_cash_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_items
    ADD CONSTRAINT petty_cash_items_pkey PRIMARY KEY (id);


--
-- Name: po_copies po_copies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_copies
    ADD CONSTRAINT po_copies_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: project_alerts project_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_alerts
    ADD CONSTRAINT project_alerts_pkey PRIMARY KEY (id);


--
-- Name: project_budget_transactions project_budget_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budget_transactions
    ADD CONSTRAINT project_budget_transactions_pkey PRIMARY KEY (id);


--
-- Name: project_milestones project_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_pkey PRIMARY KEY (id);


--
-- Name: project_team_members project_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_team_members
    ADD CONSTRAINT project_team_members_pkey PRIMARY KEY (id);


--
-- Name: project_team_members project_team_members_project_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_team_members
    ADD CONSTRAINT project_team_members_project_id_user_id_key UNIQUE (project_id, user_id);


--
-- Name: project_variations project_variations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_variations
    ADD CONSTRAINT project_variations_pkey PRIMARY KEY (id);


--
-- Name: project_variations project_variations_variation_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_variations
    ADD CONSTRAINT project_variations_variation_code_key UNIQUE (variation_code);


--
-- Name: projects projects_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_code_key UNIQUE (code);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_code_key UNIQUE (code);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_request_items purchase_request_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_request_items
    ADD CONSTRAINT purchase_request_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_requests purchase_requests_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_code_key UNIQUE (code);


--
-- Name: purchase_requests purchase_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_pkey PRIMARY KEY (id);


--
-- Name: report_downloads report_downloads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_downloads
    ADD CONSTRAINT report_downloads_pkey PRIMARY KEY (id);


--
-- Name: rfi_items rfi_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfi_items
    ADD CONSTRAINT rfi_items_pkey PRIMARY KEY (id);


--
-- Name: rfi_vendors rfi_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfi_vendors
    ADD CONSTRAINT rfi_vendors_pkey PRIMARY KEY (id);


--
-- Name: rfi_vendors rfi_vendors_rfi_id_vendor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfi_vendors
    ADD CONSTRAINT rfi_vendors_rfi_id_vendor_id_key UNIQUE (rfi_id, vendor_id);


--
-- Name: rfis rfis_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfis
    ADD CONSTRAINT rfis_code_key UNIQUE (code);


--
-- Name: rfis rfis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfis
    ADD CONSTRAINT rfis_pkey PRIMARY KEY (id);


--
-- Name: rfq_audit_logs rfq_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_audit_logs
    ADD CONSTRAINT rfq_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: rfq_items rfq_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT rfq_items_pkey PRIMARY KEY (id);


--
-- Name: rfq_vendor_prices rfq_vendor_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendor_prices
    ADD CONSTRAINT rfq_vendor_prices_pkey PRIMARY KEY (id);


--
-- Name: rfq_vendor_prices rfq_vendor_prices_rfq_vendor_id_rfq_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendor_prices
    ADD CONSTRAINT rfq_vendor_prices_rfq_vendor_id_rfq_item_id_key UNIQUE (rfq_vendor_id, rfq_item_id);


--
-- Name: rfq_vendors rfq_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendors
    ADD CONSTRAINT rfq_vendors_pkey PRIMARY KEY (id);


--
-- Name: rfq_vendors rfq_vendors_rfq_id_vendor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendors
    ADD CONSTRAINT rfq_vendors_rfq_id_vendor_id_key UNIQUE (rfq_id, vendor_id);


--
-- Name: rfqs rfqs_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_code_key UNIQUE (code);


--
-- Name: rfqs rfqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_pkey PRIMARY KEY (id);


--
-- Name: role_requests role_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_requests
    ADD CONSTRAINT role_requests_pkey PRIMARY KEY (id);


--
-- Name: sequence_counters sequence_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequence_counters
    ADD CONSTRAINT sequence_counters_pkey PRIMARY KEY (id);


--
-- Name: sequence_counters sequence_counters_prefix_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequence_counters
    ADD CONSTRAINT sequence_counters_prefix_key UNIQUE (prefix);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: system_audit_logs system_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_audit_logs
    ADD CONSTRAINT system_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: user_approvers user_approvers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_approvers
    ADD CONSTRAINT user_approvers_pkey PRIMARY KEY (id);


--
-- Name: user_approvers user_approvers_user_id_approver_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_approvers
    ADD CONSTRAINT user_approvers_user_id_approver_role_key UNIQUE (user_id, approver_role);


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
-- Name: vendor_bank_details vendor_bank_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_bank_details
    ADD CONSTRAINT vendor_bank_details_pkey PRIMARY KEY (id);


--
-- Name: vendor_categories vendor_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_categories
    ADD CONSTRAINT vendor_categories_code_key UNIQUE (code);


--
-- Name: vendor_categories vendor_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_categories
    ADD CONSTRAINT vendor_categories_pkey PRIMARY KEY (id);


--
-- Name: vendor_category_mappings vendor_category_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_category_mappings
    ADD CONSTRAINT vendor_category_mappings_pkey PRIMARY KEY (id);


--
-- Name: vendor_category_mappings vendor_category_mappings_vendor_id_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_category_mappings
    ADD CONSTRAINT vendor_category_mappings_vendor_id_category_id_key UNIQUE (vendor_id, category_id);


--
-- Name: vendor_contacts vendor_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_contacts
    ADD CONSTRAINT vendor_contacts_pkey PRIMARY KEY (id);


--
-- Name: vendor_document_alerts vendor_document_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_document_alerts
    ADD CONSTRAINT vendor_document_alerts_pkey PRIMARY KEY (id);


--
-- Name: vendor_documents vendor_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_documents
    ADD CONSTRAINT vendor_documents_pkey PRIMARY KEY (id);


--
-- Name: vendor_due_diligence_reports vendor_due_diligence_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_due_diligence_reports
    ADD CONSTRAINT vendor_due_diligence_reports_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_code_key UNIQUE (code);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: idx_document_alerts_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_alerts_date ON public.vendor_document_alerts USING btree (alert_date, is_sent);


--
-- Name: idx_document_assignments_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_assignments_document ON public.document_assignments USING btree (document_type, document_id);


--
-- Name: idx_documents_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_expiry ON public.vendor_documents USING btree (expiry_date);


--
-- Name: idx_documents_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_vendor ON public.vendor_documents USING btree (vendor_id);


--
-- Name: idx_exchange_rates_currencies; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exchange_rates_currencies ON public.exchange_rates USING btree (base_currency, target_currency);


--
-- Name: idx_goods_receipt_items_receipt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goods_receipt_items_receipt ON public.goods_receipt_items USING btree (receipt_id);


--
-- Name: idx_goods_receipts_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goods_receipts_po ON public.goods_receipts USING btree (po_id);


--
-- Name: idx_inventory_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_items_category ON public.inventory_items USING btree (category_id);


--
-- Name: idx_inventory_items_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_items_code ON public.inventory_items USING btree (code);


--
-- Name: idx_po_copies_generated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_copies_generated_at ON public.po_copies USING btree (generated_at DESC);


--
-- Name: idx_po_copies_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_copies_po_id ON public.po_copies USING btree (po_id);


--
-- Name: idx_purchase_requests_exception; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_requests_exception ON public.purchase_requests USING btree (is_exception) WHERE (is_exception = true);


--
-- Name: idx_rfis_assigned_buyer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfis_assigned_buyer_id ON public.rfis USING btree (assigned_buyer_id);


--
-- Name: idx_rfq_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfq_audit_logs_action ON public.rfq_audit_logs USING btree (action);


--
-- Name: idx_rfq_audit_logs_performed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfq_audit_logs_performed_at ON public.rfq_audit_logs USING btree (performed_at DESC);


--
-- Name: idx_rfq_audit_logs_rfq_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfq_audit_logs_rfq_id ON public.rfq_audit_logs USING btree (rfq_id);


--
-- Name: idx_rfq_vendors_submission_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_rfq_vendors_submission_token ON public.rfq_vendors USING btree (submission_token);


--
-- Name: idx_rfqs_assigned_buyer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfqs_assigned_buyer_id ON public.rfqs USING btree (assigned_buyer_id);


--
-- Name: idx_stock_movements_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_item ON public.stock_movements USING btree (inventory_item_id);


--
-- Name: idx_stock_movements_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_reference ON public.stock_movements USING btree (reference_type, reference_id);


--
-- Name: idx_system_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_audit_logs_created_at ON public.system_audit_logs USING btree (created_at DESC);


--
-- Name: idx_system_audit_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_audit_logs_entity ON public.system_audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_system_audit_logs_performed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_audit_logs_performed_by ON public.system_audit_logs USING btree (performed_by);


--
-- Name: idx_vendor_category_mappings_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_category_mappings_category_id ON public.vendor_category_mappings USING btree (category_id);


--
-- Name: idx_vendor_category_mappings_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_category_mappings_vendor_id ON public.vendor_category_mappings USING btree (vendor_id);


--
-- Name: project_variations apply_variation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER apply_variation_trigger AFTER UPDATE ON public.project_variations FOR EACH ROW EXECUTE FUNCTION public.apply_variation_to_budget();


--
-- Name: projects check_project_alerts_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_project_alerts_trigger AFTER INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.check_project_alerts();


--
-- Name: purchase_requests lock_pr_on_approval; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lock_pr_on_approval BEFORE UPDATE ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.lock_approved_pr();


--
-- Name: inventory_items trigger_check_low_stock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_check_low_stock AFTER UPDATE OF current_stock ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.check_low_stock_alert();


--
-- Name: vendor_documents trigger_generate_document_expiry_alerts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_document_expiry_alerts AFTER INSERT OR UPDATE OF expiry_date ON public.vendor_documents FOR EACH ROW EXECUTE FUNCTION public.generate_document_expiry_alerts();


--
-- Name: stock_movements trigger_update_inventory_stock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_inventory_stock AFTER INSERT ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.update_inventory_stock();


--
-- Name: approval_overrides update_approval_overrides_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_approval_overrides_updated_at BEFORE UPDATE ON public.approval_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: approval_roles update_approval_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_approval_roles_updated_at BEFORE UPDATE ON public.approval_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: approval_rules update_approval_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_approval_rules_updated_at BEFORE UPDATE ON public.approval_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: approval_thresholds update_approval_thresholds_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_approval_thresholds_updated_at BEFORE UPDATE ON public.approval_thresholds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: approval_workflows update_approval_workflows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_approval_workflows_updated_at BEFORE UPDATE ON public.approval_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cost_centers update_cost_centers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON public.cost_centers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: departments update_departments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: exchange_rates update_exchange_rates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_exchange_rates_updated_at BEFORE UPDATE ON public.exchange_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: goods_receipts update_goods_receipts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_goods_receipts_updated_at BEFORE UPDATE ON public.goods_receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_categories update_inventory_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_inventory_categories_updated_at BEFORE UPDATE ON public.inventory_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_items update_inventory_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: petty_cash_claims update_petty_cash_claims_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_petty_cash_claims_updated_at BEFORE UPDATE ON public.petty_cash_claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_milestones update_project_milestones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_milestones_updated_at BEFORE UPDATE ON public.project_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_variations update_project_variations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_variations_updated_at BEFORE UPDATE ON public.project_variations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: purchase_orders update_purchase_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: purchase_requests update_purchase_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_purchase_requests_updated_at BEFORE UPDATE ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rfis update_rfis_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rfis_updated_at BEFORE UPDATE ON public.rfis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rfqs update_rfqs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rfqs_updated_at BEFORE UPDATE ON public.rfqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: role_requests update_role_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_role_requests_updated_at BEFORE UPDATE ON public.role_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sequence_counters update_sequence_counters_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sequence_counters_updated_at BEFORE UPDATE ON public.sequence_counters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_approvers update_user_approvers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_approvers_updated_at BEFORE UPDATE ON public.user_approvers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendor_bank_details update_vendor_bank_details_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vendor_bank_details_updated_at BEFORE UPDATE ON public.vendor_bank_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendor_categories update_vendor_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vendor_categories_updated_at BEFORE UPDATE ON public.vendor_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendor_contacts update_vendor_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vendor_contacts_updated_at BEFORE UPDATE ON public.vendor_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendors update_vendors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: purchase_orders validate_po_amount_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_po_amount_trigger BEFORE INSERT OR UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.validate_po_amount();


--
-- Name: approval_audit_logs approval_audit_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_audit_logs
    ADD CONSTRAINT approval_audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES auth.users(id);


--
-- Name: approval_matrix_versions approval_matrix_versions_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_matrix_versions
    ADD CONSTRAINT approval_matrix_versions_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: approval_overrides approval_overrides_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_overrides
    ADD CONSTRAINT approval_overrides_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: approval_rule_approvers approval_rule_approvers_approval_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_rule_approvers
    ADD CONSTRAINT approval_rule_approvers_approval_role_id_fkey FOREIGN KEY (approval_role_id) REFERENCES public.approval_roles(id) ON DELETE CASCADE;


--
-- Name: approval_rule_approvers approval_rule_approvers_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_rule_approvers
    ADD CONSTRAINT approval_rule_approvers_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.approval_rules(id) ON DELETE CASCADE;


--
-- Name: approval_rules approval_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_rules
    ADD CONSTRAINT approval_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: approval_rules approval_rules_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_rules
    ADD CONSTRAINT approval_rules_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: approval_workflow_actions approval_workflow_actions_approval_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflow_actions
    ADD CONSTRAINT approval_workflow_actions_approval_role_id_fkey FOREIGN KEY (approval_role_id) REFERENCES public.approval_roles(id);


--
-- Name: approval_workflow_actions approval_workflow_actions_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflow_actions
    ADD CONSTRAINT approval_workflow_actions_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES auth.users(id);


--
-- Name: approval_workflow_actions approval_workflow_actions_delegated_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflow_actions
    ADD CONSTRAINT approval_workflow_actions_delegated_from_fkey FOREIGN KEY (delegated_from) REFERENCES auth.users(id);


--
-- Name: approval_workflow_actions approval_workflow_actions_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflow_actions
    ADD CONSTRAINT approval_workflow_actions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.approval_workflows(id) ON DELETE CASCADE;


--
-- Name: approval_workflows approval_workflows_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflows
    ADD CONSTRAINT approval_workflows_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES auth.users(id);


--
-- Name: approval_workflows approval_workflows_override_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflows
    ADD CONSTRAINT approval_workflows_override_id_fkey FOREIGN KEY (override_id) REFERENCES public.approval_overrides(id);


--
-- Name: approval_workflows approval_workflows_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflows
    ADD CONSTRAINT approval_workflows_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.approval_rules(id);


--
-- Name: company_documents company_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_documents
    ADD CONSTRAINT company_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: company_settings company_settings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: company_settings company_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: cost_centers cost_centers_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: document_assignments document_assignments_assigned_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_assignments
    ADD CONSTRAINT document_assignments_assigned_from_fkey FOREIGN KEY (assigned_from) REFERENCES public.profiles(id);


--
-- Name: document_assignments document_assignments_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_assignments
    ADD CONSTRAINT document_assignments_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);


--
-- Name: goods_receipt_items goods_receipt_items_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id);


--
-- Name: goods_receipt_items goods_receipt_items_po_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_po_item_id_fkey FOREIGN KEY (po_item_id) REFERENCES public.purchase_order_items(id);


--
-- Name: goods_receipt_items goods_receipt_items_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.goods_receipts(id) ON DELETE CASCADE;


--
-- Name: goods_receipts goods_receipts_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: goods_receipts goods_receipts_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.profiles(id);


--
-- Name: goods_receipts goods_receipts_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: inventory_categories inventory_categories_parent_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.inventory_categories(id);


--
-- Name: inventory_items inventory_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.inventory_categories(id);


--
-- Name: inventory_items inventory_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: petty_cash_claims petty_cash_claims_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_claims
    ADD CONSTRAINT petty_cash_claims_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: petty_cash_claims petty_cash_claims_gm_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_claims
    ADD CONSTRAINT petty_cash_claims_gm_approved_by_fkey FOREIGN KEY (gm_approved_by) REFERENCES public.profiles(id);


--
-- Name: petty_cash_claims petty_cash_claims_paid_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_claims
    ADD CONSTRAINT petty_cash_claims_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES public.profiles(id);


--
-- Name: petty_cash_claims petty_cash_claims_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_claims
    ADD CONSTRAINT petty_cash_claims_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: petty_cash_items petty_cash_items_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_items
    ADD CONSTRAINT petty_cash_items_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.petty_cash_claims(id) ON DELETE CASCADE;


--
-- Name: po_copies po_copies_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_copies
    ADD CONSTRAINT po_copies_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES auth.users(id);


--
-- Name: po_copies po_copies_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_copies
    ADD CONSTRAINT po_copies_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: po_copies po_copies_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_copies
    ADD CONSTRAINT po_copies_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: profiles profiles_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_line_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_line_manager_id_fkey FOREIGN KEY (line_manager_id) REFERENCES public.profiles(id);


--
-- Name: project_alerts project_alerts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_alerts
    ADD CONSTRAINT project_alerts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_budget_transactions project_budget_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budget_transactions
    ADD CONSTRAINT project_budget_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: project_budget_transactions project_budget_transactions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budget_transactions
    ADD CONSTRAINT project_budget_transactions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_milestones project_milestones_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_team_members project_team_members_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_team_members
    ADD CONSTRAINT project_team_members_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.profiles(id);


--
-- Name: project_team_members project_team_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_team_members
    ADD CONSTRAINT project_team_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_team_members project_team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_team_members
    ADD CONSTRAINT project_team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: project_variations project_variations_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_variations
    ADD CONSTRAINT project_variations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: project_variations project_variations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_variations
    ADD CONSTRAINT project_variations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: project_variations project_variations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_variations
    ADD CONSTRAINT project_variations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: projects projects_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: projects projects_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.profiles(id);


--
-- Name: purchase_order_items purchase_order_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_pr_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pr_item_id_fkey FOREIGN KEY (pr_item_id) REFERENCES public.purchase_request_items(id);


--
-- Name: purchase_orders purchase_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: purchase_orders purchase_orders_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: purchase_orders purchase_orders_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: purchase_orders purchase_orders_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.profiles(id);


--
-- Name: purchase_orders purchase_orders_pr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pr_id_fkey FOREIGN KEY (pr_id) REFERENCES public.purchase_requests(id);


--
-- Name: purchase_orders purchase_orders_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: purchase_orders purchase_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: purchase_orders purchase_orders_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.approval_workflows(id);


--
-- Name: purchase_request_items purchase_request_items_pr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_request_items
    ADD CONSTRAINT purchase_request_items_pr_id_fkey FOREIGN KEY (pr_id) REFERENCES public.purchase_requests(id) ON DELETE CASCADE;


--
-- Name: purchase_request_items purchase_request_items_rfq_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_request_items
    ADD CONSTRAINT purchase_request_items_rfq_item_id_fkey FOREIGN KEY (rfq_item_id) REFERENCES public.rfq_items(id);


--
-- Name: purchase_requests purchase_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: purchase_requests purchase_requests_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- Name: purchase_requests purchase_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: purchase_requests purchase_requests_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: purchase_requests purchase_requests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: purchase_requests purchase_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id);


--
-- Name: purchase_requests purchase_requests_rfq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id);


--
-- Name: purchase_requests purchase_requests_rfq_id_linked_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_rfq_id_linked_fkey FOREIGN KEY (rfq_id_linked) REFERENCES public.rfqs(id);


--
-- Name: purchase_requests purchase_requests_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: purchase_requests purchase_requests_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.approval_workflows(id);


--
-- Name: report_downloads report_downloads_downloaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_downloads
    ADD CONSTRAINT report_downloads_downloaded_by_fkey FOREIGN KEY (downloaded_by) REFERENCES auth.users(id);


--
-- Name: rfi_items rfi_items_rfi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfi_items
    ADD CONSTRAINT rfi_items_rfi_id_fkey FOREIGN KEY (rfi_id) REFERENCES public.rfis(id) ON DELETE CASCADE;


--
-- Name: rfi_vendors rfi_vendors_rfi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfi_vendors
    ADD CONSTRAINT rfi_vendors_rfi_id_fkey FOREIGN KEY (rfi_id) REFERENCES public.rfis(id) ON DELETE CASCADE;


--
-- Name: rfi_vendors rfi_vendors_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfi_vendors
    ADD CONSTRAINT rfi_vendors_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: rfis rfis_assigned_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfis
    ADD CONSTRAINT rfis_assigned_buyer_id_fkey FOREIGN KEY (assigned_buyer_id) REFERENCES public.profiles(id);


--
-- Name: rfis rfis_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfis
    ADD CONSTRAINT rfis_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- Name: rfis rfis_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfis
    ADD CONSTRAINT rfis_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: rfis rfis_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfis
    ADD CONSTRAINT rfis_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: rfis rfis_original_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfis
    ADD CONSTRAINT rfis_original_requester_id_fkey FOREIGN KEY (original_requester_id) REFERENCES auth.users(id);


--
-- Name: rfis rfis_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfis
    ADD CONSTRAINT rfis_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: rfis rfis_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfis
    ADD CONSTRAINT rfis_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id);


--
-- Name: rfq_audit_logs rfq_audit_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_audit_logs
    ADD CONSTRAINT rfq_audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id);


--
-- Name: rfq_audit_logs rfq_audit_logs_rfq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_audit_logs
    ADD CONSTRAINT rfq_audit_logs_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id) ON DELETE CASCADE;


--
-- Name: rfq_items rfq_items_rfi_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT rfq_items_rfi_item_id_fkey FOREIGN KEY (rfi_item_id) REFERENCES public.rfi_items(id);


--
-- Name: rfq_items rfq_items_rfq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT rfq_items_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id) ON DELETE CASCADE;


--
-- Name: rfq_vendor_prices rfq_vendor_prices_rfq_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendor_prices
    ADD CONSTRAINT rfq_vendor_prices_rfq_item_id_fkey FOREIGN KEY (rfq_item_id) REFERENCES public.rfq_items(id) ON DELETE CASCADE;


--
-- Name: rfq_vendor_prices rfq_vendor_prices_rfq_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendor_prices
    ADD CONSTRAINT rfq_vendor_prices_rfq_vendor_id_fkey FOREIGN KEY (rfq_vendor_id) REFERENCES public.rfq_vendors(id) ON DELETE CASCADE;


--
-- Name: rfq_vendors rfq_vendors_rfq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendors
    ADD CONSTRAINT rfq_vendors_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id) ON DELETE CASCADE;


--
-- Name: rfq_vendors rfq_vendors_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendors
    ADD CONSTRAINT rfq_vendors_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: rfqs rfqs_assigned_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_assigned_buyer_id_fkey FOREIGN KEY (assigned_buyer_id) REFERENCES public.profiles(id);


--
-- Name: rfqs rfqs_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- Name: rfqs rfqs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: rfqs rfqs_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: rfqs rfqs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: rfqs rfqs_recommended_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_recommended_vendor_id_fkey FOREIGN KEY (recommended_vendor_id) REFERENCES public.vendors(id);


--
-- Name: rfqs rfqs_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id);


--
-- Name: rfqs rfqs_rfi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_rfi_id_fkey FOREIGN KEY (rfi_id) REFERENCES public.rfis(id);


--
-- Name: rfqs rfqs_selected_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_selected_vendor_id_fkey FOREIGN KEY (selected_vendor_id) REFERENCES public.vendors(id);


--
-- Name: role_requests role_requests_admin_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_requests
    ADD CONSTRAINT role_requests_admin_approved_by_fkey FOREIGN KEY (admin_approved_by) REFERENCES public.profiles(id);


--
-- Name: role_requests role_requests_line_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_requests
    ADD CONSTRAINT role_requests_line_manager_id_fkey FOREIGN KEY (line_manager_id) REFERENCES public.profiles(id);


--
-- Name: role_requests role_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_requests
    ADD CONSTRAINT role_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: stock_movements stock_movements_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- Name: stock_movements stock_movements_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id);


--
-- Name: stock_movements stock_movements_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: system_audit_logs system_audit_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_audit_logs
    ADD CONSTRAINT system_audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES auth.users(id);


--
-- Name: user_approvers user_approvers_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_approvers
    ADD CONSTRAINT user_approvers_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id);


--
-- Name: user_approvers user_approvers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_approvers
    ADD CONSTRAINT user_approvers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: vendor_bank_details vendor_bank_details_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_bank_details
    ADD CONSTRAINT vendor_bank_details_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_category_mappings vendor_category_mappings_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_category_mappings
    ADD CONSTRAINT vendor_category_mappings_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.vendor_categories(id) ON DELETE CASCADE;


--
-- Name: vendor_category_mappings vendor_category_mappings_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_category_mappings
    ADD CONSTRAINT vendor_category_mappings_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_contacts vendor_contacts_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_contacts
    ADD CONSTRAINT vendor_contacts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_document_alerts vendor_document_alerts_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_document_alerts
    ADD CONSTRAINT vendor_document_alerts_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.vendor_documents(id) ON DELETE CASCADE;


--
-- Name: vendor_document_alerts vendor_document_alerts_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_document_alerts
    ADD CONSTRAINT vendor_document_alerts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_documents vendor_documents_parent_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_documents
    ADD CONSTRAINT vendor_documents_parent_document_id_fkey FOREIGN KEY (parent_document_id) REFERENCES public.vendor_documents(id);


--
-- Name: vendor_documents vendor_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_documents
    ADD CONSTRAINT vendor_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id);


--
-- Name: vendor_documents vendor_documents_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_documents
    ADD CONSTRAINT vendor_documents_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_documents vendor_documents_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_documents
    ADD CONSTRAINT vendor_documents_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id);


--
-- Name: vendor_due_diligence_reports vendor_due_diligence_reports_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_due_diligence_reports
    ADD CONSTRAINT vendor_due_diligence_reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES auth.users(id);


--
-- Name: vendor_due_diligence_reports vendor_due_diligence_reports_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_due_diligence_reports
    ADD CONSTRAINT vendor_due_diligence_reports_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: vendors vendors_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.vendor_categories(id);


--
-- Name: vendors vendors_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: rfis Admins and creators can manage RFIs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and creators can manage RFIs" ON public.rfis FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (created_by = auth.uid()) OR (requested_by = auth.uid())));


--
-- Name: rfqs Admins and creators can manage RFQs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and creators can manage RFQs" ON public.rfqs FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (created_by = auth.uid()) OR (requested_by = auth.uid())));


--
-- Name: goods_receipts Admins and creators can manage goods receipts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and creators can manage goods receipts" ON public.goods_receipts FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (received_by = auth.uid())));


--
-- Name: vendor_bank_details Admins and creators can manage vendor bank details; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and creators can manage vendor bank details" ON public.vendor_bank_details USING ((EXISTS ( SELECT 1
   FROM public.vendors v
  WHERE ((v.id = vendor_bank_details.vendor_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR (v.created_by = auth.uid()))))));


--
-- Name: vendor_contacts Admins and creators can manage vendor contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and creators can manage vendor contacts" ON public.vendor_contacts USING ((EXISTS ( SELECT 1
   FROM public.vendors v
  WHERE ((v.id = vendor_contacts.vendor_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR (v.created_by = auth.uid()))))));


--
-- Name: vendor_documents Admins and creators can manage vendor documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and creators can manage vendor documents" ON public.vendor_documents USING ((EXISTS ( SELECT 1
   FROM public.vendors v
  WHERE ((v.id = vendor_documents.vendor_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR (v.created_by = auth.uid()))))));


--
-- Name: purchase_requests Admins and creators can update PRs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and creators can update PRs" ON public.purchase_requests FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR ((created_by = auth.uid()) AND (is_locked = false))));


--
-- Name: inventory_items Admins and managers can manage inventory items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage inventory items" ON public.inventory_items USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: system_audit_logs Admins and managers can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can view audit logs" ON public.system_audit_logs FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: purchase_orders Admins can delete POs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete POs" ON public.purchase_orders FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: purchase_requests Admins can delete PRs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete PRs" ON public.purchase_requests FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: rfis Admins can delete RFIs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete RFIs" ON public.rfis FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: rfqs Admins can delete RFQs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete RFQs" ON public.rfqs FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: petty_cash_claims Admins can delete claims; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete claims" ON public.petty_cash_claims FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: vendors Admins can delete vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete vendors" ON public.vendors FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: po_copies Admins can manage PO copies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage PO copies" ON public.po_copies USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: purchase_orders Admins can manage POs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage POs" ON public.purchase_orders FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (created_by = auth.uid())));


--
-- Name: project_alerts Admins can manage alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage alerts" ON public.project_alerts USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can manage all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all profiles" ON public.profiles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: projects Admins can manage all projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all projects" ON public.projects USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: approval_workflows Admins can manage all workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all workflows" ON public.approval_workflows USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: approval_roles Admins can manage approval roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage approval roles" ON public.approval_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: approval_rules Admins can manage approval rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage approval rules" ON public.approval_rules USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: company_documents Admins can manage company documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage company documents" ON public.company_documents USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: company_settings Admins can manage company settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage company settings" ON public.company_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cost_centers Admins can manage cost centers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage cost centers" ON public.cost_centers TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: departments Admins can manage departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage departments" ON public.departments TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: vendor_document_alerts Admins can manage document alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage document alerts" ON public.vendor_document_alerts USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: inventory_categories Admins can manage inventory categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage inventory categories" ON public.inventory_categories USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: project_milestones Admins can manage milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage milestones" ON public.project_milestones USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: approval_overrides Admins can manage overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage overrides" ON public.approval_overrides USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: vendor_due_diligence_reports Admins can manage reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage reports" ON public.vendor_due_diligence_reports USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: approval_rule_approvers Admins can manage rule approvers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage rule approvers" ON public.approval_rule_approvers USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sequence_counters Admins can manage sequences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sequences" ON public.sequence_counters TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: project_team_members Admins can manage team members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage team members" ON public.project_team_members USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: approval_thresholds Admins can manage thresholds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage thresholds" ON public.approval_thresholds USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: project_budget_transactions Admins can manage transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage transactions" ON public.project_budget_transactions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_approvers Admins can manage user approvers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage user approvers" ON public.user_approvers USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: project_variations Admins can manage variations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage variations" ON public.project_variations USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: vendor_categories Admins can manage vendor categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage vendor categories" ON public.vendor_categories USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: approval_matrix_versions Admins can manage versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage versions" ON public.approval_matrix_versions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: approval_workflow_actions Admins can manage workflow actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage workflow actions" ON public.approval_workflow_actions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: vendors Admins can update vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update vendors" ON public.vendors FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (created_by = auth.uid())));


--
-- Name: report_downloads Admins can view all report downloads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all report downloads" ON public.report_downloads FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: approval_audit_logs Admins can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view audit logs" ON public.approval_audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: approval_workflow_actions Assigned approvers can update their actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Assigned approvers can update their actions" ON public.approval_workflow_actions FOR UPDATE USING ((approver_id = auth.uid()));


--
-- Name: purchase_requests Authenticated users can create PRs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create PRs" ON public.purchase_requests FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: rfis Authenticated users can create RFIs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create RFIs" ON public.rfis FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: rfqs Authenticated users can create RFQs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create RFQs" ON public.rfqs FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: goods_receipts Authenticated users can create goods receipts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create goods receipts" ON public.goods_receipts FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: vendor_due_diligence_reports Authenticated users can create reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create reports" ON public.vendor_due_diligence_reports FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: stock_movements Authenticated users can create stock movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create stock movements" ON public.stock_movements FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: vendors Authenticated users can create vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create vendors" ON public.vendors FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: rfq_audit_logs Authenticated users can insert RFQ audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert RFQ audit logs" ON public.rfq_audit_logs FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: purchase_order_items Authenticated users can manage PO items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage PO items" ON public.purchase_order_items USING ((auth.uid() IS NOT NULL));


--
-- Name: purchase_request_items Authenticated users can manage PR items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage PR items" ON public.purchase_request_items USING ((auth.uid() IS NOT NULL));


--
-- Name: rfi_items Authenticated users can manage RFI items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage RFI items" ON public.rfi_items USING ((auth.uid() IS NOT NULL));


--
-- Name: rfi_vendors Authenticated users can manage RFI vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage RFI vendors" ON public.rfi_vendors USING ((auth.uid() IS NOT NULL));


--
-- Name: rfq_items Authenticated users can manage RFQ items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage RFQ items" ON public.rfq_items USING ((auth.uid() IS NOT NULL));


--
-- Name: rfq_vendor_prices Authenticated users can manage RFQ vendor prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage RFQ vendor prices" ON public.rfq_vendor_prices USING ((auth.uid() IS NOT NULL));


--
-- Name: rfq_vendors Authenticated users can manage RFQ vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage RFQ vendors" ON public.rfq_vendors USING ((auth.uid() IS NOT NULL));


--
-- Name: goods_receipt_items Authenticated users can manage goods receipt items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage goods receipt items" ON public.goods_receipt_items USING ((auth.uid() IS NOT NULL));


--
-- Name: petty_cash_items Authenticated users can manage petty cash items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage petty cash items" ON public.petty_cash_items USING ((auth.uid() IS NOT NULL));


--
-- Name: vendor_category_mappings Authenticated users can manage vendor categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage vendor categories" ON public.vendor_category_mappings USING ((auth.uid() IS NOT NULL));


--
-- Name: po_copies Authenticated users can view PO copies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view PO copies" ON public.po_copies FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: purchase_order_items Authenticated users can view PO items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view PO items" ON public.purchase_order_items FOR SELECT USING (true);


--
-- Name: purchase_orders Authenticated users can view POs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view POs" ON public.purchase_orders FOR SELECT USING (true);


--
-- Name: purchase_request_items Authenticated users can view PR items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view PR items" ON public.purchase_request_items FOR SELECT USING (true);


--
-- Name: purchase_requests Authenticated users can view PRs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view PRs" ON public.purchase_requests FOR SELECT USING (true);


--
-- Name: rfi_items Authenticated users can view RFI items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view RFI items" ON public.rfi_items FOR SELECT USING (true);


--
-- Name: rfi_vendors Authenticated users can view RFI vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view RFI vendors" ON public.rfi_vendors FOR SELECT USING (true);


--
-- Name: rfis Authenticated users can view RFIs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view RFIs" ON public.rfis FOR SELECT USING (true);


--
-- Name: rfq_audit_logs Authenticated users can view RFQ audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view RFQ audit logs" ON public.rfq_audit_logs FOR SELECT USING (true);


--
-- Name: rfq_items Authenticated users can view RFQ items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view RFQ items" ON public.rfq_items FOR SELECT USING (true);


--
-- Name: rfq_vendor_prices Authenticated users can view RFQ vendor prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view RFQ vendor prices" ON public.rfq_vendor_prices FOR SELECT USING (true);


--
-- Name: rfq_vendors Authenticated users can view RFQ vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view RFQ vendors" ON public.rfq_vendors FOR SELECT USING (true);


--
-- Name: rfqs Authenticated users can view RFQs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view RFQs" ON public.rfqs FOR SELECT USING (true);


--
-- Name: project_alerts Authenticated users can view alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view alerts" ON public.project_alerts FOR SELECT USING (true);


--
-- Name: approval_roles Authenticated users can view approval roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view approval roles" ON public.approval_roles FOR SELECT USING (true);


--
-- Name: approval_rules Authenticated users can view approval rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view approval rules" ON public.approval_rules FOR SELECT USING (true);


--
-- Name: vendors Authenticated users can view approved vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view approved vendors" ON public.vendors FOR SELECT USING (((status = 'approved'::public.vendor_status) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR (created_by = auth.uid())));


--
-- Name: company_documents Authenticated users can view company documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view company documents" ON public.company_documents FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: company_settings Authenticated users can view company settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view company settings" ON public.company_settings FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: cost_centers Authenticated users can view cost centers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view cost centers" ON public.cost_centers FOR SELECT TO authenticated USING (true);


--
-- Name: departments Authenticated users can view departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view departments" ON public.departments FOR SELECT TO authenticated USING (true);


--
-- Name: goods_receipt_items Authenticated users can view goods receipt items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view goods receipt items" ON public.goods_receipt_items FOR SELECT USING (true);


--
-- Name: goods_receipts Authenticated users can view goods receipts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view goods receipts" ON public.goods_receipts FOR SELECT USING (true);


--
-- Name: inventory_categories Authenticated users can view inventory categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view inventory categories" ON public.inventory_categories FOR SELECT USING (true);


--
-- Name: inventory_items Authenticated users can view inventory items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view inventory items" ON public.inventory_items FOR SELECT USING (true);


--
-- Name: project_milestones Authenticated users can view milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view milestones" ON public.project_milestones FOR SELECT USING (true);


--
-- Name: approval_overrides Authenticated users can view overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view overrides" ON public.approval_overrides FOR SELECT USING (true);


--
-- Name: petty_cash_claims Authenticated users can view petty cash claims; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view petty cash claims" ON public.petty_cash_claims FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: petty_cash_items Authenticated users can view petty cash items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view petty cash items" ON public.petty_cash_items FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: projects Authenticated users can view projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view projects" ON public.projects FOR SELECT USING (true);


--
-- Name: vendor_due_diligence_reports Authenticated users can view reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view reports" ON public.vendor_due_diligence_reports FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: approval_rule_approvers Authenticated users can view rule approvers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view rule approvers" ON public.approval_rule_approvers FOR SELECT USING (true);


--
-- Name: sequence_counters Authenticated users can view sequences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view sequences" ON public.sequence_counters FOR SELECT TO authenticated USING (true);


--
-- Name: stock_movements Authenticated users can view stock movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view stock movements" ON public.stock_movements FOR SELECT USING (true);


--
-- Name: project_team_members Authenticated users can view team members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view team members" ON public.project_team_members FOR SELECT USING (true);


--
-- Name: approval_thresholds Authenticated users can view thresholds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view thresholds" ON public.approval_thresholds FOR SELECT USING (true);


--
-- Name: project_budget_transactions Authenticated users can view transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view transactions" ON public.project_budget_transactions FOR SELECT USING (true);


--
-- Name: user_approvers Authenticated users can view user approvers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view user approvers" ON public.user_approvers FOR SELECT USING (true);


--
-- Name: project_variations Authenticated users can view variations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view variations" ON public.project_variations FOR SELECT USING (true);


--
-- Name: vendor_categories Authenticated users can view vendor categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view vendor categories" ON public.vendor_categories FOR SELECT USING (true);


--
-- Name: vendor_category_mappings Authenticated users can view vendor categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view vendor categories" ON public.vendor_category_mappings FOR SELECT USING (true);


--
-- Name: approval_matrix_versions Authenticated users can view versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view versions" ON public.approval_matrix_versions FOR SELECT USING (true);


--
-- Name: vendor_bank_details Authorized users can view vendor bank details; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized users can view vendor bank details" ON public.vendor_bank_details FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.vendors v
  WHERE ((v.id = vendor_bank_details.vendor_id) AND (v.created_by = auth.uid()))))));


--
-- Name: purchase_orders Buyers and admins can create POs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers and admins can create POs" ON public.purchase_orders FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role)));


--
-- Name: petty_cash_claims Creators and admins can update claims; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators and admins can update claims" ON public.petty_cash_claims FOR UPDATE USING (((created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: exchange_rates Exchange rates are readable by all authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exchange rates are readable by all authenticated users" ON public.exchange_rates FOR SELECT TO authenticated USING (true);


--
-- Name: role_requests Line managers can update requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Line managers can update requests" ON public.role_requests FOR UPDATE USING (((line_manager_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: projects Managers can manage their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can manage their projects" ON public.projects USING ((public.has_role(auth.uid(), 'manager'::public.app_role) OR (manager_id = auth.uid()) OR (created_by = auth.uid())));


--
-- Name: project_budget_transactions Project managers can insert transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project managers can insert transactions" ON public.project_budget_transactions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_budget_transactions.project_id) AND ((p.manager_id = auth.uid()) OR (p.created_by = auth.uid()) OR public.has_role(auth.uid(), 'manager'::public.app_role))))));


--
-- Name: project_milestones Project managers can manage milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project managers can manage milestones" ON public.project_milestones USING ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_milestones.project_id) AND ((p.manager_id = auth.uid()) OR (p.created_by = auth.uid()))))));


--
-- Name: project_team_members Project managers can manage team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project managers can manage team" ON public.project_team_members USING ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_team_members.project_id) AND ((p.manager_id = auth.uid()) OR (p.created_by = auth.uid()))))));


--
-- Name: project_variations Project managers can manage variations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project managers can manage variations" ON public.project_variations USING ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_variations.project_id) AND ((p.manager_id = auth.uid()) OR (p.created_by = auth.uid()))))));


--
-- Name: rfq_vendor_prices Public can insert vendor prices for valid submission; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can insert vendor prices for valid submission" ON public.rfq_vendor_prices FOR INSERT WITH CHECK (true);


--
-- Name: rfq_vendors Public can update RFQ vendor quotation by token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can update RFQ vendor quotation by token" ON public.rfq_vendors FOR UPDATE USING (((submission_token IS NOT NULL) AND (token_expires_at > now()))) WITH CHECK (((submission_token IS NOT NULL) AND (token_expires_at > now())));


--
-- Name: rfq_items Public can view RFQ items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view RFQ items" ON public.rfq_items FOR SELECT USING (true);


--
-- Name: rfq_vendors Public can view RFQ vendor by token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view RFQ vendor by token" ON public.rfq_vendors FOR SELECT USING ((submission_token IS NOT NULL));


--
-- Name: rfqs Public can view RFQs by vendor token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view RFQs by vendor token" ON public.rfqs FOR SELECT USING (true);


--
-- Name: exchange_rates Service role can manage exchange rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage exchange rates" ON public.exchange_rates TO service_role USING (true) WITH CHECK (true);


--
-- Name: po_copies System can insert PO copies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert PO copies" ON public.po_copies FOR INSERT WITH CHECK (true);


--
-- Name: approval_audit_logs System can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert audit logs" ON public.approval_audit_logs FOR INSERT WITH CHECK (true);


--
-- Name: system_audit_logs System can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert audit logs" ON public.system_audit_logs FOR INSERT WITH CHECK (true);


--
-- Name: document_assignments Users can create assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create assignments" ON public.document_assignments FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: inventory_items Users can create inventory items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create inventory items" ON public.inventory_items FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: role_requests Users can create own role requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own role requests" ON public.role_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: petty_cash_claims Users can create petty cash claims; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create petty cash claims" ON public.petty_cash_claims FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: projects Users can create projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));


--
-- Name: report_downloads Users can manage their own report downloads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own report downloads" ON public.report_downloads USING ((downloaded_by = auth.uid()));


--
-- Name: project_alerts Users can update alert read status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update alert read status" ON public.project_alerts FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid()));


--
-- Name: approval_workflow_actions Users can view and act on their actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view and act on their actions" ON public.approval_workflow_actions FOR SELECT USING (((approver_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: document_assignments Users can view assignments they're involved in; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view assignments they're involved in" ON public.document_assignments FOR SELECT USING (((assigned_from = auth.uid()) OR (assigned_to = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: vendor_document_alerts Users can view document alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view document alerts" ON public.vendor_document_alerts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.vendors v
  WHERE ((v.id = vendor_document_alerts.vendor_id) AND ((v.status = 'approved'::public.vendor_status) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR (v.created_by = auth.uid()))))));


--
-- Name: profiles Users can view own profile or authorized roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile or authorized roles" ON public.profiles FOR SELECT USING (((id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: role_requests Users can view own role requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own role requests" ON public.role_requests FOR SELECT USING (((user_id = auth.uid()) OR (line_manager_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: approval_workflows Users can view related workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view related workflows" ON public.approval_workflows FOR SELECT USING (((initiated_by = auth.uid()) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: vendor_contacts Users can view vendor contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view vendor contacts" ON public.vendor_contacts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.vendors v
  WHERE ((v.id = vendor_contacts.vendor_id) AND ((v.status = 'approved'::public.vendor_status) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR (v.created_by = auth.uid()))))));


--
-- Name: vendor_documents Users can view vendor documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view vendor documents" ON public.vendor_documents FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.vendors v
  WHERE ((v.id = vendor_documents.vendor_id) AND ((v.status = 'approved'::public.vendor_status) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR (v.created_by = auth.uid()))))));


--
-- Name: approval_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.approval_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: approval_matrix_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.approval_matrix_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: approval_overrides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.approval_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: approval_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.approval_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: approval_rule_approvers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.approval_rule_approvers ENABLE ROW LEVEL SECURITY;

--
-- Name: approval_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: approval_thresholds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.approval_thresholds ENABLE ROW LEVEL SECURITY;

--
-- Name: approval_workflow_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.approval_workflow_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: approval_workflows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;

--
-- Name: company_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: company_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: cost_centers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: document_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: goods_receipt_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goods_receipt_items ENABLE ROW LEVEL SECURITY;

--
-- Name: goods_receipts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

--
-- Name: petty_cash_claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.petty_cash_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: petty_cash_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.petty_cash_items ENABLE ROW LEVEL SECURITY;

--
-- Name: po_copies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.po_copies ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: project_budget_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_budget_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: project_milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: project_team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: project_variations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_variations ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_request_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_request_items ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: report_downloads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.report_downloads ENABLE ROW LEVEL SECURITY;

--
-- Name: rfi_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rfi_items ENABLE ROW LEVEL SECURITY;

--
-- Name: rfi_vendors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rfi_vendors ENABLE ROW LEVEL SECURITY;

--
-- Name: rfis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rfis ENABLE ROW LEVEL SECURITY;

--
-- Name: rfq_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rfq_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: rfq_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rfq_items ENABLE ROW LEVEL SECURITY;

--
-- Name: rfq_vendor_prices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rfq_vendor_prices ENABLE ROW LEVEL SECURITY;

--
-- Name: rfq_vendors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rfq_vendors ENABLE ROW LEVEL SECURITY;

--
-- Name: rfqs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;

--
-- Name: role_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: sequence_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sequence_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: system_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: user_approvers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_approvers ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_bank_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_bank_details ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_category_mappings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_category_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_document_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_document_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_due_diligence_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_due_diligence_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: vendors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;