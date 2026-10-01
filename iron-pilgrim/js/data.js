'use strict';
/* Static data: crew, cars, enemies, items, documents, radio. */
window.IP = window.IP || {};

IP.CREW = {
  odile: {
    name: 'Odile Marchetti', short: 'ODILE', role: 'Engineer',
    hp: 8, nerve: 8, atk: 2,
    bio: 'Drove troop trains in the war and freight after it. Has opinions about the Pilgrim’s governor valve and none about anything else she will share.',
    ability: { id: 'throttle', name: 'Full Throttle', desc: 'From the locomotive only, once per fight. Every enemy takes 1 damage and is thrown one car rearward. Anything past the last car is gone. Costs 1 fuel.' },
    look: { hat: 'cap', hair: 'short', build: 1.0 }
  },
  tull: {
    name: 'Dr. Ambrose Tull', short: 'TULL', role: 'Physician',
    hp: 6, nerve: 6, atk: 1,
    bio: 'Company physician. Soft-spoken, immaculate cuffs, a bag of instruments he polishes when he is nervous. Volunteered for this run.',
    ability: { id: 'suture', name: 'Suture', desc: 'Heal 3 to one crew member in this car or the next.' },
    look: { hat: 'bowler', hair: 'none', build: 0.9 }
  },
  wren: {
    name: 'Wren Abernathy', short: 'WREN', role: 'Wireless',
    hp: 5, nerve: 7, atk: 1,
    bio: 'Nineteen. Taught herself Morse on a crystal set. Hears worse in her left ear than she lets on.',
    ability: { id: 'jam', name: 'Jam the Signal', desc: 'Cancel every whisper this turn. From the radio car, also stun one enemy anywhere. Rests a turn after.' },
    look: { hat: 'none', hair: 'bob', build: 0.8 }
  },
  vane: {
    name: 'Silas Vane', short: 'VANE', role: 'Railway Police',
    hp: 9, nerve: 6, atk: 3,
    bio: 'Company badge, Company rifle, Company manners. Rides the rear car and does not sleep facing the door.',
    ability: { id: 'cover', name: 'Covering Fire', desc: 'Pick a car within one. The first blow aimed at it this turn misses.' },
    ranged: true,
    look: { hat: 'brim', hair: 'none', build: 1.1 }
  },
  jonah: {
    name: 'Jonah', short: 'JONAH', role: 'Lamp-man',
    hp: 12, nerve: 0, atk: 2, steady: true,
    bio: 'Tends the ward-lamps. Does not speak; writes on a slate when he must. No one remembers hiring him.',
    ability: { id: 'stand', name: 'Stand', desc: 'Every blow aimed at this car lands on Jonah instead. Jonah does not lose nerve.' },
    look: { hat: 'none', hair: 'none', build: 1.35 }
  },
  constance: {
    name: 'Mrs. C. Reed', short: 'REED', role: 'Passenger',
    hp: 6, nerve: 7, atk: 1,
    bio: 'A widow travelling alone with a cello case she will not check as luggage.',
    ability: { id: 'note', name: 'The Low Note', desc: 'Stun every enemy in this car and the cars beside it. Costs her 2 nerve.' },
    look: { hat: 'veil', hair: 'long', build: 0.85 }
  }
};
IP.CREW_ORDER = ['odile', 'tull', 'wren', 'vane', 'jonah', 'constance'];

