export interface LanguageRecord {
  code: string
  name: string
  nativeName: string
  sample: string
  romanized: string
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  confusableWith: string[]
  isLatinScript: boolean
  note?: string
}

export type Script =
  | 'latin' | 'cyrillic' | 'greek' | 'han' | 'hangul' | 'arabic' | 'hebrew'
  | 'devanagari' | 'bengali' | 'tamil' | 'sinhala' | 'thai' | 'khmer' | 'burmese'
  | 'ethiopic' | 'georgian' | 'armenian' | 'gothic' | 'coptic' | 'cuneiform'
  | 'hieroglyph' | 'other'

// Detect a writing system from the first strong character of a sample.
// Used to keep quiz distractors in the same script so the alphabet isn't a giveaway.
export function detectScript(text: string): Script {
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    if (cp >= 0x12000 && cp <= 0x1247F) return 'cuneiform'
    if (cp >= 0x13000 && cp <= 0x1342F) return 'hieroglyph'
    if (cp >= 0x10330 && cp <= 0x1034F) return 'gothic'
    if (cp >= 0x2C80 && cp <= 0x2CFF) return 'coptic'
    if (cp >= 0x0400 && cp <= 0x04FF) return 'cyrillic'
    if (cp >= 0x0370 && cp <= 0x03FF) return 'greek'
    if ((cp >= 0x3040 && cp <= 0x30FF) || (cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF)) return 'han'
    if (cp >= 0xAC00 && cp <= 0xD7A3) return 'hangul'
    if (cp >= 0x0900 && cp <= 0x097F) return 'devanagari'
    if (cp >= 0x0980 && cp <= 0x09FF) return 'bengali'
    if (cp >= 0x0B80 && cp <= 0x0BFF) return 'tamil'
    if (cp >= 0x0D80 && cp <= 0x0DFF) return 'sinhala'
    if (cp >= 0x1000 && cp <= 0x109F) return 'burmese'
    if (cp >= 0x1200 && cp <= 0x137F) return 'ethiopic'
    if (cp >= 0x0E00 && cp <= 0x0E7F) return 'thai'
    if (cp >= 0x1780 && cp <= 0x17FF) return 'khmer'
    if (cp >= 0x0600 && cp <= 0x06FF) return 'arabic'
    if (cp >= 0x0590 && cp <= 0x05FF) return 'hebrew'
    if (cp >= 0x10A0 && cp <= 0x10FF) return 'georgian'
    if (cp >= 0x0530 && cp <= 0x058F) return 'armenian'
    if (cp >= 0x0041 && cp <= 0x024F) return 'latin'
  }
  return 'other'
}

const SCRIPT_LABELS: Record<Script, string> = {
  latin: 'Latin', cyrillic: 'Cyrillic', greek: 'Greek', han: 'Chinese (Han)',
  hangul: 'Korean Hangul', arabic: 'Arabic', hebrew: 'Hebrew', devanagari: 'Devanagari',
  bengali: 'Bengali', tamil: 'Tamil', sinhala: 'Sinhala', thai: 'Thai', khmer: 'Khmer',
  burmese: 'Burmese', ethiopic: 'Ethiopic', georgian: 'Georgian', armenian: 'Armenian',
  gothic: 'Gothic', coptic: 'Coptic', cuneiform: 'cuneiform', hieroglyph: 'Egyptian hieroglyph',
  other: '',
}

export function scriptLabel(s: Script): string { return SCRIPT_LABELS[s] }

// Webfont to apply for historic scripts that aren't in default system fonts.
export function scriptFont(s: Script): string | undefined {
  switch (s) {
    case 'cuneiform': return "'Noto Sans Cuneiform', sans-serif"
    case 'hieroglyph': return "'Noto Sans Egyptian Hieroglyphs', sans-serif"
    case 'gothic': return "'Noto Sans Gothic', sans-serif"
    case 'coptic': return "'Noto Sans Coptic', serif"
    default: return undefined
  }
}

