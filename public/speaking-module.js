/* ============================================================================
   AMURO SPEAKING PRACTICE MODULE (CLOUD SYNC + TEACHER GRADING)
   Tích hợp độc lập - Không ảnh hưởng Reading / Listening / Writing / Quota
   ============================================================================ */
(function() {
  // 1. CHÈN CSS GIAO DIỆN SPEAKING (ĐÃ SCOPE RIÊNG TRONG #spkAppRoot ĐỂ KHÔNG XUNG ĐỘT CSS CHUNG)
  const spkStyle = document.createElement('style');
  spkStyle.innerHTML = `
    #dashTab-speaking {
      --paper:#F2F2EF; --surface:#FFFFFF; --ink:#141414; --ink-2:#56554F; --muted:#9B9A93;
      --line:#DCDBD5; --tint:#ECEBE7; --tint-2:#DDDBD4; --accent:#059669; --accent-soft:#d1fae5; --on-accent:#FFFFFF;
      --bankW:360px;
    }
    #spkAppRoot {
      height: calc(100vh - 140px); min-height: 640px; overflow: hidden;
      display: grid; grid-template-rows: minmax(0,1fr);
      grid-template-columns: clamp(240px,20vw,290px) minmax(0,1fr) var(--bankW);
      gap: 18px; padding: 16px; background: var(--paper); color: var(--ink);
      border-radius: 14px; border: 1px solid var(--line); box-sizing: border-box;
    }
    #spkAppRoot.bank-closed { grid-template-columns: clamp(240px,20vw,290px) minmax(0,1fr) 44px; }
    #spkAppRoot * { box-sizing: border-box; }
    #spkAppRoot [hidden] { display: none !important; }
    #spkAppRoot .lbl { font-weight:800; font-size:19px; letter-spacing:-.02em; line-height:1; text-transform:lowercase; }
    #spkAppRoot .lbl::before { content:"."; color: var(--accent); }
    #spkAppRoot .cap { font-size:10.5px; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:var(--muted); }
    #spkAppRoot .spk-btn { font-size:10.5px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; line-height:1; padding:10px 12px; border:1px solid var(--line); background:transparent; cursor:pointer; border-radius:6px; white-space:nowrap; color:var(--ink); transition: all .15s; }
    #spkAppRoot .spk-btn:hover { border-color:var(--ink); }
    #spkAppRoot .spk-btn.solid { background:#065f46; border-color:#065f46; color:#fff; }
    #spkAppRoot .spk-btn.solid:hover { background:#047857; }
    #spkAppRoot .spk-btn.ghost { border-color:transparent; padding-inline:6px; color:var(--ink-2); }
    #spkAppRoot .spk-btn.ghost:hover { color:var(--ink); }
    #spkAppRoot .spk-btn[data-armed] { border-color:#dc2626; color:#dc2626; }
    #spkAppRoot .field { border:1px solid var(--line); background:var(--surface); padding:9px 10px; border-radius:6px; font-size:13.5px; min-width:0; color:var(--ink); }
    #spkAppRoot .panel { background:var(--surface); border:1px solid var(--line); border-radius:10px; display:flex; flex-direction:column; min-height:0; min-width:0; }
    #spkAppRoot .panel-head { display:flex; align-items:center; justify-content:space-between; gap:8px 12px; padding:14px 20px 0; flex-wrap:wrap; }
    #spkAppRoot .ph-left { display:flex; align-items:baseline; gap:12px; min-width:0; }
    #spkAppRoot .tools { display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
    #spkAppRoot .note { font-size:12px; color:var(--muted); line-height:1.5; margin:0; }
    #spkAppRoot .msg { font-size:12px; color:var(--accent); font-weight:600; line-height:1.5; margin:0; }
    #spkAppRoot .side { background:var(--surface); border:1px solid var(--line); border-radius:10px; display:flex; flex-direction:column; gap:18px; padding:20px 18px 16px; min-height:0; overflow:auto; }
    #spkAppRoot .amuro-logo { font-size:32px; font-weight:900; letter-spacing:-.05em; line-height:1.1; color:#064e3b; }
    #spkAppRoot .amuro-logo::after { content:"SPEAKING PRACTICE"; display:block; font-size:10px; letter-spacing:.22em; font-weight:700; margin-top:6px; color:var(--accent); }
    #spkAppRoot .draw-head { display:flex; align-items:baseline; justify-content:space-between; border-top:1px solid var(--line); padding-top:14px; }
    #spkAppRoot .parts { display:flex; flex-direction:column; }
    #spkAppRoot .part-row { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:8px; border-bottom:1px solid var(--tint); }
    #spkAppRoot .part-row:first-child { border-top:1px solid var(--tint); }
    #spkAppRoot .part { display:grid; grid-template-columns:auto minmax(0,1fr); align-items:center; gap:12px; text-align:left; background:none; border:0; padding:10px 4px 10px 0; cursor:pointer; position:relative; min-width:0; }
    #spkAppRoot .part .num { font-weight:800; font-size:40px; line-height:.9; letter-spacing:-.05em; color:var(--tint-2); width:50px; transition:color .2s; }
    #spkAppRoot .part .t { display:flex; flex-direction:column; gap:3px; min-width:0; }
    #spkAppRoot .part b { font-weight:700; font-size:15px; color:var(--ink); }
    #spkAppRoot .part small { font-size:11.5px; color:var(--muted); }
    #spkAppRoot .part:hover .num, #spkAppRoot .part.on .num { color:var(--accent); }
    #spkAppRoot .opts { display:flex; flex-direction:column; gap:10px; border-top:1px solid var(--line); padding-top:14px; }
    #spkAppRoot .opt { display:grid; grid-template-columns:auto minmax(0,1fr); gap:10px; align-items:start; cursor:pointer; font-size:13px; line-height:1.4; }
    #spkAppRoot .opt small { display:block; font-size:11px; color:var(--muted); margin-top:2px; }
    #spkAppRoot .stage { display:grid; grid-template-rows:auto auto minmax(0,1fr); gap:14px; min-height:0; min-width:0; }
    #spkAppRoot .top { display:flex; align-items:flex-end; justify-content:space-between; gap:16px 24px; padding:6px 4px 2px; flex-wrap:wrap; }
    #spkAppRoot .who { position:relative; min-width:200px; flex:1 1 200px; padding-top:28px; padding-left:4px; }
    #spkAppRoot .big-no { position:absolute; left:-4px; top:-10px; font-weight:800; font-size:88px; line-height:1; letter-spacing:-.05em; color:var(--tint-2); user-select:none; pointer-events:none; }
    #spkAppRoot .hero { position:relative; margin:0; font-weight:800; font-size:38px; line-height:1.05; letter-spacing:-.03em; }
    #spkAppRoot .sub { position:relative; display:block; margin-top:8px; font-size:13px; color:var(--ink-2); }
    #spkAppRoot .clock { display:flex; align-items:center; gap:16px; flex:0 1 auto; }
    #spkAppRoot .ring { position:relative; width:108px; height:108px; flex:none; }
    #spkAppRoot .ring svg { width:100%; height:100%; transform:rotate(-90deg); }
    #spkAppRoot .ring circle { fill:none; stroke-width:2.2; }
    #spkAppRoot .ring .bg { stroke:var(--line); }
    #spkAppRoot .ring .fg { stroke:#065f46; stroke-linecap:round; }
    #spkAppRoot .digits { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; font-weight:800; font-size:26px; }
    #spkAppRoot .digits small { font-size:8.5px; font-weight:700; letter-spacing:.18em; color:var(--muted); text-transform:uppercase; }
    #spkAppRoot .clock.over .fg { stroke:#dc2626; }
    #spkAppRoot .clock.rec .digits span { color:#dc2626; }
    #spkAppRoot .c-side { display:flex; flex-direction:column; gap:7px; }
    #spkAppRoot .c-row { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
    #spkAppRoot .spk-btn.rec { display:inline-flex; align-items:center; gap:7px; border-color:#dc2626; color:#dc2626; }
    #spkAppRoot .spk-btn.rec .dot { width:9px; height:9px; border-radius:50%; background:#dc2626; }
    #spkAppRoot .spk-btn.rec.on { background:#dc2626; border-color:#dc2626; color:#fff; }
    #spkAppRoot .spk-btn.rec.on .dot { background:#fff; border-radius:2px; }
    #spkAppRoot .level { height:3px; background:var(--tint); position:relative; overflow:hidden; width:100%; border-radius:2px; }
    #spkAppRoot .level i { position:absolute; left:0; top:0; bottom:0; width:0; background:var(--accent); transition:width .08s linear; }
    #spkAppRoot .status { font-size:11.5px; color:var(--muted); line-height:1.4; max-width:240px; }
    #spkAppRoot .status.err { color:#dc2626; font-weight:600; }
    #spkAppRoot .q { border:0; background:transparent; resize:none; padding:12px 20px 18px; font-weight:600; font-size:21px; line-height:1.38; min-height:2.6em; max-height:34vh; overflow:auto; color:var(--ink); width:100%; }
    #spkAppRoot .q.card { font-size:17.5px; font-weight:500; line-height:1.55; }
    #spkAppRoot .q:focus, #spkAppRoot .notes-ta:focus { outline:none; }
    #spkAppRoot .lower { display:grid; grid-template-columns:minmax(0,1.35fr) minmax(0,1fr); gap:14px; min-height:0; }
    #spkAppRoot .takes { flex:1; overflow:auto; min-height:0; padding:8px 20px 14px; }
    #spkAppRoot .empty { font-size:13px; color:var(--muted); line-height:1.6; padding-top:6px; }
    #spkAppRoot .take { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:6px 12px; align-items:center; padding:10px 0; border-bottom:1px solid var(--tint); }
    #spkAppRoot .play { width:34px; height:34px; border-radius:50%; border:1px solid var(--ink); background:var(--surface); display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--ink); }
    #spkAppRoot .play:hover, #spkAppRoot .take.playing .play { background:#065f46; border-color:#065f46; color:#fff; }
    #spkAppRoot .take .meta { display:flex; flex-direction:column; gap:2px; min-width:0; }
    #spkAppRoot .take .meta b { font-size:13px; font-weight:700; }
    #spkAppRoot .take .meta span { font-size:12px; color:var(--ink-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    #spkAppRoot .take .acts { display:flex; gap:5px; align-items:center; }
    #spkAppRoot .take .bar { grid-column:2 / 4; height:14px; display:flex; align-items:center; gap:10px; cursor:pointer; }
    #spkAppRoot .take .bar .track { flex:1; height:3px; background:var(--tint-2); position:relative; border-radius:2px; }
    #spkAppRoot .take .bar .track i { position:absolute; left:0; top:0; bottom:0; width:0; background:var(--accent); }
    #spkAppRoot .take .bar small { font-size:11px; color:var(--muted); min-width:68px; text-align:right; }
    #spkAppRoot .x { border:0; background:none; cursor:pointer; color:var(--muted); font-size:11px; padding:5px 6px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; }
    #spkAppRoot .x:hover { color:#dc2626; }
    #spkAppRoot .btn-submit-spk { background:#059669; color:#fff; border:none; border-radius:6px; padding:6px 11px; font-size:11px; font-weight:700; cursor:pointer; letter-spacing:.04em; transition:all .15s; }
    #spkAppRoot .btn-submit-spk:hover { background:#047857; }
    #spkAppRoot .btn-submit-spk:disabled { opacity:.6; cursor:not-allowed; }
    #spkAppRoot .notes-ta { flex:1; border:0; background:transparent; resize:none; padding:10px 20px 18px; font-size:15px; line-height:1.6; min-height:0; color:var(--ink); width:100%; }
    #spkAppRoot .bank { position:relative; background:var(--surface); border:1px solid var(--line); border-radius:10px; display:flex; flex-direction:column; min-height:0; min-width:0; overflow:hidden; }
    #spkAppRoot.bank-closed .bank { background:transparent; border:0; border-left:1px dashed var(--line); align-items:center; }
    #spkAppRoot.bank-closed .bank-body { display:none; }
    #spkAppRoot .bank-toggle { position:absolute; top:12px; right:12px; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border:1px solid var(--ink); background:var(--ink); color:var(--paper); cursor:pointer; border-radius:6px; z-index:3; }
    #spkAppRoot .bank-body { flex:1; display:flex; flex-direction:column; gap:10px; padding:16px 16px 10px 18px; min-height:0; min-width:0; }
    #spkAppRoot .bank-head { display:flex; align-items:baseline; gap:10px; min-height:30px; padding-right:36px; }
    #spkAppRoot .seg { display:flex; border:1px solid var(--line); border-radius:6px; overflow:hidden; flex:none; }
    #spkAppRoot .seg button { flex:1; border:0; background:none; padding:9px 0; font-size:10.5px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; cursor:pointer; color:var(--ink-2); }
    #spkAppRoot .seg button+button { border-left:1px solid var(--line); }
    #spkAppRoot .seg button[aria-pressed="true"] { background:#065f46; color:#fff; }
    #spkAppRoot .bank-acts { display:flex; gap:4px; flex-wrap:wrap; }
    #spkAppRoot .add { display:flex; flex-direction:column; gap:8px; border:1px solid var(--line); border-radius:8px; padding:10px; background:var(--paper); }
    #spkAppRoot .list { flex:1; overflow:auto; min-height:0; display:flex; flex-direction:column; padding-right:4px; }
    #spkAppRoot .topic-h { display:block; width:100%; text-align:left; border:0; background:none; cursor:pointer; font-size:10.5px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:#047857; padding:14px 0 4px; }
    #spkAppRoot .item { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:start; border-bottom:1px solid var(--tint); }
    #spkAppRoot .use { border:0; background:none; text-align:left; padding:8px 2px; cursor:pointer; font-size:13px; line-height:1.45; color:var(--ink); min-width:0; }
    #spkAppRoot .use:hover { color:var(--accent); }
    #spkAppRoot .item.used .use { color:var(--muted); }
    #spkAppRoot .item.used .use::before { content:"✓ "; color:#059669; font-weight:800; }
    #spkAppRoot .item.current .use { font-weight:700; color:#065f46; box-shadow:inset 3px 0 0 var(--accent); padding-left:8px; }
    @media (max-width:1024px) {
      #spkAppRoot { height:auto; overflow:visible; grid-template-columns:1fr; }
      #spkAppRoot .lower { grid-template-columns:1fr; }
      #spkAppRoot .bank { height:500px; }
    }
  `;
  document.head.appendChild(spkStyle);

  // 2. BỘ CÂU HỎI FORECAST MẶC ĐỊNH (PART 1, PART 2, PART 3)
  const KEY = 'amuro.speaking.practice.v1';
  const FORECAST = '2026-Q3';
  const DEFAULT_BANK = {"p1":[["Work / Study","Let's talk about what you do. Do you work or are you a student?"],["Work / Study · Work","What kind of work do you do?"],["Work / Study · Work","Did you do anything interesting in your job recently?"],["Work / Study · Work","Which is more important to you – the people you work with or the work you do? (Why?)"],["Work / Study · Work","Do you work best in the morning or the afternoon? (Why?)"],["Work / Study · Study","What do you study?"],["Work / Study · Study","What do you find most interesting about your studies? (Why?)"],["Work / Study · Study","Which is more important to you – the teachers or the other students on your course? (Why?)"],["Work / Study · Study","How much time do you spend studying every week?"],["Work / Study · Study","How do you usually travel to the city where you study?"],["Work / Study · Study","Do you study best in the morning or the afternoon? (Why?)"],["Work / Study · Study","Have you always wanted to study this subject / these subjects? (Why? Why not?)"],["Where you live now","Which town or city do you live in now?"],["Where you live now","Are there any things you don't like about your area? (What are they?)"],["Where you live now","Do you think you will continue to live there for a long time? (Why? Why not?)"],["Where you live now","What are some changes in the area recently?"],["Where you live now","Do you live in a house or an apartment?"],["Where you live now","What is your favourite room in your home? (Why?)"],["Where you live now","Do you know any famous people in your area?"],["Cars / Driving","Will you buy an expensive car in the future?"],["Cars / Driving","Do you think car colours are important?"],["Cars / Driving","Did you enjoy travelling by car when you were a kid?"],["Cars / Driving","What types of cars do you like?"],["Cars / Driving","Do you prefer to be a driver or the passenger?"],["Cars / Driving","What do you usually do when there is a traffic jam?"],["Study/Subject","What is your area of specialization?"],["Study/Subject","Why did you choose to study that major?"],["Study/Subject","What kind of school did you go to as a child?"],["Study/Subject","What was your favourite subject as a child?"],["Study/Subject","Do you think your country has an effective education system?"],["Comedy/Jokes","Do you like watching movies that make you laugh?"],["Comedy/Jokes","Do you find it easy to make others laugh?"],["Comedy/Jokes","Do you think it’s a good thing if you always make others laugh?"],["Evening","Do you prefer studying in the morning or in the afternoon?"],["Evening","What do you usually do in the evening?"],["Evening","What did you do in the evening when you were little? Why?"],["Evening","Are there any differences between what you do in the evening now and what you did in the past?"],["Old Buildings","Have you ever seen some old buildings in the city?"],["Old Buildings","Do you think we should keep old buildings in cities?"],["Old Buildings","Do you prefer living in an old building or a modern house?"],["Street market","Are street markets common in your country?"],["Street market","What is usually sold there?"],["Street market","Do you think people like street markets? Why?"],["Films","What’s your favourite kind of movie?"],["Films","Did you go to the cinema a lot when you were a child?"],["Films","Which is more popular in your country, going to the cinema or watching movies at home?"],["Advertisements","Are there many advertisements in your country?"],["Advertisements","Why do you think there are so many advertisements now?"],["Advertisements","What are the various places where we see advertisements?"],["Advertisements","How do you feel about advertisements?"],["Home/Accommodation","What kind of housing/accommodation do you live in?"],["Home/Accommodation","Who do you live with?"],["Home/Accommodation","How long have you lived there?"],["Home/Accommodation","What’s the difference between where you are living now and where you have lived in the past?"],["Home/Accommodation","Do you plan to live there for a long time?"],["Home/Accommodation","Which room does your family spend most of the time in?"],["Home/Accommodation","Are the transport facilities to your home very good?"],["Home/Accommodation","Do you prefer living in a house or a flat?"],["Home/Accommodation","What part of your home do you like the most ?"],["Hometown","Where do you live now? Do you like living there?"],["Hometown","Do you think you will continue living there for a long time?"],["Hometown","Please describe your hometown a little."],["Hometown","What's your hometown famous for?"],["Hometown","Did you learn about the history of your hometown at school?"],["Hometown","Are there many young people in your hometown?"],["Hometown","Is your hometown a good place for young people to pursue their careers?"],["Paper / Writing letters","Do you often write things?"],["Paper / Writing letters","Do you prefer to write by hand or write using computer?"],["Paper / Writing letters","Do you think computers might one day replace handwriting?"],["Paper / Writing letters","When do children begin to write in your country?"],["Secondary school","Where do you go to school?"],["Secondary school","Do you think your school is good for every student?"],["Secondary school","What changes do you want to make in your school?"],["Outer Space","Have you ever learnt about outer space and stars?"],["Mirrors","Do you like looking at yourself in the mirror? How often?"],["Mirrors","Have you ever bought mirrors?"],["Mirrors","Would you use mirrors to decorate your room?"],["Being polite / Politeness","How did you learn to be polite as a child?"],["Being polite / Politeness","Do you think being polite is very important?"],["Being polite / Politeness","Who taught you to be polite when you were young?"],["Neighborhood/Area","Do you know your neighbors?"],["Neighborhood/Area","What do you think of your neighbors?"],["Neighborhood/Area","How do you get along well with your neighbors?"],["Shopping","Do you like going shopping?"],["Shopping","Do you shop online?"],["Shopping","Does shopping take you a lot of time?"],["Shopping","What is the best part about shopping?"],["Losing things / Lost and found","Do you always bring a lot of keys with you?"],["Losing things / Lost and found","Have you ever lost your keys?"],["History","Do you like learning history?"],["History","What historical event do you find most interesting?"],["History","Do you think history is important?"],["History","Do you like to watch programmes on TV about history?"],["History","Do you think the internet is a good place to learn about history?"],["Parks","Did you like going to parks as a child?"],["Parks","Do you still like going to parks now?"],["Parks","Would you like to see more parks in your city?"],["Parks","Are there any parks you want to go to in the future?"],["Parks","Would you prefer to play in a personal garden or public garden?"],["Parks","How are the parks today different from those you visited as a kid?"],["Parks","What do you like to do when visiting a park?"],["Parks","Would you like to play in a public garden or park?"],["Teachers","Do you like any teacher of yours?"],["Teachers","Do you still keep in touch with your teachers?"],["Teachers","Do you think it’s important to like your teacher?"],["Teachers","Do you want to be a teacher?"],["Teachers","What qualities should a good teacher have?"],["Teachers","Do you have a favorite teacher?"],["Travelling","Do you like to travel?"],["Travelling","Do you often travel by air?"],["Travelling","How long was the longest trip you took?"],["Travelling","Which country would you like to travel to in the future?"],["Travelling","Would you like to travel to space?"],["Collecting things","Do you collect things?"],["Collecting things","Are there any things you keep from childhood?"],["Collecting things","Where do you usually keep things you need?"],["Music","Do you like listening to music?"],["Music","When do you listen to music?"],["Music","Did you learn instruments?"],["Music","Did you have any music classes in school?"],["Music","Do you think it is necessary for children to have music classes?"],["Music","What do you think of Vietnamese traditional music?"],["Music","How much time do you spend listening to music every day?"],["Music","What is your favorite kind of music?"],["Music","When did you start listening to this type of music?"],["Music","How do you feel when you listening to music?"],["Science","Do you like science?"],["Science","What science have you studied?"],["Science","How do you study science?"],["Science","What’s the most difficult part of studying science?"],["Science","How has the science that you have studied helped you?"],["Social Media","Do you like to use social media?"],["Social Media","Do you think you or your friends use too much social media?"],["Social Media","Do you want to work in social media? Why?"],["Social Media","What’s the most popular social media in VietNam? Why?"],["City","Would you recommend your city to others?"],["City","What's the weather like where you live?"],["City","Are there people of different ages living in this city?"],["City","Are the people friendly in the city?"],["City","Is the city friendly to children and old people?"],["City","Do you often see your neighbors?"],["City","What city do you live in?"],["City","Do you like this city? Why?"],["City","How long have you lived in this city?"],["City","Are there big changes in this city?"],["Sports","Did you do any sport when you were younger? (Why/Why not?)"],["Sports","Have you ever supported a sports team? (Why/Why not?)"],["Sports","Do you enjoy watching sports? (Why/Why not?)"],["Sports","Do you think there is too much sport on television in your country? (Why/Why not?)"],["Computers / Tablets","In what conditions would you use a computer?"],["Computers / Tablets","When was the first time you used a computer?"],["Computers / Tablets","In what conditions would it be difficult for you to use a computer?"],["Remembering names","Is it easy for you to remember names?"],["Remembering names","Will you forget other people’s names if others forget your name?"],["Remembering names","How can you strengthen your memory?"],["Art","Do you like art?"],["Art","Have you ever visited an art gallery?"],["Art","Is there any art work on the wall in your room?"],["Websites","What kinds of websites do you usually use?"],["Websites","What changes compared to the past?"],["Keeping things tidy","Are you a tidy person?"],["Keeping things tidy","Are all of your family members tidy?"],["Keeping things tidy","Are you tidier at home or at work/ (school)?"],["Rubbish / Recycling","Do you recycle now? Why?"],["Rubbish / Recycling","Did you recycle when you were a kid?"],["Rubbish / Recycling","Will you recycle in the future?"],["Rubbish / Recycling","What kind of things do you recycle?"],["Food","What kinds of meals do you like?"],["Food","Do you often dinner with your family or friends?"],["Food","When do you usually eat dinner?"],["Food","Are there any fruits or vegetables you don’t like? Why?"],["Food","What is your favourite cuisine?"],["Shoes","What’s your favorite type of shoes? Do you know anyone who likes to buy a lot of shoes?"],["Shoes","Have you ever bought shoes online? How often do you buy shoes?"],["Singing","Do you often sing?"],["Singing","When do you like to sing?"],["Singing","Is it difficult to sing well?"],["Singing","Do you want to be a singer?"],["Singing","What kinds of music do you like to sing?"],["Watches","How often do you wear a watch?"],["Watches","What was your first watch like?"],["Watches","What kind of watches do you like to wear?"],["Watches","Do people still wear watches in your country?"],["Watches","Did you receive any watch as a gift when you were a child?"],["Dreams","How long can you remember your dream when you wake up?"],["Dreams","Do you like hearing others dream?"],["Dreams","Do you think dream will affect life?"],["Dreams","Do you often have dream at night?"],["Dreams","Have you had a bad dream before?"],["Dreams","What was the strangest dream you have had?"],["Dreams","What do you usually dream about?"],["Headphones","Is wearing headphones comfortable?"],["Headphones","Do you use headphones?"],["Headphones","What type of headphones do you use?"],["Headphones","When would you use headphones?"],["Headphones","In what conditions would you not use headphones?"],["Morning Routine","Do you like to get up early in the morning?"],["Morning Routine","What do you do in the morning? What is your morning routine?"],["Morning Routine","Is breakfast important?"],["Glasses","Do people in your country wear sunglasses? Where can you buy sunglasses?"],["Glasses","Do you like to wear sunglasses?"],["Clothes","What's your favorite color of clothes?"],["Clothes","What kind of clothes do you never wear?"],["Clothes","What kind of clothes do you usually wear?"],["Clothes","Do you wear the same style of clothes on weekdays and weekends?"],["Tiredness","Do you often feel tired?"],["Tiredness","When would you feel tired?"],["Tiredness","What do you do when you feel tired?"],["Tiredness","Do you think you get enough rest?"]],"p2":[["Describe an experience that you were proud of","Describe an experience that you were proud of.\nYou should say:\n– What the experience was\n– When and where it happened\n– Who you were with\n– And explain why you were proud of it"],["Describe an interesting video","Describe an interesting video\nYou should say:\n– When and where you watched it\n– What it is about\n– Why you watched it\n– And explain how you feel about it"],["Describe a party that was held after a special event","Describe a party that was held after a special event.\nYou should say:\n– What the special event was\n– Where the party was held\n– Who attended the party\n– What you did at the party\n– And explain why you remember this party"],["Describe a place you have travelled to that you would like to recommend to others","Describe a place you have travelled to that you would like to recommend to others\nYou should say:\n– What it is\n– Where it is\n– What you saw and did there\n– And explain why you would like to recommend it to others"],["A piece of local news that people are interested in","A piece of local news that people are interested in\nYou should say:\n– What it was about\n– Where you saw/heard it\n– Who was involved\n– And explain why people were interested in it"],["Describe a person you know who really likes taking photos","Describe a person you know who really likes taking photos\nYou should say:\n– Who the person is\n– When and how you got to know him/her\n– Where he/she takes photos\n– And explain how you feel about him/her"],["A place you would like to visit in your free time","A place you would like to visit in your free time\nYou should say:\n– Where it is\n– What you will do there\n– How long you will stay there\n– And explain why you would like to visit it"],["A time when you got up early","A time when you got up early\nYou should say:\n– When it was\n– What you did\n– Why you got up early\n– And how you felt about it"],["A special day out that cost you little money/didn't cost you much","A special day out that cost you little money/didn't cost you much\nYou should say:\n– When the day was\n– Where you went\n– How much you spent\n– And explain how you feel about the day"],["Describe a quiet place that you would love to go to","Describe a quiet place that you would love to go to.\nYou should say:\n– Where this place is\n– How you know about this place\n– What you would do there\n– Who you would like to go there with\n– And explain why you would like to go there"],["Describe a person who learns history and loves history","Describe a person who learns history and loves history\nYou should say:\n– Who this person is\n– How he/she learns history\n– Why he/she loves history\n– And explain how you feel about him/her"],["Describe a friend's home you visited and liked but didn't want to live there","Describe a friend's home you visited and liked but didn't want to live there\nYou should say:\n– Whose home it was\n– When and why you visited it\n– What the home was like\n– What you liked about it\n– And explain why you didn't want to live there"],["Describe a new skill you learned when you were a child","Describe a new skill you learned when you were a child\nYou should say:\n– What the skill was\n– Who taught you this skill\n– How you learned it\n– And explain how you feel about learning the skill"],["Describe a change that you made recently","Describe a change that you made recently\nYou should say:\n– What the change was\n– What caused the change\n– What you did for the change\n– And explain how you feel about the change"],["Describe a person you know who has a successful business","Describe a person you know who has a successful business\nYou should say:\n– Who this person is\n– How you got to know him/her\n– Why and how he/she started the business\n– What business he/she does\n– And explain why you think the business is successful"],["Describe a city you have been to and would like to visit again","Describe a city you have been to and would like to visit again\nYou should say:\n– When you visited it\n– What you did there\n– What it was like\n– And explain why you would like to visit it again"],["Describe a time when you changed an important decision of yours","Describe a time when you changed an important decision of yours\nYou should say:\n– When you changed the decision\n– What the original decision was\n– Why you changed it\n– And explain how you felt about the experience"],["A special cake you received from others","A special cake you received from others\nYou should say:\n– When it happened\n– Where it happened\n– Who you got the cake from\n– And explain why it's a special cake"],["Describe a person who is good at learning and speaking new languages","Describe a person who is good at learning and speaking new languages\nYou should say:\n– How you got to know him/her\n– How he/she learns a new language\n– What languages he/she can speak\n– And explain how you feel about him/her"],["Describe an enjoyable evening you had with your friends","Describe an enjoyable evening you had with your friends\nYou should say:\n– When and where it was\n– What you did\n– Who you spent the evening with\n– And explain why it was enjoyable"],["Describe a law on environmental protection","Describe a law on environmental protection\nYou should say:\n– What it is\n– How you first learned about it\n– Who benefits from it\n– And explain how you feel about this law"],["Describe a course that impressed you a lot","Describe a course that impressed you a lot\nYou should say:\n– What the course was about\n– Where you took the course\n– What you did during the course\n– And explain why it impressed you a lot"],["Describe time when you were stuck in a traffic jam for a very long time","Describe time when you were stuck in a traffic jam for a very long time\nYou should say:\n– When it happened\n– Where you were stuck\n– What you did while waiting\n– And explain how you felt in the traffic jam"],["Describe a challenging technological problem you faced","Describe a challenging technological problem you faced\nYou should say:\n– What the problem was\n– When and where you faced it\n– How challenging it was\n– And explain how you solved it"],["A time when you organized a happy event successfully","A time when you organized a happy event successfully\nYou should say:\n– What the event was\n– How you prepared for it\n– Who helped you to organize it\n– And explain why you think it was a successful event"],["Describe a famous person in your local area","Describe a famous person in your local area\nYou should say:\n– Who this person is\n– What he/she has done\n– Why he/she is popular\n– And explain how you feel about this person"],["Describe an advertisement with a famous person in it","Describe an advertisement with a famous person in it\nYou should say:\n– Who the person is\n– Where you can see it\n– What the advertisement is about\n– And explain how you feel about the advertisement"],["Describe a food that people eat on special occasions/events","Describe a food that people eat on special occasions/events\nYou should say:\n– What the special event/occasion is\n– How it is cooked/made\n– And explain why people eat it on that special occasion/event"],["Describe a time when you worked in a group","Describe a time when you worked in a group"],["Describe a gift you would like to buy for your friend","Describe a gift you would like to buy for your friend\nYou should say:\n– How you knew your friend\n– How long you have known him/her\n– How you would choose a gift for him/her\n– And explain why you would choose that gift for him/her"],["A new law you would like to introduce in your country","A new law you would like to introduce in your country\nYou should say:\n– What it is\n– What changes that law brings\n– Whether the new law will be popular\n– How you came up with the new law\n– And explain how you feel about this new law"],["Describe an activity you do regularly that you think is a waste of time","Describe an activity you do regularly that you think is a waste of time\nYou should say:\n– What it is\n– When you usually do it\n– Why you do it\n– And explain why you think it is a waste of time"],["An important decision that you made","An important decision that you made\nYou should say:\n– What the decision was\n– How you made your decision\n– What the results of the decision were\n– And explain why it was important"],["Describe a person who loves to grow plants (e.g. vegetables, flowers) at home or in the garden","Describe a person who loves to grow plants (e.g. vegetables, flowers) at home or in the garden\nYou should say:\n– Who this person is\n– What plants he/she grows\n– How he/she grows the plants\n– And explain why he/she loves growing plants"],["Describe a time when you saved money to buy something you wanted","Describe a time when you saved money to buy something you wanted\nYou should say:\n– What you wanted to buy\n– Why you wanted to buy it\n– How you saved money for it\n– And explain how you feel after buying it"],["Describe a thing you did to learn another language","Describe a thing you did to learn another language\nYou should say:\n– What language you learned\n– What you did\n– How it helped you learn the language\n– And how you feel about it"],["Describe a noisy place you have been to","Describe a noisy place you have been to\nYou should say:\n– Where it is\n– When you went there\n– What you did there\n– And explain why you feel it's a noisy place"],["Describe a time when you changed an important opinion of yours","Describe a time when you changed an important opinion of yours\nYou should say:\n– When you changed your opinion\n– What the original opinion was\n– Why you changed it\n– And explain how you felt about the experience"],["Describe a time you made an important decision and were happy with the result","Describe a time you made an important decision and were happy with the result\nYou should say:\n– What the decision was\n– Why you made the decision\n– How easy it was for you to make the decision\n– And explain why you were happy with the result"],["Describe a home that you like to visit but do not want to live in","Describe a home that you like to visit but do not want to live in\nYou should say:\n– Where it is\n– What it is like\n– Why you like to visit it\n– And explain why you would not like to live there"],["A friend from your childhood","A friend from your childhood\nYou should say:\n– Who he/she is\n– Where and how you met each other\n– What you often did together\n– And explain what made you like him/her"],["Describe a person you know who would like to choose a career in the medical field (e.g. a doctor, a nurse)","Describe a person you know who would like to choose a career in the medical field (e.g. a doctor, a nurse)\nYou should say:\n– When you knew him/her\n– When he/she started to think about that\n– What he/she would like to do\n– And explain why he/she would like to choose this career"],["Describe a person you know who did something difficult and was successful","Describe a person you know who did something difficult and was successful\nYou should say:\n– Who this person is\n– What difficult thing this person did\n– Why this person was successful\n– And explain how you feel about this person"],["Describe a person who works in a successful company","Describe a person who works in a successful company"],["Describe a time when you received good service in a shop/store","Describe a time when you received good service in a shop/store\nYou should say:\n– Where the shop is\n– When you went to the shop\n– What service you received from the staff\n– And explain how you felt about the service"],["Describe a time when someone talked about something you were not interested in but you kept listening","Describe a time when someone talked about something you were not interested in but you kept listening\nYou should say:\n– Who the person was\n– What he/she talked about\n– Why you kept listening\n– And explain how you feel about the experience"],["Describe an important river/lake in your country","Describe an important river/lake in your country\nYou should say:\n– Where it is located\n– How big/long it is\n– What it looks like\n– And explain why it is important"],["Describe a live sports event you watched and liked","Describe a live sports event you watched and liked\nYou should say:\n– What it was\n– When and where you watched it\n– Who you watched it with\n– And explain why you liked it"],["Describe a crowded place you went to","Describe a crowded place you went to\nYou should say:\n– Where it was\n– When you went there\n– Who you went there with\n– What you did there\n– And how you felt about it"],["Describe a long-term goal/ambition you would like to achieve","Describe a long-term goal/ambition you would like to achieve\nYou should say:\n– How long you have had this goal/ambition\n– What it is\n– How you will achieve it\n– And explain why you set it"],["Describe a person who is good at making things by hand","Describe a person who is good at making things by hand\nYou should say:\n– Who this person is\n– What he/she makes\n– What materials or technologies he/she uses\n– And why you think this person is good at making things by hand"],["Describe a time when you sent a message or an email to someone but received no reply for a long time","Describe a time when you sent a message or an email to someone but received no reply for a long time\nYou should say:\n– Who you sent it to\n– What the message/email was about\n– Whether you finally received the reply\n– And explain how you felt about the experience"],["Describe a person you only met once recently and want to know more about","Describe a person you only met once recently and want to know more about\nYou should say:\n– Who he/she is\n– When you met him/her\n– Why you want to know more about him/her\n– And explain how you feel about him/her"],["Describe someone who is older than you that you admire","Describe someone who is older than you that you admire\nYou should say:\n– Who this person is\n– How you knew this person\n– What kinds of things you like to do together\n– And explain how you feel about this person"],["Describe a happy person you know","Describe a happy person you know\nYou should say:\n– Who this person is\n– What he/she is like\n– How he/she shows happiness\n– And explain why you think he/she is a happy person"],["Describe your least favourite movie","Describe your least favourite movie\nYou should say:\n– When you watched it\n– Where you watched it\n– What it was about\n– And explain why it's your least favourite movie"],["Describe a tall building you like or dislike","Describe a tall building you like or dislike\nYou should say:\n– What it is used for\n– Where it is\n– What it looks like\n– And explain why you like/dislike it"],["Describe a person you know who is very organized","Describe a person you know who is very organized\nYou should say:\n– Who this person is\n– What this person usually does to stay organized\n– In what situations you have noticed this quality\n– And explain why you think being organized is important to him/her"],["Describe a place where you don't like the music they play","Describe a place where you don't like the music they play\nYou should say:\n– Where this place is\n– What kind of music they play there\n– When you went there\n– And explain why you don't like the music they play there"],["Describe a boring place","Describe a boring place\nYou should say:\n– Where it is\n– Who you went there with\n– What you did there\n– And explain why you think it is a boring place"],["Describe a plan that you had to change recently","Describe a plan that you had to change recently\nYou should say:\n– When this happened\n– What made you change the plan\n– What the new plan was\n– And how you felt about the change"],["Describe a long trip that you often take but do not like","Describe a long trip that you often take but do not like.\nYou should say:\n– Where you go\n– How you usually travel\n– How long the trip takes\n– Why you often have to make this trip\n– And explain why you do not like it"],["Describe a natural place in your city that you enjoy visiting","Describe a natural place in your city that you enjoy visiting\nYou should say:\n– Where it is\n– What it is like\n– How often you go there\n– Who you often go there with\n– And explain why you enjoy visiting there"],["Describe a time when you interviewed a famous person","Describe a time when you interviewed a famous person\nYou should say:\n– Who the famous person was\n– When and where you interviewed this person\n– What you talked about during the interview\n– And explain how you feel about the experience"],["Describe a story/book with animals in it","Describe a story/book with animals in it\nYou should say:\n– What animals are in it?\n– What the story/book is about\n– Why you read the story/book\n– And explain what you think of this story/book"],["An environmental law you would like your country to introduce","An environmental law you would like your country to introduce\nYou should say:\n– What law it should be\n– Why people should follow the law\n– Whether the law will be popular\n– And explain how you feel about this law"]],"p3":[["Describe an experience that you were proud of","What kinds of achievements make people feel proud?"],["Describe an experience that you were proud of","Do young people feel proud of the same things as older people?"],["Describe an experience that you were proud of","Is it important for parents to praise their children?"],["Describe an experience that you were proud of","Why do some people find it difficult to accept praise?"],["Describe an experience that you were proud of","Do you think people should be proud of their achievements?"],["Describe an experience that you were proud of","Is it better to be proud of yourself or to receive recognition from others?"],["Describe an experience that you were proud of","Can being too proud of yourself have negative effects?"],["Describe an experience that you were proud of","What can people learn from experiences that make them proud?"],["Describe an interesting video","What kinds of things are popular on social media?"],["Describe an interesting video","What are the advantages and disadvantages of using social media?"],["Describe an interesting video","What do you think of making friends on social network?"],["Describe a party that was held after a special event","Why do people like having parties after special events?"],["Describe a party that was held after a special event","What kinds of events do people usually celebrate with a party?"],["Describe a party that was held after a special event","Do people prefer large parties or small gatherings?"],["Describe a party that was held after a special event","What makes a party enjoyable?"],["Describe a party that was held after a special event","Why are some people reluctant to attend parties?"],["Describe a party that was held after a special event","Do you think people spend too much money on parties?"],["Describe a place you have travelled to that you would like to recommend to others","Is it important to take photos while traveling?"],["Describe a place you have travelled to that you would like to recommend to others","Can you trust other people’s travel journals on the Internet?"],["Describe a place you have travelled to that you would like to recommend to others","What factors affect how people feel about travel?"],["A piece of local news that people are interested in","How do people usually get local news nowadays?"],["A piece of local news that people are interested in","Do you think local news is more important than international news? Why?"],["A piece of local news that people are interested in","Why are some news stories more popular than others?"],["A piece of local news that people are interested in","Do social media affect the way people receive news?"],["Describe a person you know who really likes taking photos","Why are some people keen on taking photos?"],["Describe a person you know who really likes taking photos","What kind of photos do people often take?"],["Describe a person you know who really likes taking photos","Do you think it's OK to take photos everywhere?"],["Describe a person you know who really likes taking photos","Why do tourists like taking photos while they are travelling?"],["Describe a person you know who really likes taking photos","Why some people don't mind others walking into their shot when they're taking photos?"],["A place you would like to visit in your free time","Do people prefer planned travel?"],["A place you would like to visit in your free time","Why do places with historical attractions develop tourism more aggressively?"],["A place you would like to visit in your free time","Why do you think people usually travel?"],["A place you would like to visit in your free time","Why does living in tourist cities experience more noise?"],["A time when you got up early","Is it good to arrive early in any situation?"],["A time when you got up early","Do you know anyone who likes to get up early?"],["A time when you got up early","Why do people get up early?"],["A time when you got up early","What kinds of occasions need people to arrive early?"],["A time when you got up early","Why do some people like to stay up late?"],["A time when you got up early","What kind of people like getting up early?"],["A special day out that cost you little money/didn't cost you much","How do people spend their leisure time in VietNam?"],["Describe a quiet place that you would love to go to","Why do people like going to quiet places?"],["Describe a quiet place that you would love to go to","What kinds of places are usually quiet?"],["Describe a quiet place that you would love to go to","Do people nowadays have enough opportunities to enjoy peace and quiet?"],["Describe a quiet place that you would love to go to","Why is it difficult for people to find quiet places in cities?"],["Describe a quiet place that you would love to go to","Do young people prefer quiet places or lively places?"],["Describe a quiet place that you would love to go to","Is it important for children to spend time in quiet places?"],["Describe a person who learns history and loves history","Do you think children should begin learning history from an early age?"],["Describe a person who learns history and loves history","At what age do you think people should begin to learn history?"],["Describe a person who learns history and loves history","How do children learn history before they attend school?"],["Describe a person who learns history and loves history","Is it important to learn how people in the past lived their lives?"],["Describe a person who learns history and loves history","Do you think people should learn ancient history before learning modern history?"],["Describe a person who learns history and loves history","Besides historical events, what else is important when learning history?"],["Describe a friend's home you visited and liked but didn't want to live there","What kind of homes do people usually prefer to live in?"],["Describe a friend's home you visited and liked but didn't want to live there","Why do some people prefer living in houses rather than apartments?"],["Describe a friend's home you visited and liked but didn't want to live there","What are the advantages of living in a large house?"],["Describe a friend's home you visited and liked but didn't want to live there","Do you think people need a lot of space in their homes?"],["Describe a friend's home you visited and liked but didn't want to live there","What makes a home comfortable and pleasant to live in?"],["Describe a friend's home you visited and liked but didn't want to live there","Why do some people like visiting other people's homes?"],["Describe a friend's home you visited and liked but didn't want to live there","Do you think people's homes reflect their personalities?"],["Describe a friend's home you visited and liked but didn't want to live there","What factors should people consider when choosing a place to live?"],["Describe a friend's home you visited and liked but didn't want to live there","Is it better to live in the city or in the countryside?"],["Describe a friend's home you visited and liked but didn't want to live there","Do you think people's preferences for homes change as they get older?"],["Describe a new skill you learned when you were a child","What skills should children learn before they go to school?"],["Describe a new skill you learned when you were a child","What are the differences between learning in a group and learning by yourself?"],["Describe a new skill you learned when you were a child","What are the differences between the way adults learn and the way children learn?"],["Describe a new skill you learned when you were a child","Do you think it is easier for children to learn new skills than for adults?"],["Describe a new skill you learned when you were a child","Can a child learn skills from another child?"],["Describe a new skill you learned when you were a child","Is it important for everyone to have a specialized skill?"],["Describe a change that you made recently","Is it easier for young people to change?"],["Describe a change that you made recently","Is it easy for old people to change?"],["Describe a change that you made recently","How can people change their daily routine if they want to?"],["Describe a change that you made recently","What are the disadvantages when people keep making changes?"],["Describe a person you know who has a successful business","Would you like to start a family business?"],["Describe a person you know who has a successful business","What are the advantages and disadvantages of family businesses?"],["Describe a city you have been to and would like to visit again","What's the difference between the city and the countryside?"],["Describe a city you have been to and would like to visit again","Some people say large cities are suitable for old people. What do you think?"],["Describe a city you have been to and would like to visit again","Do you think it is possible that all of the population move to cities?"],["Describe a city you have been to and would like to visit again","Do you think people in the countryside are friendlier than people in the city?"],["Describe a city you have been to and would like to visit again","Are there any changes in your city?"],["Describe a city you have been to and would like to visit again","What should the government do to improve citizens' safety?"],["Describe a time when you changed an important decision of yours","When do most children begin to make their own decisions?"],["A special cake you received from others","What are the differences between the special food in Vietnam and foreign countries?"],["A special cake you received from others","Do people usually cook special food in Vietnam?"],["A special cake you received from others","Should special food be easily available?"],["Describe a person who is good at learning and speaking new languages","At what age should children start learning a foreign language?"],["Describe a person who is good at learning and speaking new languages","Which skill is more important, speaking or writing?"],["Describe a person who is good at learning and speaking new languages","Does a person still need to learn other languages if he or she is good at English?"],["Describe a person who is good at learning and speaking new languages","Do you think minority languages will disappear?"],["Describe an enjoyable evening you had with your friends","How do people get along in a big family?"],["Describe a law on environmental protection","What kinds of rules do schools in China have?"],["Describe a law on environmental protection","Do you think school rules are important?"],["Describe a law on environmental protection","Are children unhappy with the school rules?"],["Describe a law on environmental protection","How can parents help their children understand and follow rules?"],["Describe a law on environmental protection","What are the rules people should obey at work?"],["Describe a law on environmental protection","What is the purpose of punishment?"],["Describe a course that impressed you a lot","What do people need to remember in their daily lives?"],["Describe a course that impressed you a lot","What can we learn from history?"],["Describe a course that impressed you a lot","Why do some people have a better memory than others?"],["Describe a course that impressed you a lot","Do people like things of memorial significance?"],["Describe a course that impressed you a lot","Which can help people remember things better, words or photos?"],["Describe a course that impressed you a lot","Can technology help people remember things better? How?"],["Describe time when you were stuck in a traffic jam for a very long time","Which vehicles are more likely to be in a traffic jam, cars or buses?"],["Describe a challenging technological problem you faced","What kinds of technological problems do people often face?"],["Describe a challenging technological problem you faced","How has technology made people's lives easier?"],["Describe a challenging technological problem you faced","Do you think people depend too much on technology nowadays?"],["Describe a challenging technological problem you faced","What should people do when technology fails?"],["Describe a challenging technological problem you faced","Will technology become more reliable in the future?"],["A time when you organized a happy event successfully","How would you feel when you were not well prepared for something?"],["A time when you organized a happy event successfully","Do you prefer to prepare and organize an activity or just take part in an activity?"],["A time when you organized a happy event successfully","How can parents help children to be organized?"],["A time when you organized a happy event successfully","On what occasions do people need to be organized?"],["A time when you organized a happy event successfully","Does everything need to be well prepared?"],["A time when you organized a happy event successfully","Do people need others' help when organizing things?"],["Describe a famous person in your local area","Is it always good to be a popular student at school?"],["Describe a famous person in your local area","Why are some students popular?"],["Describe an advertisement with a famous person in it","Why do companies use celebrities in advertisements?"],["Describe an advertisement with a famous person in it","Do celebrity advertisements influence consumers?"],["Describe an advertisement with a famous person in it","Are advertisements more creative nowadays?"],["Describe an advertisement with a famous person in it","What makes an advertisement effective?"],["Describe an advertisement with a famous person in it","Do children get influenced by advertisements easily?"],["Describe an advertisement with a famous person in it","Should there be stricter control of advertising?"],["Describe a food that people eat on special occasions/events","Do Vietnamese people grow plants?"],["Describe a food that people eat on special occasions/events","Which food is generally popular in your country?"],["Describe a food that people eat on special occasions/events","Why do some people prefer planting food themselves?"],["Describe a food that people eat on special occasions/events","Will there be more and more people planting food in the future?"],["Describe a time when you worked in a group","How do other people in your team think he is?"],["Describe a time when you worked in a group","What do you think are the characteristics of a good leader?"],["Describe a time when you worked in a group","What happens if you don’t have a good leader?"],["Describe a time when you worked in a group","Why do some people not like teamwork?"],["Describe a time when you worked in a group","Do you think young people are suitable for teamwork?"],["Describe a gift you would like to buy for your friend","When do people normally send gifts to others?"],["Describe a gift you would like to buy for your friend","Is it easy to choose clothes as gifts?"],["Describe a gift you would like to buy for your friend","Will people feel happy when receiving an expensive gift?"],["A new law you would like to introduce in your country","Is it important to take photos while traveling?"],["A new law you would like to introduce in your country","Can you trust other people’s travel journals on the Internet?"],["A new law you would like to introduce in your country","What factors affect how people feel about travel?"],["Describe an activity you do regularly that you think is a waste of time","How do you balance life and work?"],["Describe an activity you do regularly that you think is a waste of time","Will you continue doing something when you are aware that it's a waste of time?"],["Describe an activity you do regularly that you think is a waste of time","What kinds of things make people feel pressured?"],["Describe an activity you do regularly that you think is a waste of time","Why do some people refuse to abide by rules?"],["An important decision that you made","What decisions do people usually make in their daily lives?"],["An important decision that you made","Which is easier, making a decision by yourself or making a decision after group discussion?"],["An important decision that you made","Why are many young people unwilling to follow their parents’ advice?"],["An important decision that you made","Why would middle-aged people tend to second-guess their own decisions?"],["Describe a person who loves to grow plants (e.g. vegetables, flowers) at home or in the garden","What do you think of the job of a farmer?"],["Describe a person who loves to grow plants (e.g. vegetables, flowers) at home or in the garden","Are there many people growing their own vegetables now?"],["Describe a person who loves to grow plants (e.g. vegetables, flowers) at home or in the garden","Do you think it’s good to let kids learn how to plant?"],["Describe a person who loves to grow plants (e.g. vegetables, flowers) at home or in the garden","What are the differences between traditional and modern agriculture?"],["Describe a time when you saved money to buy something you wanted","Should schools teach children how to manage money from a young age?"],["Describe a time when you saved money to buy something you wanted","Should parents teach their children to spend money freely or to save money?"],["Describe a time when you saved money to buy something you wanted","Do you think it is easier to teach teenagers how to manage money when they are around 16 or 17 years old?"],["Describe a time when you saved money to buy something you wanted","Is it easier to spend money or save money?"],["Describe a time when you saved money to buy something you wanted","What kind of things do people usually save money for?"],["Describe a thing you did to learn another language","What difficulties do people face when learning a language?"],["Describe a thing you did to learn another language","Do you think language learning is important? Why?"],["Describe a time when you changed an important opinion of yours","Why do people change their opinions?"],["Describe a time when you changed an important opinion of yours","Is it easy for people to admit they were wrong?"],["Describe a time when you changed an important opinion of yours","Do older people change their opinions less often than young people?"],["Describe a time when you changed an important opinion of yours","Can other people influence our opinions? How?"],["Describe a time when you changed an important opinion of yours","Is it important to listen to different viewpoints?"],["Describe a time when you changed an important opinion of yours","Should people always stick to their own opinions?"],["Describe a time you made an important decision and were happy with the result","How can we tell the difference between an important and an easy decision?"],["Describe a time you made an important decision and were happy with the result","Do you think it is a good idea to make a small decision every day?"],["Describe a time you made an important decision and were happy with the result","What little decisions do people make every day?"],["Describe a time you made an important decision and were happy with the result","What if people in a group have different opinions on a decision?"],["Describe a time you made an important decision and were happy with the result","Do you think most people's decisions are made in their 20s?"],["Describe a time you made an important decision and were happy with the result","Which is better, to make a decision quickly or slowly?"],["Describe a home that you like to visit but do not want to live in","What are the differences between houses or buildings in the city and in the countryside?"],["Describe a home that you like to visit but do not want to live in","Do you prefer to live in the city or in the countryside?"],["Describe a home that you like to visit but do not want to live in","What safety risks are there in residential buildings in cities?"],["Describe a home that you like to visit but do not want to live in","Is it expensive to decorate a house or an apartment in the place where you live?"],["A friend from your childhood","Do you still keep in touch with your friends from childhood? Why or why not?"],["A friend from your childhood","What do you think of online social media?"],["A friend from your childhood","Do you think online social media will replace face-to-face communication?"],["A friend from your childhood","How important is childhood friendship to children?"],["Describe a person you know who would like to choose a career in the medical field (e.g. a doctor, a nurse)","Why do some people choose to work in the medical field?"],["Describe a person you know who would like to choose a career in the medical field (e.g. a doctor, a nurse)","How does working in a medical-related profession impact a person's life?"],["Describe a person you know who would like to choose a career in the medical field (e.g. a doctor, a nurse)","Do you think medical professionals are valued in society?"],["Describe a person you know who would like to choose a career in the medical field (e.g. a doctor, a nurse)","In your opinion, which profession is more important: doctors or nurses?"],["Describe a person you know who would like to choose a career in the medical field (e.g. a doctor, a nurse)","How can technology influence medical-related professions in the future?"],["Describe a person you know who would like to choose a career in the medical field (e.g. a doctor, a nurse)","What qualities are essential for someone to succeed in a medical profession?"],["Describe a person you know who did something difficult and was successful","Is it difficult to do business in today's world?"],["Describe a person you know who did something difficult and was successful","How can companies help protect the environment?"],["Describe a person you know who did something difficult and was successful","Does money equal success?"],["Describe a person who works in a successful company","Would you like to start a family business?"],["Describe a person who works in a successful company","What are the advantages and disadvantages of family businesses?"],["Describe a time when you received good service in a shop/store","What are the differences between the service in large shops and small stores?"],["Describe a time when you received good service in a shop/store","What do people do when they get bad service?"],["Describe a time when you received good service in a shop/store","What are the qualities of being a good restaurant?"],["Describe a time when someone talked about something you were not interested in but you kept listening","What kind of topics do young people like to talk about today?"],["Describe a time when someone talked about something you were not interested in but you kept listening","What would happen if the listener didn't listen carefully?"],["Describe a time when someone talked about something you were not interested in but you kept listening","How can we tell if a listener is listening carefully?"],["Describe an important river/lake in your country","What are the popular water sports in your country?"],["Describe an important river/lake in your country","Are rivers and lakes important to a country?"],["Describe an important river/lake in your country","How can rivers and lakes benefit local people?"],["Describe an important river/lake in your country","Do you think rivers and lakes attract tourists?"],["Describe an important river/lake in your country","How do rivers and lakes affect local tourism?"],["Describe an important river/lake in your country","Are rivers and lakes good for transport? Why?"],["Describe a live sports event you watched and liked","What kinds of sports events are broadcast on TV or other media in your country?"],["Describe a live sports event you watched and liked","Do people in your country enjoy watching football games?"],["Describe a live sports event you watched and liked","Does encouragement and applause from the audience have an impact on athletes? What are the impacts?"],["Describe a long-term goal/ambition you would like to achieve","What kinds of ambitions do people have?"],["Describe a long-term goal/ambition you would like to achieve","Why should parents encourage children to have ambitions?"],["Describe a long-term goal/ambition you would like to achieve","Should parents interfere with children’s ambitions?"],["Describe a long-term goal/ambition you would like to achieve","Is there any difference between children’s ambitions and those of grown-ups?"],["Describe a person who is good at making things by hand","Do you think handmade is a good thing?"],["Describe a person who is good at making things by hand","Do you think children like making things by hand?"],["Describe a person who is good at making things by hand","Is traditional craftsmanship important to the country’s tourism industry?"],["Describe a person who is good at making things by hand","What kinds of handmade things did you make as a child?"],["Describe a person who is good at making things by hand","What can handmade products bring to tourist attractions?"],["Describe a time when you sent a message or an email to someone but received no reply for a long time","Do you think children are born smart or they learn to become smart?"],["Describe a time when you sent a message or an email to someone but received no reply for a long time","How do children become smarter at school?"],["Describe a time when you sent a message or an email to someone but received no reply for a long time","Why are some people well-rounded and others only good at one thing?"],["Describe a time when you sent a message or an email to someone but received no reply for a long time","Why does modern society need talents of all kinds?"],["Describe a person you only met once recently and want to know more about","What can we do to leave a good impression on people we meet for the first time?"],["Describe a person you only met once recently and want to know more about","What should we not talk about when we meet a person for the first time?"],["Describe a person you only met once recently and want to know more about","How do people make friends in your country?"],["Describe a person you only met once recently and want to know more about","On what occasions do people like to make friends?"],["Describe a person you only met once recently and want to know more about","Is it important to have the same hobbies and interests when making friends?"],["Describe a person you only met once recently and want to know more about","What qualities make true friends?"],["Describe someone who is older than you that you admire","What can young and old people learn from each other?"],["Describe someone who is older than you that you admire","Has old people's life quality improved when compared to the past?"],["Describe someone who is older than you that you admire","Why is there a generation gap between the young and the old?"],["Describe someone who is older than you that you admire","What do old people usually do in their daily life?"],["Describe a happy person you know","Should teachers know what children are doing all the time?"],["Describe a happy person you know","Do you think teachers are able to spot the unhappy children?"],["Describe a happy person you know","How can the arts spread positive emotions in society?"],["Describe a happy person you know","When do you think people are happiest?"],["Describe your least favourite movie","What kinds of movies are the most popular in Vietnam?"],["Describe your least favourite movie","What are the differences between watching movies at home and in a cinema?"],["Describe your least favourite movie","Are movies more likely to help people become more creative than books?"],["Describe your least favourite movie","Can movies help people better understand the cultural background of a country?"],["Describe a tall building you like or dislike","How easy is it to find a place to live in your country?"],["Describe a tall building you like or dislike","Do you think it's better to rent or to buy a place to live in?"],["Describe a tall building you like or dislike","What are some of the pleasures involved in making a home for ourselves?"],["Describe a person you know who is very organized","Why is it important for people to be organized?"],["Describe a person you know who is very organized","Do you think children should learn to be organized from a young age?"],["Describe a person you know who is very organized","Are organized people more likely to be successful at work or in their studies?"],["Describe a person you know who is very organized","What can people do to become more organized?"],["Describe a person you know who is very organized","Should parents teach their children to be organized?"],["Describe a person you know who is very organized","Do you think it is important for managers to be organized?"],["Describe a place where you don't like the music they play","Do you think music is important in public places?"],["Describe a place where you don't like the music they play","What kind of music do people usually listen to in cafés?"],["Describe a place where you don't like the music they play","Why do some people like listening to music while studying or working?"],["Describe a place where you don't like the music they play","Do young people and older people have different tastes in music?"],["Describe a place where you don't like the music they play","Is it a good idea for shops to play music?"],["Describe a place where you don't like the music they play","Should restaurants allow customers to choose the music?"],["Describe a place where you don't like the music they play","Can music affect people's behaviour?"],["Describe a place where you don't like the music they play","Do you think people listen to too much music nowadays?"],["Describe a boring place","Why do some people get bored easily?"],["Describe a boring place","What kinds of places do young people enjoy visiting?"],["Describe a boring place","Do people have different ideas of what is interesting?"],["Describe a boring place","How can tourist attractions become more appealing?"],["Describe a boring place","Is it important to try new experiences?"],["Describe a boring place","Do people today have less patience than in the past?"],["Describe a plan that you had to change recently","Why do people sometimes change their plans?"],["Describe a plan that you had to change recently","Is it important to be flexible in life?"],["Describe a plan that you had to change recently","Do young people change plans more often than older people?"],["Describe a plan that you had to change recently","How do people feel when their plans suddenly change?"],["Describe a plan that you had to change recently","Can changing plans sometimes lead to better results?"],["Describe a plan that you had to change recently","How can people deal with unexpected changes?"],["Describe a long trip that you often take but do not like","Why do people dislike long journeys?"],["Describe a long trip that you often take but do not like","What are the most common reasons people make long trips?"],["Describe a long trip that you often take but do not like","Do people prefer travelling by car, train or plane for long journeys?"],["Describe a long trip that you often take but do not like","What can people do to make a long journey more enjoyable?"],["Describe a long trip that you often take but do not like","Why do some people enjoy travelling while others do not?"],["Describe a long trip that you often take but do not like","Do you think travelling by public transport will become more popular in the future?"],["Describe a natural place in your city that you enjoy visiting","Do you think there should be many natural places in cities?"],["Describe a natural place in your city that you enjoy visiting","Do you think staying in a natural place would help change people's mood?"],["Describe a natural place in your city that you enjoy visiting","Which is more important, protecting the environment or developing the economy?"],["Describe a time when you interviewed a famous person","What kinds of people are usually interviewed?"],["Describe a time when you interviewed a famous person","Why do some people dislike being interviewed?"],["Describe a time when you interviewed a famous person","Why do some people think interviews are a waste of time?"],["Describe a time when you interviewed a famous person","What should people do to prepare for a job interview?"],["Describe a story/book with animals in it","Why do children enjoy stories about animals?"],["Describe a story/book with animals in it","What can people learn from animal stories?"],["Describe a story/book with animals in it","Do films influence how people view animals?"],["Describe a story/book with animals in it","Why are animals often used in stories?"],["Describe a story/book with animals in it","Should children learn about animals at school?"],["Describe a story/book with animals in it","Do people care more about animal welfare nowadays?"],["An environmental law you would like your country to introduce","Is it important to take photos while traveling?"],["An environmental law you would like your country to introduce","Can you trust other people’s travel journals on the Internet?"],["An environmental law you would like your country to introduce","What factors affect how people feel about travel?"]]};

  // 3. TẠO TAB TRÊN THANH MENU & SECTION GIAO DIỆN SPEAKING
  function injectSpeakingTabAndSection() {
    const navBar = document.querySelector('.dash-nav');
    if (navBar && !document.getElementById('tabBtnSpeaking')) {
      const spkBtn = document.createElement('button');
      spkBtn.type = 'button';
      spkBtn.id = 'tabBtnSpeaking';
      spkBtn.className = 'dash-tab';
      spkBtn.setAttribute('data-tab', 'speaking');
      spkBtn.onclick = () => switchDashTab('speaking');
      spkBtn.innerHTML = '🗣️ Speaking Practice';

      const writingBtn = navBar.querySelector('[data-tab="writing"]');
      if (writingBtn && writingBtn.nextSibling) {
        navBar.insertBefore(spkBtn, writingBtn.nextSibling);
      } else {
        navBar.appendChild(spkBtn);
      }
    }

    const mainContainer = document.querySelector('.dash-container');
    if (mainContainer && !document.getElementById('dashTab-speaking')) {
      const spkSec = document.createElement('section');
      spkSec.id = 'dashTab-speaking';
      spkSec.className = 'dash-section';
      spkSec.innerHTML = `
        <div id="spkAppRoot">
          <aside class="side">
            <div class="amuro-logo">AMURO</div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:-8px;">
              <span class="cap">Forecast Q3/2026</span>
            </div>
            <div class="draw-head"><span class="lbl">draw</span><span class="cap">random</span></div>
            <div class="parts">
              <div class="part-row">
                <button class="part" data-part="p1" title="Bốc ngẫu nhiên một câu Part 1 (phím 1)" type="button">
                  <span class="num">01</span><span class="t"><b>Part 1</b><small id="spk-cnt-p1">0 / 209 câu đã luyện</small></span>
                </button>
                <button class="spk-btn topic-btn" data-topic="p1" title="Bốc cả một chủ đề Part 1" type="button">Topic</button>
              </div>
              <div class="part-row">
                <button class="part on" data-part="p2" title="Bốc ngẫu nhiên một cue card Part 2 (phím 2)" type="button">
                  <span class="num">02</span><span class="t"><b>Part 2</b><small id="spk-cnt-p2">0 / 66 cue cards đã luyện</small></span>
                </button>
              </div>
              <div class="part-row">
                <button class="part" data-part="p3" title="Bốc ngẫu nhiên một câu Part 3 (phím 3)" type="button">
                  <span class="num">03</span><span class="t"><b>Part 3</b><small id="spk-cnt-p3">0 / 283 câu đã luyện</small></span>
                </button>
                <button class="spk-btn topic-btn" data-topic="p3" title="Bốc cả một chủ đề Part 3" type="button">Topic</button>
              </div>
            </div>
            <p class="note">Bấm Part để bốc một câu. Bấm Topic để bốc cả bộ câu hỏi của một chủ đề.</p>
            <div class="opts">
              <label class="opt" for="spkNoRepeat">
                <input id="spkNoRepeat" type="checkbox" checked/>
                <span>Không lặp lại câu đã bốc<small>Chỉ bốc câu chưa luyện cho đến khi hết</small></span>
              </label>
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <button class="spk-btn" id="spkResetUsed" type="button">Reset đã luyện</button>
                <span class="note" id="spkUsedTotal">0 / 558 đã luyện</span>
              </div>
            </div>
          </aside>

          <main class="stage">
            <div class="top">
              <div class="who">
                <span aria-hidden="true" class="big-no" id="spkBigNo">02</span>
                <h1 class="hero" id="spkHero">Part 2</h1>
                <span class="sub" id="spkSub">Cue card · 1 phút chuẩn bị, 1–2 phút nói</span>
              </div>
              <div class="clock" id="spkClock">
                <div class="ring">
                  <svg aria-hidden="true" viewBox="0 0 100 100">
                    <circle class="bg" cx="50" cy="50" r="47"></circle>
                    <circle class="fg" cx="50" cy="50" id="spkRingFg" r="47" stroke-dasharray="295.31" stroke-dashoffset="295.31"></circle>
                  </svg>
                  <div class="digits"><span id="spkDigits">0:00</span><small id="spkAim">aim 2:00</small></div>
                </div>
                <div class="c-side">
                  <span class="cap">speaking time</span>
                  <div class="c-row">
                    <button class="spk-btn rec" id="spkRecBtn" type="button"><span class="dot"></span><span id="spkRecLabel">Record</span></button>
                    <button class="spk-btn solid" id="spkTStart" type="button">Start</button>
                    <button class="spk-btn" id="spkTReset" type="button">Reset</button>
                  </div>
                  <div class="level"><i id="spkLevel"></i></div>
                  <span class="status" id="spkStatus">Record để ghi âm và tính giờ, hoặc Start để chỉ bấm giờ.</span>
                </div>
              </div>
            </div>

            <section class="panel">
              <div class="panel-head">
                <div class="ph-left"><span class="lbl">question</span><span class="cap" id="spkQMeta">cue card</span></div>
                <div class="tools">
                  <button class="spk-btn ghost" id="spkNextBtn" type="button">Part 3 on this topic →</button>
                  <button class="spk-btn ghost" id="spkClearQ" type="button">Clear</button>
                </div>
              </div>
              <textarea class="q card" id="spkQ" placeholder="Bốc một câu hỏi, chọn từ kho bên phải, hoặc tự gõ câu hỏi vào đây" rows="3"></textarea>
              <p class="msg" id="spkQMsg" style="padding:0 20px 12px"></p>
            </section>

            <div class="lower">
              <section class="panel">
                <div class="panel-head"><div class="ph-left"><span class="lbl">recordings</span><span class="cap" id="spkTakesInfo"></span></div></div>
                <div class="takes" id="spkTakes">
                  <p class="empty">Bấm Record rồi trả lời câu hỏi. Sau khi thu xong, bấm <b>Submit</b> để nộp bài hoặc <b>Save</b> để tải về máy.</p>
                </div>
              </section>
              <section class="panel">
                <div class="panel-head">
                  <div class="ph-left"><span class="lbl">notes</span></div>
                  <div class="tools"><button class="spk-btn ghost" id="spkClearNotes" type="button">Clear</button></div>
                </div>
                <textarea class="notes-ta" id="spkNotes" placeholder="Ghi ý chính, từ vựng muốn dùng, dàn ý..."></textarea>
              </section>
            </div>
          </main>

          <aside class="bank" id="spkBank">
            <button class="bank-toggle" id="spkBankToggle" title="Mở/Đóng kho câu hỏi" type="button">☰</button>
            <div class="bank-body">
              <div class="bank-head"><span class="lbl">bank</span><span class="cap" id="spkBankInfo">66 cue cards</span></div>
              <div class="seg" id="spkSeg">
                <button aria-pressed="false" data-part="p1" type="button">Part 1</button>
                <button aria-pressed="true" data-part="p2" type="button">Part 2</button>
                <button aria-pressed="false" data-part="p3" type="button">Part 3</button>
              </div>
              <input class="field" id="spkSearch" placeholder="Tìm câu hỏi hoặc chủ đề..." type="search"/>
              <div class="bank-acts">
                <button class="spk-btn" id="spkAddToggle" type="button">+ Thêm câu hỏi</button>
                <button class="spk-btn ghost" id="spkUnmark" type="button">Bỏ ✓</button>
                <button class="spk-btn ghost" id="spkRestore" type="button">Khôi phục</button>
              </div>
              <div class="add" hidden id="spkAddBox">
                <span class="cap" id="spkAddTitle">Thêm vào Part 2</span>
                <textarea class="field" id="spkPaste" placeholder="Dán câu hỏi vào đây..." rows="3"></textarea>
                <button class="spk-btn solid" id="spkAddPaste" type="button">Lưu câu hỏi</button>
                <p class="msg" id="spkAddMsg"></p>
              </div>
              <div class="list" id="spkList"></div>
            </div>
          </aside>
        </div>
      `;
      mainContainer.appendChild(spkSec);
      initSpeakingPracticeEngine();
    }

    // Tạo Modal để Giáo viên nghe và chấm bài Speaking
    if (!document.getElementById('gradeSpeakingModal')) {
      const modal = document.createElement('div');
      modal.id = 'gradeSpeakingModal';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal-card" style="max-width:680px; width:95%;">
          <div class="modal-header">
            <h3>🎧 Chấm Bài IELTS Speaking</h3>
            <button class="btn btn-secondary" onclick="closeModal('gradeSpeakingModal')">Close</button>
          </div>
          <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
              <div style="font-size:13px; color:#475569; margin-bottom:4px;">Học sinh: <b id="spkGradeStudentName" style="color:#0f172a;"></b></div>
              <div style="font-size:13px; color:#475569; margin-bottom:8px;">Câu hỏi / Chủ đề: <b id="spkGradeQuestion" style="color:#065f46;"></b></div>
              <audio id="spkGradeAudioPlayer" controls style="width:100%; height:38px;"></audio>
            </div>
            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px;">
              <div>
                <label style="font-size:11px; font-weight:700; color:#475569;">Fluency (FC)</label>
                <input type="number" id="spkScoreFC" class="input-field" step="0.5" min="0" max="9" placeholder="6.5" oninput="calcSpkOverallBand()">
              </div>
              <div>
                <label style="font-size:11px; font-weight:700; color:#475569;">Lexical (LR)</label>
                <input type="number" id="spkScoreLR" class="input-field" step="0.5" min="0" max="9" placeholder="6.5" oninput="calcSpkOverallBand()">
              </div>
              <div>
                <label style="font-size:11px; font-weight:700; color:#475569;">Grammar (GRA)</label>
                <input type="number" id="spkScoreGRA" class="input-field" step="0.5" min="0" max="9" placeholder="6.5" oninput="calcSpkOverallBand()">
              </div>
              <div>
                <label style="font-size:11px; font-weight:700; color:#475569;">Pronunciation (PR)</label>
                <input type="number" id="spkScorePR" class="input-field" step="0.5" min="0" max="9" placeholder="6.5" oninput="calcSpkOverallBand()">
              </div>
            </div>
            <div>
              <label style="font-size:12px; font-weight:700; color:#0f172a;">OVERALL SPEAKING BAND</label>
              <input type="text" id="spkGradeOverallInput" class="input-field" placeholder="Band 6.5" style="font-weight:800; color:#059669;">
            </div>
            <div>
              <label style="font-size:12px; font-weight:700; color:#0f172a;">NHẬN XÉT CHI TIẾT (PHÁT ÂM, TỪ VỰNG, NGỮ PHÁP)</label>
              <textarea id="spkGradeFeedbackInput" class="input-field" rows="6" placeholder="Nhập nhận xét cho học sinh..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-emerald" style="width:100%;" onclick="saveSpeakingEvaluation()">💾 Lưu Điểm & Nhận Xét</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
  }

  // 4. LOGIC PHÒNG LUYỆN SPEAKING + ĐỒNG BỘ TIẾN ĐỘ LÊN CLOUD + NÚT SUBMIT
  function initSpeakingPracticeEngine() {
    const root = document.getElementById('spkAppRoot');
    if (!root) return;
    const $ = s => root.querySelector(s);

    const PN = { p1: 'Part 1', p2: 'Part 2', p3: 'Part 3' };
    const KIND = { p1: 'Interview', p2: 'Cue card · 1 phút chuẩn bị, 1–2 phút nói', p3: 'Discussion' };
    const AIM = { p1: 30, p2: 120, p3: 60 };
    const uid = () => Math.random().toString(36).slice(2, 10);
    const norm = s => (s || '').toLowerCase().replace(/[.\s]+$/, '').trim();

    function makeDefaults() {
      const b = {};
      for (const p in DEFAULT_BANK) {
        b[p] = DEFAULT_BANK[p].map(([topic, text], idx) => ({
          id: `${p}_${idx}`,
          topic,
          text,
          used: false
        }));
      }
      return b;
    }

    // Lấy dữ liệu lưu trữ theo từng tài khoản học sinh
    function getUserStorageKey() {
      const u = (typeof activeUser !== 'undefined' && activeUser) ? (activeUser.username || activeUser.name || 'guest') : 'guest';
      return `${KEY}.${u}`;
    }

    let S = null;
    try { S = JSON.parse(localStorage.getItem(getUserStorageKey())); } catch (e) {}
    if (!S || !S.bank) {
      S = { forecast: FORECAST, bank: makeDefaults(), cur: null, notes: '', ui: { bankOpen: true, bankPart: 'p2', noRepeat: true }, topicUsed: { p1: [], p3: [] } };
    }

    // Khôi phục tiến độ câu đã tích ✓ từ hồ sơ Cloud của học sinh (nếu có)
    function syncFromCloudUser() {
      if (typeof activeUser === 'undefined' || !activeUser) return;
      const me = (typeof db !== 'undefined' && db.users) ? (db.users.find(u => u.username === activeUser.username || u.id === activeUser.id) || activeUser) : activeUser;
      const doneArr = Array.isArray(me.speakingUsedIds) ? me.speakingUsedIds : [];
      if (doneArr.length > 0) {
        const doneSet = new Set(doneArr);
        ['p1', 'p2', 'p3'].forEach(p => {
          (S.bank[p] || []).forEach(item => {
            if (doneSet.has(item.id) || doneSet.has(norm(item.text))) item.used = true;
          });
        });
      }
    }
    syncFromCloudUser();

    let cloudSyncTimer = null;
    function saveState(syncToCloud = false) {
      try { localStorage.setItem(getUserStorageKey(), JSON.stringify(S)); } catch (e) {}
      if (syncToCloud && typeof activeUser !== 'undefined' && activeUser && typeof db !== 'undefined') {
        clearTimeout(cloudSyncTimer);
        cloudSyncTimer = setTimeout(() => {
          const usedIds = [];
          ['p1', 'p2', 'p3'].forEach(p => {
            (S.bank[p] || []).forEach(it => { if (it.used) usedIds.push(it.id); });
          });
          activeUser.speakingUsedIds = usedIds;
          const me = (db.users || []).find(u => u.username === activeUser.username || u.id === activeUser.id);
          if (me) me.speakingUsedIds = usedIds;
          if (typeof persist === 'function') persist();
        }, 1200);
      }
    }

    const q = $('#spkQ');
    function grow() { q.style.height = 'auto'; q.style.height = Math.max(q.scrollHeight, 60) + 'px'; }

    // Timer
    const T = { acc: 0, start: 0, run: false, aim: 120 };
    const CIRC = 295.31, clockEl = $('#spkClock'), digits = $('#spkDigits'), ringFg = $('#spkRingFg');
    const fmt = s => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
    const elapsed = () => T.acc + (T.run ? (performance.now() - T.start) / 1000 : 0);
    function setAim(sec) { T.aim = sec; $('#spkAim').textContent = 'aim ' + fmt(T.aim); tRender(); }
    function tRender() {
      const e = elapsed();
      digits.textContent = fmt(e);
      ringFg.style.strokeDashoffset = String(CIRC * (1 - Math.min(1, e / T.aim)));
      clockEl.classList.toggle('over', e >= T.aim);
      $('#spkTStart').textContent = T.run ? 'Pause' : (T.acc > 0 ? 'Resume' : 'Start');
    }
    function tLoop() { if (!T.run) return; tRender(); requestAnimationFrame(tLoop); }
    function tStart() { if (T.run) return; T.start = performance.now(); T.run = true; tRender(); requestAnimationFrame(tLoop); }
    function tPause() { if (!T.run) return; T.acc = elapsed(); T.run = false; tRender(); }
    function tReset() { T.acc = 0; T.run = false; tRender(); }

    $('#spkTStart').addEventListener('click', () => {
      if (isRecording()) return;
      T.run ? tPause() : tStart();
    });
    $('#spkTReset').addEventListener('click', () => { if (!isRecording()) tReset(); });

    function renderHeader() {
      const c = S.cur;
      root.querySelectorAll('.part').forEach(b => b.classList.toggle('on', !!c && b.dataset.part === c.part));
      if (!c) {
        $('#spkBigNo').textContent = '00';
        $('#spkHero').textContent = 'Speaking Practice';
        $('#spkSub').textContent = 'Chọn Part 1, 2 hoặc 3 để bốc câu hỏi';
        $('#spkQMeta').textContent = '';
        $('#spkNextBtn').hidden = true;
        setAim(AIM.p1);
        return;
      }
      $('#spkBigNo').textContent = '0' + c.part[1];
      $('#spkHero').textContent = PN[c.part];
      $('#spkNextBtn').hidden = false;
      if (c.mode === 'topic') {
        const n = c.ids.length;
        $('#spkSub').textContent = `${KIND[c.part]} · Topic: ${c.topic} (${n} câu)`;
        $('#spkQMeta').textContent = `topic · ${n} questions`;
        $('#spkNextBtn').textContent = 'Another topic →';
        setAim(AIM[c.part] * n);
      } else {
        $('#spkSub').textContent = c.part === 'p2' ? KIND.p2 : `${KIND[c.part]}${c.topic ? ' · ' + c.topic : ''}`;
        $('#spkQMeta').textContent = c.part === 'p2' ? 'cue card' : (c.topic || '');
        $('#spkNextBtn').textContent = c.part === 'p2' ? 'Part 3 on this topic →' : 'Same topic →';
        setAim(AIM[c.part]);
      }
    }

    function renderCounts() {
      let tu = 0, tl = 0;
      ['p1', 'p2', 'p3'].forEach(p => {
        const l = S.bank[p] || [], u = l.filter(x => x.used).length;
        tu += u; tl += l.length;
        $('#spk-cnt-' + p).textContent = `${u} / ${l.length} ${p === 'p2' ? 'cue cards' : 'câu'} đã luyện`;
      });
      $('#spkUsedTotal').textContent = `${tu} / ${tl} đã luyện`;
    }

    function showItem(item, p) {
      item.used = true;
      S.cur = { part: p, id: item.id, topic: item.topic };
      if (!$('#spkSearch').value) S.ui.bankPart = p;
      q.value = item.text;
      q.classList.toggle('card', p === 'p2');
      S.qText = item.text;
      saveState(true);
      $('#spkQMsg').textContent = '';
      grow(); renderHeader(); renderCounts(); renderList();
      if (!T.run && !isRecording()) tReset();
    }

    const mainTopic = t => (t || '').split(' · ')[0].trim();
    function topicGroups(p) {
      const m = new Map();
      (S.bank[p] || []).forEach(x => {
        const k = mainTopic(x.topic) || 'Khác';
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(x);
      });
      return m;
    }

    function showTopic(p, k, items) {
      items.forEach(x => x.used = true);
      S.cur = { part: p, mode: 'topic', topic: k, ids: items.map(x => x.id) };
      if (!$('#spkSearch').value) S.ui.bankPart = p;
      q.value = items.map((x, idx) => `${idx + 1}. ${x.text}`).join('\n');
      q.classList.add('card');
      S.qText = q.value;
      saveState(true);
      $('#spkQMsg').textContent = '';
      grow(); renderHeader(); renderCounts(); renderList();
      if (!T.run && !isRecording()) tReset();
    }

    function drawPart(p) {
      const list = S.bank[p] || [];
      if (!list.length) return;
      const curId = S.cur && S.cur.id;
      let pool = list.filter(x => x.id !== curId);
      if (!pool.length) pool = list.slice();
      if (S.ui.noRepeat) {
        let f = pool.filter(x => !x.used);
        if (!f.length) { list.forEach(x => x.used = false); f = pool; }
        pool = f;
      }
      showItem(pool[Math.floor(Math.random() * pool.length)], p);
    }

    function drawTopic(p) {
      const g = topicGroups(p), keys = [...g.keys()];
      if (!keys.length) return;
      const k = keys[Math.floor(Math.random() * keys.length)];
      showTopic(p, k, g.get(k));
    }

    function nextOnTopic() {
      const c = S.cur; if (!c) return;
      if (c.mode === 'topic') { drawTopic(c.part); return; }
      const target = c.part === 'p2' ? 'p3' : c.part;
      const cand = (S.bank[target] || []).filter(x => norm(x.topic) === norm(c.topic) && x.id !== c.id);
      if (!cand.length) {
        $('#spkQMsg').textContent = c.part === 'p2' ? 'Cue card này chưa có câu Part 3 đi kèm.' : 'Chủ đề này không còn câu nào khác.';
        return;
      }
      showItem(cand[Math.floor(Math.random() * cand.length)], target);
    }

    root.querySelectorAll('.part').forEach(b => b.addEventListener('click', () => drawPart(b.dataset.part)));
    root.querySelectorAll('.topic-btn').forEach(b => b.addEventListener('click', () => drawTopic(b.dataset.topic)));
    $('#spkNextBtn').addEventListener('click', nextOnTopic);
    $('#spkClearQ').addEventListener('click', () => { S.cur = null; S.qText = ''; q.value = ''; saveState(false); grow(); renderHeader(); renderList(); });
    q.addEventListener('input', () => { grow(); S.qText = q.value; saveState(false); });

    $('#spkNoRepeat').checked = !!S.ui.noRepeat;
    $('#spkNoRepeat').addEventListener('change', e => { S.ui.noRepeat = e.target.checked; saveState(false); });
    $('#spkResetUsed').addEventListener('click', () => {
      if (!confirm('Xoá toàn bộ dấu ✓ đã luyện của cả 3 Part?')) return;
      ['p1', 'p2', 'p3'].forEach(p => (S.bank[p] || []).forEach(x => x.used = false));
      saveState(true); renderCounts(); renderList();
    });

    // Ghi âm & Nộp bài (Submit)
    let rec = null, recStream = null, recCtx = null, recT0 = 0, recQ = null, chunks = [], meterOn = false;
    const takes = []; let takeNo = 0;
    const isRecording = () => !!rec && rec.state === 'recording';
    const statusEl = $('#spkStatus');
    const setStatus = (t, err) => { statusEl.textContent = t; statusEl.classList.toggle('err', !!err); };

    async function toggleRec() {
      if (isRecording()) { rec.stop(); return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
        setStatus('Trình duyệt không hỗ trợ ghi âm. Hãy dùng Chrome, Edge hoặc Safari.', true);
        return;
      }
      try {
        recStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      } catch (e) {
        setStatus('Micro đang bị chặn. Hãy cấp quyền Microphone trên thanh địa chỉ trình duyệt.', true);
        return;
      }
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const mime = types.find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
      try {
        rec = new MediaRecorder(recStream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 });
      } catch (e) {
        rec = new MediaRecorder(recStream);
      }
      chunks = [];
      recQ = {
        part: S.cur ? S.cur.part : 'p2',
        topic: S.cur ? (S.cur.topic || '') : 'Speaking Practice',
        text: q.value.trim() || 'Speaking Free Practice'
      };
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = finishRec;
      rec.start(250);
      recT0 = performance.now();
      tReset(); tStart();
      $('#spkRecBtn').classList.add('on');
      $('#spkRecLabel').textContent = 'Stop';
      clockEl.classList.add('rec');
      $('#spkTStart').hidden = true; $('#spkTReset').hidden = true;
      setStatus('Đang ghi âm… Bấm Stop khi nói xong.');
      startMeter();
    }

    function finishRec() {
      const dur = (performance.now() - recT0) / 1000;
      tPause(); stopMeter();
      if (recStream) recStream.getTracks().forEach(t => t.stop());
      recStream = null;
      $('#spkRecBtn').classList.remove('on');
      $('#spkRecLabel').textContent = 'Record';
      clockEl.classList.remove('rec');
      $('#spkTStart').hidden = false; $('#spkTReset').hidden = false;
      const type = (rec && rec.mimeType) || (chunks[0] && chunks[0].type) || 'audio/webm';
      rec = null;
      if (!chunks.length || dur < 0.5) {
        setStatus('Bản ghi quá ngắn nên không được lưu.', true);
        return;
      }
      const blob = new Blob(chunks, { type });
      const ext = /mp4|aac|m4a/.test(type) ? 'm4a' : 'webm';
      takes.unshift({ id: uid(), n: ++takeNo, dur, blob, url: URL.createObjectURL(blob), ext, q: recQ, at: new Date(), submitted: false });
      setStatus(`Đã ghi ${fmt(dur)}. Bấm ▶ để nghe lại hoặc bấm Submit để nộp bài.`);
      renderTakes();
    }

    function startMeter() {
      try {
        recCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = recCtx.createMediaStreamSource(recStream), an = recCtx.createAnalyser();
        an.fftSize = 512; src.connect(an);
        const buf = new Uint8Array(an.fftSize); meterOn = true;
        (function m() {
          if (!meterOn) return;
          an.getByteTimeDomainData(buf);
          let s = 0; for (const v of buf) { const d = (v - 128) / 128; s += d * d; }
          $('#spkLevel').style.width = Math.min(100, Math.sqrt(s / buf.length) * 320) + '%';
          requestAnimationFrame(m);
        })();
      } catch (e) {}
    }
    function stopMeter() {
      meterOn = false; $('#spkLevel').style.width = '0';
      if (recCtx) { recCtx.close().catch(() => {}); recCtx = null; }
    }
    $('#spkRecBtn').addEventListener('click', toggleRec);

    const player = new Audio(); let playingId = null;
    function blobToDataUrl(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    async function submitSpeakingTake(t, btnEl) {
      if (typeof activeUser === 'undefined' || !activeUser) {
        alert('Vui lòng đăng nhập trước khi nộp bài!');
        return;
      }
      btnEl.disabled = true;
      btnEl.textContent = 'Submitting...';
      try {
        let finalAudioUrl = '';
        // Thử đẩy lên Firebase Storage nếu đã bật, nếu chưa bật thì nén Base64 lưu trực tiếp vào document kết quả riêng
        if (window.firebase && typeof firebase.storage === 'function') {
          try {
            const storageRef = firebase.storage().ref().child(`speaking_submissions/${activeUser.username || 'student'}_${Date.now()}.${t.ext}`);
            const snap = await storageRef.put(t.blob);
            finalAudioUrl = await snap.ref.getDownloadURL();
          } catch (stErr) {
            finalAudioUrl = await blobToDataUrl(t.blob);
          }
        } else {
          finalAudioUrl = await blobToDataUrl(t.blob);
        }

        const partLabel = PN[t.q.part] || 'Part 2';
        const topicTitle = (t.q.topic || t.q.text.split('\n')[0] || 'Forecast Question').slice(0, 80);
        const newRes = {
          id: 'res_spk_' + Date.now(),
          userName: activeUser.name,
          userClass: activeUser.className || 'Unassigned',
          examId: 'spk_' + (t.q.part || 'p2'),
          examTitle: `[Speaking ${partLabel}] ${topicTitle}`,
          skill: 'speaking',
          examType: 'speaking',
          score: 0,
          total: 9,
          band: 'Submitted',
          speakingSubmission: {
            part: partLabel,
            topic: topicTitle,
            questionText: t.q.text,
            duration: fmt(t.dur),
            audioData: finalAudioUrl,
            notes: $('#spkNotes').value || ''
          },
          teacherFeedback: '',
          timestamp: new Date().toLocaleString()
        };

        if (typeof db !== 'undefined') {
          if (!Array.isArray(db.results)) db.results = [];
          db.results.push(newRes);
          if (typeof persist === 'function') await persist();
        }

        t.submitted = true;
        btnEl.textContent = '✓ Submitted';
        alert('✅ Đã nộp bài Speaking thành công!');
      } catch (err) {
        console.error('Submit Speaking error:', err);
        btnEl.disabled = false;
        btnEl.textContent = 'Submit';
        alert('Có lỗi khi nộp bài. Vui lòng bấm Save để tải file âm thanh về máy.');
      }
    }

    function renderTakes() {
      const box = $('#spkTakes'); box.innerHTML = '';
      $('#spkTakesInfo').textContent = takes.length ? `${takes.length} bản ghi` : '';
      if (!takes.length) {
        box.innerHTML = '<p class="empty">Bấm Record rồi trả lời câu hỏi. Sau khi thu xong, bấm <b>Submit</b> để nộp bài hoặc <b>Save</b> để tải về máy.</p>';
        return;
      }
      takes.forEach(t => {
        const el = document.createElement('div'); el.className = 'take'; el.dataset.id = t.id;
        const pb = document.createElement('button'); pb.type = 'button'; pb.className = 'play'; pb.innerHTML = '▶';
        pb.onclick = () => {
          if (playingId === t.id) { player.paused ? player.play() : player.pause(); return; }
          player.src = t.url; playingId = t.id; player.currentTime = 0; player.play().catch(() => {});
        };
        const meta = document.createElement('div'); meta.className = 'meta';
        meta.innerHTML = `<b>Take ${t.n} · ${PN[t.q.part] || 'Speaking'} · ${fmt(t.dur)}</b><span>${(t.q.text || '').split('\n')[0]}</span>`;

        const acts = document.createElement('div'); acts.className = 'acts';
        const subBtn = document.createElement('button');
        subBtn.type = 'button';
        subBtn.className = 'btn-submit-spk';
        subBtn.textContent = t.submitted ? '✓ Submitted' : 'Submit';
        subBtn.disabled = !!t.submitted;
        subBtn.onclick = () => submitSpeakingTake(t, subBtn);

        const sv = document.createElement('button'); sv.type = 'button'; sv.className = 'x'; sv.textContent = 'Save';
        sv.onclick = () => {
          const a = document.createElement('a'); a.href = t.url; a.download = `IELTS-Speaking-Take${t.n}.${t.ext}`;
          document.body.appendChild(a); a.click(); a.remove();
        };
        const dl = document.createElement('button'); dl.type = 'button'; dl.className = 'x'; dl.textContent = 'Xoá';
        dl.onclick = () => {
          if (playingId === t.id) { player.pause(); playingId = null; }
          takes.splice(takes.indexOf(t), 1); renderTakes();
        };
        acts.append(subBtn, sv, dl);
        el.append(pb, meta, acts);
        box.appendChild(el);
      });
    }

    // Notes
    const notesEl = $('#spkNotes');
    notesEl.value = S.notes || '';
    notesEl.addEventListener('input', () => { S.notes = notesEl.value; saveState(false); });
    $('#spkClearNotes').addEventListener('click', () => { notesEl.value = ''; S.notes = ''; saveState(false); });

    // Question Bank
    $('#spkBankToggle').addEventListener('click', () => {
      S.ui.bankOpen = !S.ui.bankOpen;
      root.classList.toggle('bank-closed', !S.ui.bankOpen);
      saveState(false);
    });
    $('#spkSeg').addEventListener('click', e => {
      const b = e.target.closest('[data-part]'); if (!b) return;
      S.ui.bankPart = b.dataset.part; saveState(false); renderList();
    });
    $('#spkSearch').addEventListener('input', renderList);
    $('#spkAddToggle').addEventListener('click', () => {
      const box = $('#spkAddBox'); box.hidden = !box.hidden;
    });
    $('#spkUnmark').addEventListener('click', () => {
      (S.bank[S.ui.bankPart] || []).forEach(x => x.used = false);
      saveState(true); renderList(); renderCounts();
    });
    $('#spkRestore').addEventListener('click', () => {
      S.bank = makeDefaults(); saveState(true); renderList(); renderCounts();
    });
    $('#spkAddPaste').addEventListener('click', () => {
      const p = S.ui.bankPart, raw = $('#spkPaste').value.trim();
      if (!raw) return;
      raw.split(/\n+/).map(s => s.trim()).filter(Boolean).forEach(line => {
        S.bank[p].push({ id: uid(), topic: 'Custom', text: line, used: false, custom: true });
      });
      $('#spkPaste').value = '';
      saveState(true); renderList(); renderCounts();
    });

    function renderList() {
      const p = S.ui.bankPart, all = S.bank[p] || [], f = $('#spkSearch').value.trim().toLowerCase();
      root.querySelectorAll('#spkSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.part === p)));
      const used = all.filter(x => x.used).length;
      $('#spkBankInfo').textContent = `${all.length} ${p === 'p2' ? 'cue cards' : 'câu'}${used ? ` · ${used} ✓` : ''}`;
      const box = $('#spkList'); box.innerHTML = '';
      const list = all.filter(it => !f || it.text.toLowerCase().includes(f) || (it.topic || '').toLowerCase().includes(f));
      let last = null;
      const curId = S.cur && S.cur.id;
      list.forEach(it => {
        if (p !== 'p2' && it.topic !== last) {
          last = it.topic;
          if (it.topic) {
            const h = document.createElement('button'); h.type = 'button'; h.className = 'topic-h'; h.textContent = it.topic;
            h.onclick = () => showTopic(p, it.topic, all.filter(x => x.topic === it.topic));
            box.appendChild(h);
          }
        }
        const row = document.createElement('div');
        row.className = 'item' + (it.used ? ' used' : '') + (curId === it.id ? ' current' : '');
        const u = document.createElement('button'); u.type = 'button'; u.className = 'use';
        u.textContent = p === 'p2' ? it.text.split('\n')[0] : it.text;
        u.title = it.text;
        u.onclick = () => showItem(it, p);
        const x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.textContent = 'Xoá';
        x.onclick = () => { S.bank[p] = S.bank[p].filter(y => y.id !== it.id); saveState(false); renderList(); renderCounts(); };
        row.append(u, x);
        box.appendChild(row);
      });
    }

    renderHeader(); renderCounts(); renderList(); renderTakes(); tRender();
  }

  // 5. HỆ THỐNG CHẤM BÀI SPEAKING CHO GIÁO VIÊN TRONG TAB SUBMISSIONS
  let activeGradingSpkResId = null;

  window.openGradeSpeakingModal = function(resId) {
    const res = (typeof db !== 'undefined' && db.results || []).find(r => r.id === resId);
    if (!res) return;
    activeGradingSpkResId = resId;
    const spk = res.speakingSubmission || {};
    document.getElementById('spkGradeStudentName').textContent = `${res.userName} (${res.userClass || ''})`;
    document.getElementById('spkGradeQuestion').textContent = spk.questionText || res.examTitle;
    const audioEl = document.getElementById('spkGradeAudioPlayer');
    if (audioEl) {
      audioEl.src = spk.audioData || '';
    }
    const sc = res.speakingScores || {};
    document.getElementById('spkScoreFC').value = sc.fc || '';
    document.getElementById('spkScoreLR').value = sc.lr || '';
    document.getElementById('spkScoreGRA').value = sc.gra || '';
    document.getElementById('spkScorePR').value = sc.pr || '';
    document.getElementById('spkGradeOverallInput').value = (res.band && res.band !== 'Submitted') ? res.band : '';
    document.getElementById('spkGradeFeedbackInput').value = res.teacherFeedback || '';
    openModal('gradeSpeakingModal');
  };

  window.calcSpkOverallBand = function() {
    const fc = parseFloat(document.getElementById('spkScoreFC').value);
    const lr = parseFloat(document.getElementById('spkScoreLR').value);
    const gra = parseFloat(document.getElementById('spkScoreGRA').value);
    const pr = parseFloat(document.getElementById('spkScorePR').value);
    const vals = [fc, lr, gra, pr].filter(v => !isNaN(v));
    if (vals.length === 4) {
      const avg = (fc + lr + gra + pr) / 4;
      const rounded = (Math.round(avg * 2) / 2).toFixed(1);
      document.getElementById('spkGradeOverallInput').value = `Band ${rounded}`;
    }
  };

  window.saveSpeakingEvaluation = async function() {
    if (!activeGradingSpkResId || typeof db === 'undefined') return;
    const res = (db.results || []).find(r => r.id === activeGradingSpkResId);
    if (!res) return;
    res.speakingScores = {
      fc: document.getElementById('spkScoreFC').value,
      lr: document.getElementById('spkScoreLR').value,
      gra: document.getElementById('spkScoreGRA').value,
      pr: document.getElementById('spkScorePR').value
    };
    res.band = document.getElementById('spkGradeOverallInput').value.trim() || 'Evaluated';
    res.teacherFeedback = document.getElementById('spkGradeFeedbackInput').value.trim();
    if (typeof persist === 'function') await persist();
    closeModal('gradeSpeakingModal');
    if (typeof renderAnalyticsTable === 'function') renderAnalyticsTable();
    if (typeof renderPaginatedHomeSubmissions === 'function') renderPaginatedHomeSubmissions();
    alert('✅ Đã lưu điểm và nhận xét Speaking!');
  };

  // Tự động nhận diện bài nộp Speaking trong các bảng điểm để gắn nút "🎧 Nghe & Chấm"
  function patchSpeakingIntoSubmissionsTables() {
    if (typeof window.detectResultSkillType === 'function') {
      const _origDetect = window.detectResultSkillType;
      window.detectResultSkillType = function(r) {
        if (r && (r.skill === 'speaking' || r.examType === 'speaking' || r.speakingSubmission || String(r.examTitle || '').includes('[Speaking'))) {
          return 'speaking';
        }
        return _origDetect(r);
      };
    }

    // Chèn nút bấm mở modal Speaking khi render bảng Analytics / Submissions
    setInterval(() => {
      injectSpeakingTabAndSection();
      document.querySelectorAll('button[onclick*="openGradeWritingModal"], button[onclick*="reopenReviewFromHistory"]').forEach(btn => {
        const oc = btn.getAttribute('onclick') || '';
        const m = oc.match(/'(res_spk_[^']+)'/);
        if (m && m[1]) {
          btn.setAttribute('onclick', `openGradeSpeakingModal('${m[1]}')`);
          btn.innerHTML = '🎧 Nghe & Chấm';
        }
      });
    }, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectSpeakingTabAndSection();
      patchSpeakingIntoSubmissionsTables();
    });
  } else {
    injectSpeakingTabAndSection();
    patchSpeakingIntoSubmissionsTables();
  }
})();