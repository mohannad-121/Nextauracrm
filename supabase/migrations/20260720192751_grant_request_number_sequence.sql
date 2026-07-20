-- Existing projects need explicit sequence privileges so inserts into
-- client_requests can generate request numbers through the trigger.
GRANT USAGE, SELECT ON SEQUENCE public.request_number_seq TO authenticated;
GRANT ALL ON SEQUENCE public.request_number_seq TO service_role;
