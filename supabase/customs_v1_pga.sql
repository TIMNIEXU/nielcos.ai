
-- PGA (Participating Government Agency) flag rules, matched by HTS prefix.
insert into pga_rules (hts_prefix, agency, agency_cn, note) values
('02', 'FSIS', '食品安全检验局', 'Meat products may require FSIS inspection'),
('03', 'FDA', '食品药品监督管理局', 'Seafood is subject to FDA prior notice'),
('09', 'FDA', '食品药品监督管理局', 'Tea/spices may be subject to FDA review'),
('1601', 'FSIS', '食品安全检验局', 'Sausages and prepared meat may require FSIS'),
('1604', 'FDA', '食品药品监督管理局', 'Prepared fishery products subject to FDA'),
('2204', 'TTB', '烟酒税务贸易局', 'Wine imports require TTB approval'),
('2208', 'TTB', '烟酒税务贸易局', 'Spirits imports require TTB approval'),
('2402', 'TTB', '烟酒税务贸易局', 'Tobacco products require TTB permits'),
('28', 'EPA', '环境保护署', 'Chemicals may be subject to TSCA certification'),
('29', 'EPA', '环境保护署', 'Organic chemicals may be subject to TSCA certification'),
('30', 'FDA', '食品药品监督管理局', 'Pharmaceuticals require FDA review'),
('33', 'FDA', '食品药品监督管理局', 'Cosmetics are FDA-regulated'),
('44', 'APHIS', '动植物卫生检验局', 'Wood products subject to Lacey Act declaration'),
('61', 'CPSC', '消费品安全委员会', 'Textiles: check flammability / children''s product rules'),
('62', 'CPSC', '消费品安全委员会', 'Textiles: check flammability / children''s product rules'),
('64', 'CPSC', '消费品安全委员会', 'Footwear: check children''s product rules if applicable'),
('8525', 'FCC', '联邦通信委员会', 'RF transmitting devices require FCC authorization'),
('8526', 'FCC', '联邦通信委员会', 'Radio navigational apparatus require FCC authorization'),
('8517', 'FCC', '联邦通信委员会', 'Telecom equipment may require FCC authorization'),
('87', 'EPA', '环境保护署', 'Vehicles/engines subject to EPA emissions requirements'),
('8708', 'DOT', '交通部', 'Motor vehicle parts subject to DOT/NHTSA standards'),
('9301', 'ATF', '烟酒火器管理局', 'Firearms and related articles require ATF licensing'),
('9503', 'CPSC', '消费品安全委员会', 'Toys subject to CPSC testing (ASTM F963 / lead & phthalates)'),
('9619', 'FDA', '食品药品监督管理局', 'Sanitary products may be FDA-regulated')
on conflict do nothing;