IP.CARS = {
  loco:   { name: 'Locomotive', short: 'LOCO', desc: 'No. 9, the Iron Pilgrim. Diesel-electric, armoured. Odile drives from here.', fixed: true },
  tender: { name: 'Fuel Tender', short: 'TENDER', desc: 'Diesel. Damage here leaks fuel.', fixed: true },
  zero:   { name: 'Car Zero', short: 'CAR 0', desc: 'Sealed. Company property. The coupling is welded. Crossing its roof costs nerve.', fixed: true },
  radio:  { name: 'Radio Car', short: 'RADIO', desc: 'Wireless set and gramophone. Wren works best from here.' },
  lamp:   { name: 'Lamp Car', short: 'LAMPS', desc: 'Ward-lamps. Spend ward oil here to stun what stands near.' },
  coach:  { name: 'Coach', short: 'COACH', desc: 'Passengers. Things that reach an empty coach feed.' },
  infirmary: { name: 'Infirmary', short: 'INFIRM', desc: 'Crew who end a turn here heal 1.', cost: 40 },
  armory: { name: 'Armory', short: 'ARMORY', desc: 'Crew attacking from here hit 1 harder.', cost: 40 },
  dining: { name: 'Dining Car', short: 'DINING', desc: 'Crew who end a turn here steady 1 nerve. Nights cost 1 less provision.', cost: 30 },
  observe: { name: 'Observation', short: 'OBSERV', desc: 'Rites spoken from here cost 1 less lore.', cost: 35 }
};

IP.ITEMS = {
  bandage:  { name: 'Bandages', desc: 'Heal 3 to a crew member.', cost: 10, combat: true },
  laudanum: { name: 'Laudanum', desc: 'Restore 3 nerve to a crew member.', cost: 14, combat: true },
  flare:    { name: 'Signal Flare', desc: 'Stun every enemy in the user’s car.', cost: 12, combat: true },
  dynamite: { name: 'Dynamite', desc: 'In a fight: 6 damage to everything in one car, 2 to the hull. Has other uses.', cost: 30, combat: true },
  fork:     { name: 'Tuning Fork', desc: 'Brass. Engraved SPUR IX. It hums when held near Car Zero.', story: true },
  orders:   { name: 'Sealed Envelope', desc: 'Vane’s. Opened.', story: true },
  record_waltz: { name: 'Record: Meridian Waltz', desc: 'Shellac, 78 rpm. Play it in the radio car.', record: true },
  record_hymn:  { name: 'Record: Company Hymn', desc: 'Shellac, 78 rpm. Play it in the radio car.', record: true },
  record_blank: { name: 'Record: No Label', desc: 'Shellac, 78 rpm. The grooves run the wrong way.', record: true }
};

IP.ENEMIES = {
  hollow:  { name: 'Hollow', hp: 4, desc: 'What is left of a farmhand. Strikes whoever shares its car; otherwise shambles closer.' },
  hound:   { name: 'Gauge-Hound', hp: 3, desc: 'Fast. Lunges up to two cars and bites hard.' },
  choir:   { name: 'Pale Choir', hp: 3, desc: 'Sings. Everyone within one car loses nerve.' },
  tick:    { name: 'Tick-Man', hp: 5, desc: 'Tears at the car it stands in. Hull damage. In the tender it drinks fuel; in a coach, passengers.' },
  lantern: { name: 'Lantern-Eater', hp: 4, desc: 'Crawls toward the lamps and eats the light.' },
  porter:  { name: 'The Porter', hp: 9, elite: true, desc: 'Company grey. Seizes the weakest crew in its car and drags them rearward. Off the end of the train is gone.' },
  master:  { name: 'Choirmaster', hp: 11, elite: true, desc: 'Every car loses nerve while it conducts. Calls more singers.' },
  tendril: { name: 'Throat-Tendril', hp: 18, elite: true, boss: true, desc: 'Reaches up out of the gorge under the bridge. Crushes cars. Pulls crew toward it.' }
};

