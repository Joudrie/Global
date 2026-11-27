// Demonyms: the hand-curated candidates. scripts/demonyms/verify.mjs checks
// every one against Wikidata (P1549, English), the English Wikipedia (the
// place's infobox and the "List of adjectival and demonymic forms" pages) and
// Wiktionary, and writes the ones that pass to src/data/demonyms.ts. A place is
// dropped when fewer than two kinds of source give the answer, or when Wikidata
// or its infobox gives a second standard word beside it that a dictionary has
// in current use (Monégasque/Monacan, Floridian/Floridan). Every other form a
// source gives is accepted when typed (Angelino, Liverpolitan) or, for
// nicknames and other places' words, never right; none of them can be a fake.
//
// P(place, where, kind, tier, answer, fakes, options)
//   where   shown small under the place ("Italy", "Ontario, Canada")
//   kind    city | region | island | country
//   tier    easy: the place plus a plain ending (Parisian, Berliner)
//           medium: a changed stem or an unexpected ending (Mancunian, Dallasite)
//           hard: not guessable from the name (Haligonian, Porteño, Carioca)
//   fakes   three believable wrong answers; leave out (or give fewer) and
//           fakes.mjs makes the rest. A fake that is a real word for another
//           place is a trap and must say whose word it is.
// options
//   wiki      the English Wikipedia article, when it isn't the place's name
//   also      other names a dictionary definition may use for the place
//   variants  the same word spelled another way (gender, accents, spacing)
//   traps     { Fake: 'Wikipedia article of the place it belongs to' } or
//             { Fake: { means: 'a Real Madrid fan', word: 'Madridista' } }
//   origin    [note, ...words the source must contain]: kept only when
//             Wiktionary's etymology of the answer contains those words
//   aka       nicknames, shown as "Also called …" when Wiktionary defines
//             them as words for the place; never an answer
//   rivals    other words for the place's people to look up (Angelino): if a
//             dictionary gives one as a word for the place, the place is debated
//   ignore    { Form: reason }: a form the sources list that is not a second
//             demonym in common use (a nickname, an adjective, a historical
//             word). Every one is printed in the report.

const P = (place, where, kind, tier, answer, fakes = [], o = {}) => ({ place, where, kind, tier, answer, fakes, ...o })

