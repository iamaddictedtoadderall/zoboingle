'use strict';
/* Events. Each: {id, title, where, legs, once, weight, req, text, choices}.
   A choice's go() returns {text, fx, combat, next, scene}. */
(function () {
const A = id => IP.alive(id);
const R = () => IP.run();
const K = f => IP.knows(f);
const nm = id => IP.CREW[id].short.charAt(0) + IP.CREW[id].short.slice(1).toLowerCase();
const need = id => ({ req: () => A(id), why: 'Needs ' + nm(id) });

IP.EVENTS = [
/* ---------------- any leg ---------------- */
{ id: 'clocktown', title: 'A Town at 11:07', where: ['town', 'unknown'], legs: [1, 2, 3], once: true,
  text: () => 'The Pilgrim slows through a grain town. Every clock in every window says 11:07. The people are on the street, mid-step, mid-word. A man holds his hat an inch above his head. Nobody has moved in two years.\n\nThe bank door stands open.',
  choices: () => [
    { t: 'Send a party into the bank', go: () => ({ text: 'The vault is unlocked. The money is warm, as though someone has just been counting it. Nobody on the street turns to watch you go. You are almost sure of that.', fx: { scrip: 18, nerveAll: -1 } }) },
    { t: 'Wind the clock in the station', go: () => ({ text: 'Three turns of the key. The minute hand moves to 11:08.\n\nEvery person on the street takes one step toward the train. Then they stop again. Odile does not wait to be told.', fx: { lore: 2, att: 1 } }) },
    { t: 'Keep the blinds down and roll on', go: () => ({ text: 'You roll through at walking pace. Passengers peek anyway. A child in Coach waves at a woman frozen mid-wave. Nobody sleeps well.', fx: { nerveAll: -1, quiet: -0.3 } }) }
  ] },

{ id: 'refugees', title: 'Flagged at the Water Tower', where: ['depot', 'unknown'], legs: [1, 2, 3],
  text: () => 'A family waves a red shirt from the water tower ladder. Five of them. They have a handcart and no food. The father calls up that they will work, they will do anything, they only want to reach the coast.',
  choices: () => [
    { t: 'Take them aboard', go: () => ({ text: 'They climb into Coach and fall asleep almost at once. The youngest holds your sleeve for a while first.', fx: { pass: 5, trust: { wren: 1, constance: 1 } } }) },
    { t: 'Give them food and leave them', go: () => ({ text: 'Three days’ rations in a flour sack. They thank you in a way that is hard to listen to.', fx: { prov: -3, nerveAll: 1 } }) },
    { t: 'Fill the tender and go', go: () => ({ text: 'You fill the tender while they watch. Nobody on the train says anything about it. Wren does not look at you for some time.', fx: { fuel: 3, trust: { wren: -1 }, nerve: { wren: -1 } } }) }
  ] },

{ id: 'signalman', title: 'Signal Box 14', where: ['signal', 'unknown'], legs: [1, 2], once: true,
  text: () => 'The signal is set against you. In the box, a signalman in a moth-eaten uniform waves a lamp: hold, hold. He shouts down that the 11:07 is due and nothing may pass before it.\n\nHis face has not been shaved in two years. His lamp has no oil in it and is lit.',
  choices: () => [
    { t: 'Wait for the 11:07', go: () => ({ text: 'You wait. At 11:07 something passes on the empty track beside you. You feel the wind of it. You hear the wheels. There is nothing there.\n\nThe signalman salutes it, and then the signal drops.', fx: { lore: 2, quiet: 0.8, nerveAll: -1 } }) },
    { t: 'Force the points and run the signal', go: () => ({ text: 'The Pilgrim shoulders through the points. Something under the train screams like metal or like a man. The signalman is still waving his lamp when you lose sight of him.', fx: { hull: -3 } }) },
    { t: 'Ask Wren to read his logbook', ...need('wren'), go: () => ({ text: 'Wren climbs up with a lamp of her own. She is gone twenty minutes. She comes back with the logbook under her arm and will not say what he said to her.', fx: { doc: 'signallog', lore: 1, trust: { wren: 1 } } }) }
  ] },

{ id: 'freight', title: 'Derailed Freight', where: ['wreck'], legs: [1, 2, 3],
  text: () => 'A Halvorsen freight lies on its side in the cinders, forty cars long, doors sprung. Some of the cargo looks untouched. Something has dragged a long furrow from the caboose into the dark.',
  choices: () => [
    { t: 'Search quickly, take what is near', go: () => {
      const r = IP.pick([{ fuel: 3 }, { prov: 4 }, { ward: 2 }, { item: { bandage: 1 }, scrip: 6 }]);
      return { text: 'You strip the nearest four cars and get back aboard before the light changes.', fx: r };
    } },
    { t: 'Search every car', go: () => {
      if (IP.chance(0.55)) return { text: 'Twelve cars in, Vane’s whistle. Things are climbing out of the furrow.', combat: { list: IP.pick([['hollow', 'hollow'], ['hound', 'hollow']]), reward: { fuel: 3, prov: 4, ward: 1, scrip: 10 }, winText: 'When it is over you finish the search. It was worth it, mostly.' } };
      return { text: 'You search all forty cars. Nothing stirs. You find a crate of signal flares, diesel, and tinned peaches.', fx: { fuel: 3, prov: 5, item: { flare: 1 } } };
    } },
    { t: 'Send Vane alone', ...need('vane'), go: () => ({ text: 'Vane goes with his rifle and comes back with a full sack and a cut across his knuckles he does not explain.', fx: { fuel: 2, prov: 3, scrip: 8, hp: { vane: -2 } } }) }
  ] },

{ id: 'shrine', title: 'The Parallel Shrine', where: ['shrine'], legs: [1, 2, 3],
  text: () => 'A country church beside the line, its steeple sawn off. Over the altar someone has cut a mark into the plaster: two parallel lines, and a ring crossing them. Candles are burning. There are no footprints in the dust.' + (A('tull') ? '\n\nDr. Tull has gone very quiet.' : ''),
  choices: () => [
    { t: 'Kneel and listen', go: () => ({ text: 'You kneel. For a long time there is nothing. Then you understand that the candles are burning in time with the train’s engine, which is a mile behind you and switched off.\n\nYou learn something. You would rather not have.', fx: { lore: 3, att: 1, nerveAll: -1 } }) },
    { t: 'Deface the mark', go: () => ({ text: 'Jonah takes a crowbar to the plaster. The mark comes away in one piece and shatters. Outside, every candle goes out at once. The crew are lighter afterwards, as if a hand had lifted from them.', fx: { nerveAll: 1, att: -1 } }) },
    { t: 'Watch the doctor', req: () => A('tull') && !R().flags.cufflink, why: 'Needs Tull', go: () => {
      R().flags.cufflink = true;
      return { text: 'Tull stands before the mark with his hat in his hands. When he thinks no one is looking he touches his left cuff, the way some men touch a crucifix. You see the cufflink: two lines and a ring.', fx: { doc: 'cufflink', learn: 'tull_cufflink' } };
    } }
  ] },

{ id: 'inspector', title: 'The Company Inspector', where: ['town', 'unknown', 'station'], legs: [1, 2, 3], once: true,
  text: () => 'A man in Company grey steps up from the platform as if he had been waiting for you. His smile does not use his eyes. He wants to see the manifest for Car Zero, and he wants to see it now.',
  choices: () => [
    { t: 'Show him the manifest', go: () => ({ text: 'He reads it twice, nods, and tucks a bonus envelope into your breast pocket. “Punctual,” he says. “The Chairman will be pleased.” When he leaves, he leaves walking along the rails.', fx: { scrip: 20, att: 1 } }) },
    { t: 'Refuse him', go: () => ({ text: 'He writes something in a small grey book. “Noted,” he says, and steps back down onto the platform, and is not on it.', fx: { att: 1, flag: 'porterMarked' } }) },
    { t: 'Have Vane see him off', ...need('vane'), go: () => ({ text: 'Vane steps between you and the man, hand on his holster. They look at each other a long moment, two men in Company buttons. The inspector leaves. Vane is quiet for the rest of the day.', fx: { trust: { vane: 1 }, nerve: { vane: -1 } } }) }
  ] },

{ id: 'fever', title: 'Fever in the Coach', where: ['unknown', 'town'], legs: [1, 2, 3],
  text: () => 'Three passengers in Coach are burning with fever. They talk in their sleep, all three, the same words at the same time. The others want them off the train.',
  choices: () => [
    { t: 'Let the doctor treat them', ...need('tull'), go: () => ({ text: 'Tull works through the night. By morning the fever has broken. He looks more tired than the patients. “They were saying a timetable,” he says, and then does not want to talk about it.', fx: { prov: -1, nerve: { tull: -1 }, trust: { tull: 1 } } }) },
    { t: 'Quarantine them in the rear', go: () => ({ text: 'You move them to the back of the rear coach and hang a sheet. By the next stop, two of them are gone. The sheet is still hanging.', fx: { pass: -2, nerveAll: -1 } }) },
    { t: 'Put them off at the next halt', go: () => ({ text: 'You put them off at a halt with blankets and water. They stand on the platform and watch you go, and keep saying the timetable.', fx: { pass: -3, att: -1 } }) }
  ] },

{ id: 'walker', title: 'A Man Walking the Rails', where: ['unknown', 'town', 'depot'], legs: [1], once: true, weight: 3,
  req: () => !R().flags.walker,
  text: () => 'A man is walking the ties ahead of you, toward you, in a conductor’s coat. Odile leans on the whistle. He does not step aside.\n\nRule two of the passenger pamphlet: do not speak to persons walking the rails.',
  choices: () => [
    { t: 'Stop the train and call to him', go: () => { R().flags.walker = true; return { text: 'The Pilgrim screams to a stop ten yards short. You climb down. The coat is lying on the ties, folded, with nobody in it. It is warm.\n\nIn the pockets: a journal, and a claim ticket.', fx: { doc: ['ashby1', 'ticket077'], learn: 'ashby_coat', nerveAll: -1 } }; } },
    { t: 'Do not slow down', go: () => { R().flags.walker = true; return { text: 'The Pilgrim does not slow down. There is no impact. There is a coat on the cowcatcher when you next stop, folded neatly, as though someone had put it there by hand.', fx: { doc: ['ashby1', 'ticket077'], learn: 'ashby_coat', att: 1 } }; } }
  ] },

{ id: 'herd', title: 'The Herd', where: ['unknown'], legs: [1], once: true,
  text: () => 'Cattle stand across the line in the cinders, hundreds of them, all facing the train. None of them are grazing. As you slow, one of them turns its head the wrong way round to look at you.',
  choices: () => [
    { t: 'Push through slowly', go: () => ({ text: 'They part for the cowcatcher without a sound, and close behind you. It takes an hour. It costs fuel to crawl.', fx: { fuel: -2 } }) },
    { t: 'Open the throttle', go: () => ({ text: 'Odile opens her up. The herd does not part. The herd comes apart.', combat: { list: ['hound', 'hound', 'hollow'], reward: { prov: 5, scrip: 4 }, winText: 'Some of what you hit was beef. The cook does not ask.' } }) }
  ] },

{ id: 'grassfire', title: 'Fire on the Plain', where: ['unknown', 'depot'], legs: [1], once: true,
  text: () => 'A wall of fire is crossing the prairie toward the line, too fast and too straight, like a thing being drawn with a ruler.',
  choices: () => [
    { t: 'Race it', go: () => ({ text: 'The Pilgrim runs flat out with the fire at her flank. You win by a car-length. The tender is hot to the touch for an hour.', fx: { fuel: -2 } }) },
    { t: 'Go straight through', go: () => ({ text: 'The cars blister and the coach windows crack. For the length of the fire every passenger is screaming the same note. Then you are through, into black stubble and quiet.', fx: { hull: -4, nerveAll: -1 } }) }
  ] },

{ id: 'derrick', title: 'The Derrick', where: ['depot'], legs: [1, 2], once: true,
  text: () => 'An oil derrick nods by the line, pumping something black into an open tank. It smells like diesel. Mostly.',
  choices: () => [
    { t: 'Fill the tender from it', go: () => ({ text: 'The tender fills. The Pilgrim runs well on it. Too well. Odile says the engine has never been this warm, and puts her hand on the casing like you would on a horse.', fx: { fuel: 7, att: 2 } }) },
    { t: 'Take only what you need', go: () => ({ text: 'A few drums, no more.', fx: { fuel: 3, att: 1 } }) },
    { t: 'Leave it pumping', go: () => ({ text: 'The derrick nods after you. Yes. Yes. Yes.', fx: {} }) }
  ] },

{ id: 'deserters', title: 'Militia Camp', where: ['town', 'unknown'], legs: [1, 2, 3], once: true,
  text: () => 'A camp of State Militia by a burned bridge, what is left of a company. Their captain wants food for his men and has ammunition and medical stores to trade.',
  choices: () => [
    { t: 'Trade provisions for supplies', req: () => R().res.prov >= 4, why: 'Needs 4 provisions', go: () => ({ text: 'A fair trade. The captain shakes your hand like a man who has not shaken one in a while.', fx: { prov: -4, item: { bandage: 2, flare: 1 } } }) },
    { t: 'Trade scrip for dynamite', req: () => R().res.scrip >= 20, why: 'Needs 20 scrip', go: () => ({ text: 'He sells you two sticks of dynamite wrapped in oilcloth. “For the bridges,” he says. “They all need blowing.”', fx: { scrip: -20, item: { dynamite: 1 } } }) },
    { t: 'Wish them well and go', go: () => ({ text: 'They salute the train as it passes. You return it.', fx: { nerveAll: 1 } }) }
  ] },

{ id: 'mailcar', title: 'A Mail Car in the Weeds', where: ['wreck'], legs: [1, 2, 3], once: true,
  text: () => 'An old Halvorsen mail car has been shunted off onto a dead siding. Sacks of letters, two years undelivered.',
  choices: () => [
    { t: 'Read some of the letters', go: () => ({ text: 'Most are what you would expect. Weather. Prices. Love. One envelope is addressed to no one, in a woman’s hand, never sent.', fx: { doc: 'letter', nerveAll: -1, flag: 'readLetter' } }) },
    { t: 'Take the sacks for the stove', go: () => ({ text: 'Paper burns well. The coach is warm tonight.', fx: { nerveAll: 1, prov: 1 } }) },
    { t: 'Leave them', go: () => ({ text: 'You leave them. They are not yours to read.', fx: {} }) }
  ] },

{ id: 'secondtrain', title: 'The Other Pilgrim', where: ['unknown'], legs: [2, 3], once: true, req: () => IP.meta().knots >= 1,
  text: () => 'A second track runs alongside yours. On it, at exactly your speed, runs a locomotive with No. 9 on its nose. Its windows are lit. In the rear car, someone in a conductor’s cap is looking straight at you.',
  choices: () => [
    { t: 'Wave', go: () => ({ text: 'The figure waves back, a fraction of a second late. Then the other track curves away into the dark, and you have the distinct feeling of having been shown something.', fx: { lore: 2, nerveAll: -1 } }) },
    { t: 'Signal it with the lamp', ...need('wren'), go: () => ({ text: 'Wren flashes it in Morse: WHO ARE YOU. The other train answers, slowly. She writes it on her cuff and shows you.\n\nL E F T  A T  T H E  P I L L A R S', fx: { lore: 1, flag: 'heardLeft', trust: { wren: 1 } } }) },
    { t: 'Blinds down', go: () => ({ text: 'You pull every blind. For an hour you hear a second set of wheels. Then you don’t.', fx: {} }) }
  ] },

/* ---------------- leg 2 ---------------- */
{ id: 'chapel', title: 'The Sunken Chapel', where: ['unknown', 'shrine'], legs: [2], once: true,
  text: () => 'A chapel sits at the bottom of a flood pond, perfectly visible through still water. Its bell is ringing. You can hear it through the floor of the train.\n\nThe wardens’ lamp oil was kept in chapels like this one, in the old days.',
  choices: () => [
    { t: 'Send Jonah down', ...need('jonah'), go: () => ({ text: 'Jonah walks into the water without taking his coat off. He is under for four minutes. Then six. Then eleven. Wren has started to cry when he walks back out, carrying two jerrycans of oil, perfectly calm, not breathing hard.\n\nHe writes on his slate: COLD.', fx: { ward: 4, flag: 'jonahDove' } }) },
    { t: 'Ring the bell back', go: () => ({ text: 'You ring the Pilgrim’s bell, once. The chapel bell stops. The water goes black, then clear, then the chapel isn’t there.', fx: { lore: 2, att: 1 } }) },
    { t: 'Move on', go: () => ({ text: 'The bell rings after you for miles.', fx: { nerveAll: -1 } }) }
  ] },

{ id: 'fishers', title: 'Fishers of Still Water', where: ['town', 'unknown'], legs: [2], once: true,
  text: () => 'The flood stands up beside the line in a wall forty feet high, perfectly still, fish hanging in it like flies in amber. Men on ladders are fishing it with their bare hands.\n\nThey will trade a week of fish for one passenger who wants to stay. One already does.',
  choices: () => [
    { t: 'Let the passenger stay', go: () => ({ text: 'Mr. Royce, travelling in brushes, shakes your hand and climbs a ladder and walks into the wall of water. He waves from inside it. He is smiling. He keeps smiling.', fx: { pass: -1, prov: 7, nerveAll: -1 } }) },
    { t: 'Refuse', go: () => ({ text: 'The fishers shrug. Mr. Royce sulks in Coach for a day and then is fine. Mostly.', fx: { prov: 1 } }) }
  ] },

{ id: 'drownedtel', title: 'The Drowned Telegraph', where: ['signal'], legs: [2], once: true,
  text: () => 'A post office stands up to its eaves in clear water. Through the window you can see the telegraph key on the counter, tapping by itself.' + (A('wren') ? '\n\nWren puts her good ear to the window glass.' : ''),
  choices: () => [
    { t: 'Have Wren copy the message', ...need('wren'), go: () => ({ text: 'She copies it on the back of her hand. It is addressed to A.T.', fx: { doc: 'tullreply', learn: 'tull_telegram', lore: 1 } }) },
    { t: 'Break the window and fish out the tape', go: () => ({ text: 'The tape comes up wet but legible. It is addressed to A.T.\n\nThe water you let out of the window stands on the platform in a cube and does not spread.', fx: { doc: 'tullreply', learn: 'tull_telegram', nerveAll: -1 } }) },
    { t: 'Leave it tapping', go: () => ({ text: 'It is none of your business. You are fairly sure.', fx: {} }) }
  ] },

{ id: 'monument', title: 'The Founder’s Monument', where: ['town'], legs: [2], once: true,
  text: () => 'In the square of a drowned town, a bronze man stands chest-deep in standing water: AUGUSTIN HALVORSEN, 1851–, FOUNDER. The death year was never carved. He holds a surveyor’s chain.' + (A('constance') ? '\n\nMrs. Reed has come out onto the observation step and is looking at the statue with no expression at all.' : ''),
  choices: () => [
    { t: 'Ask Mrs. Reed if she knew him', req: () => A('constance'), why: 'Needs Mrs. Reed', go: () => {
      const known = K('constance_photo');
      return { text: known ? '“You’ve seen the photograph,” she says. It isn’t a question. “Then you know. My name is Constance Halvorsen. He is in your sealed car, Conductor. I am going to see him.”' : '“Everyone knew him,” she says. “He built all this.” She goes back inside. Later you find her cello case open and her hands shaking on the clasps.',
        fx: known ? { learn: 'constance_name', trust: { constance: 2 } } : { trust: { constance: 1 } } };
    } },
    { t: 'Search the town hall', go: () => ({ text: 'Behind the clerk’s desk, sealed in a glass frame, a family photograph. You take it.', fx: { doc: 'photo', learn: 'constance_photo' } }) },
    { t: 'Move on', go: () => ({ text: 'The bronze man watches the train go. Statues do that.', fx: {} }) }
  ] },

{ id: 'mercy', title: 'The Floating Town', where: ['town', 'station'], legs: [2], once: true,
  text: () => 'Mercy, Pop. 400, hangs in the air thirty feet above its own reflection, every house, every fencepost. People wave from upstairs windows. A rope ladder comes down. They want to trade.',
  choices: () => [
    { t: 'Trade for ward oil', req: () => R().res.scrip >= 12, why: 'Needs 12 scrip', go: () => ({ text: 'Good oil, lamp-grade. The townsfolk ask if the ground is still down there. You say it is. They don’t believe you.', fx: { scrip: -12, ward: 3 } }) },
    { t: 'Trade for a gramophone record', req: () => R().res.scrip >= 8, why: 'Needs 8 scrip', go: () => ({ text: 'An old woman lowers it in a basket. “We danced to it,” she says. “We danced to it and then we were up here.”', fx: { scrip: -8, item: { record_waltz: 1 } } }) },
    { t: 'Climb up and look around', go: () => ({ text: 'From up here you can see the line. You can see the shape it makes. You come down quickly.', fx: { lore: 2, doc: 'survey', learn: 'glyph', nerveAll: -1 } }) }
  ] },

/* ---------------- leg 3 ---------------- */
{ id: 'stair', title: 'The Stair', where: ['unknown', 'shrine'], legs: [3], once: true,
  text: () => 'An iron staircase stands by the line, bolted to nothing, climbing up into the low grey ceiling of the sky. The Lid is close enough here to hear. It hums.',
  choices: () => [
    { t: 'Climb it yourself', go: () => ({ text: 'You climb until your head is in the grey. It is warm and smells of the inside of a clock. You hear, very clearly, someone above it reading a timetable. Your name is on it.\n\nYou don’t remember climbing down.', fx: { lore: 4, att: 2, nerveAll: -2 } }) },
    { t: 'Send Wren with the aerial', ...need('wren'), go: () => ({ text: 'Wren rigs the aerial from the top step and listens for a long time. She comes down pale and certain. “It’s the same numbers, Conductor. It’s coming from up there. It’s coming from everywhere.”', fx: { lore: 2, nerve: { wren: -2 }, trust: { wren: 1 } } }) },
    { t: 'Leave it', go: () => ({ text: 'The stair is still in sight an hour later, which should not be possible on this ground.', fx: {} }) }
  ] },

{ id: 'lidcamp', title: 'Under the Lid', where: ['town', 'unknown', 'station'], legs: [3], once: true,
  text: () => 'A camp of people living stooped under the low sky, every one of them bent at the neck. They have food, and they will trade it for news. Any news. They have not seen the sky in a year.',
  choices: () => [
    { t: 'Tell them the truth', go: () => ({ text: 'You tell them what you’ve seen. They listen without interrupting and thank you and give you food, and you understand that they had hoped for different news.', fx: { prov: 4, nerveAll: -1 } }) },
    { t: 'Tell them it’s better out east', go: () => ({ text: 'You lie. They cry with relief. They load you with food. You will remember their faces.', fx: { prov: 6, nerve: { wren: -1, constance: -1 } } }) }
  ] },

/* ---------------- night crew events ---------------- */
{ id: 'n_slate', title: 'The Lamp-man', where: ['night'], legs: [1, 2, 3], once: true, req: () => A('jonah'),
  text: () => 'You find Jonah in the lamp car, trimming wicks, in the dark. He doesn’t look up. After a while he takes up his slate and writes, and holds it out to you.',
  choices: () => [
    { t: 'Read it', go: () => ({ text: 'The slate says: ' + IP.slateText() + '\n\nHe wipes it clean with his sleeve before you can ask.', fx: { doc: 'slate' } }) }
  ] },

{ id: 'n_watch', title: 'Jonah Sleeps', where: ['night'], legs: [2, 3], once: true, req: () => A('jonah') && IP.meta().knots >= 2 && !K('jonah_watch'),
  text: () => 'For the first time anyone can remember, Jonah is asleep. He sits upright on a crate in the lamp car, chin on his chest. A silver watch chain hangs from his waistcoat.',
  choices: () => [
    { t: 'Look at the watch', go: () => ({ text: 'You open the lid very carefully.\n\nIt is your name.\n\nWhen you look up Jonah is awake and watching you. He does not seem angry. He seems very, very tired.', fx: { doc: 'watch', learn: 'jonah_watch', nerveAll: -1, trust: { jonah: 1 } } }) },
    { t: 'Let him sleep', go: () => ({ text: 'You leave him be. He looks peaceful. He looks, you think, like someone you know.', fx: { nerveAll: 1 } }) }
  ] },

{ id: 'n_wren', title: 'The Numbers', where: ['night'], legs: [1, 2, 3], once: true, req: () => A('wren'),
  text: () => 'Wren knocks on your compartment at two in the morning, coat over her nightdress, a notebook clutched against her. “Conductor. Do you hear it? Tell me you hear it.” You don’t hear anything.',
  choices: () => [
    { t: '“I believe you. Show me.”', go: () => {
      const t = R().crew.wren.trust;
      if (t >= 1 || K('spur_known')) {
        IP.learn('spur_known');
        return { text: 'She sits on your bunk and shows you the notebook: rows of numbers. “It’s letters,” she says. “It’s just letters. One is A.” She writes it out underneath, her pencil steady for the first time in days.\n\nSPUR NINE. LEFT AT THE PILLARS.', fx: { doc: 'notebook', learn: 'wren_numbers', trust: { wren: 2 }, nerve: { wren: 2 } } };
      }
      return { text: 'She shows you the notebook: rows of numbers. She can’t say what they mean. But she stops shaking, and leaves the notebook with you, “in case I forget.”', fx: { doc: 'notebook', learn: 'wren_numbers', trust: { wren: 1 }, nerve: { wren: 1 } } };
    } },
    { t: '“Get some sleep, Wren.”', go: () => ({ text: 'She nods and goes. In the morning she is at her set as usual. She doesn’t bring it up again.', fx: { trust: { wren: -2 }, nerve: { wren: -2 } } }) }
  ] },

{ id: 'n_odile', title: 'The Cab at Night', where: ['night'], legs: [1, 2, 3], once: true, req: () => A('odile'),
  text: () => 'Odile drives nights alone. You bring her coffee. She takes it without looking away from the dark ahead. The firebox door of the old auxiliary heater is open, and in the glow you can see marks scratched inside it.',
  choices: () => [
    { t: 'Ask about the marks', go: () => ({ text: '“One for every run,” she says. “I keep count. Somebody has to.”\n\nYou ask how many runs she’s made on this line. She drinks her coffee and doesn’t answer.', fx: { doc: 'tally', learn: 'odile_tally', trust: { odile: 1 } } }) },
    { t: 'Ask about her family', go: () => ({ text: '“Had a boy. Fireman on this line. He was on the night freight when it happened.” A long pause. “He talks to me, some nights. On the radio. Don’t look at me like that.”', fx: { learn: 'odile_son', trust: { odile: 1 } } }) },
    { t: 'Sit with her and say nothing', go: () => ({ text: 'You watch the dark go by together until the coffee is cold. It helps both of you more than you expected.', fx: { nerve: { odile: 2 }, nerveAll: 1 } }) }
  ] },

{ id: 'n_cello', title: 'Music in the Coach', where: ['night'], legs: [1, 2, 3], once: true, req: () => A('constance'),
  text: () => 'Late in the night you hear a cello from Coach. Mrs. Reed is playing for the passengers, very low, the lamps turned down. Outside the windows, things that had been keeping pace with the train fall back.',
  choices: () => [
    { t: 'Listen', go: () => ({ text: 'Everyone sleeps that night, even Vane.', fx: { nerveAll: 2, trust: { constance: 1 } } }) },
    { t: 'Ask her to join the crew', go: () => { const r = R(); if (!r.crew.constance.crew) { r.crew.constance.crew = true; return { text: '“I am not much use with a rifle,” she says. “But they don’t like the low notes.” She takes a post on the crew roster.', fx: { trust: { constance: 1 } } }; } return { text: 'She is already crew. She plays anyway.', fx: { nerveAll: 1 } }; } }
  ] },

{ id: 'n_vane', title: 'Vane Asleep', where: ['night'], legs: [2, 3], once: true, req: () => A('vane') && !R().flags.vaneOrders,
  text: () => 'Vane has finally fallen asleep in the rear car, rifle across his knees. An envelope sticks up from his breast pocket, Company seal unbroken, marked OPEN AT HINGE BRIDGE.',
  choices: () => [
    { t: 'Steam it open and reseal it', go: () => { R().flags.vaneOrders = true; return { text: 'It takes twenty minutes over the coach stove. You read it twice. You reseal it and put it back. Vane doesn’t stir. You think.', fx: { doc: 'orders', learn: 'vane_orders', nerveAll: -1 } }; } },
    { t: 'Wake him and ask', req: () => K('vane_orders'), why: 'You would need to know what it says', go: () => { const r = R(); r.flags.vaneOrders = true; r.flags.vaneTurned = r.crew.vane.trust >= 1; return r.flags.vaneTurned
      ? { text: 'You tell him what is in the envelope before he opens it. He goes grey. “How could you possibly—” He stops. Looks at Mrs. Reed asleep across the aisle. Tears the envelope in half. “I was a policeman once,” he says. “Before the Company.”', fx: { trust: { vane: 2 }, nerve: { vane: 1 } } }
      : { text: 'You tell him what is in the envelope. His face doesn’t change at all. “Go to bed, Conductor.” He is watching Mrs. Reed now. He doesn’t trust you enough yet.', fx: { trust: { vane: -1 } } }; } },
    { t: 'Leave him be', go: () => ({ text: 'Not your business. Probably.', fx: {} }) }
  ] },

{ id: 'n_tull', title: 'The Doctor’s Telegram', where: ['night'], legs: [1, 2], once: true, req: () => A('tull'),
  text: () => 'You find Dr. Tull writing a telegram form by lamplight, to be sent at the next office. He covers it with his hand when you come in, then smiles and uncovers it, as if embarrassed by his own reflex. “Report to the Company. Nothing exciting.”',
  choices: () => [
    { t: 'Read it over his shoulder later', go: () => ({ text: 'He leaves it in his bag. The bag is not locked.', fx: { doc: 'tulltel', learn: 'tull_telegram', trust: { tull: -1 } } }) },
    { t: 'Confront him', req: () => K('tull_cufflink') && K('tull_telegram'), why: 'You would need proof', go: () => { const r = R(); r.flags.tullTurned = true; return { text: 'You put the cufflink sketch and the reply telegram on the table between you. He looks at them for a long time.\n\n“I lost my wife in the Hush,” he says. “They told me there would be an end to it. Grief, I mean. Every line has an end.” He takes a folded paper from inside his jacket and gives it to you. “I think I was a fool. Here. It’s everything they told me.”', fx: { doc: 'society', lore: 3, att: -3, trust: { tull: 3 } } }; } },
    { t: 'Leave him to it', go: () => ({ text: 'Company business. Company doctor.', fx: {} }) }
  ] },

{ id: 'n_luca', title: 'A Voice on 1290', where: ['night'], legs: [2, 3], once: true, req: () => A('odile') && K('odile_son'),
  text: () => 'At three in the morning Odile comes back to the radio car and asks Wren, very politely, to tune to 1290. A boy’s voice: “Mama? It’s warm here. Keep driving. Don’t stop for anything.” Odile is weeping without making a sound.',
  choices: () => [
    { t: 'Ask Wren what she hears', req: () => A('wren') && R().crew.wren.trust >= 1, why: 'Needs Wren, and her trust', go: () => { R().flags.lucaTold = true; return { text: 'Wren looks at the dial for a long time. Then, gently: “Mrs. Marchetti, it’s the 1107 signal. Same carrier. Someone’s pitched it up.”\n\nOdile sits down very slowly on a crate. “I know,” she says. “I’ve known for a while.” She switches the set off herself.', fx: { learn: 'luca_false', trust: { odile: 2 }, nerve: { odile: -2 }, att: -1 } }; } },
    { t: 'Let her listen', go: () => ({ text: 'You leave her with it. She drives faster the next day. She does not want to stop for anything.', fx: { fuel: 1, att: 1, trust: { odile: 1 } } }) }
  ] },

{ id: 'n_zero', title: 'Car Zero', where: ['night'], legs: [1, 2, 3], req: () => IP.meta().knots >= 1,
  text: () => IP.pick([
    'Three knocks from inside Car Zero. Measured. Patient. Then, very faintly, the sound of a chain being let out link by link.',
    'The coupling behind the tender is warm enough to boil water on. Jonah has hung a blanket over the door of Car Zero, as if it were a birdcage.',
    'Every clock aboard stops at 11:07 for exactly one minute. In Car Zero, someone clears their throat.'
  ]),
  choices: () => [
    { t: 'Put your ear to the door', go: () => ({ text: 'Breathing. Slow, like a big engine idling. And under it, counting. You recognize the number.', fx: { lore: 1, nerveAll: -1, att: 1 } }) },
    { t: 'Walk away', go: () => ({ text: 'You walk away. It is harder than it should be.', fx: {} }) }
  ] },

{ id: 'n_quiet', title: 'A Quiet Night', where: ['night'], legs: [1, 2, 3], weight: 2,
  text: () => IP.pick([
    'Nothing comes out of the dark. The wheels keep their rhythm. Somewhere in Coach someone laughs.',
    'Rain on the roof all night, ordinary rain, falling down the ordinary way. Several passengers go out on the step just to feel it.',
    'Wren finds a dance band on 820 that has no business still being on the air. Nobody asks how. Mr. Fenwick dances with Sister Agathe.'
  ]),
  choices: () => [ { t: 'Rest', go: () => ({ text: 'The crew rests.', fx: { nerveAll: 1, hpAll: 1 } }) } ] }
];

/* ---------------- story scenes (by id) ---------------- */
IP.SCENES = {
  harrow_after: { title: 'Harrow’s Cross', text: () => 'The Porter is gone. The station hotel at Harrow’s Cross is lit in every window and empty in every room. Supper is laid in the dining room, still hot.\n\nThere is a telegraph office on the platform. ' + (A('tull') ? 'Dr. Tull excuses himself and walks toward it.' : 'Its key is tapping by itself.'),
    choices: () => [
      { t: 'Eat, and let everyone rest', go: () => ({ text: 'You eat the Company’s supper. It is very good. Nobody asks who cooked it.', fx: { prov: 4, hpAll: 2, nerveAll: 1 } }) },
      { t: 'Follow the doctor to the telegraph office', req: () => A('tull'), why: 'Needs Tull', go: () => ({ text: 'Through the office window you watch him hand over a form. The clerk has no face. When Tull leaves, you go in. The clerk hands you a carbon copy without being asked.', fx: { doc: 'tulltel', learn: 'tull_telegram', nerveAll: -1 } }) },
      { t: 'Search the hotel register', go: () => ({ text: 'The last guest signed in on 29 October 1929. It is your signature. The room number is 077.', fx: { lore: 2, learn: 'register', nerveAll: -1 } }) }
    ] },
  lowater_after: { title: 'Lowater', text: () => 'Lowater is a town on stilts over a lake that stands perfectly level, even where the ground falls away under it. The Choirmaster’s singers drift face down in the water like lilies.\n\nOn the station platform, behind a brass grille: HALVORSEN LINE · LOST PROPERTY.' + (K('ashby_coat') ? '' : ''),
    choices: () => [
      { t: 'Go to the Lost Property window', go: () => ({ scene: 'lostprop' }) },
      { t: 'Search the flooded signal box', go: () => ({ text: 'Pinned under a mug on the signalman’s desk: a journal page in a hand you are starting to know well.', fx: { doc: 'ashby2', learn: 'ashby2', lore: 1 } }) },
      { t: 'Rest at the Railway Inn', go: () => ({ text: 'The beds are dry. That is enough.', fx: { hpAll: 2, nerveAll: 2, prov: -1 } }) }
    ] },
  pillars: { title: 'The Pillars', text: () => 'The Lid comes down to meet the ground here on pillars, a forest of them, grey and ribbed. Up close they are not stone. Up close they are people, hundreds, standing on each other’s shoulders, holding up the sky.\n\nOne near the line wears a conductor’s coat. His eyes follow the train.' + (K('spur_known') ? '\n\nAnd there, to the left, half-buried in cinders: a set of rails that appears on none of your maps.' : ''),
    choices: () => [
      { t: 'Speak to the man in the coat', go: () => ({ text: '“You found my coat,” Ashby says, in a voice like a slow train. “Good. You’ll want this.” A page flutters down from his pocket. “I cut the line. They relaid it. Don’t cut it. Unmake it.”', fx: { doc: 'ashby3', learn: 'ashby3', lore: 2, nerveAll: -1 } }) },
      { t: 'Pass by with the blinds down', go: () => ({ text: 'You pass. Behind the blinds, the passengers are counting the pillars under their breath.', fx: {} }) }
    ] },
  lostprop: { title: 'Lost Property', text: () => 'A clerk in a green eyeshade sits behind the grille. Shelves behind him go back farther than the building does: umbrellas, a birdcage, a wedding dress, a child’s shoe, a ship in a bottle. “Claim number, or passphrase,” he says.', input: true }
};
})();