/* Night/day encounter tables per leg */
IP.ENCOUNTERS = {
  1: [['hollow', 'hollow'], ['hound', 'hollow'], ['tick', 'hollow'], ['choir', 'hollow'], ['hound', 'hound']],
  2: [['hollow', 'hollow', 'choir'], ['hound', 'hound', 'tick'], ['lantern', 'choir', 'hollow'], ['porter', 'hollow'], ['tick', 'lantern', 'hound']],
  3: [['porter', 'choir', 'hollow'], ['hound', 'hound', 'choir', 'tick'], ['hollow', 'hollow', 'hollow', 'lantern'], ['porter', 'hound', 'lantern'], ['choir', 'choir', 'tick', 'hound']]
};
IP.BOSSES = {
  harrow: { list: ['porter', 'hollow', 'hollow'], waves: { 2: ['hound'], 4: ['hollow'] }, title: 'Harrow’s Cross' },
  lowater: { list: ['master', 'choir', 'hollow'], waves: { 2: ['choir'], 3: ['hound'], 5: ['choir'] }, title: 'Lowater' },
  hinge: { list: ['tendril', 'hound'], waves: { 2: ['choir'], 4: ['hound', 'hollow'] }, title: 'Hinge Bridge' }
};

IP.LEGS = {
  1: { name: 'The Cinderlands', start: 'Calder Yard', end: 'Harrow’s Cross', blurb: 'Burnt prairie. Grain towns where the clocks stopped.' },
  2: { name: 'The Sunken Counties', start: 'Harrow’s Cross', end: 'Lowater', blurb: 'Floodland. The water stands up in walls and does not fall.' },
  3: { name: 'The Lid', start: 'Lowater', end: 'Hinge Bridge', blurb: 'The sky comes down low here, close enough to touch.' }
};

IP.PASSENGERS = [
  'Mr. Abel Fenwick, grain broker', 'Miss Ida Ostrowski', 'Miss Hanna Ostrowski', 'Rev. Lyle Burch (lapsed)',
  'Mrs. Pearl Dunmore and infant', 'Cpl. Otto Brandt, discharged', 'Mr. Feliks Nowak, watchmaker', 'Sister Agathe',
  'Mr. & Mrs. Teague', 'Dorothea Lisle, schoolteacher', 'Mr. Royce, travelling in brushes', 'A boy who gives his name as “Pip”',
  'Mr. Halloran, surveyor (retired)', 'Mrs. Gertrude Amsel', 'Two men from the Grange', 'Mr. Silberman, pharmacist'
];