export const LANGUAGES: LanguageRecord[] = [
  // ── EASY ────────────────────────────────────────────────────────────────────
  { code:'en', name:'English', nativeName:'English', difficulty:'easy', isLatinScript:true, confusableWith:['de','nl','sv'],
    sample:'The sun rises in the east and sets in the west every single day.',
    romanized:'The sun rises in the east and sets in the west every single day.' },
  { code:'es', name:'Spanish', nativeName:'Español', difficulty:'easy', isLatinScript:true, confusableWith:['pt','it','fr'],
    sample:'El sol sale por el este y se pone por el oeste cada día.',
    romanized:'El sol sale por el este y se pone por el oeste cada día.' },
  { code:'fr', name:'French', nativeName:'Français', difficulty:'easy', isLatinScript:true, confusableWith:['es','it','pt'],
    sample:'Le soleil se lève à l\'est et se couche à l\'ouest chaque jour.',
    romanized:'Le soleil se lève à l\'est et se couche à l\'ouest chaque jour.' },
  { code:'de', name:'German', nativeName:'Deutsch', difficulty:'easy', isLatinScript:true, confusableWith:['nl','sv','en'],
    sample:'Die Sonne geht im Osten auf und im Westen unter, jeden Tag.',
    romanized:'Die Sonne geht im Osten auf und im Westen unter, jeden Tag.' },
  { code:'pt', name:'Portuguese', nativeName:'Português', difficulty:'easy', isLatinScript:true, confusableWith:['es','it','fr'],
    sample:'O sol nasce no leste e se põe no oeste todos os dias.',
    romanized:'O sol nasce no leste e se põe no oeste todos os dias.' },
  { code:'it', name:'Italian', nativeName:'Italiano', difficulty:'easy', isLatinScript:true, confusableWith:['es','fr','pt'],
    sample:'Il sole sorge ad est e tramonta ad ovest ogni giorno.',
    romanized:'Il sole sorge ad est e tramonta ad ovest ogni giorno.' },
  { code:'ru', name:'Russian', nativeName:'Русский', difficulty:'easy', isLatinScript:false, confusableWith:['uk','bg','sr'],
    sample:'Солнце восходит на востоке и заходит на западе каждый день.',
    romanized:'Solntse voskhodit na vostoke i zakhodit na zapade kazhdyy den\'.' },
  { code:'zh', name:'Mandarin', nativeName:'普通话', difficulty:'easy', isLatinScript:false, confusableWith:['ja','ko'],
    sample:'太阳每天从东方升起，从西方落下。',
    romanized:'Tàiyáng měi tiān cóng dōngfāng qǐlái, cóng xīfāng luò xià.' },
  { code:'ja', name:'Japanese', nativeName:'日本語', difficulty:'easy', isLatinScript:false, confusableWith:['zh','ko'],
    sample:'太陽は毎日東から昇り、西に沈みます。',
    romanized:'Taiyō wa mainichi higashi kara nobori, nishi ni shizumimasu.' },
  { code:'ar', name:'Arabic', nativeName:'العربية', difficulty:'easy', isLatinScript:false, confusableWith:['fa','ur'],
    sample:'تشرق الشمس من الشرق وتغرب في الغرب كل يوم.',
    romanized:'Tashruqu al-shamsu min al-sharqi wa taghrubu fi al-gharbi kulla yawm.' },
  { code:'ko', name:'Korean', nativeName:'한국어', difficulty:'easy', isLatinScript:false, confusableWith:['ja','zh'],
    sample:'태양은 매일 동쪽에서 떠서 서쪽으로 집니다.',
    romanized:'Taeyang-eun maeil dongjogeeseo tteoseo seojogeuro jimnida.' },
  { code:'hi', name:'Hindi', nativeName:'हिन्दी', difficulty:'easy', isLatinScript:false, confusableWith:['mr','ne','bn'],
    sample:'सूरज हर रोज़ पूर्व में उगता है और पश्चिम में डूबता है।',
    romanized:'Sūraj har roz pūrv meṃ ugtā hai aur paścim meṃ ḍūbtā hai.' },

  // ── MEDIUM ─────────────────────────────────────────────────────────────────
  { code:'tr', name:'Turkish', nativeName:'Türkçe', difficulty:'medium', isLatinScript:true, confusableWith:['az','uz'],
    sample:'Güneş her gün doğudan doğar ve batıdan batar.',
    romanized:'Güneş her gün doğudan doğar ve batıdan batar.' },
  { code:'nl', name:'Dutch', nativeName:'Nederlands', difficulty:'medium', isLatinScript:true, confusableWith:['de','af','en'],
    sample:'De zon komt elke dag in het oosten op en gaat in het westen onder.',
    romanized:'De zon komt elke dag in het oosten op en gaat in het westen onder.' },
  { code:'sv', name:'Swedish', nativeName:'Svenska', difficulty:'medium', isLatinScript:true, confusableWith:['no','da','fi'],
    sample:'Solen går upp i öster och ner i väster varje dag.',
    romanized:'Solen går upp i öster och ner i väster varje dag.' },
  { code:'no', name:'Norwegian', nativeName:'Norsk', difficulty:'medium', isLatinScript:true, confusableWith:['sv','da'],
    sample:'Solen stiger i øst og setter i vest hver eneste dag.',
    romanized:'Solen stiger i øst og setter i vest hver eneste dag.' },
  { code:'da', name:'Danish', nativeName:'Dansk', difficulty:'medium', isLatinScript:true, confusableWith:['sv','no'],
    sample:'Solen går op i øst og ned i vest hver dag.',
    romanized:'Solen går op i øst og ned i vest hver dag.' },
  { code:'pl', name:'Polish', nativeName:'Polski', difficulty:'medium', isLatinScript:true, confusableWith:['cs','sk'],
    sample:'Słońce wschodzi na wschodzie i zachodzi na zachodzie każdego dnia.',
    romanized:'Słońce wschodzi na wschodzie i zachodzi na zachodzie każdego dnia.' },
  { code:'cs', name:'Czech', nativeName:'Čeština', difficulty:'medium', isLatinScript:true, confusableWith:['sk','pl'],
    sample:'Slunce vychází na východě a zapadá na západě každý den.',
    romanized:'Slunce vychází na východě a zapadá na západě každý den.' },
  { code:'ro', name:'Romanian', nativeName:'Română', difficulty:'medium', isLatinScript:true, confusableWith:['it','es','pt'],
    sample:'Soarele răsare la est și apune la vest în fiecare zi.',
    romanized:'Soarele răsare la est și apune la vest în fiecare zi.' },
  { code:'hu', name:'Hungarian', nativeName:'Magyar', difficulty:'medium', isLatinScript:true, confusableWith:['fi','et'],
    sample:'A nap minden nap keleten kel fel és nyugaton nyugszik le.',
    romanized:'A nap minden nap keleten kel fel és nyugaton nyugszik le.' },
  { code:'fi', name:'Finnish', nativeName:'Suomi', difficulty:'medium', isLatinScript:true, confusableWith:['et','hu'],
    sample:'Aurinko nousee idässä ja laskee lännessä joka päivä.',
    romanized:'Aurinko nousee idässä ja laskee lännessä joka päivä.' },
  { code:'el', name:'Greek', nativeName:'Ελληνικά', difficulty:'medium', isLatinScript:false, confusableWith:['ru','bg'],
    sample:'Ο ήλιος ανατέλλει ανατολικά και δύει δυτικά κάθε μέρα.',
    romanized:'O ílios anatelléi anatoliká kai dýei dytiká káthe méra.' },
  { code:'uk', name:'Ukrainian', nativeName:'Українська', difficulty:'medium', isLatinScript:false, confusableWith:['ru','bg','sr'],
    sample:'Сонце сходить на сході і заходить на заході кожного дня.',
    romanized:'Sontse skhodyt\' na skhodi i zakhodyt\' na zakhodi kozhnogo dnya.' },
  { code:'th', name:'Thai', nativeName:'ภาษาไทย', difficulty:'medium', isLatinScript:false, confusableWith:['km','my'],
    sample:'ดวงอาทิตย์ขึ้นทางทิศตะวันออกและตกทางทิศตะวันตกทุกวัน',
    romanized:'Duang āthit khuen thāng thit tawan ʻǭk læa tok thāng thit tawan tok thuk wan.' },
  { code:'id', name:'Indonesian', nativeName:'Bahasa Indonesia', difficulty:'medium', isLatinScript:true, confusableWith:['ms'],
    sample:'Matahari terbit di timur dan terbenam di barat setiap hari.',
    romanized:'Matahari terbit di timur dan terbenam di barat setiap hari.' },
  { code:'ms', name:'Malay', nativeName:'Bahasa Melayu', difficulty:'medium', isLatinScript:true, confusableWith:['id'],
    sample:'Saya pergi ke kedai dengan kereta setiap petang.',
    romanized:'Saya pergi ke kedai dengan kereta setiap petang.' },
  { code:'vi', name:'Vietnamese', nativeName:'Tiếng Việt', difficulty:'medium', isLatinScript:true, confusableWith:['id','ms'],
    sample:'Mặt trời mọc ở phía đông và lặn ở phía tây mỗi ngày.',
    romanized:'Mặt trời mọc ở phía đông và lặn ở phía tây mỗi ngày.' },
  { code:'fa', name:'Persian (Farsi)', nativeName:'فارسی', difficulty:'medium', isLatinScript:false, confusableWith:['ar','ur'],
    sample:'خورشید هر روز از شرق طلوع می‌کند و در غرب غروب می‌کند.',
    romanized:'Khorshid har ruz az sharq tolu\' mi-konad va dar gharb ghorub mi-konad.' },
  { code:'he', name:'Hebrew', nativeName:'עברית', difficulty:'medium', isLatinScript:false, confusableWith:['ar','fa'],
    sample:'השמש זורחת במזרח ושוקעת במערב כל יום.',
    romanized:'Hashemesh zorakhat bamizrakh veshoka\'at bama\'arav kol yom.' },
  { code:'bn', name:'Bengali', nativeName:'বাংলা', difficulty:'medium', isLatinScript:false, confusableWith:['hi','mr'],
    sample:'সূর্য প্রতিদিন পূর্বে ওঠে এবং পশ্চিমে অস্ত যায়।',
    romanized:'Sūrya pratidin pūrbe oṭhe ebaṃ paścime asta yāẏa.' },

  // ── HARD ────────────────────────────────────────────────────────────────────
  { code:'eu', name:'Basque', nativeName:'Euskara', difficulty:'hard', isLatinScript:true, confusableWith:['es','gl'],
    sample:'Eguzkia ekialdean sortzen da eta mendebaldean sartzen da egunero.',
    romanized:'Eguzkia ekialdean sortzen da eta mendebaldean sartzen da egunero.' },
  { code:'gl', name:'Galician', nativeName:'Galego', difficulty:'hard', isLatinScript:true, confusableWith:['es','pt'],
    sample:'O sol sae polo leste e ponse polo oeste cada día.',
    romanized:'O sol sae polo leste e ponse polo oeste cada día.' },
  { code:'ca', name:'Catalan', nativeName:'Català', difficulty:'hard', isLatinScript:true, confusableWith:['es','fr','it'],
    sample:'El sol surt a l\'est i es pon a l\'oest cada dia.',
    romanized:'El sol surt a l\'est i es pon a l\'oest cada dia.' },
  { code:'af', name:'Afrikaans', nativeName:'Afrikaans', difficulty:'hard', isLatinScript:true, confusableWith:['nl','de'],
    sample:'Die son kom elke dag in die ooste op en gaan in die weste onder.',
    romanized:'Die son kom elke dag in die ooste op en gaan in die weste onder.' },
  { code:'sw', name:'Swahili', nativeName:'Kiswahili', difficulty:'hard', isLatinScript:true, confusableWith:['id','ms'],
    sample:'Jua huchomoza mashariki na kuchwa magharibi kila siku.',
    romanized:'Jua huchomoza mashariki na kuchwa magharibi kila siku.' },
  { code:'ka', name:'Georgian', nativeName:'ქართული', difficulty:'hard', isLatinScript:false, confusableWith:['am','hy'],
    sample:'მზე ყოველ დღე აღმოსავლეთიდან ამოდის და დასავლეთში ჩადის.',
    romanized:'Mze q\'ovel dghe aghmosavletidan amodis da dasavletshi chadis.' },
  { code:'hy', name:'Armenian', nativeName:'Հայերեն', difficulty:'hard', isLatinScript:false, confusableWith:['ka'],
    sample:'Արևը ամեն օր արևելքից ծագում է և արևմուտքում մայր մտնում։',
    romanized:'Arevë amen or arevilkits tsagum e yev arevmutkyum mayr mtnoom.' },
  { code:'mn', name:'Mongolian', nativeName:'Монгол', difficulty:'hard', isLatinScript:false, confusableWith:['ru','uk'],
    sample:'Нар өдөр бүр зүүн зүгт мандан, баруун зүгт жаргадаг.',
    romanized:'Nar ödör bür züün zügt mandan, baruun zügt jargadag.' },
  { code:'km', name:'Khmer', nativeName:'ភាសាខ្មែរ', difficulty:'hard', isLatinScript:false, confusableWith:['th','my'],
    sample:'ព្រះអាទិត្យរះពីខាងកើត ហើយលិចពីខាងលិចរៀងរាល់ថ្ងៃ។',
    romanized:'Preah atit reah pi khang kaet haey lich pi khang lich reang real thngai.' },
  { code:'my', name:'Burmese', nativeName:'မြန်မာဘာသာ', difficulty:'hard', isLatinScript:false, confusableWith:['km','th'],
    sample:'နေသည် တိုင်းတစ်ပါးမှ အရှေ့မှ တက်ပြီး အနောက်မှ နစ်မြုပ်သည်။',
    romanized:'Ne thit taing ta ba mha a-shay hma tet pyi a-nauk hma nit myut thit.' },
  { code:'si', name:'Sinhala', nativeName:'සිංහල', difficulty:'hard', isLatinScript:false, confusableWith:['ta'],
    sample:'හිරු සෑම දිනකම නැගෙනහිරින් උදාවී බටහිරින් බසියි.',
    romanized:'Hiru sǣma dinakama nægenehirin udāvī baṭahirin basiyai.' },
  { code:'ta', name:'Tamil', nativeName:'தமிழ்', difficulty:'hard', isLatinScript:false, confusableWith:['si'],
    sample:'சூரியன் ஒவ்வொரு நாளும் கிழக்கில் உதித்து மேற்கில் மறைகிறது.',
    romanized:'Cūriyaṉ ovvoru nāḷum kiḻakkil utittu mēṟkil maṟaikiṟatu.' },
  { code:'is', name:'Icelandic', nativeName:'Íslenska', difficulty:'hard', isLatinScript:true, confusableWith:['no','da','sv'],
    sample:'Sólin rís í austri og sest í vestri á hverjum degi.',
    romanized:'Sólin rís í austri og sest í vestri á hverjum degi.' },
  { code:'cy', name:'Welsh', nativeName:'Cymraeg', difficulty:'hard', isLatinScript:true, confusableWith:['en','ga'],
    sample:'Mae\'r haul yn codi yn y dwyrain ac yn machlud yn y gorllewin bob dydd.',
    romanized:'Mae\'r haul yn codi yn y dwyrain ac yn machlud yn y gorllewin bob dydd.' },
  { code:'ga', name:'Irish', nativeName:'Gaeilge', difficulty:'hard', isLatinScript:true, confusableWith:['cy','en'],
    sample:'Éiríonn an ghrian san oirthear agus luíonn sí san iarthar gach lá.',
    romanized:'Éiríonn an ghrian san oirthear agus luíonn sí san iarthar gach lá.' },
  { code:'lt', name:'Lithuanian', nativeName:'Lietuvių', difficulty:'hard', isLatinScript:true, confusableWith:['lv','et','pl'],
    sample:'Saulė kiekvieną dieną teka rytuose ir leidžiasi vakaruose.',
    romanized:'Saulė kiekvieną dieną teka rytuose ir leidžiasi vakaruose.' },
  { code:'lv', name:'Latvian', nativeName:'Latviešu', difficulty:'hard', isLatinScript:true, confusableWith:['lt','et'],
    sample:'Saule katru dienu lec austrumos un riet rietumos.',
    romanized:'Saule katru dienu lec austrumos un riet rietumos.' },
  { code:'sq', name:'Albanian', nativeName:'Shqip', difficulty:'hard', isLatinScript:true, confusableWith:['ro','it'],
    sample:'Dielli lind çdo ditë nga lindja dhe perëndon nga perëndimi.',
    romanized:'Dielli lind çdo ditë nga lindja dhe perëndon nga perëndimi.' },
  { code:'yo', name:'Yoruba', nativeName:'Yorùbá', difficulty:'hard', isLatinScript:true, confusableWith:['sw','ha'],
    sample:'Oòrùn máa ń jọ lárọ̀ọ̀wọ́tọ́ ó sì máa ń wọ̀ ní ìhà ìwọ̀ oòrùn.',
    romanized:'Oòrùn máa ń jọ lárọ̀ọ̀wọ́tọ́ ó sì máa ń wọ̀ ní ìhà ìwọ̀ oòrùn.' },
  { code:'am', name:'Amharic', nativeName:'አማርኛ', difficulty:'hard', isLatinScript:false, confusableWith:['sw','ar'],
    sample:'ፀሐይ ከምሥራቅ ትወጣለች ከምዕራብም ትጠልቃለች ሁልጊዜ።',
    romanized:'Ts\'ehay kem\'s\'rak t\'iwet\'alech kem\'irab t\'it\'elq\'alech hulgiize.' },
  { code:'uz', name:'Uzbek', nativeName:'Oʻzbek', difficulty:'hard', isLatinScript:true, confusableWith:['kk','tr','az'],
    sample:'Quyosh har kuni sharqdan chiqadi va g\'arbda botadi.',
    romanized:'Quyosh har kuni sharqdan chiqadi va g\'arbda botadi.' },

  // ── MORE MEDIUM ──────────────────────────────────────────────────────────────
  { code:'sk', name:'Slovak', nativeName:'Slovenčina', difficulty:'medium', isLatinScript:true, confusableWith:['cs','pl'],
    sample:'Slnko každý deň vychádza na východe a zapadá na západe.',
    romanized:'Slnko každý deň vychádza na východe a zapadá na západe.' },
  { code:'sr', name:'Serbian', nativeName:'Српски', difficulty:'medium', isLatinScript:false, confusableWith:['ru','bg','mk','uk'],
    sample:'Сунце сваког дана излази на истоку, а залази на западу.',
    romanized:'Sunce svakog dana izlazi na istoku, a zalazi na zapadu.' },
  { code:'bg', name:'Bulgarian', nativeName:'Български', difficulty:'medium', isLatinScript:false, confusableWith:['ru','mk','sr'],
    sample:'Слънцето изгрява на изток и залязва на запад всеки ден.',
    romanized:'Slǎnceto izgryava na iztok i zalyazva na zapad vseki den.' },
  { code:'ur', name:'Urdu', nativeName:'اردو', difficulty:'medium', isLatinScript:false, confusableWith:['ar','fa'],
    sample:'سورج ہر روز مشرق سے طلوع ہوتا ہے اور مغرب میں غروب ہوتا ہے۔',
    romanized:'Sūraj har roz mashriq se tulū hotā hai aur maghrib men ghurūb hotā hai.' },
  { code:'tl', name:'Tagalog', nativeName:'Tagalog', difficulty:'medium', isLatinScript:true, confusableWith:['id','ms'],
    sample:'Ang araw ay sumisikat sa silangan at lumulubog sa kanluran araw-araw.',
    romanized:'Ang araw ay sumisikat sa silangan at lumulubog sa kanluran araw-araw.' },

  // ── MORE HARD ────────────────────────────────────────────────────────────────
  { code:'et', name:'Estonian', nativeName:'Eesti', difficulty:'hard', isLatinScript:true, confusableWith:['fi','lv','lt'],
    sample:'Päike tõuseb idas ja loojub läänes iga päev.',
    romanized:'Päike tõuseb idas ja loojub läänes iga päev.' },
  { code:'ne', name:'Nepali', nativeName:'नेपाली', difficulty:'hard', isLatinScript:false, confusableWith:['hi','mr','bn'],
    sample:'सूर्य हरेक दिन पूर्वमा उदाउँछ र पश्चिममा अस्ताउँछ।',
    romanized:'Sūrya harek din pūrvamā udāũcha ra paścimmā astāũcha.' },
  { code:'zu', name:'Zulu', nativeName:'isiZulu', difficulty:'hard', isLatinScript:true, confusableWith:['sw','yo'],
    sample:'Ilanga liphuma empumalanga lishone entshonalanga zonke izinsuku.',
    romanized:'Ilanga liphuma empumalanga lishone entshonalanga zonke izinsuku.' },
  { code:'kk', name:'Kazakh', nativeName:'Қазақ', difficulty:'hard', isLatinScript:false, confusableWith:['ru','mn','uz'],
    sample:'Күн күн сайын шығыстан шығып, батыстан батады.',
    romanized:'Kün kün sayın şığıstan şığıp, batıstan batadı.' },
  { code:'mi', name:'Māori', nativeName:'Te Reo Māori', difficulty:'medium', isLatinScript:true, confusableWith:['haw','sm','id'],
    sample:'Ka whiti mai te rā i te rāwhiti, ka tō ki te uru i ia rā.',
    romanized:'Ka whiti mai te rā i te rāwhiti, ka tō ki te uru i ia rā.' },
  { code:'haw', name:'Hawaiian', nativeName:'ʻŌlelo Hawaiʻi', difficulty:'medium', isLatinScript:true, confusableWith:['mi','sm'],
    sample:'Puka mai ka lā ma ka hikina a napoʻo ma ke komohana i kēlā lā kēia lā.',
    romanized:'Puka mai ka lā ma ka hikina a napoʻo ma ke komohana i kēlā lā kēia lā.' },
  { code:'sm', name:'Samoan', nativeName:'Gagana Sāmoa', difficulty:'hard', isLatinScript:true, confusableWith:['mi','haw','tl'],
    sample:'E oso aʻe le lā i sasaʻe ma goto ifo i sisifo i aso uma.',
    romanized:'E oso aʻe le lā i sasaʻe ma goto ifo i sisifo i aso uma.' },
  { code:'ht', name:'Haitian Creole', nativeName:'Kreyòl ayisyen', difficulty:'medium', isLatinScript:true, confusableWith:['fr','pt','es'],
    sample:'Solèy la leve nan lès epi li kouche nan lwès chak jou.',
    romanized:'Solèy la leve nan lès epi li kouche nan lwès chak jou.' },
  { code:'lb', name:'Luxembourgish', nativeName:'Lëtzebuergesch', difficulty:'hard', isLatinScript:true, confusableWith:['de','nl'],
    sample:"D'Sonn geet all Dag am Osten op an am Westen ënner.",
    romanized:"D'Sonn geet all Dag am Osten op an am Westen ënner." },
  { code:'ha', name:'Hausa', nativeName:'Harshen Hausa', difficulty:'hard', isLatinScript:true, confusableWith:['sw','yo','zu'],
    sample:'Rana takan fito daga gabas ta kuma faɗi a yamma kowace rana.',
    romanized:'Rana takan fito daga gabas ta kuma faɗi a yamma kowace rana.' },

  // ── EXTREME (ancient & historical languages — just for fun) ──────────────────
  { code:'la', name:'Latin', nativeName:'Latina', difficulty:'extreme', isLatinScript:true, confusableWith:['it','es','ro'],
    sample:'Sol ab oriente oritur et ad occidentem occidit cotidie.',
    romanized:'Sol ab oriente oritur et ad occidentem occidit cotidie.' },
  { code:'grc', name:'Ancient Greek', nativeName:'Ἑλληνική', difficulty:'extreme', isLatinScript:false, confusableWith:['el','cop'],
    sample:'Ὁ ἥλιος ἀνατέλλει ἐκ τῆς ἀνατολῆς καὶ δύεται πρὸς δυσμάς.',
    romanized:'Ho hēlios anatellei ek tēs anatolēs kai dyetai pros dysmas.' },
  { code:'sa', name:'Sanskrit', nativeName:'संस्कृतम्', difficulty:'extreme', isLatinScript:false, confusableWith:['hi','ne','mr'],
    sample:'सूर्यः प्रतिदिनं पूर्वस्यां उदेति पश्चिमायां च अस्तं गच्छति।',
    romanized:'Sūryaḥ pratidinaṃ pūrvasyāṃ udeti paścimāyāṃ ca astaṃ gacchati.' },
  { code:'non', name:'Old Norse', nativeName:'Norrœnt', difficulty:'extreme', isLatinScript:true, confusableWith:['is','no','da'],
    sample:'Sól rís í austri ok sezk í vestri hvern dag.',
    romanized:'Sól rís í austri ok sezk í vestri hvern dag.' },
  { code:'ang', name:'Old English', nativeName:'Englisc', difficulty:'extreme', isLatinScript:true, confusableWith:['en','de','non'],
    sample:'Sēo sunne ārīst on ēastan and gǣþ to setle on westan ǣlce dæg.',
    romanized:'Seo sunne arist on eastan and gaeth to setle on westan aelce daeg.' },
  { code:'cop', name:'Coptic', nativeName:'ϯⲙⲉⲧⲣⲉⲙⲛ̀ⲭⲏⲙⲓ', difficulty:'extreme', isLatinScript:false, confusableWith:['grc','el'],
    sample:'ⲡⲣⲏ ϣⲁϥϣⲁ ϩⲓ ⲡⲥⲁ ⲛ̀ϣⲁ ⲟⲩⲟϩ ϣⲁϥϩⲱⲧⲡ ϩⲓ ⲡⲥⲁ ⲛ̀ϩⲱⲧⲡ.',
    romanized:'Pre shafsha hi psa ensha ouoh shafhotp hi psa enhotp.' },
  { code:'chu', name:'Old Church Slavonic', nativeName:'Словѣ́ньскъ', difficulty:'extreme', isLatinScript:false, confusableWith:['ru','bg','sr'],
    sample:'Слъньце въсходитъ отъ въстока и заходитъ на западъ.',
    romanized:'Slŭnĭce vŭsxoditŭ otŭ vŭstoka i zaxoditŭ na zapadŭ.' },
  { code:'nci', name:'Classical Nahuatl', nativeName:'Nāhuatl', difficulty:'extreme', isLatinScript:true, confusableWith:['es','la'],
    sample:'In tōnatiuh mōmoztlae huālquīza in tlauhcopa īhuān oncalaqui in cihuātlāmpa.',
    romanized:'In tonatiuh momoztlae hualquiza in tlauhcopa ihuan oncalaqui in cihuatlampa.' },
  { code:'got', name:'Gothic', nativeName:'𐌲𐌿𐍄𐌹𐍃𐌺', difficulty:'extreme', isLatinScript:false, confusableWith:['non','grc'],
    sample:'𐌰𐍄𐍄𐌰 𐌿𐌽𐍃𐌰𐍂 𐌸𐌿 𐌹𐌽 𐌷𐌹𐌼𐌹𐌽𐌰𐌼.',
    romanized:'Atta unsar thu in himinam. (Our Father who art in heaven)' },
  { code:'lzh', name:'Classical Chinese', nativeName:'文言', difficulty:'extreme', isLatinScript:false, confusableWith:['zh','ja','yue'],
    sample:'日出於東而沒於西，日日如是。',
    romanized:'Rì chū yú dōng ér mò yú xī, rìrì rúshì.' },

  // ── Extra regional neighbours (harder to tell apart) ─────────────────────────
  { code:'yue', name:'Cantonese', nativeName:'廣東話', difficulty:'medium', isLatinScript:false, confusableWith:['zh','ja','lzh'],
    sample:'太陽每日喺東邊升起，喺西邊落山。',
    romanized:'Taai-yèuhng múih yaht hái dūng-bīn sīng-héi, hái sāi-bīn lohk-sāan.' },
  { code:'fy', name:'West Frisian', nativeName:'Frysk', difficulty:'hard', isLatinScript:true, confusableWith:['nl','de','en'],
    sample:'De sinne komt alle dagen yn it easten op en giet yn it westen ûnder.',
    romanized:'De sinne komt alle dagen yn it easten op en giet yn it westen ûnder.' },

  // ── Cuneiform & hieroglyphic scripts (rendered via Noto historic webfonts) ───
  { code:'sux', name:'Sumerian', nativeName:'𒅴𒂠', difficulty:'extreme', isLatinScript:false, confusableWith:['akk','egy'],
    sample:'𒈗 𒆠𒂗𒄀',
    romanized:'lugal ki-en-gi — “king of Sumer”' },
  { code:'akk', name:'Akkadian', nativeName:'𒀝𒅗𒁺𒌑', difficulty:'extreme', isLatinScript:false, confusableWith:['sux','egy'],
    sample:'𒈗 𒆳𒆳',
    romanized:'šar mātāti — “king of all lands”' },
  { code:'egy', name:'Ancient Egyptian', nativeName:'𓂋𓏤𓈖𓆎𓅓𓏏𓊖', difficulty:'extreme', isLatinScript:false, confusableWith:['sux','akk','cop'],
    sample:'𓂋𓂝𓇳',
    romanized:'Rꜥ — “Ra”, the sun god' },

  // ── Added languages — each paired with its closest relatives as distractors ──
  { code:'hr', name:'Croatian', nativeName:'Hrvatski', difficulty:'medium', isLatinScript:true, confusableWith:['sr','sk','cs'],
    sample:'Sunce izlazi na istoku i zalazi na zapadu svaki dan.',
    romanized:'Sunce izlazi na istoku i zalazi na zapadu svaki dan.' },
  { code:'sl', name:'Slovenian', nativeName:'Slovenščina', difficulty:'hard', isLatinScript:true, confusableWith:['hr','sk','cs'],
    sample:'Sonce vzhaja na vzhodu in zahaja na zahodu vsak dan.',
    romanized:'Sonce vzhaja na vzhodu in zahaja na zahodu vsak dan.' },
  { code:'mk', name:'Macedonian', nativeName:'Македонски', difficulty:'hard', isLatinScript:false, confusableWith:['bg','sr','ru'],
    sample:'Сонцето изгрева на исток и заоѓа на запад секој ден.',
    romanized:'Sonceto izgreva na istok i zaogja na zapad sekoj den.' },
  { code:'mt', name:'Maltese', nativeName:'Malti', difficulty:'hard', isLatinScript:true, confusableWith:['it','ar','sq'],
    sample:'Ix-xemx titla\' mil-lvant u tinżel mill-punent kuljum.',
    romanized:'Ix-xemx titla\' mil-lvant u tinżel mill-punent kuljum.' },
  { code:'az', name:'Azerbaijani', nativeName:'Azərbaycan', difficulty:'medium', isLatinScript:true, confusableWith:['tr','uz','kk'],
    sample:'Günəş hər gün şərqdən doğur və qərbdə batır.',
    romanized:'Günəş hər gün şərqdən doğur və qərbdə batır.' },
  { code:'mr', name:'Marathi', nativeName:'मराठी', difficulty:'hard', isLatinScript:false, confusableWith:['hi','ne','sa'],
    sample:'सूर्य दररोज पूर्वेला उगवतो आणि पश्चिमेला मावळतो.',
    romanized:'Surya dararoj purvela ugavto ani paschimela mavalto.' },
]