export const PLACES = [
  // ── The owner's sample ───────────────────────────────────────────────────
  P('Venice', 'Italy', 'city', 'easy', 'Venetian', ['Venician', 'Venetan', 'Venecian'], { origin: ['From Latin Venetia, the lands of the Veneti.', 'Venetia', 'Veneti'] }),
  P('Florence', 'Italy', 'city', 'easy', 'Florentine', ['Florencian', 'Florentan', 'Florish'], { origin: ['From Florentia, the Latin name for Florence.', 'Florentia', 'Florence'] }),
  P('Vienna', 'Austria', 'city', 'easy', 'Viennese', ['Viennian', 'Viennite', 'Viennan']),
  P('Paris', 'France', 'city', 'easy', 'Parisian', ['Parisite', 'Parisese', 'Parisan']),
  P('Boston', 'Massachusetts, United States', 'city', 'easy', 'Bostonian', ['Bostonite', 'Bostoner', 'Bostonese', 'Bostonish', 'Bostanian', 'Bostonan']),
  P('Toronto', 'Ontario, Canada', 'city', 'easy', 'Torontonian', ['Torontan', 'Torontoite', 'Torontese']),
  P('Brittany', 'France', 'region', 'easy', 'Breton', ['Brittanian', 'Brittish', 'Brittanese'], { origin: ['From French Breton, a cousin of the word Briton.', 'fr|Breton', 'Briton'] }),
  P('Hamburg', 'Germany', 'city', 'easy', 'Hamburger', ['Hamburgian', 'Hamburgite', 'Hamburgese', 'Hamburgan', 'Hamburgonian']),
  P('Naples', 'Italy', 'city', 'medium', 'Neapolitan', ['Nepalese', 'Naplesian', 'Napolite'], {
    traps: { Nepalese: 'Nepal' }, origin: ['From Neapolis, Greek for “new city”.', 'Neapolis', 'new city'] }),
  P('Manchester', 'England, UK', 'city', 'medium', 'Mancunian', ['Manchurian', 'Manchesterian', 'Mancastrian'], {
    traps: { Manchurian: 'Manchuria' }, origin: ['From Mancunium, a Latin name of the Roman fort at Manchester.', 'Mancunium', 'Roman'] }),
  P('Oxford', 'England, UK', 'city', 'medium', 'Oxonian', ['Oxfordite', 'Oxenian', 'Oxfordese'], { origin: ['From Oxonia, the medieval Latin name for Oxford.', 'Oxonia', 'la-med'] }),
  P('Liverpool', 'England, UK', 'city', 'medium', 'Liverpudlian', ['Liverpoolian', 'Liverpolitan', 'Liverpoolite', 'Liverpoolese', 'Liverpooler'], {
    aka: ['Scouser'], ignore: { Scouser: 'nickname (Wiktionary: informal)' }, origin: ['A pun: the “pool” in Liverpool became a “puddle”.', 'puddle', 'pool'] }),
  P('Glasgow', 'Scotland, UK', 'city', 'medium', 'Glaswegian', ['Glasgowian', 'Glasgonian', 'Glaswenian'], {
    aka: ['Weegie'], ignore: { Weegie: 'a nickname: Wiktionary gives it as Glaswegian with the diminutive -ie' }, origin: ['Modelled on Galwegian (someone from Galway), itself modelled on Norwegian.', 'Galwegian', 'Galway', 'Norwegian'] }),
  P('Moscow', 'Russia', 'city', 'medium', 'Muscovite', ['Moscowite', 'Moscovian', 'Moskvan', 'Moscowian', 'Moscowese'], { origin: ['From Moscovia, the Latin name for Moscow and Muscovy.', 'Moscovia', 'Muscovy'] }),
  P('Sydney', 'New South Wales, Australia', 'city', 'medium', 'Sydneysider', ['Sydneyite', 'Sydnian', 'Sydneyan', 'Sydneyer', 'Sydnonian'], { origin: ['Built from Sydney, side and -er.', 'Sydney|side'] }),
  P('Phoenix', 'Arizona, United States', 'city', 'medium', 'Phoenician', ['Phoenixite', 'Phoenixian', 'Phoenixer', 'Phoenixese'], { wiki: 'Phoenix, Arizona' }),
  P('Flanders', 'Belgium', 'region', 'medium', 'Fleming', ['Flandrian', 'Flanderish', 'Flandish', 'Flanderite'], { origin: ['From Middle Dutch Vlaminc, through Middle English flameng.', 'dum|Vlaminc', 'enm|flameng'] }),
  P('Halifax', 'Nova Scotia, Canada', 'city', 'hard', 'Haligonian', ['Halifaxian', 'Halifonian', 'Haligander', 'Halifaxite'], {
    wiki: 'Halifax, Nova Scotia', origin: ['Probably from a folk etymology that read Halifax as Old English for “holy hair”.', 'folk etymology', 'holy hair'] }),
  P('Aberdeen', 'Scotland, UK', 'city', 'hard', 'Aberdonian', ['Aberdeenian', 'Aberdenite', 'Aberdinian'], { origin: ['From Aberdonia, the medieval Latin name for Aberdeen.', 'Aberdonia', 'la-med'] }),
  P('Isle of Man', 'British Isles', 'island', 'hard', 'Manx', ['Mannish', 'Manese', 'Manian'], { variants: ['Manxman', 'Manxwoman'], origin: ['From Old Norse Maniske, from Mǫn, the Isle of Man.', 'non|Maniske', 'Isle of Man'] }),
  P('Orkney', 'Scotland, UK', 'island', 'hard', 'Orcadian', ['Orkneyan', 'Orknian', 'Orcan', 'Orkneyite', 'Orcanian'], { origin: ['From Orcades, the Latin name for Orkney.', 'la:Orcades'] }),
  P('Madrid', 'Spain', 'city', 'hard', 'Madrileño', ['Madridista', 'Madrideño', 'Madridian', 'Madridese', 'Madridite'], {
    variants: ['Madrileña'], traps: { Madridista: { means: 'a Real Madrid fan', wiki: 'Madridista' } } }),
  P('Buenos Aires', 'Argentina', 'city', 'hard', 'Porteño', ['Bonairean', 'Airesino', 'Buenaireño'], {
    variants: ['Porteña'], traps: { Bonairean: 'Bonaire' }, origin: ['From Spanish puerto, “port”.', 'puerto'] }),
  P('Rio de Janeiro', 'Brazil', 'city', 'hard', 'Carioca', ['Riojano', 'Janeirense', 'Riense'], { also: ['Rio'], traps: { Riojano: 'La Rioja' } }),
  P('Indianapolis', 'Indiana, United States', 'city', 'hard', 'Indianapolitan', ['Indianapolisan', 'Indianapolite', 'Indianian'], { traps: { Indianian: 'Indiana' } }),
  P('Los Angeles', 'California, United States', 'city', 'hard', 'Angeleno', ['Angelite', 'Angelan', 'Los Angelian'], { variants: ['Angelena'], rivals: ['Angelino'] }),
  P('Burkina Faso', 'West Africa', 'country', 'hard', 'Burkinabé', ['Burkinan', 'Burkinese', 'Fasonian', 'Burkinite', 'Burkinian'], { also: ['Burkina'] }),
  P('Kiribati', 'Pacific Ocean', 'country', 'hard', 'I-Kiribati', ['Kiribatian', 'Kiribatese', 'Kiribatan', 'Kiribatite', 'Kiribatiese']),

  // ── Easy: the place plus a plain ending ──────────────────────────────────
  P('Rome', 'Italy', 'city', 'easy', 'Roman', ['Romese', 'Romeite', 'Romeian']),
  P('Berlin', 'Germany', 'city', 'easy', 'Berliner', ['Berlinese', 'Berlinian', 'Berlinite']),
  P('London', 'England, UK', 'city', 'easy', 'Londoner', ['Londonian', 'Londonite', 'Londonese', 'Londonish', 'Londoneer']),
  P('New York City', 'New York, United States', 'city', 'easy', 'New Yorker', ['New Yorkian', 'New Yorkite', 'New Yorkan', 'New Yorkish'], { also: ['New York'] }),
  P('Chicago', 'Illinois, United States', 'city', 'easy', 'Chicagoan', ['Chicagian', 'Chicagoite', 'Chicagese']),
  P('Milan', 'Italy', 'city', 'easy', 'Milanese', ['Milanian', 'Milanite', 'Milaner']),
  P('Texas', 'United States', 'region', 'easy', 'Texan', ['Texasite', 'Texasian', 'Texese'], { ignore: { Tejano: 'a Texan of Mexican descent (Wiktionary), not a word for everyone from Texas' } }),
  P('California', 'United States', 'region', 'easy', 'Californian', ['Californese', 'Californite', 'Californer', 'Californish', 'Californiaite']),
  P('Florida', 'United States', 'region', 'easy', 'Floridian', ['Floridese', 'Floridite', 'Floridaite']),
  P('Alaska', 'United States', 'region', 'easy', 'Alaskan', ['Alaskese', 'Alaskian', 'Alaskaite']),
  P('Oregon', 'United States', 'region', 'easy', 'Oregonian', ['Oregoner', 'Oregonite', 'Oregonese']),
  P('Wisconsin', 'United States', 'region', 'medium', 'Wisconsinite', ['Wisconsinese', 'Wisconsiner', 'Wisconsinan']),
  P('Bavaria', 'Germany', 'region', 'easy', 'Bavarian', ['Bavarese', 'Bavarite', 'Bavarer']),
  P('Tuscany', 'Italy', 'region', 'easy', 'Tuscan', ['Tuscanian', 'Tuscanese', 'Tuscanite']),
  P('Sicily', 'Italy', 'island', 'easy', 'Sicilian', ['Sicilese', 'Sicilite', 'Siciler']),
  P('Corsica', 'France', 'island', 'easy', 'Corsican', ['Corsicese', 'Corsicite', 'Corsicer']),
  P('Crete', 'Greece', 'island', 'easy', 'Cretan', ['Cretian', 'Cretite', 'Cretese']),
  P('Athens', 'Greece', 'city', 'easy', 'Athenian', ['Athensian', 'Athenite', 'Athenese']),
  P('Nova Scotia', 'Canada', 'region', 'easy', 'Nova Scotian', ['Nova Scotish', 'Nova Scotite', 'Nova Scotese']),
  P('Queensland', 'Australia', 'region', 'easy', 'Queenslander', ['Queenslandian', 'Queenslandite', 'Queenslandese']),
  P('Tasmania', 'Australia', 'island', 'easy', 'Tasmanian', ['Tasmanese', 'Tasmaner', 'Tasmanish']),
  P('Auckland', 'New Zealand', 'city', 'easy', 'Aucklander', ['Aucklandian', 'Aucklandite', 'Aucklandese'], { ignore: { Jafa: 'nickname, and an insult' } }),
  P('Dublin', 'Ireland', 'city', 'easy', 'Dubliner', ['Dublinian', 'Dublinite', 'Dublinese']),
  P('Amsterdam', 'Netherlands', 'city', 'easy', 'Amsterdammer', ['Amsterdamian', 'Amsterdamite', 'Amsterdamese']),
  P('Frankfurt', 'Germany', 'city', 'easy', 'Frankfurter', ['Frankfurtian', 'Frankfurtite', 'Frankfurtese']),
  P('Shanghai', 'China', 'city', 'medium', 'Shanghainese', ['Shanghaian', 'Shanghaier', 'Shanghaite']),
  P('Seoul', 'South Korea', 'city', 'medium', 'Seoulite', ['Seoulian', 'Seoulese', 'Seouler']),
  P('Tokyo', 'Japan', 'city', 'medium', 'Tokyoite', ['Tokyoan', 'Tokyese', 'Tokyoer'], { ignore: { Edokko: 'a Japanese word, not English' } }),
  P('Taiwan', 'East Asia', 'island', 'easy', 'Taiwanese', ['Taiwanian', 'Taiwanite', 'Taiwaner', 'Taiwanish'], { ignore: { Hoklo: 'an ethnic group (Wiktionary), not everyone from Taiwan', Holo: 'an ethnic group (Wiktionary), not everyone from Taiwan' } }),
  P('Tibet', 'China', 'region', 'easy', 'Tibetan', ['Tibetian', 'Tibetese', 'Tibetite']),
  P('Singapore', 'Southeast Asia', 'country', 'easy', 'Singaporean', ['Singaporian', 'Singaporite', 'Singaporese', 'Singaporish', 'Singaporan']),
  P('Bohemia', 'Czech Republic', 'region', 'easy', 'Bohemian', ['Bohemese', 'Bohemite', 'Bohemer']),
  P('Transylvania', 'Romania', 'region', 'easy', 'Transylvanian', ['Transylvanese', 'Transylvanite', 'Transylvanish']),
  P('Andalusia', 'Spain', 'region', 'easy', 'Andalusian', ['Andalusese', 'Andalusish', 'Andaluser']),
  P('Piedmont', 'Italy', 'region', 'easy', 'Piedmontese', ['Piedmontian', 'Piedmonter', 'Piedmontish']),
  P('Bologna', 'Italy', 'city', 'easy', 'Bolognese', ['Bolognian', 'Bolognite', 'Bologner']),
  P('Verona', 'Italy', 'city', 'easy', 'Veronese', ['Veronian', 'Veronite', 'Veroner']),
  P('Siena', 'Italy', 'city', 'easy', 'Sienese', ['Sienian', 'Sienite', 'Siener']),
  P('Greenland', 'North America', 'island', 'easy', 'Greenlander', ['Greenlandian', 'Greenlandish', 'Greenlandite']),
  P('Saint Petersburg', 'Russia', 'city', 'easy', 'Petersburger', ['Petersburgian', 'Petersburgite', 'Petersburgese'], { also: ['Petersburg'] }),
  P('Istanbul', 'Turkey', 'city', 'medium', 'Istanbulite', ['Istanbulian', 'Istanbuler', 'Istanbulese']),
  P('Baghdad', 'Iraq', 'city', 'easy', 'Baghdadi', ['Baghdadian', 'Baghdadite', 'Baghdadese']),
  P('Beirut', 'Lebanon', 'city', 'easy', 'Beiruti', ['Beirutian', 'Beirutite', 'Beirutese']),
  P('Liechtenstein', 'Europe', 'country', 'easy', 'Liechtensteiner', ['Liechtensteinian', 'Liechtensteinese', 'Liechtensteinite']),
  P('Malta', 'Europe', 'country', 'easy', 'Maltese', ['Maltan', 'Maltaite', 'Maltian']),
  P('Patagonia', 'Argentina and Chile', 'region', 'easy', 'Patagonian', ['Patagonese', 'Patagonite', 'Patagoner']),
  P('Montreal', 'Quebec, Canada', 'city', 'easy', 'Montrealer', ['Montrealian', 'Montrealite', 'Montrealese']),
  P('Vancouver', 'British Columbia, Canada', 'city', 'easy', 'Vancouverite', ['Vancouverian', 'Vancouverer', 'Vancouverese']),
  P('Seattle', 'Washington, United States', 'city', 'easy', 'Seattleite', ['Seattlian', 'Seattler', 'Seattlese']),
  P('Houston', 'Texas, United States', 'city', 'easy', 'Houstonian', ['Houstonite', 'Houstoner', 'Houstonese', 'Houstonish', 'Houstanian']),
  P('Philadelphia', 'Pennsylvania, United States', 'city', 'easy', 'Philadelphian', ['Philadelphite', 'Philadelphese', 'Philadelpher']),
  P('Pittsburgh', 'Pennsylvania, United States', 'city', 'easy', 'Pittsburgher', ['Pittsburghian', 'Pittsburghite', 'Pittsburgan']),
  P('New Orleans', 'Louisiana, United States', 'city', 'easy', 'New Orleanian', ['New Orleansian', 'New Orleanser', 'New Orleanese'], { ignore: { Yat: 'a New Orleanian who speaks the Yat dialect (Wiktionary), not everyone from the city' } }),
  P('San Francisco', 'California, United States', 'city', 'easy', 'San Franciscan', ['San Franciscoan', 'San Franciscite', 'San Franciscoite']),
  P('Bristol', 'England, UK', 'city', 'easy', 'Bristolian', ['Bristolite', 'Bristoler', 'Bristolese']),
  P('Brisbane', 'Queensland, Australia', 'city', 'medium', 'Brisbanite', ['Brisbanian', 'Brisbaner', 'Brisbanese']),
  P('Adelaide', 'South Australia, Australia', 'city', 'easy', 'Adelaidean', ['Adelaidite', 'Adelaider', 'Adelaidese']),

  // ── Medium: a changed stem or an unexpected ending ───────────────────────
  P('Dallas', 'Texas, United States', 'city', 'medium', 'Dallasite', ['Dallasian', 'Dallaser', 'Dallasonian']),
  P('Austin', 'Texas, United States', 'city', 'medium', 'Austinite', ['Austinian', 'Austiner', 'Austinese'], { wiki: 'Austin, Texas' }),
  P('Las Vegas', 'Nevada, United States', 'city', 'medium', 'Las Vegan', ['Las Vegasian', 'Las Vegasite', 'Las Vegasser']),
  P('Memphis', 'Tennessee, United States', 'city', 'medium', 'Memphian', ['Memphite', 'Memphisian', 'Memphese'], { wiki: 'Memphis, Tennessee', traps: { Memphite: 'Memphis, Egypt' } }),
  P('Buffalo', 'New York, United States', 'city', 'medium', 'Buffalonian', ['Buffaloan', 'Buffaloite', 'Buffaloer'], { wiki: 'Buffalo, New York' }),
  P('Salt Lake City', 'Utah, United States', 'city', 'medium', 'Salt Laker', ['Salt Lakian', 'Salt Lakeite', 'Salt Lakese']),
  P('Winnipeg', 'Manitoba, Canada', 'city', 'medium', 'Winnipegger', ['Winnipegian', 'Winnipegite', 'Winnipegese', 'Winnipeggan']),
  P('Regina', 'Saskatchewan, Canada', 'city', 'medium', 'Reginan', ['Reginian', 'Reginite', 'Reginese'], { wiki: 'Regina, Saskatchewan' }),
  P('Saskatoon', 'Saskatchewan, Canada', 'city', 'medium', 'Saskatonian', ['Saskatooner', 'Saskatoonite', 'Saskatoonese']),
  P('Hamilton', 'Ontario, Canada', 'city', 'medium', 'Hamiltonian', ['Hamiltoner', 'Hamiltonite', 'Hamiltonese'], { wiki: 'Hamilton, Ontario' }),
  P('Melbourne', 'Victoria, Australia', 'city', 'medium', 'Melburnian', ['Melbournite', 'Melbourner', 'Melbournese']),
  P('Lyon', 'France', 'city', 'medium', 'Lyonnais', ['Lyonese', 'Lyonite', 'Lyonian', 'Lyonish', 'Lyonard'], { variants: ['Lyonnaise'] }),
  P('Marseille', 'France', 'city', 'medium', 'Marseillais', ['Marseillian', 'Marseillite', 'Marseillese'], { variants: ['Marseillaise'] }),
  P('Normandy', 'France', 'region', 'medium', 'Norman', ['Normandian', 'Normandese', 'Normandite']),
  P('Alsace', 'France', 'region', 'medium', 'Alsatian', ['Alsacer', 'Alsacese', 'Alsacite'], { origin: ['From Alsatia, the medieval Latin name for Alsace.', 'ML.:Alsatia'] }),
  P('Gascony', 'France', 'region', 'medium', 'Gascon', ['Gasconian', 'Gasconese', 'Gasconite']),
  P('Picardy', 'France', 'region', 'medium', 'Picard', ['Picardian', 'Picardese', 'Picardish']),
  P('Lombardy', 'Italy', 'region', 'medium', 'Lombard', ['Lombardian', 'Lombardese', 'Lombardish']),
  P('Parma', 'Italy', 'city', 'medium', 'Parmesan', ['Parmian', 'Parmese', 'Parmite']),
  P('Saxony', 'Germany', 'region', 'medium', 'Saxon', ['Saxonese', 'Saxonite', 'Saxonish']),
  P('Wallonia', 'Belgium', 'region', 'medium', 'Walloon', ['Wallonese', 'Wallonish', 'Wallonite']),
  P('Cyprus', 'Mediterranean', 'country', 'medium', 'Cypriot', ['Cyprusian', 'Cyprese', 'Cyprite'], { variants: ['Cypriote'] }),
  P('Philippines', 'Southeast Asia', 'country', 'medium', 'Filipino', ['Philippinian', 'Philippinese', 'Philippiner'], { variants: ['Filipina'] }),
  P('Comoros', 'Indian Ocean', 'country', 'medium', 'Comorian', ['Comorese', 'Comorite', 'Comorish']),
  P('Ghana', 'West Africa', 'country', 'medium', 'Ghanaian', ['Ghanese', 'Ghanite', 'Ghanan', 'Ghanish', 'Ghanaese']),
  P('Togo', 'West Africa', 'country', 'medium', 'Togolese', ['Togonian', 'Togite', 'Togoish']),
  P('Benin', 'West Africa', 'country', 'medium', 'Beninese', ['Beninian', 'Beninite', 'Beniner']),
  P('Barbados', 'Caribbean', 'country', 'medium', 'Barbadian', ['Barbadosian', 'Barbadese', 'Barbadite'], { aka: ['Bajan'], ignore: { Bajan: 'nickname (Wiktionary: informal)' } }),
  P('Nevis', 'Saint Kitts and Nevis', 'island', 'medium', 'Nevisian', ['Nevian', 'Nevisite', 'Nevisese']),
  P('Cayman Islands', 'Caribbean', 'island', 'medium', 'Caymanian', ['Caymaner', 'Caymanese', 'Caymanite']),
  P('Montenegro', 'Europe', 'country', 'medium', 'Montenegrin', ['Montenegroan', 'Montenegrese', 'Montenegrite']),
  P('Rhodes', 'Greece', 'island', 'medium', 'Rhodian', ['Rhodesite', 'Rhodese', 'Rhodean']),
  P('Delhi', 'India', 'city', 'medium', 'Delhiite', ['Delhian', 'Delhiese', 'Delhier']),
  P('Karachi', 'Pakistan', 'city', 'medium', 'Karachiite', ['Karachian', 'Karachese', 'Karachier']),
  P('Macau', 'China', 'city', 'medium', 'Macanese', ['Macauan', 'Macauite', 'Macaunese']),
  P('Warsaw', 'Poland', 'city', 'medium', 'Varsovian', ['Warsawite', 'Warsovian', 'Warsawese'], { origin: ['From Varsovia, the Latin name for Warsaw.', 'Varsovia', 'Warsaw'] }),
  P('Dundee', 'Scotland, UK', 'city', 'medium', 'Dundonian', ['Dundeean', 'Dundeeite', 'Dundeeian']),
  P('Cork', 'Ireland', 'city', 'medium', 'Corkonian', ['Corkite', 'Corkian', 'Corkese'], { wiki: 'Cork (city)', origin: ['Cork plus -onian, the ending of Devonian and Oxonian.', 'Devonian', 'Oxonian'], ignore: { Leesider: 'nickname, after the River Lee' } }),
  P('Galway', 'Ireland', 'city', 'medium', 'Galwegian', ['Galwayan', 'Galwayite', 'Galwian']),
  P('Inverness', 'Scotland, UK', 'city', 'medium', 'Invernessian', ['Invernesser', 'Invernessite', 'Invernessese']),
  P('Minneapolis', 'Minnesota, United States', 'city', 'medium', 'Minneapolitan', ['Minneapolisan', 'Minneapolite', 'Minneapolian']),
  P('Kansas City', 'Missouri, United States', 'city', 'medium', 'Kansas Citian', ['Kansas Cityan', 'Kansas Cityite', 'Kansas Citese', 'Kansas Citonian'], { wiki: 'Kansas City, Missouri' }),
  P('Seychelles', 'Indian Ocean', 'country', 'medium', 'Seychellois', ['Seychellian', 'Seychellese', 'Seychellite'], { origin: ['Borrowed from French; the same word as Seselwa, the islands\' Creole name.', 'fr|seychellois', 'Seselwa'] }),
  P('Savoy', 'France', 'region', 'medium', 'Savoyard', ['Savoyan', 'Savoyese', 'Savoyite', 'Savoyer']),
  P('Falkland Islands', 'South Atlantic', 'island', 'medium', 'Falkland Islander', ['Falklandian', 'Falklandese', 'Falklandish']),

  // ── Hard: not guessable from the name ────────────────────────────────────
  P('Cambridge', 'England, UK', 'city', 'hard', 'Cantabrigian', ['Cambridgian', 'Cambridgite', 'Cambrian'], {
    traps: { Cambrian: 'Wales' }, origin: ['From Cantabrigia, the Latin name for Cambridge.', 'Cantabrigia', 'Cambridge'] }),
  P('Exeter', 'England, UK', 'city', 'hard', 'Exonian', ['Exeterian', 'Exetrian', 'Exeterite'], { origin: ['From Exonia, the medieval Latin name for Exeter.', 'Exonia', 'la-med'] }),
  P('Plymouth', 'England, UK', 'city', 'hard', 'Plymothian', ['Plymouthian', 'Plymouthite', 'Plymouther']),
  P('Leeds', 'England, UK', 'city', 'hard', 'Leodensian', ['Leedsian', 'Leedsite', 'Leedser'], { aka: ['Loiner'], ignore: { Loiner: 'nickname (Wiktionary: informal)' } }),
  P('Cairo', 'Egypt', 'city', 'hard', 'Cairene', ['Cairoan', 'Cairite', 'Cairese'], { origin: ['From Latin Cairenus: Cairo plus the ending -ene.', 'Cairenus', '-ene'] }),
  P('Damascus', 'Syria', 'city', 'hard', 'Damascene', ['Damascan', 'Damascian', 'Damascite'], { origin: ['From Latin Damascenus.', 'Damascenus'] }),
  P('Kraków', 'Poland', 'city', 'hard', 'Cracovian', ['Krakowite', 'Krakovian', 'Cracowite'], { also: ['Krakow', 'Cracow'], origin: ['From Cracovia, the Latin name for Kraków.', 'Cracovia', 'Krakow'] }),
  P('Mumbai', 'India', 'city', 'hard', 'Mumbaikar', ['Mumbaian', 'Mumbaiese', 'Mumbain'], { origin: ['Borrowed from Marathi.', 'mr|'] }),
  P('São Paulo', 'Brazil', 'city', 'hard', 'Paulistano', ['Paulista', 'São Paulan', 'Paulese'], { also: ['Sao Paulo'], variants: ['Paulistana'], traps: { Paulista: { wiki: 'São Paulo (state)', label: 'São Paulo state' } } }),
  P('Lima', 'Peru', 'city', 'hard', 'Limeño', ['Liman', 'Limese', 'Limite'], { variants: ['Limeña'] }),
  P('Quito', 'Ecuador', 'city', 'hard', 'Quiteño', ['Quitoan', 'Quitese', 'Quitian'], { variants: ['Quiteña'] }),
  P('Caracas', 'Venezuela', 'city', 'hard', 'Caraqueño', ['Caracasian', 'Caracan', 'Caracasite', 'Caracasan'], { variants: ['Caraqueña'] }),
  P('Montevideo', 'Uruguay', 'city', 'medium', 'Montevidean', ['Montevideoan', 'Montevidese', 'Montevidite']),
  P('Tierra del Fuego', 'Argentina and Chile', 'island', 'hard', 'Fuegian', ['Tierra del Fuegan', 'Fuegoan', 'Fuegese']),
  P('Tobago', 'Trinidad and Tobago', 'island', 'hard', 'Tobagonian', ['Tobagan', 'Tobagoan', 'Tobagese']),
  P('Niger', 'West Africa', 'country', 'hard', 'Nigerien', ['Nigerian', 'Nigerese', 'Nigerite'], { traps: { Nigerian: 'Nigeria' }, origin: ['Borrowed from French nigérien.', 'fr|Nigerien'] }),
  P('Madagascar', 'Indian Ocean', 'country', 'hard', 'Malagasy', ['Madagascarian', 'Madagascese', 'Madagascite'], { origin: ['The islanders\' own word, borrowed from the Malagasy language.', 'mg|malagasy'] }),
  P('Guinea-Bissau', 'West Africa', 'country', 'hard', 'Bissau-Guinean', ['Guinean', 'Guinea-Bissauan', 'Bissauese'], { traps: { Guinean: 'Guinea' } }),
  P('Vanuatu', 'Pacific Ocean', 'country', 'hard', 'Ni-Vanuatu', ['Vanuatese', 'Vanuatian', 'Vanuatite']),
  P('San Marino', 'Europe', 'country', 'hard', 'Sammarinese', ['San Marinian', 'Marinite', 'San Marinoan']),
  P('Nice', 'France', 'city', 'hard', 'Niçois', ['Nicene', 'Nicean', 'Nicese'], { variants: ['Niçoise'], traps: { Nicene: 'Nicaea' } }),
  P('Bordeaux', 'France', 'city', 'hard', 'Bordelais', ['Bordeauxian', 'Bordelian', 'Bordonese'], { variants: ['Bordelaise'] }),
  P('Monaco', 'Europe', 'country', 'hard', 'Monégasque', ['Monacoan', 'Monacese', 'Monacite'], { rivals: ['Monacan'] }),
  // ── More cities and regions (added to balance the tiers) ─────────────────
  P('Northern Territory', 'Australia', 'region', 'medium', 'Territorian', ['Northern Territorian', 'Territorite', 'Territoran'], { ignore: { 'Top Ender': 'someone from the Top End only, the north of the territory (Wiktionary)' } }),
  P('New South Wales', 'Australia', 'region', 'medium', 'New South Welshman', ['New South Walesian', 'New South Waler', 'New South Walian'], { variants: ['New South Welshwoman'] }),
  P('Salzburg', 'Austria', 'city', 'easy', 'Salzburger', ['Salzburgian', 'Salzburgite', 'Salzburgese']),
  P('Genoa', 'Italy', 'city', 'medium', 'Genoese', ['Genoan', 'Genoite', 'Genoian', 'Genovan']),
  P('Trieste', 'Italy', 'city', 'medium', 'Triestine', ['Triestan', 'Triestian', 'Triestite']),
  P('Turin', 'Italy', 'city', 'medium', 'Turinese', ['Turinian', 'Turinite', 'Turiner']),
  P('Sardinia', 'Italy', 'island', 'easy', 'Sardinian', ['Sardinese', 'Sardinite', 'Sardinish']),
  P('Gozo', 'Malta', 'island', 'hard', 'Gozitan', ['Gozoan', 'Gozian', 'Gozese']),
  P('Corfu', 'Greece', 'island', 'hard', 'Corfiot', ['Corfuan', 'Corfian', 'Corfuite']),
  P('Nazareth', 'Israel', 'city', 'hard', 'Nazarene', ['Nazarethian', 'Nazarethite', 'Nazarean']),
  P('Catalonia', 'Spain', 'region', 'medium', 'Catalan', ['Catalonese', 'Catalonite', 'Catalish']),
  P('Navarre', 'Spain', 'region', 'medium', 'Navarrese', ['Navarrian', 'Navarrite', 'Navarrer']),
  P('Canary Islands', 'Spain', 'island', 'medium', 'Canarian', ['Canarese', 'Canaryite', 'Canaryan']),
  P('Cornwall', 'England, UK', 'region', 'medium', 'Cornish', ['Cornwallian', 'Cornwaller', 'Cornwallite'], { variants: ['Cornishman', 'Cornishwoman'] }),
  P('Chester', 'England, UK', 'city', 'hard', 'Cestrian', ['Chesterian', 'Chesterite', 'Chestrian']),
  P('Durham', 'England, UK', 'city', 'hard', 'Dunelmian', ['Durhamite', 'Durhamian', 'Durhamer'], { wiki: 'Durham, England' }),
  P('Quebec', 'Canada', 'region', 'medium', 'Quebecer', ['Quebecian', 'Quebecite', 'Quebecese'], { variants: ['Quebecker'] }),
  P('Yukon', 'Canada', 'region', 'medium', 'Yukoner', ['Yukonian', 'Yukonite', 'Yukonese']),
  P('Maine', 'United States', 'region', 'medium', 'Mainer', ['Mainian', 'Maineite', 'Mainese'], { ignore: { Vacationlander: 'nickname, from the state nickname Vacationland (Wiktionary)' } }),
  P('Honolulu', 'Hawaii, United States', 'city', 'medium', 'Honolulan', ['Honoluluan', 'Honoluluite', 'Honolulese']),
  P('Spokane', 'Washington, United States', 'city', 'medium', 'Spokanite', ['Spokanian', 'Spokaner', 'Spokanese'], { wiki: 'Spokane, Washington' }),
  P('Kyiv', 'Ukraine', 'city', 'easy', 'Kyivan', ['Kyivite', 'Kyivese', 'Kyivian']),
  P('Bali', 'Indonesia', 'island', 'easy', 'Balinese', ['Balian', 'Balite', 'Balier']),
  P('Manila', 'Philippines', 'city', 'hard', 'Manileño', ['Manilan', 'Manilese', 'Manilite'], { variants: ['Manileña'] }),
  P('Punjab', 'India and Pakistan', 'region', 'easy', 'Punjabi', ['Punjabian', 'Punjabite', 'Punjabese']),
  P('Tehran', 'Iran', 'city', 'easy', 'Tehrani', ['Tehranian', 'Tehranite', 'Tehranese']),
  P('Tripoli', 'Libya', 'city', 'hard', 'Tripolitan', ['Tripolian', 'Tripolite', 'Tripolese'], { wiki: 'Tripoli, Libya' }),
  P('Algiers', 'Algeria', 'city', 'hard', 'Algérois', ['Algiersian', 'Algierite', 'Algierese'], { variants: ['Algéroise'] }),
  P('Cape Town', 'South Africa', 'city', 'medium', 'Capetonian', ['Cape Townian', 'Cape Towner', 'Capetowner', 'Cape Townite', 'Cape Townese', 'Capetonite']),
  P('Durban', 'South Africa', 'city', 'medium', 'Durbanite', ['Durbanian', 'Durbaner', 'Durbanese']),
  P('Lagos', 'Nigeria', 'city', 'easy', 'Lagosian', ['Lagosite', 'Lagoser', 'Lagosese']),
  P('Nairobi', 'Kenya', 'city', 'easy', 'Nairobian', ['Nairobite', 'Nairobese', 'Nairobier']),
  P('Dakar', 'Senegal', 'city', 'hard', 'Dakarois', ['Dakarian', 'Dakarite', 'Dakarese'], { variants: ['Dakaroise'] }),
  P('Abidjan', 'Ivory Coast', 'city', 'hard', 'Abidjanais', ['Abidjanian', 'Abidjanite', 'Abidjanese', 'Abidjanan', 'Abidjaner'], { variants: ['Abidjanaise'] }),
  P('Lesotho', 'Southern Africa', 'country', 'hard', 'Mosotho', ['Lesothan', 'Lesothian', 'Lesothese'], { variants: ['Basotho'] }),
  P('Botswana', 'Southern Africa', 'country', 'hard', 'Motswana', ['Botswanian', 'Botswanese', 'Botswanite'], { variants: ['Batswana'] }),
  P('Reims', 'France', 'city', 'hard', 'Rémois', ['Reimsian', 'Reimsite', 'Reimsese'], { variants: ['Rémoise'] }),
  P('Strasbourg', 'France', 'city', 'medium', 'Strasbourgeois', ['Strasbourgian', 'Strasbourger', 'Strasbourgite'], { variants: ['Strasbourgeoise'] }),
  P('Grenoble', 'France', 'city', 'medium', 'Grenoblois', ['Grenoblian', 'Grenoblite', 'Grenoblese'], { variants: ['Grenobloise'] }),
  P('Porto', 'Portugal', 'city', 'hard', 'Portuense', ['Portoan', 'Portonian', 'Portoese'], { ignore: { Tripeiro: 'nickname (Portuguese Wiktionary: informal)' } }),
  P('Monterrey', 'Mexico', 'city', 'hard', 'Regiomontano', ['Monterreyan', 'Monterreño', 'Monterreyite'], { variants: ['Regiomontana'] }),
  P('Havana', 'Cuba', 'city', 'hard', 'Habanero', ['Havanan', 'Havanese', 'Havanite'], { variants: ['Habanera'] }),
  P('Santiago', 'Chile', 'city', 'hard', 'Santiaguino', ['Santiagoan', 'Santiaguese', 'Santiagan'], { variants: ['Santiaguina'] }),
  P('Arequipa', 'Peru', 'city', 'hard', 'Arequipeño', ['Arequipan', 'Arequipese', 'Arequipite'], { variants: ['Arequipeña'] }),
  P('La Paz', 'Bolivia', 'city', 'hard', 'Paceño', ['La Pazian', 'Pazeño', 'Pazite'], { variants: ['Paceña'] }),
  P('Cali', 'Colombia', 'city', 'hard', 'Caleño', ['Calian', 'Calino', 'Calite'], { variants: ['Caleña'] }),
  P('Asunción', 'Paraguay', 'city', 'hard', 'Asunceno', ['Asuncionian', 'Asuncionese', 'Asuncionite'], { also: ['Asuncion'], variants: ['Asuncena'] }),
  P('Salvador', 'Bahia, Brazil', 'city', 'hard', 'Soteropolitano', ['Salvadorite', 'Salvadorese', 'Salvadorino'], { wiki: 'Salvador, Bahia', variants: ['Soteropolitana'], ignore: { Salvadoran: 'someone from El Salvador (Wiktionary)', Salvadorian: 'someone from El Salvador' } }),
  P('Brasília', 'Brazil', 'city', 'hard', 'Brasiliense', ['Brasilian', 'Brasilite', 'Brasiliano'], { also: ['Brasilia'] }),
  P('Minas Gerais', 'Brazil', 'region', 'hard', 'Mineiro', ['Minasian', 'Geraisian', 'Minasense'], { variants: ['Mineira'] }),
  P('San Juan', 'Puerto Rico', 'city', 'hard', 'Sanjuanero', ['San Juanian', 'San Juanite', 'San Juanese'], { wiki: 'San Juan, Puerto Rico', variants: ['Sanjuanera'] }),
]