/* Documents. body/hidden are HTML. {N} = conductor name, {K} = knot number. */
IP.DOCS = {
  hire: { kind: 'telegram', title: 'Telegram: Appointment', body:
    'HALVORSEN TRANSCONTINENTAL RAILWAY CO<br>TO CONDUCTOR-ELECT {N}<br><br>POSITION ACCEPTED STOP REPORT CALDER YARD 6 AM 9 NOV 1931 STOP ENGINE NO 9 IRON PILGRIM STOP CONSIGNMENT ONE SEALED CAR ZERO DO NOT OPEN STOP PASSENGERS AS PER MANIFEST STOP DELIVER ALL TO SALLOW HAVEN STOP<br><br>THE COMPANY THANKS YOU FOR YOUR PUNCTUALITY STOP',
    hidden: 'Pencilled faintly under the last line: <i>you said that last time</i>' },
  timetable: { kind: 'pamphlet', title: 'Company Timetable, Winter 1931', body:
    '<b>HALVORSEN TRANSCONTINENTAL &middot; MERIDIAN LINE</b><br><br>Calder Yard &hellip; dep. 6:00<br>Harrow’s Cross &hellip; &mdash;<br>Lowater &hellip; &mdash;<br>Hinge Bridge &hellip; &mdash;<br>Sallow Haven &hellip; arr. 11:07<br><br><small>Times subject to conditions on the line. Arrival is assured.</small>' },
  pamphlet: { kind: 'pamphlet', title: 'Pamphlet: The Pilgrim Is Safe', body:
    '<b>THE PILGRIM IS SAFE.</b><br>Five things every passenger should know:<br><br>1. Keep the blinds down after dark.<br>2. Do not speak to persons walking the rails.<br>3. Do not count the knots in the bell-cord.<br>4. The sealed car is Company property.<br>5. Arrival is assured.',
    hidden: 'Someone has pressed hard enough to dent the paper beside rule 3: <i>{K}</i>' },
  ashby1: { kind: 'journal', title: 'Journal of E. Ashby, p. 1', body:
    'Nov 9. Calder Yard. Odile says the governor valve sticks below forty. The doctor is pleasant. The lamp-man watched me sign the contract and shook his head. I asked him why. He wrote on his slate: NOT AGAIN.<br><br>I have never met him.',
    hidden: 'The ink on my contract was already dry when they handed it to me.' },
  ashby2: { kind: 'journal', title: 'Journal of E. Ashby, p. 2', body:
    'The clocks in the Sunken Counties all say 11:07 and so does mine now. Wren played me her numbers. I think they are directions, but she cannot hold the pencil steady long enough to finish.<br><br>Car Zero was warm tonight. I put my ear to it. Something in there was counting.',
    hidden: 'Knot {K}. I tied the bell-cord knot myself. I know because it is my knot.' },
  ashby3: { kind: 'journal', title: 'Journal of E. Ashby, p. 3', body:
    'I am going to cut the line at Hinge Bridge. Odile will drive. Vane has the powder.<br><br>If you are reading this, it did not work, or it worked and they relaid it. Lines can be relaid. They need only a surveyor and a little time, and time is the one thing it has plenty of.',
    hidden: 'Left at the Pillars. Wren was right. I was too late to listen to her.' },
  ticket077: { kind: 'ticket', title: 'Claim Ticket No. 077', body:
    'HALVORSEN LINE<br><b>LOST PROPERTY</b><br>CLAIM No. <b>077</b><br><br>Present at any Company office.<br>Found in coat of: E. ASHBY' ,
    hidden: 'On the back, in pencil: <i>Central keeps the ledger. You keep it too, you just haven’t looked.</i>' },
  signallog: { kind: 'journal', title: 'Signal Box 14, Log', body:
    '29 Oct 1929. 11:07 pm. Down train passed. No lights. No number. Logged.<br>30 Oct. 11:07 pm. Same.<br>31 Oct. 11:07 pm. Same.<br><br>[the entry repeats, in a worsening hand, for seven hundred and some nights]' },
  tulltel: { kind: 'telegram', title: 'Telegram: Dr. Tull, outgoing', body:
    'TO G.S. SALLOW HAVEN<br><br>NEEDLE ON SCHEDULE STOP KNOT {K} STOP DAUGHTER ABOARD STOP CONDUCTOR UNAWARE STOP AWAIT INSTRUCTION STOP<br><br>A.T.' },
  tullreply: { kind: 'telegram', title: 'Telegram: Reply to A.T.', body:
    'TO A.T.<br><br>PROCEED STOP THE CHAIRMAN THANKS YOU FOR YOUR PUNCTUALITY STOP<br><br>G.S.',
    hidden: 'Water-stained. It was received by a telegraph key at the bottom of a flooded post office.' },
  cufflink: { kind: 'photo', title: 'Dr. Tull’s Cufflink', body:
    'Gold. Enamelled with two parallel lines crossed by a ring. The same mark is cut into the shrine stones along the line.', glyph: true },
  notebook: { kind: 'notebook', title: 'Wren’s Notebook', body:
    'Numbers taken down at night, left ear, no set switched on:<br><br><span class="mono big">19 16 21 18 &middot; 14 9 14 5<br>12 5 6 20 &middot; 1 20 &middot; 20 8 5<br>16 9 12 12 1 18 19</span><br><br><i>it’s always the same ones. am I going mad. W.</i>',
    cipher: true },
  orders: { kind: 'letter', title: 'Sealed Orders: S. Vane', body:
    'SEALED. OPEN AT HINGE BRIDGE.<br><br>Vane &mdash; The passenger travelling as Mrs. Reed is not to cross. Discretion is assured.<br><br>&mdash; Office of the Chairman',
    hidden: 'The Chairman’s signature is in the same hand that wrote the timetable.' },
  photo: { kind: 'photo', title: 'Photograph, 1911', body:
    'A family on a station platform. A tall man with a measuring chain over his shoulder. A woman. A small girl holding a violin bow like a sword.<br><br><i>Back:</i> Augustin, Margarethe and little Connie, who will finish what her father started.',
    hidden: '&hellip;or end it. &mdash; M.', family: true },
  letter: { kind: 'letter', title: 'Unsent Letter', body:
    'Father &mdash;<br><br>I know where you are. I know what you are now. Mother’s last words were that you were kind once. I am coming to see whether that is true.<br><br>&mdash; C.' },
  slate: { kind: 'slate', title: 'Jonah’s Slate', body: '{SLATE}', hidden: 'Scratched into the frame, very small: DON’T SIGN IT' },
  tally: { kind: 'photo', title: 'Inside the Firebox Door', body:
    'Tally marks scratched into the iron with a nail. You count them twice. <b>{TALLY}</b>. The newest is bright and fresh.', tally: true },
  survey: { kind: 'map', title: 'Survey of 1884, Sheet 9', body: 'The route as given.', map: true,
    hidden: 'A dotted line leaves the main route near the Pillars and goes left, off the sheet. It is labelled: <i>Spur IX (not to be built).</i>' },
  watch: { kind: 'photo', title: 'Jonah’s Pocket Watch', body:
    'Silver, dented, stopped at 11:07. Engraved inside the lid:<br><br><b>{N}</b><br>from the Company, for Punctuality.<br>1929' },
  porter: { kind: 'ticket', title: 'Ticket', body: 'HALVORSEN LINE<br><b>ADMIT ONE</b><br>RETURN JOURNEY<br><br><small>Punched twice.</small>' },
  society: { kind: 'letter', title: 'The Society’s Timetable', body:
    'Given to you by Dr. Tull, folded very small.<br><br>THE GAUGE SOCIETY. Est. 1879. <i>Every line must have an end.</i><br><br>The route was surveyed as a mark. The mark was closed at Hinge Bridge, 29 Oct 1929, 11:07 pm. The Chairman rides in the sealed car so that he may arrive with it. The needle must make the circuit until the knots are sufficient. Then the Terminus keeps its appointment.',
    hidden: 'Tull has written in the margin: <i>I believed it would end grief. I think it only ends.</i>' }
};

