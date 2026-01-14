--
-- PostgreSQL database dump
--

\restrict B6pjRKg5e59EdEsi4dT0Aj3flERgOEAT1em1Ie1XRaoMQSAZOV70SeWXRZ2rn1r

-- Dumped from database version 18.1 (Postgres.app)
-- Dumped by pg_dump version 18.1 (Postgres.app)

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
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: application_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.application_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    application_id uuid NOT NULL,
    changed_by uuid NOT NULL,
    old_status character varying(50),
    new_status character varying(50),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.application_history OWNER TO postgres;

--
-- Name: TABLE application_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.application_history IS 'Historique des changements de statut des candidatures';


--
-- Name: applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.applications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    candidate_id uuid NOT NULL,
    job_id uuid NOT NULL,
    created_by uuid NOT NULL,
    status character varying(50) DEFAULT 'sourcé'::character varying,
    is_in_shortlist boolean DEFAULT false,
    client_feedback text,
    client_validated boolean,
    client_validated_at timestamp without time zone,
    offer_sent_at timestamp without time zone,
    offer_accepted boolean,
    offer_accepted_at timestamp without time zone,
    onboarding_completed boolean DEFAULT false,
    onboarding_completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT applications_status_check CHECK (((status)::text = ANY ((ARRAY['sourcé'::character varying, 'qualifié'::character varying, 'entretien_rh'::character varying, 'entretien_client'::character varying, 'shortlist'::character varying, 'offre'::character varying, 'rejeté'::character varying, 'embauché'::character varying])::text[])))
);


ALTER TABLE public.applications OWNER TO postgres;

--
-- Name: TABLE applications; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.applications IS 'Table de liaison entre candidats et jobs (candidatures)';


--
-- Name: candidate_job_comparisons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.candidate_job_comparisons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidate_id uuid NOT NULL,
    job_id uuid NOT NULL,
    created_by uuid NOT NULL,
    analysis_data text NOT NULL,
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
    updated_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text)
);


ALTER TABLE public.candidate_job_comparisons OWNER TO postgres;

--
-- Name: TABLE candidate_job_comparisons; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.candidate_job_comparisons IS 'Stocke les analyses IA de correspondance entre candidats et besoins de recrutement';


--
-- Name: candidates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.candidates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255),
    phone character varying(20),
    cv_file_path character varying(500),
    profile_picture_url character varying(500),
    tags text[],
    skills text[],
    source character varying(50),
    status character varying(50) DEFAULT 'sourcé'::character varying,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT candidates_status_check CHECK (((status)::text = ANY ((ARRAY['sourcé'::character varying, 'qualifié'::character varying, 'entretien_rh'::character varying, 'entretien_client'::character varying, 'shortlist'::character varying, 'offre'::character varying, 'rejeté'::character varying, 'embauché'::character varying])::text[])))
);


ALTER TABLE public.candidates OWNER TO postgres;

--
-- Name: TABLE candidates; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.candidates IS 'Table des candidats (personnes candidates)';


--
-- Name: COLUMN candidates.profile_picture_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.candidates.profile_picture_url IS 'URL de la photo de profil du candidat';


--
-- Name: COLUMN candidates.skills; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.candidates.skills IS 'Liste des compétences du candidat (tableau PostgreSQL)';


--
-- Name: client_interview_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_interview_requests (
    id uuid NOT NULL,
    application_id uuid,
    client_id uuid,
    availability_slots text,
    notes text,
    status character varying(20) NOT NULL,
    scheduled_interview_id uuid,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.client_interview_requests OWNER TO postgres;

--
-- Name: interviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.interviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    application_id uuid NOT NULL,
    interview_type character varying(50) NOT NULL,
    scheduled_at timestamp without time zone NOT NULL,
    location character varying(255),
    interviewer_id uuid,
    preparation_notes text,
    feedback text,
    feedback_provided_at timestamp without time zone,
    decision character varying(20),
    score integer,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    scheduled_end_at timestamp without time zone,
    meeting_link character varying(500),
    notes text,
    status character varying(20) DEFAULT 'planifié'::character varying,
    rescheduled_at timestamp without time zone,
    rescheduling_reason text,
    cancellation_reason text,
    cancelled_at timestamp without time zone,
    completed_at timestamp without time zone,
    CONSTRAINT interviews_decision_check CHECK (((decision)::text = ANY ((ARRAY['positif'::character varying, 'négatif'::character varying, 'en_attente'::character varying])::text[]))),
    CONSTRAINT interviews_interview_type_check CHECK (((interview_type)::text = ANY ((ARRAY['rh'::character varying, 'technique'::character varying, 'client'::character varying, 'prequalification'::character varying, 'qualification'::character varying, 'autre'::character varying])::text[]))),
    CONSTRAINT interviews_score_check CHECK (((score >= 0) AND (score <= 10))),
    CONSTRAINT interviews_status_check CHECK (((status)::text = ANY ((ARRAY['planifié'::character varying, 'réalisé'::character varying, 'reporté'::character varying, 'annulé'::character varying])::text[])))
);


