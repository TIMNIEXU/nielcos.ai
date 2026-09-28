
-- Seeded common HTS codes. Rates are APPROXIMATE reference values only.
insert into hts_schedule (hts_no, description, general_rate, keywords) values
-- plastics
('3926.90.99', 'Other articles of plastics', 5.3, 'plastic,plastic articles,塑料,塑料制品'),
('3923.21.00', 'Sacks and bags of polymers of ethylene', 3.0, 'plastic bag,polybag,塑料袋,包装袋'),
-- wood / furniture
('4412.99.90', 'Other plywood, veneered panels', 8.0, 'plywood,veneer,胶合板,木板'),
('9401.61.60', 'Upholstered seats with wooden frames', 0.0, 'chair,seat,upholstered,椅子,座椅,沙发椅'),
('9403.20.00', 'Other metal furniture', 0.0, 'metal furniture,steel furniture,金属家具'),
('9403.60.80', 'Other wooden furniture', 0.0, 'wooden furniture,wood furniture,cabinet,table,desk,木家具,桌子,柜子'),
('9403.70.80', 'Furniture of plastics', 0.0, 'plastic furniture,塑料家具'),
('9404.29.90', 'Mattresses of other materials', 6.0, 'mattress,床垫'),
('9404.90.20', 'Pillows, cushions of cotton', 6.0, 'pillow,cushion,枕头,靠垫'),
-- apparel (cotton)
('6109.10.00', 'T-shirts, singlets of cotton', 16.5, 't-shirt,tee shirt,tshirt,棉,T恤'),
('6110.20.20', 'Sweaters, pullovers of cotton', 16.5, 'sweater,pullover,hoodie,毛衣,卫衣'),
('6203.42.40', 'Men''s trousers of cotton', 16.6, 'men trousers,pants,男裤,长裤'),
('6204.62.40', 'Women''s trousers of cotton', 16.6, 'women trousers,pants,女裤'),
('6205.20.20', 'Men''s shirts of cotton', 19.7, 'men shirt,衬衫,男衬衫'),
('6212.10.90', 'Brassieres', 16.9, 'bra,brassiere,文胸,内衣'),
('6302.60.00', 'Toilet and kitchen linen of cotton', 6.7, 'towel,bath towel,kitchen towel,毛巾,浴巾'),
-- footwear
('6403.99.90', 'Footwear with leather uppers', 10.0, 'leather shoes,皮鞋'),
('6404.19.90', 'Footwear with textile uppers', 37.5, 'canvas shoes,sneakers,textile shoes,帆布鞋,运动鞋'),
('6402.99.90', 'Footwear with plastic uppers', 6.0, 'sandals,slippers,rubber shoes,凉鞋,拖鞋'),
-- ceramics / glass
('6912.00.50', 'Ceramic tableware, kitchenware', 9.8, 'ceramic plate,bowl,mug,dinnerware,陶瓷,盘子,碗,杯子'),
('7013.49.20', 'Glassware for table/kitchen', 7.5, 'glass cup,glassware,玻璃杯,玻璃器皿'),
-- steel / metals
('7210.70.30', 'Flat-rolled steel, painted/varnished', 0.0, 'painted steel,coated steel,彩涂钢,钢板'),
('7304.41.00', 'Seamless tubes of stainless steel', 0.0, 'steel tube,steel pipe,stainless tube,钢管,不锈钢管'),
('7326.90.86', 'Other articles of iron or steel', 2.9, 'steel articles,metal parts,钢铁制品,五金'),
('7616.99.51', 'Other articles of aluminum', 2.5, 'aluminum articles,aluminum parts,铝制品'),
-- tools
('8207.19.60', 'Interchangeable tools', 5.0, 'drill bits,tool bits,钻头,工具头'),
-- machinery / appliances
('8418.10.00', 'Combined refrigerator-freezers', 2.9, 'refrigerator,fridge,冰箱'),
('8450.20.00', 'Washing machines, 10kg+ capacity', 1.0, 'washing machine,washer,洗衣机'),
('8414.51.30', 'Ceiling fans', 4.7, 'ceiling fan,吊扇,风扇'),
-- computers / electronics (mostly Free)
('8471.30.01', 'Portable computers (laptops)', 0.0, 'laptop,notebook computer,笔记本电脑'),
('8471.60.10', 'Input or output units', 0.0, 'monitor,keyboard,mouse,显示器,键盘,鼠标'),
('8473.30.11', 'Parts of computers', 0.0, 'computer parts,motherboard,电脑配件,主板'),
('8504.40.95', 'Power supplies', 1.5, 'power supply,adapter,charger,电源,适配器,充电器'),
('8517.12.00', 'Smartphones', 0.0, 'smartphone,mobile phone,cell phone,智能手机,手机'),
('8517.62.00', 'Network equipment (routers/switches)', 0.0, 'router,switch,network equipment,路由器,交换机'),
('8518.30.20', 'Headphones and earphones', 1.2, 'headphones,earphones,earbuds,耳机'),
('8523.51.00', 'Solid-state storage devices', 0.3, 'ssd,usb drive,memory card,固态硬盘,优盘,存储卡'),
('8528.72.64', 'TVs with flat panel screen', 3.9, 'tv,television,电视机'),
('8536.69.40', 'Plugs and sockets', 2.7, 'plug,socket,connector,插头,插座,连接器'),
('8544.42.20', 'Electric conductors with connectors', 2.6, 'cable,wire harness,电缆,线束'),
-- auto parts
('8708.29.51', 'Body parts of motor vehicles', 2.5, 'bumper,fender,car body parts,保险杠,汽车覆盖件'),
('8708.99.68', 'Other parts of motor vehicles', 2.5, 'auto parts,car parts,汽车零部件,汽配'),
('8716.80.50', 'Trailers and semi-trailers, other', 3.1, 'trailer,拖车,挂车'),
-- medical / instruments
('9018.90.75', 'Other medical instruments', 0.0, 'medical device,surgical instrument,医疗器械'),
('9025.19.80', 'Other thermometers', 1.7, 'thermometer,温度计'),
('9001.50.00', 'Spectacle lenses of other materials', 2.0, 'glasses lens,eyeglass lens,眼镜片'),
-- toys / sports
('9503.00.00', 'Tricycles, scooters, dolls, toys', 0.0, 'toys,doll,action figure,玩具,玩偶,手办'),
('9506.91.00', 'Gymnasium and athletic equipment', 4.6, 'dumbbell,gym equipment,fitness,哑铃,健身器材'),
('9504.50.00', 'Video game consoles', 0.0, 'game console,游戏机'),
-- bags
('4202.92.90', 'Travel, sports and similar bags', 17.6, 'backpack,duffel bag,travel bag,luggage,背包,旅行包,行李箱'),
-- paper
('4819.10.00', 'Cartons, boxes of corrugated paper', 0.3, 'carton,cardboard box,纸箱'),
-- misc
('9405.40.60', 'Other electric lamps', 6.0, 'lamp,light fixture,led lamp,灯具,台灯'),
('9619.00.71', 'Sanitary towels, diapers', 6.0, 'diaper,sanitary pad,纸尿裤,卫生巾'),
('3304.99.50', 'Beauty and skin-care preparations', 0.0, 'cosmetics,skincare,cream,化妆品,护肤品'),
('3307.90.00', 'Other perfumery and cosmetic preparations', 5.4, 'perfume,fragrance,香水'),
('3004.90.92', 'Medicaments, retail sale', 0.0, 'medicine,pharmaceutical,药品'),
('8516.60.60', 'Ovens, cookers, cooking plates', 3.0, 'oven,air fryer,烤箱,空气炸锅'),
('8419.81.50', 'Cooking equipment, other', 2.5, 'cooking equipment,kitchen equipment,厨具'),
('9401.71.00', 'Seats with metal frames, upholstered', 0.0, 'office chair,metal chair,办公椅,金属椅'),
('9401.79.00', 'Seats with metal frames, other', 0.0, 'metal stool,folding chair,金属凳,折叠椅'),
('4421.99.97', 'Other articles of wood', 3.3, 'wooden articles,wood crafts,木制品,木工艺品'),
('4602.11.09', 'Basketwork of bamboo', 5.0, 'bamboo basket,rattan,竹篮,藤编'),
('5703.30.80', 'Carpets of man-made fibers', 6.0, 'carpet,rug,地毯'),
('6307.90.98', 'Other made-up textile articles', 7.0, 'textile products,curtain,窗帘,纺织品')
on conflict (hts_no) do update
  set description = excluded.description,
      general_rate = excluded.general_rate,
      keywords = excluded.keywords;