IP.SLATES = [
  'LAMPS LIT.', 'AGAIN.', 'YOU SIGNED IT AGAIN.', 'STOP COUNTING THE KNOTS. IT COUNTS FOR YOU.', 'LEFT. AT THE PILLARS. LEFT.'
];

/* Radio stations. freq in kilocycles. */
IP.STATIONS = [
  { f: 640, call: 'WHTC', name: 'The Company Hour', kind: 'speech' },
  { f: 910, call: '—', name: 'Numbers', kind: 'morse' },
  { f: 1107, call: '', name: '(no call sign)', kind: 'speech', night: true },
  { f: 1290, call: '', name: '(a child’s voice)', kind: 'speech', night: true },
  { f: 1440, call: '', name: 'The Hour Between', kind: 'speech', hour: true }
];

IP.RECORDS = {
  record_waltz: { notes: 'E4 G4 B4 E5 . D5 B4 G4 . C5 E4 A4 C5 . B4 . . . E4 G4 B4 E5 . F#5 E5 D5 . C5 A4 F#4 . E4 . . .', tempo: 0.32, wave: 'triangle', note: 'Steadies the crew once a day.' },
  record_hymn:  { notes: 'C4 C4 G4 G4 A4 A4 G4 . F4 F4 E4 E4 D4 D4 C4 . G4 G4 F4 F4 E4 E4 D4 .', tempo: 0.42, wave: 'sine', note: 'The Company hymn. The crew sings along, mostly.' },
  record_blank: { notes: 'C3 . C#3 . C3 . . . G#2 . . . C3 C#3 C3 . D3 . . . . . C3', tempo: 0.55, wave: 'sawtooth', reverse: true, note: 'Something whispers between the notes.' }
};