ALTER TABLE public.interviews OWNER TO postgres;

--
-- Name: TABLE interviews; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.interviews IS 'Table des entretiens planifiés et réalisés';


--
-- Name: COLUMN interviews.decision; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.interviews.decision IS 'Décision de l''entretien : positif, négatif, en_attente';


--
-- Name: COLUMN interviews.score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.interviews.score IS 'Score sur 10 de l''entretien';


--
-- Name: COLUMN interviews.meeting_link; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.interviews.meeting_link IS 'Lien de visioconférence si l''entretien est virtuel';


--
-- Name: COLUMN interviews.notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.interviews.notes IS 'Notes préparatoires pour l''entretien';


--
-- Name: job_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    job_id uuid,
    modified_by uuid NOT NULL,
    field_name character varying(100),
    old_value text,
    new_value text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.job_history OWNER TO postgres;

--
-- Name: TABLE job_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.job_history IS 'Historique des modifications sur les jobs';


--
-- Name: job_recruiters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_recruiters (
    id uuid NOT NULL,
    job_id uuid,
    recruiter_id uuid,
    assigned_at timestamp without time zone NOT NULL,
    assigned_by uuid
);


ALTER TABLE public.job_recruiters OWNER TO postgres;

--
-- Name: jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    department character varying(100),
    contract_type character varying(50),
    budget numeric(10,2),
    urgency character varying(20),
    status character varying(20) DEFAULT 'brouillon'::character varying,
    job_description_file_path character varying(500),
    created_by uuid NOT NULL,
    validated_by uuid,
    validated_at timestamp without time zone,
    closed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    manager_demandeur character varying(255),
    entreprise character varying(255),
    motif_recrutement character varying(50),
    date_prise_poste date,
    missions_principales text,
    missions_secondaires text,
    kpi_poste text,
    niveau_formation character varying(20),
    experience_requise integer,
    competences_techniques_obligatoires text[],
    competences_techniques_souhaitees text[],
    competences_comportementales text[],
    langues_requises text,
    certifications_requises text,
    localisation character varying(255),
    mobilite_deplacements character varying(20),
    teletravail character varying(20),
    contraintes_horaires text,
    criteres_eliminatoires text,
    salaire_minimum double precision,
    salaire_maximum double precision,
    avantages text[],
    evolution_poste text,
    CONSTRAINT jobs_status_check CHECK (((status)::text = ANY ((ARRAY['brouillon'::character varying, 'validé'::character varying, 'en_cours'::character varying, 'clôturé'::character varying])::text[]))),
    CONSTRAINT jobs_urgency_check CHECK (((urgency)::text = ANY ((ARRAY['faible'::character varying, 'moyenne'::character varying, 'haute'::character varying, 'critique'::character varying])::text[])))
);


ALTER TABLE public.jobs OWNER TO postgres;

