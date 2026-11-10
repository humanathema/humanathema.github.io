// KAITIAKI — game data. Cash is in $k. One turn = one season (quarter).
// Project fields: id, act, cat, name, desc, cost, costq (cost in quarters of income), inf (influence cost),
// mandate, t (turns), req [ids], need {stat: threshold}, gain {instant}, inc {per turn}, rel {partner: +n},
// slots, rep (max repeats), tag ('absorb' | 'window'), toAct, win
(function () {
  const projects = [
    // ───────────── ACT I — PAPAIOEA ─────────────
    { id: 'lawns', act: 1, cat: 'Business', name: 'Mow lawns, fix mowers', desc: 'A mower, a trailer, a letterbox drop. Every lawn is a household that knows your name.', cost: 1, t: 1, gain: { mana: 1 }, inc: { cash: 4, voters: 6 } },
    { id: 'morelawns', act: 1, cat: 'Business', name: 'Take on another round of lawns', desc: 'More streets, more regulars.', cost: 2, t: 1, rep: 3, until: 2, req: ['lawns'], inc: { cash: 3, voters: 5 } },
    { id: 'tutoring', act: 1, cat: 'Education', name: 'Tutoring on the side', desc: 'Maths at kitchen tables in the evenings. Parents talk to other parents.', cost: 0, t: 1, gain: { mana: 1 }, inc: { cash: 2, voters: 3 } },
    { id: 'partner', act: 1, cat: 'Business', name: 'Business partner: the mechanic', desc: 'Your mate is doing his automotive course. He takes the engines, you take the lawns.', cost: 3, t: 2, gain: { hands: 1 }, inc: { cash: 4 } },
    { id: 'gym', act: 1, cat: 'Community', name: 'Garage gym', desc: 'A bag, some mats, a rack. Open to anyone who turns up and trains properly. Everything on the security side grows out of who you train with here.', cost: 4, t: 1, gain: { mana: 2, security: 1 }, inc: { voters: 4 } },
    { id: 'hire1', act: 1, cat: 'Business', name: 'Hire your first worker', desc: 'A social enterprise from day one: the wage policy you set now is the one you will be known for.', cost: 6, t: 1, req: ['lawns'], gain: { hands: 1 }, inc: { cash: 4 } },
    { id: 'landscaping', act: 1, cat: 'Business', name: 'Landscaping', desc: 'From cutting grass to shaping sections.', cost: 15, t: 2, req: ['hire1'], need: { hands: 2 }, inc: { cash: 12, voters: 6 } },
    { id: 'fences', act: 1, cat: 'Business', name: 'Property works', desc: 'Post-hole borer, concrete mixer, compactor: fences, driveways, paths, decks, retaining walls, sheds. With the truck as well, the council starts sending you potholes.', cost: 30, t: 2, req: ['landscaping'], need: { hands: 3 }, inc: { cash: 20, voters: 6 } },
    { id: 'truck', act: 1, cat: 'Industry', name: 'Buy a truck', desc: 'A tired tipper. Your partner keeps it alive.', cost: 45, t: 1, req: ['landscaping'], gain: { industry: 1 }, inc: { cash: 10 } },
    { id: 'crew2', act: 1, cat: 'Business', name: 'Second crew', desc: 'Three more on the payroll.', cost: 35, t: 1, req: ['landscaping'], gain: { hands: 3 }, inc: { cash: 8 } },
    { id: 'contractor', act: 1, cat: 'Business', name: 'Become a contractor', desc: 'You have the plant and the people. Pivot from driveways to roading: resealing for the council, subcontracting to builders. Paperwork, insurance, real jobs.', cost: 90, t: 2, req: ['fences', 'truck'], need: { hands: 6, propWorks: 4, roadWorks: 2 }, gain: { industry: 2, mana: 2 }, inc: { cash: 50 }, toAct: 2 },
    { id: 'waste', act: 2, cat: 'Industry', name: 'Waste company', desc: 'Scrap vehicles, clear sections, take away what people cannot shift themselves.', cost: 60, t: 2, req: ['truck'], gain: { industry: 1, mana: 2 }, inc: { cash: 28, voters: 10 } },
    { id: 'recycle', act: 2, cat: 'Industry', name: 'Recycling and repair yard', desc: 'What comes in as rubbish goes out as parts, steel and fixed machines.', cost: 80, t: 2, req: ['waste', 'partner'], gain: { industry: 2, mana: 2 }, inc: { cash: 25 } },
    { id: 'pyrolysis', act: 2, cat: 'Industry', name: 'Plastic to diesel', desc: 'A pyrolysis retort built in the yard cooks waste plastic down into diesel. Your trucks and mowers run on what the city throws away: longer working days, cheaper convoys.', cost: 140, t: 3, req: ['recycle'], gain: { industry: 3, tech: 1 }, inc: { cash: 20 } },
    { id: 'engshop', act: 2, cat: 'Industry', name: 'Engineering shop', desc: 'Lathe, mill, welders, a plasma table. You stop buying machines and start building them.', cost: 160, t: 3, req: ['recycle'], gain: { industry: 4 }, inc: { cash: 35 } },
    { id: 'gvcs', act: 2, cat: 'Industry', name: 'The civilisation toolkit', desc: 'An open-source machine set in the spirit of Open Source Ecology\'s Global Village Construction Set: tractor, brick press, sawmill, power cube. You have to have actually built three machines in the shop first.', cost: 280, t: 4, req: ['engshop'], need: { built: 3 }, gain: { industry: 8, tech: 1 }, inc: { cash: 45 } },
    { id: 'patrols', act: 2, cat: 'Community', name: 'Community safety patrols', desc: 'Weekend nights outside the bars on the strip. Break up fights, walk people to taxis, bring the angry young ones to the gym.', cost: 8, t: 1, req: ['gym'], need: { sparWins: 1 }, gain: { mana: 4, security: 2 }, inc: { voters: 15, mana: 0.2 } },
    { id: 'securityarm', act: 2, cat: 'Business', name: 'Licensed security arm', desc: 'The patrol volunteers get licences and a wage.', cost: 45, t: 2, req: ['patrols', 'hire1'], need: { sparWins: 3 }, gain: { security: 3, hands: 2 }, inc: { cash: 28 } },
    { id: 'reserves', act: 2, cat: 'Community', name: 'Reserve-friendly employer', desc: 'Help staff join the Army Reserve and build the work programme around training and service blocks. Linton is just down the road.', cost: 25, t: 2, req: ['securityarm'], need: { sparWins: 5 }, gain: { security: 4, mana: 3 } },
    { id: 'labourhire', act: 2, cat: 'Business', name: 'Triple-ticketed labour hire', desc: 'Everyone gets Site Safe, a truck licence and a security licence. Like soldiers, the same people can do labour, logistics or security depending on the day.', cost: 120, t: 2, req: ['securityarm', 'contractor'], gain: { hands: 8 }, inc: { cash: 55 } },
    { id: 'bizservices', act: 2, cat: 'Finance', name: 'Business and admin services', desc: 'Payroll, invoicing and compliance for every small firm that hates doing it.', cost: 70, t: 2, req: ['contractor'], slots: 1, inc: { cash: 28 } },
    { id: 'contacts', act: 2, cat: 'Politics', name: 'The list', desc: 'Customers, clients, suppliers, gym members, parents. One database, kept carefully.', cost: 20, t: 1, req: ['bizservices'], inc: { voters: 30 } },
    { id: 'kyc', act: 2, cat: 'Finance', name: 'KYC and compliance services', desc: 'Identity verification and anti-money-laundering checks: dull, required, and the doorway into finance.', cost: 90, t: 2, req: ['bizservices'], inc: { cash: 40 } },
    { id: 'finance', act: 2, cat: 'Finance', name: 'Finance arm: everything on credit', desc: 'Lend to customers and to other firms. Generous terms, shares as collateral.', cost: 320, t: 3, req: ['kyc'], inc: { cash: 100 } },
    { id: 'absorb1', act: 2, cat: 'Finance', name: 'Micro Belt and Road', desc: 'High wages, low prices and easy credit pull the city\'s small firms into your orbit. Some repay; some become divisions.', cost: 450, t: 3, tag: 'absorb', req: ['finance'], gain: { hands: 10, industry: 3, voters: 150 }, inc: { cash: 170 } },
    { id: 'civil', act: 2, cat: 'Industry', name: 'Civil contractor', desc: 'Roads, pipes, earthworks. You tender against the big names.', cost: 550, t: 3, req: ['contractor', 'gvcs', 'labourhire'], need: { hands: 15, industry: 10, roadWorks: 6 }, gain: { industry: 6 }, inc: { cash: 240 } },
    { id: 'housing', act: 2, cat: 'Community', name: 'Pilot: housing, aged care and ECE in one complex', desc: 'Housing-first, low-cost units built by your own crews, with elders and under-fives sharing a courtyard.', cost: 420, t: 4, req: ['contractor', 'engshop'], gain: { mana: 10 }, inc: { cash: 30, voters: 40 } },
    { id: 'school', act: 2, cat: 'Education', name: 'Pilot school: ten till two', desc: 'Four 45-minute blocks: two taught (mathematics, martial arts, mind and body), a break at 10:45 and 11:45, then two blocks of student-directed work — retrieval essays, compositions, technical projects.', cost: 160, t: 3, req: ['housing', 'tutoring'], gain: { mana: 8, tech: 1 }, inc: { voters: 30 } },
    { id: 'vocational', act: 2, cat: 'Education', name: 'Vocational afternoons', desc: 'After 2pm: two hours in the gardens, the workshop, the office, the studio. The organisation is the campus.', cost: 80, t: 2, req: ['school'], gain: { hands: 5, industry: 2, mana: 3 } },
    { id: 'doorknock', map: true, act: 2, cat: 'Politics', name: 'Door-knock a suburb', desc: 'Highbury, Roslyn, Awapuni, Milson, Takaro, Hokowhitu. One street at a time.', cost: 6, t: 1, rep: 6, until: 3, gain: { voters: 100 } },
    { id: 'koha', act: 1, cat: 'Community', name: 'Koha', desc: 'Free jobs for people who cannot pay, sponsorship for clubs, labour for the marae. Costs a season\'s takings.', costq: 1, t: 1, rep: 999, req: ['hire1'], gain: { mana: 4 } },
    { id: 'councilrun', act: 2, cat: 'Politics', name: 'Run for council', desc: 'Platform: youth violence prevention. One of you stands, and steps away from the day-to-day business to do it: from then on they are the liaison, not the contractor. The company is not one person. It is a social enterprise with a constitution, a trust beside it, and other people running the work.', cost: 40, t: 2, req: ['housing', 'patrols'], need: { voters: 800, mana: 35, patrolWins: 3 }, gain: { influence: 5 }, slots: 1, toAct: 3 },

    { id: 'aerostat', act: 2, cat: 'Aerospace', name: 'Tethered aerostat', desc: 'A helium balloon on a winch above the yard, built in your own shop: a radio relay and a camera for the patrols. Three hundred metres up, you can see the whole city. This is where you start to work from.', cost: 120, t: 2, req: ['engshop'], gain: { tech: 1, security: 1 } },
    // ───────────── REGION ─────────────
    { id: 'councilarm', act: 3, cat: 'Industry', name: 'Council civil engineering arm', desc: 'An in-house industrial division: the council stops tendering everything out and starts building.', cost: 900, inf: 2, t: 3, gain: { industry: 8, mana: 4 }, inc: { cash: 350, voters: 200 } },
    { id: 'cityworks', act: 3, cat: 'Community', name: 'City works programme', desc: 'Footpaths, pipes, parks, bus shelters. Visible, finished, on budget.', cost: 1200, t: 3, req: ['councilarm'], gain: { mana: 8 }, inc: { voters: 400 } },
    { id: 'allies', act: 3, cat: 'Politics', name: 'Bring allies onto council', desc: 'Recruit and back candidates who follow the work programme. This is the succession plan: your own seat can be handed on, and the movement stays at the table without you needing to be. One vote is a voice; seven is a majority.', cost: 300, t: 2, need: { voters: 2500 }, gain: { influence: 3 }, inc: { influence: 1 } },
    { id: 'network', act: 3, cat: 'Politics', name: 'The city network', desc: 'Principals, pastors, kaumātua, club presidents, business owners. Become indispensable to each.', cost: 400, t: 2, req: ['allies'], inc: { voters: 250, influence: 0.5 } },
    { id: 'absorb2', act: 3, cat: 'Finance', name: 'Absorb the big contractors and quarries', desc: 'The same strategy at council scale: credit, wages and volume until the Higgins-class firms and the aggregate resources are inside the tent.', cost: 3500, t: 4, tag: 'absorb', req: ['councilarm', 'finance'], gain: { industry: 15, hands: 40, voters: 1000 }, inc: { cash: 1100 } },
    { id: 'regional', act: 3, cat: 'Business', name: 'Wider Wellington region', desc: 'Contracts down the line: Horowhenua, Kāpiti, the Hutt, Wairarapa, the capital.', cost: 4500, t: 3, req: ['absorb2'], gain: { influence: 3 }, inc: { cash: 1600, voters: 500 } },
    { id: 'datacentre', act: 3, cat: 'Industry', name: 'Alluvial-plain datacentres', desc: 'Sited on the old fanned-out riverbeds, cooled by groundwater moving through subsurface gravel, so the heat never reaches the Manawatū River.', cost: 7000, t: 5, req: ['absorb2'], gain: { tech: 5 }, inc: { cash: 2200 } },
    { id: 'png_sec', act: 3, cat: 'Security', name: 'PNG security firm', desc: 'A licensed armed security company in Papua New Guinea, where that is legal. Operators trained to be highly respectful; conduct code grounded in kaupapa Māori.', cost: 1800, t: 3, req: ['reserves', 'absorb1'], gain: { security: 10 }, rel: { png: 15 }, inc: { cash: 350 } },
    { id: 'rotation', act: 3, cat: 'Security', name: 'PNC ⇄ PNG rotation', desc: 'Palmerston North staff rotate through PNG and come home as officers who train the next intake.', cost: 600, t: 3, req: ['png_sec'], gain: { security: 8, hands: 10 }, rel: { png: 5 } },
    { id: 'himatangi', act: 3, cat: 'Industry', name: 'Himatangi launch', desc: 'Permit for an offshore research vessel and barge in the South Taranaki Bight, launched off Himatangi Beach.', cost: 2800, t: 4, req: ['councilarm', 'gvcs'], gain: { tech: 5 } },
    { id: 'pipeline', map: true, act: 3, cat: 'Industry', name: 'PNC → Himatangi → barge', desc: 'A logistics line from the engineering shops to the coast: components, automated crawlers, the first undersea research station.', cost: 3500, t: 4, req: ['himatangi'], gain: { tech: 6, industry: 5 } },
    { id: 'mprun', act: 3, cat: 'Politics', name: 'Run for Parliament: Palmerston North', desc: 'You need about 15,000 to take the seat conclusively.', cost: 600, t: 2, req: ['cityworks'], need: { voters: 15000, mana: 90 }, gain: { influence: 10 } },
    { id: 'party', act: 3, cat: 'Politics', name: 'Found a party', desc: 'A works-and-wages party that will never ask for the top job.', cost: 1500, inf: 8, t: 2, req: ['mprun'] },
    { id: 'campaign', act: 3, cat: 'Politics', name: 'National campaign tour', desc: 'Town halls from Kaitaia to Bluff, showing what was built in Palmerston North.', cost: 2500, t: 2, rep: 5, until: 4, req: ['party'], gain: { voters: 15000 } },
    { id: 'fourpercent', act: 3, cat: 'Politics', name: 'Cross the threshold', desc: 'The party vote clears the threshold. Every further 0.8% or so is another seat. Neither bloc can govern without you.', cost: 3000, t: 2, req: ['party'], need: { voters: 100000, mana: 140 }, gain: { mandate: 2, influence: 10 }, slots: 1, toAct: 4 },

    { id: 'airship', act: 3, cat: 'Aerospace', name: 'The Kāhu', desc: 'A crewed lighter-than-air ship with a rigid hull welded in the council workshops. It loiters at six kilometres over the Manawatū and becomes your office.', cost: 2200, t: 4, req: ['aerostat', 'councilarm'], gain: { tech: 3, influence: 2 } },
    // ───────────── AOTEAROA ─────────────
    { id: 'mow', act: 4, cat: 'Industry', name: 'Ministry of Works', desc: 'The state builds again: a standing public works organisation with its own plant, engineers and apprentices.', cost: 20000, mandate: 1, t: 4, gain: { industry: 40 }, slots: 1, inc: { cash: 9000 } },
    { id: 'iwiagri', act: 4, map: true, cat: 'Community', name: 'State–iwi enterprises', desc: 'Built on the map: processing on Māori land, in partnership, with ownership that stays put.', cost: 0, t: 1, gain: { mana: 15 } },
    { id: 'trunk', act: 4, map: true, cat: 'Industry', name: 'Main trunk electrified', desc: 'Built on the map: Auckland to Wellington under the wire.', cost: 0, t: 1, gain: { industry: 15, mana: 5 } },
    { id: 'grid', act: 4, cat: 'Industry', name: 'Nationalise the power grid', desc: 'Generation and lines back in public hands, priced to build industry.', cost: 60000, mandate: 1, t: 4, gain: { industry: 10 }, inc: { cash: 18000 } },
    { id: 'housingnat', act: 4, cat: 'Community', name: 'National housing-first build', desc: 'The Palmerston North complex, repeated in every town by the Ministry of Works. It needs your own timber.', cost: 30000, t: 4, req: ['mow'], need: { timber: 1 }, gain: { mana: 15 }, inc: { cash: 4000 } },
    { id: 'schoolnat', act: 4, cat: 'Education', name: 'Ten-till-two schools nationwide', desc: 'The pilot school model offered to any community that wants it, with vocational branches alongside academic.', cost: 12000, t: 4, req: ['school'], gain: { tech: 8, mana: 8 } },
    { id: 'northport', act: 4, cat: 'Maritime', name: 'Northport floating drydock', desc: 'A floating drydock at Marsden Point: the country can build and repair its own ships again.', cost: 80000, mandate: 1, t: 5, req: ['mow'], gain: { industry: 30 } },
    { id: 'drumbeat', act: 4, cat: 'Maritime', name: 'Shipbuilding drumbeat', desc: 'A steady rhythm of hulls so the yard never lays off its workforce. It needs your own steel.', cost: 50000, t: 4, req: ['northport'], need: { steel: 1 }, gain: { industry: 20 }, inc: { cash: 12000 } },
    { id: 'ferries', act: 4, cat: 'Maritime', name: 'Replace the ferries', desc: 'New Cook Strait ferries, built at home.', cost: 40000, t: 3, req: ['drumbeat'], gain: { mana: 15 }, inc: { cash: 6000 } },
    { id: 'composites', act: 4, cat: 'Maritime', name: 'Composite yards', desc: 'The country already builds some of the best composite hulls in the world, for racing yachts and superyachts. Put those yards and their laminators to work for the state: superstructures, masts, panels.', cost: 25000, t: 3, req: ['northport'], gain: { industry: 8, tech: 5 }, inc: { cash: 3000 } },
    { id: 'opv', act: 4, cat: 'Security', name: 'Offshore patrol vessels', desc: 'A class of OPVs built with Australia, for fisheries, straits and sea lanes: steel keel and lower hull rolled from your own plate, composite upper hull and superstructure from the yacht yards. Lighter up top, quicker to build, so the same money buys a third ship.', cost: 60000, t: 4, req: ['drumbeat', 'composites'], need: { steel: 1 }, gain: { security: 30 } },
    { id: 'armour', act: 4, cat: 'Security', name: 'Modular armour panels', desc: 'Thick armour plate would mean far bigger vacuum degassers than the mill has. Skip them: roll thin hard plate, back it with composite, and make bolt-on panels any truck, boat or building can carry and any workshop can replace.', cost: 30000, t: 3, req: ['composites'], need: { steel: 1 }, gain: { security: 15, industry: 5 }, inc: { cash: 5000 } },
    { id: 'cargo', act: 4, cat: 'Maritime', name: 'The circuit route', desc: 'Small-to-medium cargo ships run a loop: the small cities of Australia\'s east coast, then out through the Pacific Islands and home.', cost: 50000, t: 3, req: ['drumbeat'], rel: { aus: 10, pac: 15 }, inc: { cash: 22000 } },
    { id: 'undulator', act: 4, cat: 'Technology', name: 'Undulator prototype', desc: 'Designed and prototyped in New Zealand: Buckley Systems\' magnet manufacturing with the Robinson Research Institute\'s superconductor work.', cost: 40000, t: 5, req: ['mow'], need: { tech: 10 }, gain: { tech: 20 } },
    { id: 'seamount', map: true, act: 4, cat: 'Technology', name: 'Seamount stations', desc: 'Distributed undersea research stations, bases and depots on seamounts, supplied from Himatangi.', cost: 30000, t: 4, req: ['pipeline', 'mow'], need: { boatWins: 2 }, gain: { tech: 10, security: 10 } },
    { id: 'pacreset', act: 4, cat: 'Politics', name: 'Honest broker', desc: 'A foreign policy for a small power that seeks no hegemony: build, employ, connect, and take no side.', cost: 10000, inf: 10, mandate: 1, t: 2, req: ['mow', 'cargo'], need: { food: 3, revived: 3, mana: 200 }, gain: { cohesion: 5 }, toAct: 5 },

    { id: 'hap', act: 4, cat: 'Aerospace', name: 'Stratospheric platform', desc: 'The Kāhu\'s successor: a solar-electric platform holding station at twenty kilometres, above the weather and the air lanes. Workshops, antennas and a deck you can build on.', cost: 25000, t: 4, req: ['airship', 'mow'], gain: { tech: 8, security: 5 } },
    { id: 'massdriver', act: 4, cat: 'Aerospace', name: 'Southern Alps launch rail', desc: 'An electromagnetic launch track up a mountainside in the Southern Alps: little air traffic, a clear run south to polar orbit, and power from the public grid. The magnets come from the undulator people; the structure from yards that began by scrapping cars.', cost: 70000, t: 6, req: ['grid', 'gvcs', 'recycle'], need: { industry: 80, tech: 20 }, gain: { tech: 15, industry: 10 } },
    { id: 'polar', act: 4, cat: 'Aerospace', name: 'Polar-orbit constellation', desc: 'Small, rugged satellites thrown south off the rail: fisheries watch, weather, communications for every island that wants them.', cost: 45000, t: 4, req: ['massdriver'], gain: { tech: 10, security: 10 }, inc: { cash: 15000 }, rel: { pac: 5 } },
    // ───────────── TE MOANA ─────────────
    { id: 'whanaunga', act: 5, cat: 'Diplomacy', name: 'Whanaungatanga Pasifika charter', desc: 'The coalition\'s founding language: kaitiakitanga (guardianship), whanaungatanga (kinship), tuakana–teina (the elder sibling teaches and is taught). Obligations between relatives, not conditions from donors.', cost: 20000, t: 2, gain: { cohesion: 4, mana: 10 }, rel: { pac: 5, png: 5 } },
    { id: 'mowpac', act: 5, cat: 'Diplomacy', name: 'Ministry of Works, Pacific contracts', desc: 'Wharves, roads, hospitals and power for island governments, built with local crews who keep the skills.', cost: 120000, t: 4, req: ['whanaunga'], gain: { cohesion: 5 }, rel: { pac: 25 }, inc: { cash: 35000 } },
    { id: 'circuit', act: 5, cat: 'Maritime', name: 'Plants out, processed goods back', desc: 'The circuit ships deliver canneries and timber mills, pick up commodities, and later carry the islands\' own finished goods.', cost: 100000, t: 4, req: ['cargo'], gain: { cohesion: 5 }, rel: { pac: 15 }, inc: { cash: 45000 } },
    { id: 'pngind', act: 5, cat: 'Diplomacy', name: 'PNG industrial capacity', desc: 'Not extraction and not fly-in engineers: plants owned and run by Papua New Guineans, with locals promoted through every rank.', cost: 90000, t: 4, req: ['png_sec'], gain: { cohesion: 5 }, rel: { png: 30 }, inc: { cash: 25000 } },
    { id: 'retired', act: 5, cat: 'Diplomacy', name: 'The general\'s handshake', desc: 'A contract with a retired Indonesian military officer to build a combined organisation. A foreign PMC is impossible in Indonesia; a partnership is not.', cost: 30000, t: 2, rel: { idn: 10 } },
    { id: 'siz', act: 5, cat: 'Industry', name: 'Base in the Papua special economic zone', desc: 'Investment and downstreaming inside Indonesia\'s special industrial zone in Papua. Whether you are welcome is up to the people who live there.', cost: 150000, t: 4, req: ['retired'], gain: { consent: -5 }, rel: { idn: 15 }, inc: { cash: 30000 } },
    { id: 'employ', act: 5, cat: 'Community', name: 'Employ and promote Papuans', desc: 'Papuan staff at every level, including the unarmed logistics corps, alongside New Zealand officers. Kaitiakitanga written into the operating rules.', cost: 60000, t: 3, req: ['siz'], gain: { consent: 25, mana: 5 } },
    { id: 'plants', act: 5, cat: 'Industry', name: 'Timber, fish and asphalt plants', desc: 'Processing where the resource is, so the value and the jobs stay.', cost: 200000, t: 4, req: ['siz'], gain: { consent: 10 }, rel: { idn: 10 }, inc: { cash: 70000 } },
    { id: 'tni', act: 5, cat: 'Security', name: 'Fund the TNI garrison', desc: 'Pay for Indonesian military bases and provisions around the zone. Your own people stay unarmed and internal.', cost: 120000, t: 3, req: ['siz'], gain: { security: 20, consent: -10 }, rel: { idn: 15 } },
    { id: 'corridor', act: 5, cat: 'Industry', name: 'The corridor road', desc: 'A road from the zone to the port: not one island of order, but a corridor. Once it is surveyed you drive the first three unarmed convoys down it yourself. It cannot be built against the people it runs past.', cost: 250000, t: 5, tag: 'window', req: ['plants', 'tni'], need: { consent: 60 }, gain: { cohesion: 8 }, inc: { cash: 90000 } },
    { id: 'ev', act: 5, cat: 'Technology', name: 'EV technology coalition', desc: 'Indonesian nickel, Australian lithium, shared plants.', cost: 300000, t: 5, req: ['plants'], gain: { tech: 20, cohesion: 4 }, rel: { idn: 10, aus: 10 }, inc: { cash: 120000 } },
    { id: 'aa2d', act: 5, cat: 'Security', name: 'The denial zone', desc: 'A layered anti-access / area-denial arrangement with Australia, Singapore, Malaysia, PNG and Indonesia. Defensive by design: it keeps everyone\'s navies honest.', cost: 200000, t: 4, tag: 'window', req: ['opv'], need: { security: 60, boatWins: 4 }, gain: { security: 30, cohesion: 10 }, rel: { aus: 15, sgp: 10, mys: 15 } },
    { id: 'darwin', act: 5, cat: 'Security', name: 'Straits patrol from Darwin', desc: 'Australian and New Zealand OPVs based forward at Darwin help Indonesia secure its straits.', cost: 150000, t: 3, req: ['aa2d'], gain: { cohesion: 8 }, rel: { idn: 10, aus: 10 } },
    { id: 'uuv', act: 5, cat: 'Technology', name: 'Mass-produced UUVs', desc: 'Unmanned underwater vehicles off a production line shared by New Zealand, Australia and Indonesia.', cost: 350000, t: 5, req: ['seamount', 'aa2d'], need: { tech: 50 }, gain: { security: 50, tech: 10 } },
    { id: 'chain', map: true, act: 5, cat: 'Technology', name: 'The sensor chain', desc: 'Seabed sensors and unmanned platforms from the North Island up the island chains to PNG, securing the eastern approach.', cost: 300000, t: 5, tag: 'window', req: ['uuv'], gain: { tech: 10 }, rel: { png: 10 } },
    { id: 'sentinel', act: 5, cat: 'Security', name: 'Deep Sea Sentinel', desc: 'The chain goes quiet and patient: it listens for submarine encroachment over years, and everyone in the coalition hears the same thing.', cost: 250000, t: 4, req: ['chain'], gain: { cohesion: 15, security: 40 } },
    { id: 'fel', act: 5, cat: 'Technology', name: 'Free-electron laser', desc: 'The undulator becomes a light source bright enough for next-generation lithography.', cost: 500000, t: 6, req: ['undulator'], gain: { tech: 40 } },
    { id: 'fabs', act: 5, cat: 'Technology', name: 'Light for the fabs', desc: 'The free-electron laser plugs into Singaporean and Malaysian chip fabs. The region no longer rents its lithography.', cost: 400000, t: 5, req: ['fel'], gain: { cohesion: 10 }, rel: { sgp: 40, mys: 40 }, inc: { cash: 350000 } },
    { id: 'vnmphl', act: 5, cat: 'Diplomacy', name: 'Vietnam and the Philippines', desc: 'The northern edge joins the conversation.', cost: 200000, t: 4, tag: 'window', req: ['darwin'], need: { boatWins: 6 }, gain: { cohesion: 10 }, rel: { vnm: 60, phl: 60 } },
    { id: 'buffer', act: 5, cat: 'Diplomacy', name: 'Not which direction — together', desc: 'The smaller states resolve to stop arguing over which great power to face and to face each other instead.', cost: 150000, t: 3, tag: 'window', req: ['mowpac', 'darwin', 'pngind'], need: { cohesion: 50, mana: 260 }, gain: { cohesion: 15 }, rel: { aus: 5, idn: 5, png: 5, sgp: 5, mys: 5, pac: 5, vnm: 5, phl: 5 } },
    { id: 'compact', act: 5, cat: 'Diplomacy', name: 'Te Moana Compact', desc: 'A standing buffer coalition across the southern Indo-Pacific: secure, employed, and nobody\'s client.', cost: 500000, t: 4, req: ['sentinel', 'fabs', 'corridor', 'buffer', 'vnmphl'], need: { cohesion: 90, rel: 60, mana: 300, corridorLegs: 3, sealanes: 4 }, win: true },
    { id: 'buyout', act: 5, cat: 'Diplomacy', name: 'Offer a better deal', desc: 'A great power has a foothold: a wharf lease, a listening post, a "fisheries" base. Out-build it. Offer the host what the Ministry of Works offers everyone, and let the lease lapse.', costq: 0.6, t: 2, rep: 99, need: { footholds: 1 }, gain: { mana: 2 } },
    { id: 'tether', act: 5, cat: 'Aerospace', name: 'The sky tether', desc: 'A rotating tether catches payloads lofted from the stratospheric platform and the rail and swings them into orbit.', cost: 400000, t: 6, req: ['hap', 'polar'], need: { tech: 90 }, gain: { tech: 25 }, inc: { cash: 80000 } },
    { id: 'ring', act: 5, cat: 'Aerospace', name: 'Orbital ring: first segment', desc: 'A coalition project too large for any one member: a ring spun up above the equator, anchored by tethers over the archipelago. The lawnmower is in a museum in Palmerston North.', cost: 2500000, t: 10, req: ['tether', 'compact'], need: { industry: 170, tech: 150 }, gain: { cohesion: 20, tech: 50 } },
  ];

  const has = (S, id) => !!S.done[id];

  const events = [
    // Act I
    { id: 'mower', act: [1, 1], title: 'The mower seizes', text: 'Halfway through a section in Awapuni the engine locks solid.', choices: [
      { t: 'Strip it down yourselves this weekend', d: { cashq: -0.3, industry: 1 }, r: 'It runs again, and you know the engine better than the manual does.' },
      { t: 'Buy a new one', d: { cashq: -1 }, r: 'Back at work on Monday, lighter in the wallet.' } ] },
    { id: 'wetspring', act: [1, 1], title: 'A wet, warm spring', text: 'The grass in the Manawatū is growing faster than anyone can cut it.', choices: [
      { t: 'Work the long evenings', d: { cashq: 0.8, voters: 20 }, r: 'Every lawn in the suburb wants you fortnightly.' } ] },
    { id: 'cantpay', act: [1, 3], title: 'A customer can\'t pay', text: 'A pensioner in Roslyn owes for a fence. She is embarrassed and offers to pay it off slowly.', choices: [
      { t: 'Carry the debt, no interest', d: { cashq: -0.4, mana: 3, voters: 20 }, r: 'She tells her whole street.' },
      { t: 'Chase it', d: { cashq: 0.2, mana: -2 }, r: 'You get paid. People hear about that too.' } ] },
    { id: 'undercut', act: [1, 2], title: 'A competitor undercuts you', text: 'A franchise is flyering your streets at ten dollars a lawn less.', choices: [
      { t: 'Match the price', d: { cashq: -0.5, voters: 40 }, r: 'Margins thin, list grows.' },
      { t: 'Hold price, do better work', d: { mana: 1 }, r: 'You lose a few and keep the ones who notice edges.' } ] },
    { id: 'poached', act: [1, 3], cond: S => S.hands >= 3, title: 'Your best worker gets an offer', text: 'A bigger firm has offered more money.', choices: [
      { t: 'Beat the offer', d: { cashq: -0.3, mana: 1 }, r: 'They stay. Word gets round about what you pay.' },
      { t: 'Wish them well', d: { hands: -1 }, r: 'One fewer pair of hands.' } ] },
    { id: 'strip', act: [2, 3], cond: S => has(S, 'patrols'), title: 'Saturday night on the strip', text: 'Two groups of teenagers square up outside a bar. Your patrol is thirty metres away.', choices: [
      { t: 'Step in, talk them down, invite them to the gym', d: { mana: 3, hands: 1, voters: 30 }, r: 'Three of them turn up on Monday. One of them stays for years.' },
      { t: 'Call the police and keep your people back', d: { mana: -1 }, r: 'It is handled. Nothing changes.' } ] },
    { id: 'reserveblock', act: [2, 4], cond: S => has(S, 'reserves'), title: 'Reserve training block', text: 'Six of your staff are called up for a fortnight\'s exercise at Waiouru in your busiest month.', choices: [
      { t: 'Restructure the roster around it', d: { cashq: -0.3, security: 2, mana: 1 }, r: 'NZDF notes who makes this easy.' },
      { t: 'Ask them to defer', d: { security: -1, mana: -2 }, r: 'They defer. They also remember.' } ] },
    // Police, the business association, and the press
    { id: 'raid', act: [1, 5], cond: S => S.heat >= 35, title: 'A visit from the sergeant', text: 'A sergeant and two constables walk through the yard, taking their time. There have been complaints. Most of them, it turns out, from your competitors.', choices: [
      { t: 'Open every book and every shed', d: { cashq: -0.3, heat: -10 }, r: 'Two days lost. They find nothing they can use.' },
      { t: 'An envelope, and an understanding', d: { cashq: -0.6, heat: -30, corrupt: 1 }, r: 'He does not count it in front of you. You are now someone who does this.' },
      { t: 'Come back with a warrant', d: { heat: 15, mana: 1 }, r: 'They leave. They will be back, and they will remember the tone.' } ] },
    { id: 'bid', act: [2, 3], cond: S => S.bid === null && S.done.hire1, title: 'Coffee with the Palmy BID', text: 'The chair of the business association invites you for coffee. A senior constable happens to be at the next table. Your wages and prices, you are told, are "destabilising the market". There is a levy. Members do not get inspected much.', choices: [
      { t: 'Join and pay the levy', d: { cashq: -0.4, bid: 'member', heat: -10, mana: -3 }, r: 'You are one of them now. The inspections stop. Your crews notice whose table you sat at.' },
      { t: 'Decline', d: { heat: 15 }, r: 'The next week a parking warden, a WorkSafe inspector and a constable all find reasons to visit.' },
      { t: 'Take the conversation public', cond: S => S.mana >= 40, why: 'Needs 40 mana', d: { bid: 'exposed', mana: 8, influence: 2, heat: 10 }, r: 'It runs on the front page. The arrangement between the association and the station is now everybody\'s business.' } ] },
    { id: 'expose', act: [2, 5], cond: S => Object.keys(S.gang).some(g => S.gang[g].stance === 'alliance'), title: 'A reporter is asking questions', text: 'Someone has noticed the same faces at your yard and at the pad. She has dates, and she is polite about it.', choices: [
      { t: 'Cut the ties, today', d: { dropAlliances: 1, mana: -5 }, r: 'It costs money and some friendships. The story becomes a smaller story.' },
      { t: 'Deny everything', d: { mana: -10, heat: 15 }, r: 'The denial is quoted in full, next to the photographs.' } ] },
    // Act II
    { id: 'flood', act: [3, 4], title: 'The Manawatū is up', text: 'Stopbanks are holding but the low streets are under water.', choices: [
      { t: 'Every crew and truck out, no invoice', d: { cashq: -1, mana: 8, voters: 800 }, r: 'Sandbags, pumps, skips. Nobody forgets who turned up.' },
      { t: 'Deploy under an emergency contract', d: { cashq: 1, mana: -3 }, r: 'Good money. A few raised eyebrows.' } ] },
    { id: 'conflict', act: [3, 3], title: 'Conflict of interest', text: 'A rival councillor asks how a contractor can sit at the table that awards contracts. The answer is that no one person does both: whoever stood for council left the business to do it, and the enterprise has a constitution that says it is to be handed to the public in the end, as a council-controlled organisation and the seed of a ministry of works.', choices: [
      { t: 'Open the books, publish the constitution, recuse on tenders', d: { influence: -1, mana: 4 }, r: 'It costs you some votes at the table and wins you the room. People can read for themselves who owns what, and where it is meant to end up.' },
      { t: 'Stonewall', d: { influence: 1, mana: -5 }, r: 'The story runs for a fortnight.' } ] },
    { id: 'groundwater', act: [3, 4], cond: S => has(S, 'absorb2'), title: 'The aquifer hearing', text: 'Rangitāne and the regional council want to know what groundwater cooling does to the aquifer.', choices: [
      { t: 'Fund independent monitoring, co-governed with iwi', d: { cashq: -0.5, mana: 5 }, r: 'The data is public and the consent is durable.' },
      { t: 'Push the consent through', d: { mana: -6, influence: -2 }, r: 'You get it. You also get an appeal.' } ] },
    { id: 'village', act: [3, 5], cond: S => has(S, 'png_sec'), title: 'An incident in Morobe', text: 'One of your operators was disrespectful at a village checkpoint. The elders are angry.', choices: [
      { t: 'Stand the team down and go and sit with the elders', d: { cashq: -0.5, mana: 2, rel: { png: 5 } }, r: 'It takes three days of listening. The contract outlasts the insult.' },
      { t: 'Move the operator and say nothing', d: { rel: { png: -10 } }, r: 'It is not forgotten.' } ] },
    // Act III
    { id: 'election', act: [4, 5], scheduled: true, title: 'General election: coalition talks', text: 'Neither bloc has the numbers. Both leaders are in your office within the day. You do not want the top job; you want the programme.', choices: [
      { t: 'Supply the left bloc: public works and housing', d: { mandate: 2, mana: 4 }, r: 'Two commitments in writing.' },
      { t: 'Supply the right bloc: infrastructure and defence', d: { mandate: 2, cashq: 1, security: 3 }, r: 'Two commitments in writing.' },
      { t: 'Play them off against each other for more', d: { mandate: 3, influence: -6, mana: -3 }, r: 'Three commitments, and a reputation for being hard work.' } ] },
    { id: 'baubles', act: [4, 4], title: 'The baubles of office', text: 'The Prime Minister offers you a grand title and a quiet word about dropping the grid.', choices: [
      { t: 'Decline. Policy, not portfolios', d: { influence: 3, mana: 2 }, r: 'It leaks, to your advantage.' },
      { t: 'Accept', d: { cashq: 0.5, mana: -8 }, r: 'Your own members are not impressed.' } ] },
    { id: 'cyclone', act: [4, 5], title: 'Cyclone in the islands', text: 'A category five has gone through Vanuatu and Fiji.', choices: [
      { t: 'Send the Ministry of Works and every ship you have', d: { cashq: -1, mana: 5, rel: { pac: 10 } }, r: 'Your crews rebuild alongside local ones and leave the plant behind.' },
      { t: 'Send a cheque', d: { rel: { pac: -5 } }, r: 'It is received politely.' } ] },
    { id: 'treasury', act: [4, 4], title: 'Treasury pushes back', text: 'Officials brief that the works programme is unaffordable.', choices: [
      { t: 'Spend political capital to hold the line', d: { influence: -3 }, r: 'The programme survives the budget round.' },
      { t: 'Take it to the public', d: { mana: -3, voters: 5000 }, r: 'Noisy, but your supporters like a fight.' } ] },
    { id: 'drain', act: [4, 5], title: 'The Tasman drain', text: 'Australian yards are hiring your welders and engineers.', choices: [
      { t: 'A joint trans-Tasman training scheme', d: { hands: -5, rel: { aus: 5 } }, r: 'Some go. More come through behind them.' },
      { t: 'Wage top-up across the yards', d: { cashq: -0.8 }, r: 'They stay.' } ] },
    // Act IV
    { id: 'crisis1', act: [5, 5], scheduled: true, title: 'The eastern front escalates', text: 'Russia and Ukraine: a new offensive pulls carrier groups, satellites and attention toward Europe.', choices: [
      { t: 'Consolidate quietly while nobody is watching', d: { gpa: -40, cohesion: 3 }, r: 'A window opens.' },
      { t: 'Offer Wellington as a venue for talks', d: { gpa: -40, mana: 5, influence: 3 }, r: 'A window opens, and you are seen as useful.' } ] },
    { id: 'crisis2', act: [5, 5], scheduled: true, title: 'Crisis in the Gulf', text: 'Iran, shipping lanes, oil. The great powers\' fleets and diplomats head for the antipode of your ocean.', choices: [
      { t: 'Consolidate quietly', d: { gpa: -40, cohesion: 3 }, r: 'A window opens.' },
      { t: 'Use the oil shock to push the EV coalition', d: { gpa: -40, tech: 5 }, r: 'A window opens.' } ] },
    { id: 'crisis3', act: [5, 5], scheduled: true, title: 'The Levant again', text: 'Israel–Palestine draws in the region and then the patrons. Summits are cancelled; attention drains away from the Pacific.', choices: [
      { t: 'Consolidate quietly', d: { gpa: -40, cohesion: 3 }, r: 'A window opens.' },
      { t: 'Send humanitarian shipping', d: { gpa: -40, mana: 6, cashq: -0.3 }, r: 'A window opens.' } ] },
    { id: 'china', act: [5, 5], title: 'Beijing makes an offer', text: 'State banks will finance a port and fibre across three coalition members, with a quiet preference clause.', choices: [
      { t: 'Take it into a coalition-run fund, no preference clause', d: { cashq: 1, cohesion: 3, lean: -8 }, r: 'Their money subsidises the thing that keeps them out.' },
      { t: 'Take the full package', d: { cashq: 2.5, lean: -25 }, r: 'Generous. Washington notices.' },
      { t: 'Decline', d: { lean: 6 }, r: 'Politely refused.' } ] },
    { id: 'usa', act: [5, 5], title: 'Washington makes an offer', text: 'Security assistance and development finance, with basing rights attached.', choices: [
      { t: 'Take the finance into the coalition fund, no basing', d: { cashq: 1, cohesion: 3, lean: 8 }, r: 'Their money subsidises the thing that keeps them at arm\'s length.' },
      { t: 'Take the full package', d: { cashq: 2.5, security: 10, lean: 25 }, r: 'Generous. Beijing notices.' },
      { t: 'Decline', d: { lean: -6 }, r: 'Politely refused.' } ] },
    { id: 'demarche', act: [5, 5], cond: S => S.gpa >= 70, title: 'Choose a side', text: 'Both capitals deliver the same message in the same week: the time for sitting on the fence is over.', choices: [
      { t: 'Reply jointly, as a coalition: no', cond: S => S.cohesion >= 40, d: { cohesion: 3, leanTo0: 15 }, r: 'Nine governments, one sentence. Neither capital presses the point.' },
      { t: 'Lean to Washington', d: { lean: 30, cashq: 1 }, r: 'The pressure eases from one direction.' },
      { t: 'Lean to Beijing', d: { lean: -30, cashq: 1 }, r: 'The pressure eases from one direction.' },
      { t: 'Stall alone', d: { cohesion: -4, mana: -3 }, r: 'Stalling works, for now, at a price.' } ] },
    { id: 'gate', act: [5, 5], cond: S => has(S, 'siz'), title: 'Protest at the zone gate', text: 'Landowners say the zone\'s fence cut a path to their gardens and nobody asked.', choices: [
      { t: 'Sit down with the clan leaders; move the fence', d: { cashq: -0.4, consent: 8 }, r: 'The fence moves. Two of the protesters\' sons take jobs in the mill.' },
      { t: 'Let the garrison handle it', d: { consent: -15, rel: { idn: 3 } }, r: 'It is handled. The gate is quiet and so is everyone near it.' } ] },
    { id: 'jakarta', act: [5, 5], cond: S => has(S, 'siz'), title: 'Questions in Jakarta', text: 'Nationalist legislators ask why foreigners are operating in Papua at all.', choices: [
      { t: 'Transfer more ownership to Indonesian and Papuan partners', d: { cashq: -0.8, consent: 4, rel: { idn: 8 } }, r: 'Downstreaming, as promised. The questions stop.' },
      { t: 'Lobby quietly', d: { influence: -5 }, r: 'It dies in committee.' } ] },
    { id: 'contact', act: [5, 5], cond: S => has(S, 'chain'), title: 'Contact on the chain', text: 'The sensors track an unidentified submarine loitering near a seamount depot.', choices: [
      { t: 'Share the track with every coalition member at once', d: { cohesion: 4 }, r: 'Everyone hears the same thing. That is the point.' },
      { t: 'Pass it to Washington first', d: { lean: 15, cashq: 0.8 }, r: 'Appreciated in one capital. Noted in others.' } ] },
  ];

  const acts = {
    1: { name: 'The Street', sub: 'Palmerston North, on foot', view: 'Ground level', goal: 'Run the route each season before daylight runs out. A second crew takes the lawns off your hands for good; you move on to the skilled work and grow into a contractor.' },
    2: { name: 'Papaioea', sub: 'The city', view: 'City view', goal: 'Send crews out to connect the suburbs, build machines from scrap and put them where they fit, run the pilots, get 800 on the list, win a council seat.', intro: 'You have crews you no longer work alongside every day. You stop looking at one street and start looking at the city.' },
    3: { name: 'Region & Coast', sub: 'Manawatū to Wellington, and the Bight', view: 'Regional view', goal: 'Launch convoys to establish industry in the towns, build the council\'s industrial arm, reach the coast and the sea, win the electorate, found a party and cross the threshold.', intro: 'You are sworn in at the council chamber on the Square. The business is one arm; the council can be another. The map widens to the ranges, the capital and the sea.' },
    4: { name: 'Aotearoa', sub: 'Kingmaker', view: 'National view', goal: 'Draw the country together on the map: build the Palmerston North hub, run roads and rail out to the forests, farms, ironsand and fisheries, decide where each is processed, and electrify the main trunk. Trade supply for programme, term after term. Then set an honest-broker foreign policy.', intro: 'Election night. The party clears the threshold and neither bloc can govern alone. You do not want to be Prime Minister. You want the Ministry of Works. Each election brings new mandates to spend.' },
    6: { name: 'The World', sub: 'A network of cities', view: 'World view', goal: '' },
    5: { name: 'Te Moana', sub: 'The southern Indo-Pacific', view: 'Theatre view', goal: 'Keep the watch: place patrol ships and UUV pickets so no great power gets a foothold around you. Bring every partner to 60, drive the corridor, build the buffer coalition and sign Te Moana Compact, without becoming anyone\'s client.', intro: 'New Zealand is now your base. Beijing and Washington are both building coalitions in the region; their attention rises until a crisis at the antipode pulls it away. Use each window to consolidate. Keep your balance: lean too far either way and you are captured.' },
  };

  const policies = {
    wages: { label: 'Wages', opts: {
      min: { label: 'Minimum', cash: 1.15, voters: 0.9, mana: -0.6, tip: '+15% profit, −0.6 mana a season (× scale)' },
      fair: { label: 'Fair', cash: 1, voters: 1, mana: 0, tip: 'Market rate' },
      max: { label: 'Maximum', cash: 0.88, voters: 1.15, mana: 0.4, tip: '−12% profit, +0.4 mana a season (× scale), list grows 15% faster' } } },
    prices: { label: 'Prices', opts: {
      high: { label: 'High', cash: 1.15, voters: 0.7, mana: -0.3, tip: '+15% profit, list grows 30% slower, −0.3 mana' },
      market: { label: 'Market', cash: 1, voters: 1, mana: 0, tip: 'Going rate' },
      low: { label: 'Low', cash: 0.9, voters: 1.3, mana: 0.2, tip: '−10% profit, list grows 30% faster, +0.2 mana' } } },
    credit: { label: 'Credit terms', opts: {
      tight: { label: 'Tight', cash: 1.05, voters: 1, mana: -0.2, absorb: 1.4, tip: '+5% profit, absorbing firms costs 40% more' },
      normal: { label: 'Normal', cash: 1, voters: 1, mana: 0, absorb: 1, tip: 'Standard terms' },
      generous: { label: 'Generous', cash: 0.95, voters: 1, mana: 0.2, absorb: 0.7, tip: '−5% profit, +0.2 mana, absorbing firms costs 30% less' } } },
  };

  const partners = { aus: 'Australia', idn: 'Indonesia', png: 'Papua New Guinea', sgp: 'Singapore', mys: 'Malaysia', pac: 'Pacific Islands', vnm: 'Vietnam', phl: 'Philippines' };

  // Scale 2: city network. need = crew-seasons to connect; y = yield per season; aff = machine that doubles the yield
  const city = [
    { id: 'yard', name: 'Your yard', x: 505, y: 62, home: true, adj: ['milson', 'roslyn', 'kelvin'] },
    { id: 'milson', name: 'Milson', x: 385, y: 72, need: 3, yl: { voters: 10, cash: 3 }, aff: 'sawmill', adj: ['yard', 'takaro'] },
    { id: 'roslyn', name: 'Roslyn', x: 452, y: 138, need: 2, yl: { voters: 14 }, aff: 'brickpress', adj: ['yard', 'terrace', 'square'] },
    { id: 'kelvin', name: 'Kelvin Grove', x: 585, y: 98, need: 4, yl: { voters: 15, cash: 6 }, aff: 'excavator', adj: ['yard', 'terrace'] },
    { id: 'terrace', name: 'Terrace End', x: 498, y: 212, need: 3, yl: { voters: 10, cash: 4 }, aff: 'tractor', adj: ['roslyn', 'kelvin', 'hokowhitu'] },
    { id: 'square', name: 'The Square', x: 350, y: 222, need: 5, yl: { voters: 20, cash: 10, mana: 0.3 }, aff: 'brickpress', adj: ['roslyn', 'takaro', 'westend', 'hokowhitu'] },
    { id: 'takaro', name: 'Takaro', x: 262, y: 160, need: 3, yl: { voters: 12 }, aff: 'brickpress', adj: ['milson', 'square', 'highbury'] },
    { id: 'highbury', name: 'Highbury', x: 150, y: 190, need: 4, yl: { voters: 15, mana: 0.3 }, aff: 'brickpress', adj: ['takaro', 'westend'] },
    { id: 'westend', name: 'West End', x: 248, y: 275, need: 3, yl: { voters: 10, cash: 3 }, aff: 'tractor', adj: ['highbury', 'square', 'awapuni'] },
    { id: 'awapuni', name: 'Awapuni', x: 150, y: 305, need: 4, yl: { voters: 12, cash: 5 }, aff: 'tractor', adj: ['westend', 'massey'] },
    { id: 'hokowhitu', name: 'Hokowhitu', x: 440, y: 298, need: 4, yl: { voters: 12, cash: 8 }, aff: 'excavator', adj: ['terrace', 'square', 'massey'] },
    { id: 'massey', name: 'Massey', x: 352, y: 402, need: 5, yl: { voters: 18, cash: 8 }, aff: 'sawmill', adj: ['hokowhitu', 'awapuni'] },
  ];
  // Scale 3 roads: the state highways, near enough. Ground vehicles keep to these.
  const roads = [['pn', 'feilding'], ['pn', 'bulls'], ['bulls', 'marton'], ['bulls', 'whanganui'], ['feilding', 'marton'], ['bulls', 'foxton'], ['pn', 'ramp'], ['ramp', 'foxton'], ['foxton', 'levin'], ['pn', 'levin'], ['levin', 'otaki'], ['otaki', 'kapiti'], ['kapiti', 'wellington'], ['pn', 'woodville'], ['woodville', 'dannevirke'], ['woodville', 'pahiatua'], ['pahiatua', 'masterton'], ['masterton', 'wellington']];
  const machines = {
    tractor: { name: 'Tractor', scrap: 4, use: 'parks, berms, market gardens' },
    brickpress: { name: 'Brick press', scrap: 6, use: 'housing areas' },
    sawmill: { name: 'Sawmill', scrap: 6, use: 'timber and framing' },
    excavator: { name: 'Excavator', scrap: 10, use: 'stopbanks and subdivisions' },
  };
  // Scale 3: towns you launch convoys at. need = convoys that must land; y = yield per season once established
  const towns = [
    { id: 'pn', name: 'Palmerston North', x: 470, y: 185, home: true },
    { id: 'feilding', name: 'Feilding', x: 440, y: 105, need: 2, yl: { cash: 60, voters: 150 }, res: { name: 'stockyards and cropping', machine: 'tractor' } },
    { id: 'dannevirke', name: 'Dannevirke', x: 615, y: 110, need: 2, yl: { cash: 80, voters: 150 }, res: { name: 'forestry', machine: 'sawmill' } },
    { id: 'levin', name: 'Levin', x: 380, y: 275, need: 3, yl: { cash: 80, voters: 200 }, res: { name: 'market gardens', machine: 'tractor' } },
    { id: 'whanganui', name: 'Whanganui', x: 285, y: 80, need: 3, yl: { cash: 150, voters: 400 }, res: { name: 'river gravel and the port', machine: 'excavator' } },
    { id: 'masterton', name: 'Masterton', x: 545, y: 350, need: 3, yl: { cash: 150, voters: 300 }, res: { name: 'forestry', machine: 'sawmill' } },
    { id: 'kapiti', name: 'Kāpiti', x: 310, y: 345, need: 3, yl: { cash: 150, voters: 400 }, res: { name: 'clay and new housing', machine: 'brickpress' } },
    { id: 'wellington', name: 'Wellington', x: 255, y: 415, need: 4, yl: { cash: 400, voters: 1500 }, res: { name: 'port works', machine: 'excavator' } },
    // the infill ring: smaller targets that open once the first ring is established
    { id: 'bulls', name: 'Bulls', x: 385, y: 135, need: 2, r: 15, infill: true, yl: { cash: 40, voters: 80 }, res: { name: 'river gravel', machine: 'excavator' } },
    { id: 'marton', name: 'Marton', x: 365, y: 60, need: 2, r: 15, infill: true, yl: { cash: 40, voters: 80 }, res: { name: 'cropping', machine: 'tractor' } },
    { id: 'foxton', name: 'Foxton', x: 355, y: 215, need: 2, r: 15, infill: true, yl: { cash: 40, voters: 80 }, res: { name: 'flax and timber', machine: 'sawmill' } },
    { id: 'woodville', name: 'Woodville', x: 565, y: 175, need: 2, r: 15, infill: true, yl: { cash: 40, voters: 80 }, res: { name: 'the gorge road', machine: 'excavator' } },
    { id: 'pahiatua', name: 'Pahiatua', x: 585, y: 245, need: 2, r: 15, infill: true, yl: { cash: 40, voters: 80 }, res: { name: 'forestry', machine: 'sawmill' } },
    { id: 'otaki', name: 'Ōtaki', x: 345, y: 310, need: 2, r: 15, infill: true, yl: { cash: 50, voters: 100 }, res: { name: 'market gardens', machine: 'tractor' } },
  ];

  // Street politics. Turf assignments are game fiction, not a claim about the real organisations. Rename freely.
  const gangs = [
    { id: 'bp', name: 'Black Power', col: '#5a8be0', nodes: ['highbury', 'takaro', 'westend'], towns: [] },
    { id: 'mm', name: 'Mongrel Mob', col: '#e05a5a', nodes: ['roslyn', 'kelvin', 'terrace'], towns: ['whanganui'] },
    { id: 'nomads', name: 'Nomads', col: '#c9a23c', nodes: [], towns: ['levin', 'foxton'] },
    { id: 'feilding', name: 'the Feilding crew', col: '#9a7fd1', nodes: [], towns: ['feilding'] },
    { id: 'rangitikei', name: 'the Rangitīkei crew', col: '#6fbf8a', nodes: [], towns: ['marton', 'bulls'] },
  ];

  // Te Moana: the lanes great-power probes take toward a foothold (lon, lat). cn = Beijing, us = Washington.
  const sea = {
    lanes: [
      { power: 'cn', site: 'Dili', host: 'idn', pts: [[117, 22], [119, 12], [119.5, 4], [118.3, -2], [116, -8.8], [121, -10.6], [125.6, -9]] },
      { power: 'cn', site: 'Manus', host: 'png', pts: [[124, 22], [132, 12], [140, 3], [147, -2]] },
      { power: 'cn', site: 'Honiara', host: 'pac', pts: [[128, 23], [140, 10], [152, 0], [157.5, -6], [160, -9.4]] },
      { power: 'cn', site: 'Luganville', host: 'pac', pts: [[136, 23], [150, 8], [163, -3], [167, -15.5]] },
      { power: 'cn', site: 'Tarawa', host: 'pac', pts: [[142, 23], [158, 10], [173, 1.4]] },
      { power: 'cn', site: 'Natuna', host: 'mys', pts: [[112, 21], [111, 12], [108, 4]] },
      { power: 'us', site: 'Manus', host: 'png', pts: [[150, 23], [146, 13], [146.5, 5], [147, -2]] },
      { power: 'us', site: 'Honiara', host: 'pac', pts: [[172, 23], [166, 6], [160, -9.4]] },
      { power: 'us', site: 'Apia', host: 'pac', pts: [[210, 18], [198, 2], [188.2, -13.8]] },
      { power: 'us', site: "Nuku'alofa", host: 'pac', pts: [[211, 2], [197, -12], [184.8, -21]] },
      { power: 'us', site: 'Suva', host: 'pac', pts: [[206, 22], [190, -6], [178.4, -18]] },
      { power: 'us', site: 'Palawan', host: 'phl', pts: [[158, 23], [140, 17], [127, 12.2], [123, 10.5], [119, 9.6]] },
    ],
    start: { opv: [[130.8, -11.5], [143, -10.2], [116, -10], [156, -13], [170, -20]], uuv: [[118.5, -3], [129, -4.5], [150, -2], [160, -6.5], [168, -11], [176, -4], [186, -15], [139, 4]], air: [[166, -26]] },
    stations: [[176, -31], [181, -25]], // seamount listening posts
    chain: [[174, -35], [171.5, -31], [168, -27], [165, -21], [162, -14.5], [157, -10], [151.5, -7]],
    coast: { aus: [142.5, -10.5], idn: [116, -8.4], png: [147.2, -9.4], sgp: [103.8, 1.3], mys: [110, 3.5], pac: [178, -18], vnm: [109.5, 12], phl: [119.5, 10.5] },
  };

  // Aotearoa: places (lon, lat), the links you can build between them, and what each resource becomes.
  // kind: city | rural | iwi (Māori land, worked in partnership). res: the raw good found there.
  const nz = {
    nodes: [
      { id: 'pn', name: 'Palmerston North', kind: 'city', at: [175.61, -40.35], hub: true },
      { id: 'akl', name: 'Auckland', kind: 'city', at: [174.76, -36.85] }, { id: 'whg', name: 'Whangārei', kind: 'city', at: [174.32, -35.73] },
      { id: 'ham', name: 'Hamilton', kind: 'city', at: [175.28, -37.79] }, { id: 'tga', name: 'Tauranga', kind: 'city', at: [176.17, -37.69] },
      { id: 'npl', name: 'New Plymouth', kind: 'city', at: [174.08, -39.06] }, { id: 'nap', name: 'Napier', kind: 'city', at: [176.9, -39.5] },
      { id: 'wlg', name: 'Wellington', kind: 'city', at: [174.78, -41.29] }, { id: 'nsn', name: 'Nelson', kind: 'city', at: [173.28, -41.27] },
      { id: 'chc', name: 'Christchurch', kind: 'city', at: [172.64, -43.53] }, { id: 'dud', name: 'Dunedin', kind: 'city', at: [170.5, -45.87] }, { id: 'inv', name: 'Invercargill', kind: 'city', at: [168.35, -46.41] },
      { id: 'tmn', name: 'Taumarunui', kind: 'rural', at: [175.26, -38.88] },
      { id: 'glb', name: 'Glenbrook mill', kind: 'city', at: [174.6, -37.25], mill: 'sand' }, // the existing steel mill south of Auckland: connect it and it is yours to feed
      { id: 'nth', name: 'Te Tai Tokerau', kind: 'iwi', at: [173.75, -35.25], res: 'produce' },
      { id: 'tah', name: 'Taharoa', kind: 'iwi', at: [174.72, -38.17], res: 'sand' },
      { id: 'mat', name: 'Matamata', kind: 'rural', at: [175.77, -37.95], res: 'milk' },
      { id: 'kai', name: 'Kaingaroa', kind: 'iwi', at: [176.6, -38.45], res: 'logs' },
      { id: 'eas', name: 'Te Tairāwhiti', kind: 'iwi', at: [177.95, -38.55], res: 'logs' },
      { id: 'haw', name: 'Hāwera', kind: 'rural', at: [174.3, -39.6], res: 'milk' },
      { id: 'wrp', name: 'Wairarapa', kind: 'rural', at: [175.75, -41.0], res: 'meat' },
      { id: 'kkr', name: 'Kaikōura', kind: 'iwi', at: [173.6, -42.35], res: 'fish' },
      { id: 'gym', name: 'Te Tai Poutini', kind: 'rural', at: [171.2, -42.5], res: 'logs' },
      { id: 'can', name: 'Canterbury plains', kind: 'rural', at: [171.6, -44.0], res: 'milk' },
      { id: 'sth', name: 'Southland', kind: 'rural', at: [168.9, -45.9], res: 'meat' },
      { id: 'blf', name: 'Murihiku · Bluff', kind: 'iwi', at: [168.2, -46.75], res: 'fish' },
    ],
    links: [ // [a, b, type]: road, rail (the main trunk; can be electrified) or ferry
      ['pn', 'tmn', 'rail'], ['tmn', 'ham', 'rail'], ['ham', 'akl', 'rail'], ['pn', 'wlg', 'rail'],
      ['akl', 'glb', 'road'], ['glb', 'tah', 'road'], ['akl', 'whg', 'road'], ['whg', 'nth', 'road'], ['ham', 'tah', 'road'], ['ham', 'mat', 'road'], ['mat', 'tga', 'road'], ['tga', 'kai', 'road'], ['kai', 'nap', 'road'], ['nap', 'eas', 'road'], ['nap', 'pn', 'road'],
      ['pn', 'haw', 'road'], ['haw', 'npl', 'road'], ['pn', 'wrp', 'road'], ['wrp', 'wlg', 'road'], ['wlg', 'nsn', 'ferry'], ['nsn', 'kkr', 'road'], ['kkr', 'chc', 'road'], ['nsn', 'gym', 'road'], ['gym', 'chc', 'road'],
      ['chc', 'can', 'road'], ['can', 'dud', 'road'], ['dud', 'sth', 'road'], ['sth', 'inv', 'road'], ['inv', 'blf', 'road'],
    ],
    goods: {
      logs: { name: 'logs', plant: 'Sawmill', out: 'timber', col: '#3f9b6b' }, sand: { name: 'ironsand', plant: 'Steel mill', out: 'steel', col: '#8894a0' },
      milk: { name: 'milk', plant: 'Dairy factory', out: 'food', col: '#e8dcc0' }, meat: { name: 'stock', plant: 'Meat works', out: 'food', col: '#d98f4c' },
      fish: { name: 'fish', plant: 'Cannery', out: 'food', col: '#6fd0e8' }, produce: { name: 'produce', plant: 'Packhouse', out: 'food', col: '#b6d957' },
    },
    rivers: [[[175.9, -38.75], [175.55, -38.2], [175.3, -37.8], [175.1, -37.5], [174.72, -37.36]], [[175.4, -39.0], [175.2, -39.4], [175.05, -39.93]], [[176.1, -40.0], [175.8, -40.3], [175.6, -40.4], [175.25, -40.47]], [[169.2, -44.7], [169.4, -45.3], [169.75, -46.3]], [[170.1, -44.3], [170.6, -44.7], [171.15, -44.94]], [[171.6, -43.0], [172.2, -43.3], [172.7, -43.4]]],
  };

  const DATA = { projects, events, acts, policies, partners, city, machines, towns, roads, gangs, sea, nz };
  if (typeof module !== 'undefined') module.exports = DATA; else window.DATA = DATA;
})();
