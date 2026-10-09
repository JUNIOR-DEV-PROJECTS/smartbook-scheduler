ALTER TABLE public.businesses ALTER COLUMN timezone SET DEFAULT 'America/Cuiaba';
ALTER TABLE public.businesses ALTER COLUMN notify_confirmation SET DEFAULT false;
ALTER TABLE public.businesses ALTER COLUMN notify_reminder SET DEFAULT false;
ALTER TABLE public.businesses ALTER COLUMN notify_cancellation SET DEFAULT false;