// Notes shown on the answer reveal — short, true statements (the ancient languages
// in particular are NOT "spoken by millions", so each gets a real fact).
const LANGUAGE_NOTES: Record<string, string> = {
  la:  'Latin was the language of ancient Rome and stayed Europe’s language of scholarship for over a thousand years.',
  grc: 'Ancient Greek is the language of Homer, Plato and the original New Testament.',
  sa:  'Sanskrit is the classical language of India and the sacred texts of Hinduism.',
  non: 'Old Norse was spoken by the Vikings and is the direct ancestor of modern Icelandic.',
  ang: 'Old English is the language of Beowulf, spoken in England before about 1150.',
  cop: 'Coptic is the final form of the ancient Egyptian language, still used in Coptic Christian worship.',
  chu: 'Old Church Slavonic was the first Slavic literary language, devised in the 9th century by Saints Cyril and Methodius.',
  nci: 'Classical Nahuatl was the language of the Aztec Empire — words like “chocolate” and “tomato” come from it.',
  got: 'Gothic is an extinct East Germanic language, known almost entirely from a 4th-century Bible translation.',
  lzh: 'Classical Chinese was the written language of imperial China and East Asian scholarship for two millennia.',
  sux: 'Sumerian, written in cuneiform, is the oldest known written language — and related to no living language.',
  akk: 'Akkadian was the language of Babylon and Assyria, written in cuneiform on clay tablets.',
  egy: 'Ancient Egyptian was written in hieroglyphs and spoken along the Nile for more than 3,000 years.',
}

export function languageNote(l: LanguageRecord): string {
  if (l.note) return l.note
  if (LANGUAGE_NOTES[l.code]) return LANGUAGE_NOTES[l.code]
  const label = scriptLabel(detectScript(l.sample))
  return label ? `${l.name} is written in the ${label} script.` : `${l.name} (${l.nativeName}).`
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme'

export function getLanguagesByDifficulty(diff: Difficulty): LanguageRecord[] {
  return LANGUAGES.filter(l => l.difficulty === diff)
}

export function getLanguageByCode(code: string): LanguageRecord | undefined {
  return LANGUAGES.find(l => l.code === code)
}