--
-- Name: TABLE jobs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.jobs IS 'Table des besoins de recrutement (postes à pourvoir)';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    user_id uuid,
    title character varying(255) NOT NULL,
    message character varying NOT NULL,
    notification_type character varying(50) NOT NULL,
    is_read boolean NOT NULL,
    related_job_id uuid,
    related_application_id uuid,
    email_sent boolean NOT NULL,
    email_sent_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    read_at timestamp without time zone,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: offers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.offers (
    id uuid NOT NULL,
    application_id uuid,
    sent_by uuid,
    salary double precision,
    contract_type character varying(50),
    start_date timestamp without time zone,
    benefits text,
    notes text,
    status character varying(20) NOT NULL,
    sent_at timestamp without time zone NOT NULL,
    responded_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.offers OWNER TO postgres;

--
-- Name: onboarding_checklists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.onboarding_checklists (
    id uuid NOT NULL,
    application_id uuid,
    document_signed boolean NOT NULL,
    document_signed_at timestamp without time zone,
    background_check boolean NOT NULL,
    background_check_at timestamp without time zone,
    equipment_provided boolean NOT NULL,
    equipment_provided_at timestamp without time zone,
    training_completed boolean NOT NULL,
    training_completed_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.onboarding_checklists OWNER TO postgres;

--
-- Name: security_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.security_logs (
    id uuid NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    ip_address character varying(45),
    user_agent text,
    success boolean NOT NULL,
    details text,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.security_logs OWNER TO postgres;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    id uuid NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    description text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: team_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_members (
    id uuid NOT NULL,
    team_id uuid,
    user_id uuid,
    role character varying(50) NOT NULL,
    joined_at timestamp without time zone NOT NULL
);


ALTER TABLE public.team_members OWNER TO postgres;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    department character varying(100),
    manager_id uuid,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    role character varying(20) NOT NULL,
    phone character varying(20),
    department character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['recruteur'::character varying, 'manager'::character varying, 'client'::character varying, 'administrateur'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'Table des utilisateurs de l''application (recruteurs, managers, clients, administrateurs)';


--
-- Data for Name: application_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.application_history (id, application_id, changed_by, old_status, new_status, notes, created_at) FROM stdin;
\.


--
-- Data for Name: applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.applications (id, candidate_id, job_id, created_by, status, is_in_shortlist, client_feedback, client_validated, client_validated_at, offer_sent_at, offer_accepted, offer_accepted_at, onboarding_completed, onboarding_completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: candidate_job_comparisons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.candidate_job_comparisons (id, candidate_id, job_id, created_by, analysis_data, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: candidates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.candidates (id, first_name, last_name, email, phone, cv_file_path, profile_picture_url, tags, skills, source, status, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: client_interview_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.client_interview_requests (id, application_id, client_id, availability_slots, notes, status, scheduled_interview_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: interviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.interviews (id, application_id, interview_type, scheduled_at, location, interviewer_id, preparation_notes, feedback, feedback_provided_at, decision, score, created_by, created_at, updated_at, scheduled_end_at, meeting_link, notes, status, rescheduled_at, rescheduling_reason, cancellation_reason, cancelled_at, completed_at) FROM stdin;
\.


--
-- Data for Name: job_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_history (id, job_id, modified_by, field_name, old_value, new_value, created_at) FROM stdin;
\.


--
-- Data for Name: job_recruiters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_recruiters (id, job_id, recruiter_id, assigned_at, assigned_by) FROM stdin;
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobs (id, title, department, contract_type, budget, urgency, status, job_description_file_path, created_by, validated_by, validated_at, closed_at, created_at, updated_at, manager_demandeur, entreprise, motif_recrutement, date_prise_poste, missions_principales, missions_secondaires, kpi_poste, niveau_formation, experience_requise, competences_techniques_obligatoires, competences_techniques_souhaitees, competences_comportementales, langues_requises, certifications_requises, localisation, mobilite_deplacements, teletravail, contraintes_horaires, criteres_eliminatoires, salaire_minimum, salaire_maximum, avantages, evolution_poste) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, notification_type, is_read, related_job_id, related_application_id, email_sent, email_sent_at, created_at, read_at, updated_at) FROM stdin;
\.


--
-- Data for Name: offers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.offers (id, application_id, sent_by, salary, contract_type, start_date, benefits, notes, status, sent_at, responded_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: onboarding_checklists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.onboarding_checklists (id, application_id, document_signed, document_signed_at, background_check, background_check_at, equipment_provided, equipment_provided_at, training_completed, training_completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: security_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.security_logs (id, user_id, action, ip_address, user_agent, success, details, created_at) FROM stdin;
1439c323-a549-4c4f-8e76-c86ce1d0b12e	\N	failed_login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	f	User not found	2026-01-11 17:39:38.169113
7083c0db-7f98-4d43-bb67-f6dabd72c2dc	\N	failed_login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	f	User not found	2026-01-11 17:39:49.452044
17b7af4f-8ad5-44dc-b4ca-58f7a17b98fb	\N	failed_login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	f	User not found	2026-01-11 17:40:13.132012
7d945600-f37a-4cd3-9d4f-abf8e9dbd150	\N	failed_login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	f	User not found	2026-01-11 17:42:16.718897
86396a54-cb9a-42c8-bfdb-8370a7b7fa3c	13434276-77e4-40fe-b6bc-11dfd4a989db	login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	t	\N	2026-01-11 17:47:11.489588
2fa6cf5d-bb4d-466b-99c3-54b11c0a70de	\N	failed_login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	f	User not found	2026-01-11 17:49:31.848682
b2142e6a-6768-4318-96b4-36c02de674c6	\N	failed_login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	f	User not found	2026-01-11 17:52:39.171994
f6722dee-ba91-4f11-816a-af292dc5b88d	13434276-77e4-40fe-b6bc-11dfd4a989db	login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	t	\N	2026-01-11 17:53:01.266564
c1fddd91-abf3-4044-bff3-7baec72d74ec	\N	failed_login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	f	User not found	2026-01-11 18:38:01.952545
4b90464c-7d78-4bdc-a400-6f2e7e1729e4	13434276-77e4-40fe-b6bc-11dfd4a989db	login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	t	\N	2026-01-11 18:38:06.006485
1fab4a0f-4ac9-4dbe-8c3f-82a14116f486	13434276-77e4-40fe-b6bc-11dfd4a989db	login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	t	\N	2026-01-11 20:50:29.943678
2cb6a793-ea7d-48ee-aea6-2905b3332c74	\N	login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	t	\N	2026-01-11 20:50:24.002968
437551a3-b8ed-4b02-91a3-e71b3b415b85	\N	login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	t	\N	2026-01-11 17:49:07.532061
a791bc6e-a2e7-424e-9ac0-137e81a22485	3e218f0a-60bf-4a13-9073-48a10a083d35	login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	t	\N	2026-01-11 21:15:21.345092
1a6acbb4-799f-4c7d-bec7-ac1f0b4437db	3e218f0a-60bf-4a13-9073-48a10a083d35	login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	t	\N	2026-01-11 23:45:46.705221
97cbd6b8-c61b-4105-8fef-443640b543cf	33012bc5-c0d1-4fe7-b642-c4d353a0ddff	login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	t	\N	2026-01-11 23:54:11.344561
050c2a9c-d4a9-4f5c-b880-0068eaa8f125	33012bc5-c0d1-4fe7-b642-c4d353a0ddff	login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	t	\N	2026-01-11 23:56:01.823009
a8579c2a-def4-4bfb-997a-29b73f901e05	33012bc5-c0d1-4fe7-b642-c4d353a0ddff	login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	t	\N	2026-01-11 23:56:07.217067
d4a74120-c10e-46dc-947a-664f8bfa6436	33012bc5-c0d1-4fe7-b642-c4d353a0ddff	login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	t	\N	2026-01-11 23:59:30.000864
e46c5734-dbd6-4d49-9a47-cdc2def1832b	33012bc5-c0d1-4fe7-b642-c4d353a0ddff	login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	t	\N	2026-01-12 00:00:08.134518
21811b02-1a51-4f2b-9aae-d4880fb032df	3e218f0a-60bf-4a13-9073-48a10a083d35	login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	t	\N	2026-01-12 00:24:49.409505
f3822be2-2797-47d1-94d1-defed4fcf20a	33012bc5-c0d1-4fe7-b642-c4d353a0ddff	login	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	t	\N	2026-01-12 00:25:37.463929
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (id, key, value, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: team_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.team_members (id, team_id, user_id, role, joined_at) FROM stdin;
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teams (id, name, description, department, manager_id, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, first_name, last_name, role, phone, department, is_active, created_at, updated_at) FROM stdin;
13434276-77e4-40fe-b6bc-11dfd4a989db	admin@yemma-gates.com	$2b$12$LjtoJ.L.WynpLJCW9mqajOuUL/C8WpeldhACtU7eE/9IfGMn7POQ.	Romaric	Tokpa	administrateur	0798872672	Yemma	t	2026-01-11 17:46:46.029963	2026-01-11 17:46:46.030223
3e218f0a-60bf-4a13-9073-48a10a083d35	romaric.tokpa0@gmail.com	$2b$12$kbaW3ceX7ha9Gu9DU7r18eXo7nu0nrRsQdSYE.pEaQ5Sxh3LtpBuK	Alex	Beugre	manager	0798872672	Yemma	t	2026-01-11 21:13:54.808227	2026-01-11 21:13:54.808316
cb704367-bd0b-4dbb-b4b7-a4f303190053	candidatures.dbb@gmail.com	$2b$12$JKExoYardBNNM604h5O7pevHbZ8deoZlX4siTGXBfE75gUVzGkyo6	Anne	Tokpa	recruteur	+2250798872672	Yemma	t	2026-01-11 21:23:11.075327	2026-01-11 21:23:11.075624
33012bc5-c0d1-4fe7-b642-c4d353a0ddff	tokpafabrice78@gmail.com	$2b$12$4Wg5vuWLLrz2wMSLicJHd.emBe0vcIUTxsQ91JMDgtKcwKt4wnnzW	Tokpa	Romaric	recruteur	0798872672	Yemma	t	2026-01-11 21:09:13.870055	2026-01-12 00:26:50.347441
964ac529-d664-4852-9d2a-57ed819a9482	admin@test.com	$2b$12$aaeOJvwynrPi5tf5ab7egeb.mv8Wsv4wivxi3AnyPw0mbELG0uvj.	Admin	Test	administrateur	\N	\N	t	2026-01-13 20:57:05.758656	2026-01-13 20:57:05.758812
52def10c-8826-439b-8310-deb951ff791e	manager@test.com	$2b$12$xPagemipInmPUAGUCbdvQO8Ep8oJ5mMODNCPj6DCtWmhfKBpeipT6	Manager	Test	manager	\N	\N	t	2026-01-13 20:57:06.606526	2026-01-13 20:57:06.606714
c6b3ceb1-c302-4adb-9848-df704d60ac7e	recruteur@test.com	$2b$12$jCJs1KLf8FQdr6nT1HlA.e/9dzdkhrRoU/SYwdXFciiieco7oRQBa	Recruteur	Test	recruteur	\N	\N	t	2026-01-13 20:57:07.328718	2026-01-13 20:57:07.328924
f4585c17-58cd-4c3d-9e3e-d248abeeca43	client@test.com	$2b$12$W7W.Cn7u99RsSsGXnBS2iOn9YL0u0tsOSHXpO0qP/hW8se4EUfSwe	Client	Test	client	\N	\N	t	2026-01-13 20:57:08.261699	2026-01-13 20:57:08.261866
\.


--
-- Name: application_history application_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_history
    ADD CONSTRAINT application_history_pkey PRIMARY KEY (id);


--
-- Name: applications applications_candidate_id_job_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_candidate_id_job_id_key UNIQUE (candidate_id, job_id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: candidate_job_comparisons candidate_job_comparisons_candidate_id_job_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_job_comparisons
    ADD CONSTRAINT candidate_job_comparisons_candidate_id_job_id_key UNIQUE (candidate_id, job_id);


--
-- Name: candidate_job_comparisons candidate_job_comparisons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_job_comparisons
    ADD CONSTRAINT candidate_job_comparisons_pkey PRIMARY KEY (id);


--
-- Name: candidates candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);


--
-- Name: client_interview_requests client_interview_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_interview_requests
    ADD CONSTRAINT client_interview_requests_pkey PRIMARY KEY (id);


--
-- Name: interviews interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_pkey PRIMARY KEY (id);


--
-- Name: job_history job_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_history
    ADD CONSTRAINT job_history_pkey PRIMARY KEY (id);


--
-- Name: job_recruiters job_recruiters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_recruiters
    ADD CONSTRAINT job_recruiters_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- Name: onboarding_checklists onboarding_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_checklists
    ADD CONSTRAINT onboarding_checklists_pkey PRIMARY KEY (id);


--
-- Name: security_logs security_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_logs
    ADD CONSTRAINT security_logs_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_application_history_application_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_application_history_application_id ON public.application_history USING btree (application_id);


--
-- Name: idx_applications_candidate_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_applications_candidate_id ON public.applications USING btree (candidate_id);


--
-- Name: idx_applications_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_applications_created_by ON public.applications USING btree (created_by);


--
-- Name: idx_applications_job_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_applications_job_id ON public.applications USING btree (job_id);


--
-- Name: idx_applications_shortlist; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_applications_shortlist ON public.applications USING btree (is_in_shortlist);


--
-- Name: idx_applications_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_applications_status ON public.applications USING btree (status);


--
-- Name: idx_candidate_job_comparisons_candidate; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_candidate_job_comparisons_candidate ON public.candidate_job_comparisons USING btree (candidate_id);


--
-- Name: idx_candidate_job_comparisons_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_candidate_job_comparisons_created_by ON public.candidate_job_comparisons USING btree (created_by);


--
-- Name: idx_candidate_job_comparisons_job; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_candidate_job_comparisons_job ON public.candidate_job_comparisons USING btree (job_id);


--
-- Name: idx_candidates_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_candidates_created_by ON public.candidates USING btree (created_by);


--
-- Name: idx_candidates_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_candidates_email ON public.candidates USING btree (email);


--
-- Name: idx_candidates_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_candidates_source ON public.candidates USING btree (source);


--
-- Name: idx_candidates_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_candidates_status ON public.candidates USING btree (status);


--
-- Name: idx_interviews_application_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_interviews_application_id ON public.interviews USING btree (application_id);


--
-- Name: idx_interviews_interviewer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_interviews_interviewer_id ON public.interviews USING btree (interviewer_id);


--
-- Name: idx_interviews_scheduled_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_interviews_scheduled_at ON public.interviews USING btree (scheduled_at);


--
-- Name: idx_interviews_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_interviews_type ON public.interviews USING btree (interview_type);


--
-- Name: idx_job_history_job_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_history_job_id ON public.job_history USING btree (job_id);


--
-- Name: idx_jobs_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_created_by ON public.jobs USING btree (created_by);


--
-- Name: idx_jobs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);


--
-- Name: idx_jobs_validated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_validated_by ON public.jobs USING btree (validated_by);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: applications update_applications_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: candidates update_candidates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: interviews update_interviews_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: jobs update_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: application_history application_history_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_history
    ADD CONSTRAINT application_history_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: application_history application_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_history
    ADD CONSTRAINT application_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: applications applications_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: applications applications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: candidate_job_comparisons candidate_job_comparisons_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_job_comparisons
    ADD CONSTRAINT candidate_job_comparisons_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: candidate_job_comparisons candidate_job_comparisons_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_job_comparisons
    ADD CONSTRAINT candidate_job_comparisons_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: candidate_job_comparisons candidate_job_comparisons_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_job_comparisons
    ADD CONSTRAINT candidate_job_comparisons_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: candidates candidates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: client_interview_requests client_interview_requests_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_interview_requests
    ADD CONSTRAINT client_interview_requests_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: client_interview_requests client_interview_requests_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_interview_requests
    ADD CONSTRAINT client_interview_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: client_interview_requests client_interview_requests_scheduled_interview_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_interview_requests
    ADD CONSTRAINT client_interview_requests_scheduled_interview_id_fkey FOREIGN KEY (scheduled_interview_id) REFERENCES public.interviews(id) ON DELETE SET NULL;


--
-- Name: interviews interviews_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: interviews interviews_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: interviews interviews_interviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_interviewer_id_fkey FOREIGN KEY (interviewer_id) REFERENCES public.users(id);


--
-- Name: job_history job_history_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_history
    ADD CONSTRAINT job_history_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;


--
-- Name: job_history job_history_modified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_history
    ADD CONSTRAINT job_history_modified_by_fkey FOREIGN KEY (modified_by) REFERENCES public.users(id);


--
-- Name: job_recruiters job_recruiters_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_recruiters
    ADD CONSTRAINT job_recruiters_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: job_recruiters job_recruiters_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_recruiters
    ADD CONSTRAINT job_recruiters_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: job_recruiters job_recruiters_recruiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_recruiters
    ADD CONSTRAINT job_recruiters_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: jobs jobs_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.users(id);


--
-- Name: notifications notifications_related_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_related_application_id_fkey FOREIGN KEY (related_application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_related_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_related_job_id_fkey FOREIGN KEY (related_job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: offers offers_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: offers offers_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.users(id);


--
-- Name: onboarding_checklists onboarding_checklists_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_checklists
    ADD CONSTRAINT onboarding_checklists_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: security_logs security_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_logs
    ADD CONSTRAINT security_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teams teams_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict B6pjRKg5e59EdEsi4dT0Aj3flERgOEAT1em1Ie1XRaoMQSAZOV70SeWXRZ2rn1r

