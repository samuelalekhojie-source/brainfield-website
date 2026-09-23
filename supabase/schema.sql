-- =========================================================================
-- Brainfield CMS — Supabase schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste
-- this whole file → Run.
-- =========================================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------------------
-- 1. content_blocks — every editable heading / paragraph / image on the
--    site. `key` is the unique id used in the HTML (data-cms="...").
-- -------------------------------------------------------------------------
create table if not exists content_blocks (
  key         text primary key,
  page        text not null,          -- 'global' | 'home' | 'about' | 'consult' | 'agro' | 'gallery' | 'contact'
  section     text not null,          -- human grouping shown in the admin UI, e.g. 'Hero'
  label       text not null,          -- human label shown in the admin UI, e.g. 'Hero heading'
  type        text not null default 'text', -- 'text' | 'textarea' | 'html' | 'image'
  value       text not null default '',
  sort_order  int  not null default 0,
  updated_at  timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 2. team_members — powers the team cards on Home / About / Services.
-- -------------------------------------------------------------------------
create table if not exists team_members (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  role             text not null,
  bio              text not null default '',
  initials         text not null default '',
  photo_url        text,
  show_on_home     boolean not null default false,
  show_on_about    boolean not null default true,
  show_on_consult  boolean not null default false,
  sort_order       int not null default 0,
  updated_at       timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 3. gallery_images — powers gallery.html.
-- -------------------------------------------------------------------------
create table if not exists gallery_images (
  id          uuid primary key default gen_random_uuid(),
  image_url   text not null,
  alt_text    text not null default '',
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Row Level Security: public can read everything (so the live site works
-- with no login), only a logged-in user can write. There's one admin
-- account for your client, created manually in the Supabase dashboard
-- (see SETUP.md) — nobody can sign themselves up through admin.html.
-- -------------------------------------------------------------------------
alter table content_blocks enable row level security;
alter table team_members   enable row level security;
alter table gallery_images enable row level security;

create policy "public read content_blocks" on content_blocks
  for select using (true);
create policy "auth write content_blocks" on content_blocks
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read team_members" on team_members
  for select using (true);
create policy "auth write team_members" on team_members
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read gallery_images" on gallery_images
  for select using (true);
create policy "auth write gallery_images" on gallery_images
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- -------------------------------------------------------------------------
-- Seed data — this is your current live text, loaded in as a starting
-- point so the site looks identical the moment you switch it on.
-- -------------------------------------------------------------------------

insert into content_blocks (key, page, section, label, type, value, sort_order) values
-- GLOBAL -------------------------------------------------------------------
('global.phone', 'global', 'Contact', 'Phone number', 'text', '+234 803 7212 048', 1),
('global.email', 'global', 'Contact', 'Email address', 'text', 'info@brainfieldng.com', 2),
('global.address', 'global', 'Contact', 'Head office address', 'text', '48, Okota Road, Isolo, Lagos', 3),
('global.footer_tagline', 'global', 'Footer', 'Footer tagline (Consult pages)', 'textarea', 'A Lagos-based oil and gas marketing company, duly registered under the Nigerian Companies and Allied Matters Act.', 4),
('global.logo_consult', 'global', 'Images', 'Header/footer logo (Consult pages)', 'image', 'assets/img/brainfield-consult-logo.png', 5),
('global.logo_group', 'global', 'Images', 'Header/footer logo (Agro page)', 'image', 'assets/img/brainfield-header-logo.png', 6),
('global.logo_mark', 'global', 'Images', 'Small footer mark', 'image', 'assets/img/brainfield-b-trim.png', 7),
('agro.footer_tagline', 'global', 'Footer', 'Footer tagline (Agro page)', 'textarea', 'A Lagos-based group working across energy and agriculture, through Brainfield Consult Limited and Brainfield Agro Limited.', 8),
('agro.logo', 'global', 'Images', 'Agro hero logo', 'image', 'assets/img/brainfield-agro-logo.png', 9),

-- HOME -----------------------------------------------------------------
('home.hero.eyebrow', 'home', 'Hero', 'Eyebrow', 'text', 'Brainfield · Lagos, Nigeria', 1),
('home.hero.title', 'home', 'Hero', 'Heading', 'html', 'Professional. Honest.<br>Built on experience.', 2),
('home.hero.lede', 'home', 'Hero', 'Intro paragraph', 'textarea', 'At Brainfield Consult Limited we strive to maintain a professional and honest relationship with all our clients, suppliers and associates — creating imaginative solutions by bringing to the fore our full and collective experience.', 3),
('home.hero.fact1_value', 'home', 'Hero', 'Fact 1 — value', 'text', '1990', 4),
('home.hero.fact1_label', 'home', 'Hero', 'Fact 1 — label', 'text', 'CAMA-registered company', 5),
('home.hero.fact2_value', 'home', 'Hero', 'Fact 2 — value', 'text', '676934', 6),
('home.hero.fact2_label', 'home', 'Hero', 'Fact 2 — label', 'text', 'RC registration number', 7),
('home.hero.fact3_value', 'home', 'Hero', 'Fact 3 — value', 'text', 'Lagos', 8),
('home.hero.fact3_label', 'home', 'Hero', 'Fact 3 — label', 'text', 'Head office, Isolo', 9),
('home.hero.panel_title', 'home', 'Hero', 'Snapshot panel — title', 'text', 'RC 676934', 10),
('home.hero.panel_text', 'home', 'Hero', 'Snapshot panel — text', 'textarea', 'Duly registered and incorporated under the Nigerian Companies and Allied Matters Decree Act 1990.', 11),
('home.services.eyebrow', 'home', 'Services', 'Eyebrow', 'text', 'Our services', 12),
('home.services.title', 'home', 'Services', 'Heading', 'text', 'Three ways we move product', 13),
('home.services.body', 'home', 'Services', 'Intro paragraph', 'textarea', 'A professional and honest relationship with every client, supplier and associate — with the technical know-how to bring speed and accuracy to every transaction.', 14),
('home.services.card1_title', 'home', 'Services', 'Card 1 — title', 'text', 'Product storage', 15),
('home.services.card1_body', 'home', 'Services', 'Card 1 — text', 'textarea', 'Facilitation, procurement, storage, sales and marketing of refined petroleum products.', 16),
('home.services.card2_title', 'home', 'Services', 'Card 2 — title', 'text', 'Product export', 17),
('home.services.card2_body', 'home', 'Services', 'Card 2 — text', 'textarea', 'Facilitation, export and marketing of Bonny Light Crude Oil.', 18),
('home.services.card3_title', 'home', 'Services', 'Card 3 — title', 'text', 'Product retailing', 19),
('home.services.card3_body', 'home', 'Services', 'Card 3 — text', 'textarea', 'Open-market sales of refined petroleum products.', 20),
('home.stats.stat1_text', 'home', 'Stats', 'Stat 1 — description', 'textarea', 'Cognate experience in oil & gas, held by our COO', 21),
('home.stats.stat2_text', 'home', 'Stats', 'Stat 2 — description', 'textarea', 'Cognate experience in infrastructure, held by our GMD/CEO', 22),
('home.stats.stat3_text', 'home', 'Stats', 'Stat 3 — description', 'textarea', 'Core services — storage, export and retailing', 23),
('home.stats.stat4_text', 'home', 'Stats', 'Stat 4 — description', 'textarea', 'Registered under the CAMA Decree', 24),
('home.why.eyebrow', 'home', 'Why us', 'Eyebrow', 'text', 'Why Brainfield', 25),
('home.why.title', 'home', 'Why us', 'Heading', 'text', 'Quality and safety, non-negotiable', 26),
('home.why.body', 'home', 'Why us', 'Intro paragraph', 'textarea', 'Brainfield places a high premium on quality and safety as the primary requirement for efficient, sustainable service delivery — for our customers and for Nigeria at large.', 27),
('home.why.card1_title', 'home', 'Why us', 'Card 1 — title', 'text', 'Quality & safety', 28),
('home.why.card1_body', 'home', 'Why us', 'Card 1 — text', 'textarea', 'A primary requirement for efficient, sustainable delivery — for our customers and for the nation at large.', 29),
('home.why.card2_title', 'home', 'Why us', 'Card 2 — title', 'text', 'Customer satisfaction', 30),
('home.why.card2_body', 'home', 'Why us', 'Card 2 — text', 'textarea', 'The quality of every job is non-negotiable. Our focus is meeting client satisfaction and continuously improving.', 31),
('home.why.card3_title', 'home', 'Why us', 'Card 3 — title', 'text', 'Qualified & experienced staff', 32),
('home.why.card3_body', 'home', 'Why us', 'Card 3 — text', 'textarea', 'Our biggest asset is our people — highly qualified, experienced Nigerians certified across disciplines.', 33),
('home.leadership.eyebrow', 'home', 'Leadership', 'Eyebrow', 'text', 'Leadership', 34),
('home.leadership.title', 'home', 'Leadership', 'Heading', 'text', 'Decades of cognate experience', 35),
('home.gallery_teaser.eyebrow', 'home', 'Gallery teaser', 'Eyebrow', 'text', 'Gallery', 36),
('home.gallery_teaser.title', 'home', 'Gallery teaser', 'Heading', 'text', 'Take a look inside', 37),
('home.gallery_teaser.body', 'home', 'Gallery teaser', 'Text', 'textarea', 'A visual look at Brainfield Consult''s work.', 38),
('home.cta.title', 'home', 'Closing CTA', 'Heading', 'text', 'Partner with Brainfield', 39),
('home.cta.body', 'home', 'Closing CTA', 'Text', 'textarea', 'Whether you''re sourcing refined petroleum products, exporting Bonny Light Crude, or looking to buy on the open market — we''d like to hear from you.', 40),

-- ABOUT ------------------------------------------------------------------
('about.hero.title', 'about', 'Hero', 'Heading', 'text', 'Professional, honest, and built to last', 1),
('about.hero.lede', 'about', 'Hero', 'Intro paragraph', 'textarea', 'Brainfield Consult Limited is a duly registered and incorporated company under the Nigerian Companies and Allied Matters Decree Act 1990, with registration number RC 676934.', 2),
('about.overview.title', 'about', 'Overview', 'Heading', 'text', 'Company overview', 3),
('about.overview.body1', 'about', 'Overview', 'Paragraph 1', 'textarea', 'At Brainfield Consult Limited we strive to maintain a professional and honest relationship with all our clients, suppliers and associates. We create imaginative solutions by bringing to the fore our full and collective experience.', 4),
('about.overview.body2', 'about', 'Overview', 'Paragraph 2', 'textarea', 'We shall continue to bring our technical know-how and experience to bear on every project with speed and accuracy. This mission is achievable through our continuous investment in manpower, expertise and experience.', 5),
('about.overview.mission', 'about', 'Overview', 'Mission statement', 'textarea', 'Our mission is to provide high quality and cost-effective services in a professional and ethical manner, in order to meet the needs of our clients.', 6),
('about.control.eyebrow', 'about', 'Control system', 'Eyebrow', 'text', 'How we operate', 7),
('about.control.title', 'about', 'Control system', 'Heading', 'text', 'The Brainfield Control System', 8),
('about.control.body', 'about', 'Control system', 'Intro paragraph', 'textarea', 'In order to defeat corruption, money laundering and terrorism, we have clear policies and procedures and an ethical control awareness culture.', 9),
('about.control.card1_title', 'about', 'Control system', 'Card 1 — title', 'text', 'Establishing a risk-awareness culture', 10),
('about.control.kyc1_title', 'about', 'Control system', 'KYC item 1 — title', 'text', 'Verification of legal existence', 11),
('about.control.kyc1_body', 'about', 'Control system', 'KYC item 1 — text', 'textarea', 'Verification of legal existence and structure by obtaining proof of business registration.', 12),
('about.control.kyc2_title', 'about', 'Control system', 'KYC item 2 — title', 'text', 'Transaction monitoring', 13),
('about.control.kyc2_body', 'about', 'Control system', 'KYC item 2 — text', 'textarea', 'All departments pay attention to complex and unusual large transactions, and any pattern of transactions with no apparent lawful purpose.', 14),
('about.control.kyc3_title', 'about', 'Control system', 'KYC item 3 — title', 'text', 'Documented background & purpose', 15),
('about.control.kyc3_body', 'about', 'Control system', 'KYC item 3 — text', 'textarea', 'The background and purpose of transactions are established in writing and documented.', 16),
('about.control.card2_title', 'about', 'Control system', 'Card 2 — title', 'text', 'Staff induction & training', 17),
('about.control.card2_body1', 'about', 'Control system', 'Card 2 — paragraph 1', 'textarea', 'Corruption, money laundering and terrorism are included in our staff induction programme. Our staff handbook clearly defines fraudulent conduct — including falsification or unauthorised removal of company documents, concealment or misappropriation of corporate funds, and an employee''s failure to promptly notify their supervisor of any suspected dishonest or fraudulent act.', 18),
('about.control.card2_body2', 'about', 'Control system', 'Card 2 — paragraph 2', 'textarea', 'We run an ongoing employee-training programme so our staff are adequately trained in anti-corruption, money-laundering and KYC procedures. New staff are educated on the importance of these standards, and front-line staff who deal directly with the public are trained to verify the identity of new customers and detect patterns of suspicious activity. Our internal and external auditors assist management in detecting and preventing these risks, irrespective of an employee''s grade, position or length of service.', 19),
('about.team.eyebrow', 'about', 'Team', 'Eyebrow', 'text', 'Management team', 20),
('about.team.title', 'about', 'Team', 'Heading', 'text', 'The people behind Brainfield', 21),
('about.cta.title', 'about', 'Closing CTA', 'Heading', 'text', 'Auditors, secretary & insurance', 22),
('about.cta.body', 'about', 'Closing CTA', 'Text', 'textarea', 'Full corporate contacts for our company secretary, auditor and insurance consultant are on the contact page.', 23),

-- CONSULT ------------------------------------------------------------------
('consult.hero.eyebrow', 'consult', 'Hero', 'Eyebrow', 'text', 'RC 676934 · Oil & gas marketing', 1),
('consult.hero.title', 'consult', 'Hero', 'Heading', 'text', 'Moving Nigeria''s petroleum products', 2),
('consult.hero.lede', 'consult', 'Hero', 'Intro paragraph', 'textarea', 'Brainfield Consult Limited is a duly registered and incorporated oil and gas marketing company under the Nigerian Companies and Allied Matters Decree Act 1990, RC 676934 — bringing technical know-how and experience to every project with speed and accuracy.', 3),
('consult.hero.panel_title', 'consult', 'Hero', 'Snapshot panel — title', 'text', 'Refined products & Bonny Light Crude', 4),
('consult.services.title', 'consult', 'Services', 'Heading', 'text', 'Three ways we move product', 5),
('consult.services.card1_title', 'consult', 'Services', 'Card 1 — title', 'text', 'Product storage', 6),
('consult.services.card1_body', 'consult', 'Services', 'Card 1 — text', 'textarea', 'Facilitation, procurement, storage, sales and marketing of refined petroleum products.', 7),
('consult.services.card2_title', 'consult', 'Services', 'Card 2 — title', 'text', 'Product export', 8),
('consult.services.card2_body', 'consult', 'Services', 'Card 2 — text', 'textarea', 'Facilitation, export and marketing of Bonny Light Crude Oil.', 9),
('consult.services.card3_title', 'consult', 'Services', 'Card 3 — title', 'text', 'Product retailing', 10),
('consult.services.card3_body', 'consult', 'Services', 'Card 3 — text', 'textarea', 'Open-market sales of refined petroleum products.', 11),
('consult.why.eyebrow', 'consult', 'Why us', 'Eyebrow', 'text', 'Why should you choose us?', 12),
('consult.why.title', 'consult', 'Why us', 'Heading', 'text', 'Quality, people, and satisfaction', 13),
('consult.why.card1_title', 'consult', 'Why us', 'Card 1 — title', 'text', 'Quality and safety', 14),
('consult.why.card1_body', 'consult', 'Why us', 'Card 1 — text', 'textarea', 'Brainfield places a very high premium on quality and safety as a primary requirement for the achievement of efficient and sustainable service delivery — for our customers and for the nation at large.', 15),
('consult.why.card2_title', 'consult', 'Why us', 'Card 2 — title', 'text', 'Qualified & experienced staff', 16),
('consult.why.card2_body', 'consult', 'Why us', 'Card 2 — text', 'textarea', 'At Brainfield Consult Limited our biggest asset is our people. Our staff are highly qualified and experienced Nigerians with certification from different organisations.', 17),
('consult.why.card3_title', 'consult', 'Why us', 'Card 3 — title', 'text', 'Customer satisfaction', 18),
('consult.why.card3_body', 'consult', 'Why us', 'Card 3 — text', 'textarea', 'The quality of the jobs executed by our company cannot be compromised. Our task is to meet client satisfaction and continuously improve the quality of our products.', 19),
('consult.team.title', 'consult', 'Team', 'Heading', 'text', 'Project & operations team', 20),
('consult.cta.title', 'consult', 'Closing CTA', 'Heading', 'text', 'Source, store, or export with us', 21),
('consult.cta.body', 'consult', 'Closing CTA', 'Text', 'textarea', 'Tell us what you need moved — refined product for the open market, or Bonny Light Crude for export — and our team will take it from there.', 22),

-- AGRO ------------------------------------------------------------------
('agro.hero.eyebrow', 'agro', 'Hero', 'Eyebrow', 'text', 'RC 875233 · Agro-allied production', 1),
('agro.hero.title', 'agro', 'Hero', 'Heading', 'text', 'Rice, done right — from farm to table', 2),
('agro.hero.lede', 'agro', 'Hero', 'Intro paragraph', 'textarea', 'Brainfield Agro Limited is an agro-allied services and production company, and owner of the Brainfield Rice Mill Factory — working with community-based smallholder farmers to grow, purify and mill Ofada (brown) rice for a quality-conscious, ever-growing market.', 3),
('agro.hero.panel_title', 'agro', 'Hero', 'Snapshot panel — title', 'text', '2.5 acres', 4),
('agro.hero.panel_text', 'agro', 'Hero', 'Snapshot panel — text', 'textarea', 'Sited along Ido-Eruwa Road, home to a hi-tech automated rice processing line.', 5),
('agro.hero.capacity_current', 'agro', 'Hero', 'Current capacity line', 'text', 'Current capacity: 25 tons / day', 6),
('agro.hero.capacity_target', 'agro', 'Hero', 'Target capacity line', 'text', 'Target by year end: 150 tons / day', 7),
('agro.stats.stat1_text', 'agro', 'Stats', 'Stat 1 — description', 'textarea', 'Processing capacity, tons per day (current → year-end target)', 8),
('agro.stats.stat2_text', 'agro', 'Stats', 'Stat 2 — description', 'textarea', 'Factory site along Ido-Eruwa Road', 9),
('agro.stats.stat3_text', 'agro', 'Stats', 'Stat 3 — description', 'textarea', 'Farmland in Ido Local Government, planted with seed rice', 10),
('agro.stats.stat4_text', 'agro', 'Stats', 'Stat 4 — description', 'textarea', 'Outgrower farmers in the smallholder value chain', 11),
('agro.story.eyebrow', 'agro', 'Story', 'Eyebrow', 'text', 'Rooted in the South-West', 12),
('agro.story.title', 'agro', 'Story', 'Heading', 'text', 'Ofada rice, raised to a global standard', 13),
('agro.story.body1', 'agro', 'Story', 'Paragraph 1', 'textarea', 'Ofada rice — a brown rice mostly grown in South-West Nigeria — carries a deep cultural attachment for the communities that grow it. Brainfield Agro works directly with community-based smallholder value chain actors to increase production of Ofada rice, while enhancing its quality and branding to meet international standards and the expectations of an ever-growing number of consumers — today sold under our own retail brand, Jojo.', 14),
('agro.story.body2', 'agro', 'Story', 'Paragraph 2', 'textarea', 'It''s a model built on partnership rather than extraction: farmers grow, Brainfield purifies, processes and brands — and the value created moves back through the whole chain.', 15),
('agro.products.eyebrow', 'agro', 'Products', 'Eyebrow', 'text', 'Our products', 16),
('agro.products.title', 'agro', 'Products', 'Heading', 'text', 'Jojo — bagged and branded for the market', 17),
('agro.products.body', 'agro', 'Products', 'Intro text', 'textarea', 'Everything that comes off the line at the Ido-Eruwa Road factory is bagged and sold under our own retail brand, Jojo — from the desk sample to the warehouse floor.', 18),
('agro.products.product1_name', 'agro', 'Products', 'Product 1 — name', 'text', 'Jojo Premium Parboiled Rice', 19),
('agro.products.product1_body', 'agro', 'Products', 'Product 1 — text', 'textarea', 'Long-grain parboiled rice milled at our own factory, bagged in 5kg and bulk sizes for retail and distribution.', 20),
('agro.products.product2_name', 'agro', 'Products', 'Product 2 — name', 'text', 'Jojo Premium Ofada (Brown) Rice', 21),
('agro.products.product2_body', 'agro', 'Products', 'Product 2 — text', 'textarea', 'Our own take on South-West Nigeria''s culturally rooted Ofada rice, processed and branded to the same Jojo standard.', 22),
('agro.factory.eyebrow', 'agro', 'Factory', 'Eyebrow', 'text', 'The factory', 23),
('agro.factory.title', 'agro', 'Factory', 'Heading', 'text', 'Built for scale, sited for access', 24),
('agro.factory.body', 'agro', 'Factory', 'Intro paragraph', 'textarea', 'The Brainfield Rice Mill Factory sits on 2.5 acres of land along Ido-Eruwa Road, running a hi-tech automated rice processing line with an installed capacity of 25 tons per day — with an immediate plan to raise that to 150 tons per day before the end of the year.', 25),
('agro.factory.card1_title', 'agro', 'Factory', 'Card 1 — title', 'text', '2.5-acre site', 26),
('agro.factory.card1_body', 'agro', 'Factory', 'Card 1 — text', 'textarea', 'Purpose-sited along Ido-Eruwa Road for straightforward access to farms and market.', 27),
('agro.factory.card2_title', 'agro', 'Factory', 'Card 2 — title', 'text', 'Automated processing', 28),
('agro.factory.card2_body', 'agro', 'Factory', 'Card 2 — text', 'textarea', 'A hi-tech automated line handles purification, milling and grading with consistent quality.', 29),
('agro.factory.card3_title', 'agro', 'Factory', 'Card 3 — title', 'text', '25 → 150 tons/day', 30),
('agro.factory.card3_body', 'agro', 'Factory', 'Card 3 — text', 'textarea', 'Capacity is expanding six-fold this year to meet rising demand across the value chain.', 31),
('agro.video.title', 'agro', 'Video', 'Heading', 'text', 'A walk through the mill', 32),
('agro.video.caption', 'agro', 'Video', 'Caption', 'textarea', 'See the automated processing line and the land around the Ido-Eruwa Road factory.', 33),
('agro.outgrower.title', 'agro', 'Outgrower programme', 'Heading', 'text', '27 hectares, ~100 farmers, one value chain', 34),
('agro.outgrower.body', 'agro', 'Outgrower programme', 'Intro paragraph', 'textarea', 'Brainfield Agro holds 27 hectares of land in Ido Local Government, presently planted with rice to be distributed as seed to our outgrower farmers after purification — almost 100 smallholders strong.', 35),
('agro.outgrower.step1_title', 'agro', 'Outgrower programme', 'Step 1 — title', 'text', '27 hectares planted', 36),
('agro.outgrower.step1_body', 'agro', 'Outgrower programme', 'Step 1 — text', 'textarea', 'Company-held farmland in Ido LG is planted with rice earmarked for seed.', 37),
('agro.outgrower.step2_title', 'agro', 'Outgrower programme', 'Step 2 — title', 'text', 'Purified & distributed', 38),
('agro.outgrower.step2_body', 'agro', 'Outgrower programme', 'Step 2 — text', 'textarea', 'Harvested seed is purified, then distributed to outgrower farmers to plant.', 39),
('agro.outgrower.step3_title', 'agro', 'Outgrower programme', 'Step 3 — title', 'text', '~100 outgrower farmers', 40),
('agro.outgrower.step3_body', 'agro', 'Outgrower programme', 'Step 3 — text', 'textarea', 'Smallholders across the community grow the crop as part of the value chain.', 41),
('agro.cta.title', 'agro', 'Closing CTA', 'Heading', 'text', 'Buy, supply, or grow with us', 42),
('agro.cta.body', 'agro', 'Closing CTA', 'Text', 'textarea', 'Whether you''re a distributor sourcing quality Ofada rice, or a farmer in the Ido area interested in the outgrower programme — reach out.', 43),

-- GALLERY ------------------------------------------------------------------
('gallery.hero.title', 'gallery', 'Hero', 'Heading', 'text', 'Inside Brainfield', 1),
('gallery.hero.lede', 'gallery', 'Hero', 'Intro paragraph', 'textarea', 'A visual look at Brainfield Consult''s work.', 2),
('gallery.cta.title', 'gallery', 'Closing CTA', 'Heading', 'text', 'Partner with Brainfield', 3),
('gallery.cta.body', 'gallery', 'Closing CTA', 'Text', 'textarea', 'Whether you''re sourcing refined petroleum products, exporting Bonny Light Crude, or looking to buy on the open market — we''d like to hear from you.', 4),

-- CONTACT ------------------------------------------------------------------
('contact.hero.title', 'contact', 'Hero', 'Heading', 'text', 'Let''s talk business', 1),
('contact.hero.lede', 'contact', 'Hero', 'Intro paragraph', 'textarea', 'Reach the Brainfield team directly, or send a message and we''ll get back to you.', 2),
('contact.form.intro', 'contact', 'Contact form', 'Intro text', 'textarea', 'We''ll get back to you at the email you provide, usually within a business day.', 3),
('contact.visit.body', 'contact', 'Contact form', 'Visit-us note', 'textarea', '48, Okota Road, Isolo, Lagos — our head office welcomes visitors by appointment. Call ahead to arrange a time.', 4),
('contact.corporate.eyebrow', 'contact', 'Corporate info', 'Eyebrow', 'text', 'Corporate information', 5),
('contact.corporate.title', 'contact', 'Corporate info', 'Heading', 'text', 'Our registered advisors', 6),
('contact.secretary.name', 'contact', 'Corporate info', 'Company secretary — name', 'text', 'Leke Oladeji and Co.', 7),
('contact.secretary.address', 'contact', 'Corporate info', 'Company secretary — address', 'textarea', '108, Ojuelegba Road, Surulere, Lagos', 8),
('contact.secretary.phone', 'contact', 'Corporate info', 'Company secretary — phone', 'text', '+234 802 301 0673', 9),
('contact.insurance.name', 'contact', 'Corporate info', 'Insurance consultant — name', 'text', 'Albert Ehichioya — Linkage Assurance Plc', 10),
('contact.insurance.address', 'contact', 'Corporate info', 'Insurance consultant — address', 'textarea', 'Plot 20, Block 94, Providence Street, Lekki Phase 1, Lagos', 11),
('contact.insurance.phone', 'contact', 'Corporate info', 'Insurance consultant — phone', 'text', '+234 805 341 3264', 12),
('contact.auditor.name', 'contact', 'Corporate info', 'Auditor — name', 'text', 'Ibukun Owofadeju & Co.', 13),
('contact.auditor.address', 'contact', 'Corporate info', 'Auditor — address', 'textarea', '14 Association Avenue, Magodo-Shangisha, Lagos', 14),
('contact.auditor.phone', 'contact', 'Corporate info', 'Auditor — phone', 'text', '0708 414 7758', 15)

on conflict (key) do nothing;

-- Team members ----------------------------------------------------------
insert into team_members (name, role, bio, initials, show_on_home, show_on_about, show_on_consult, sort_order) values
('Olukayode Ajala', 'GMD / CEO', 'A seasoned technocrat and professional with over thirty years of cognate experience, specialising in geotechnical services and infrastructure development and management.', 'OA', true, true, false, 1),
('Mang Kalu Onwuka', 'COO', 'A civil engineering graduate of Texas A&M University, USA, with over forty years of cognate experience in the oil and gas industry.', 'MO', true, true, false, 2),
('Joyce A. Ndukwe', 'Director, Admin & Finance', 'A seasoned professional banker and administrator with over eight years of experience in the industry.', 'JN', false, true, false, 3),
('Omowunmi Kayode-Ajala', 'Executive Director', 'A seasoned educationist, master trainer and entrepreneur; retired Director of Education, Lagos State.', 'OK', true, true, false, 4),
('Raymond Titus', 'Project Manager', 'Project Manager at Brainfield Consult Limited.', 'RT', false, true, true, 5),
('Savior Kalu', 'Project Manager', 'Project Manager at Brainfield Consult Limited.', 'SK', false, true, true, 6),
('Oluwafemi Agboola', 'Operations Manager', 'Operations Manager at Brainfield Consult Limited.', 'OA', false, true, true, 7),
('Rita Matthews', 'Operations Manager', 'Operations Manager at Brainfield Consult Limited.', 'RM', false, true, true, 8)
on conflict do nothing;

-- Gallery images ----------------------------------------------------------
insert into gallery_images (image_url, alt_text, sort_order) values
('assets/img/gallery-rice/rice-01.jpg', 'Jojo Premium Parboiled Rice, 5kg bag', 1),
('assets/img/gallery-rice/rice-02.jpg', 'Jojo Premium Parboiled Rice packaging detail', 2),
('assets/img/gallery-rice/rice-03.jpg', 'Jojo Rice bags in storage', 3),
('assets/img/gallery-rice/rice-04.jpg', 'Jojo Rice bags stacked in the warehouse', 4),
('assets/img/gallery-rice/rice-05.jpg', 'Jojo Rice bags in multiple sizes', 5),
('assets/img/gallery-rice/rice-06.jpg', 'Jojo Rice bags loaded for distribution', 6),
('assets/img/gallery-rice/rice-07.jpg', 'Jojo Rice 50kg bag', 7),
('assets/img/gallery-rice/rice-08.jpg', 'Jojo Rice bags in multiple sizes', 8),
('assets/img/gallery-rice/rice-09.jpg', 'Jojo Rice bag close-up', 9)
on conflict do nothing;

-- -------------------------------------------------------------------------
-- Storage bucket for images uploaded through the admin dashboard.
-- (If this errors because the bucket already exists, that's fine — skip it.)
-- -------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

create policy "public read site-images" on storage.objects
  for select using (bucket_id = 'site-images');
create policy "auth upload site-images" on storage.objects
  for insert with check (bucket_id = 'site-images' and auth.role() = 'authenticated');
create policy "auth update site-images" on storage.objects
  for update using (bucket_id = 'site-images' and auth.role() = 'authenticated');
create policy "auth delete site-images" on storage.objects
  for delete using (bucket_id = 'site-images' and auth.role() = 'authenticated');
