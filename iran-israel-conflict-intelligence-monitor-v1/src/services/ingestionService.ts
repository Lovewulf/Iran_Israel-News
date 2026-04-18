mport { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import Parser from 'rss-parser';

// ========== Configuration ==========
const MIN_DATE = new Date('2026-03-01T00:00:00Z');
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ========== User-Agent Rotation ==========
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
];
const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': getRandomUserAgent() },
});

// ========== Enhanced Location Dictionary (400+ entries) ==========
const LOCATION_MAP: Record<string, { lat: number; lon: number; aliases: string[] }> = {
  // Iran – major cities
  'Tehran': { lat: 35.6892, lon: 51.3890, aliases: ['tehran', 'teheran'] },
  'Mashhad': { lat: 36.2972, lon: 59.6057, aliases: ['mashhad'] },
  'Isfahan': { lat: 32.6546, lon: 51.6680, aliases: ['isfahan', 'esfahan'] },
  'Karaj': { lat: 35.8400, lon: 50.9390, aliases: ['karaj'] },
  'Shiraz': { lat: 29.5918, lon: 52.5837, aliases: ['shiraz'] },
  'Tabriz': { lat: 38.0800, lon: 46.2919, aliases: ['tabriz'] },
  'Qom': { lat: 34.6399, lon: 50.8759, aliases: ['qom'] },
  'Ahvaz': { lat: 31.3183, lon: 48.6706, aliases: ['ahvaz'] },
  'Kermanshah': { lat: 34.3277, lon: 47.0778, aliases: ['kermanshah'] },
  'Urmia': { lat: 37.5553, lon: 45.0720, aliases: ['urmia'] },
  'Rasht': { lat: 37.2769, lon: 49.5886, aliases: ['rasht'] },
  'Zahedan': { lat: 29.4963, lon: 60.8629, aliases: ['zahedan'] },
  'Hamadan': { lat: 34.7984, lon: 48.5150, aliases: ['hamadan'] },
  'Yazd': { lat: 31.8974, lon: 54.3569, aliases: ['yazd'] },
  'Ardabil': { lat: 38.2498, lon: 48.2933, aliases: ['ardabil'] },
  'Bandar Abbas': { lat: 27.1832, lon: 56.2666, aliases: ['bandar abbas'] },
  'Bushehr': { lat: 28.9234, lon: 50.8203, aliases: ['bushehr'] },
  'Chabahar': { lat: 25.2919, lon: 60.6430, aliases: ['chabahar'] },
  'Kish': { lat: 26.5313, lon: 53.9965, aliases: ['kish'] },
  'Qeshm': { lat: 26.9469, lon: 56.0516, aliases: ['qeshm'] },
  'Larak': { lat: 26.8500, lon: 56.3500, aliases: ['larak'] },
  'Abadan': { lat: 30.3392, lon: 48.3043, aliases: ['abadan'] },
  'Khorramshahr': { lat: 30.4391, lon: 48.1663, aliases: ['khorramshahr'] },
  'Dezful': { lat: 32.3800, lon: 48.4000, aliases: ['dezful'] },
  'Ilam': { lat: 33.6374, lon: 46.4227, aliases: ['ilam'] },
  'Birjand': { lat: 32.8649, lon: 59.2212, aliases: ['birjand'] },
  'Bojnord': { lat: 37.4747, lon: 57.3291, aliases: ['bojnord'] },
  'Gorgan': { lat: 36.8392, lon: 54.4344, aliases: ['gorgan'] },
  'Sari': { lat: 36.5633, lon: 53.0601, aliases: ['sari'] },
  'Zanjan': { lat: 36.6736, lon: 48.4787, aliases: ['zanjan'] },
  'Qazvin': { lat: 36.2688, lon: 50.0041, aliases: ['qazvin'] },
  'Arak': { lat: 34.0917, lon: 49.6892, aliases: ['arak'] },
  'Saveh': { lat: 35.0213, lon: 50.3566, aliases: ['saveh'] },
  'Kashan': { lat: 33.9850, lon: 51.4390, aliases: ['kashan'] },
  'Natanz': { lat: 33.5075, lon: 51.9169, aliases: ['natanz'] },
  'Fordow': { lat: 34.8850, lon: 51.0140, aliases: ['fordow', 'fordo'] },
  'Parchin': { lat: 35.5200, lon: 51.7700, aliases: ['parchin'] },
  'Semnan': { lat: 35.5769, lon: 53.3925, aliases: ['semnan'] },
  'Shahr-e Kord': { lat: 32.3256, lon: 50.8644, aliases: ['shahr-e kord'] },
  'Yasuj': { lat: 30.6682, lon: 51.5880, aliases: ['yasuj'] },
  'Khorramabad': { lat: 33.4878, lon: 48.3558, aliases: ['khorramabad'] },
  'Sanandaj': { lat: 35.3147, lon: 46.9910, aliases: ['sanandaj'] },
  'Maragheh': { lat: 37.3919, lon: 46.2390, aliases: ['maragheh'] },
  'Miandoab': { lat: 36.9667, lon: 46.1000, aliases: ['miandoab'] },
  'Mahabad': { lat: 36.7631, lon: 45.7222, aliases: ['mahabad'] },
  'Baneh': { lat: 35.9975, lon: 45.8853, aliases: ['baneh'] },
  'Saqqez': { lat: 36.2500, lon: 46.2667, aliases: ['saqqez'] },
  'Bukan': { lat: 36.5211, lon: 46.2089, aliases: ['bukan'] },
  'Takab': { lat: 36.4000, lon: 47.1167, aliases: ['takab'] },
  'Shahin Dezh': { lat: 36.6792, lon: 46.5669, aliases: ['shahin dezh'] },
  'Piranshahr': { lat: 36.7011, lon: 45.1417, aliases: ['piranshahr'] },
  'Sardasht': { lat: 36.1550, lon: 45.4789, aliases: ['sardasht'] },
  'Oshnavieh': { lat: 37.0397, lon: 45.0983, aliases: ['oshnavieh'] },
  'Naqadeh': { lat: 36.9553, lon: 45.3883, aliases: ['naqadeh'] },
  'Showt': { lat: 39.2192, lon: 44.7700, aliases: ['showt'] },
  'Poldasht': { lat: 39.3481, lon: 45.0711, aliases: ['poldasht'] },
  'Maku': { lat: 39.2953, lon: 44.5167, aliases: ['maku'] },
  'Khoy': { lat: 38.5503, lon: 44.9522, aliases: ['khoy'] },
  'Salmas': { lat: 38.1972, lon: 44.7653, aliases: ['salmas'] },
  'Torbat-e Heydarieh': { lat: 35.2740, lon: 59.2194, aliases: ['torbat'] },
  'Sabzevar': { lat: 36.2125, lon: 57.6819, aliases: ['sabzevar'] },
  'Neyshabur': { lat: 36.2133, lon: 58.7958, aliases: ['neyshabur'] },
  'Gonbad-e Kavus': { lat: 37.2500, lon: 55.1672, aliases: ['gonbad'] },
  'Aliabad-e Katul': { lat: 36.9083, lon: 54.8689, aliases: ['aliabad'] },
  'Kalaleh': { lat: 37.3806, lon: 55.4917, aliases: ['kalaleh'] },
  'Minudasht': { lat: 37.2289, lon: 55.3747, aliases: ['minudasht'] },
  'Azadshahr': { lat: 37.0864, lon: 55.1722, aliases: ['azadshahr'] },
  'Ramian': { lat: 37.0161, lon: 55.1417, aliases: ['ramian'] },
  'Galikash': { lat: 37.2719, lon: 55.4325, aliases: ['galikash'] },
  'Maraveh Tappeh': { lat: 37.9033, lon: 56.0056, aliases: ['maraveh'] },
  'Incheh Borun': { lat: 37.4497, lon: 54.7244, aliases: ['incheh'] },
  'Bandar Torkaman': { lat: 36.9014, lon: 54.0722, aliases: ['bandar torkaman'] },
  'Bandar Gaz': { lat: 36.7742, lon: 53.9481, aliases: ['bandar gaz'] },
  'Neka': { lat: 36.6508, lon: 53.2992, aliases: ['neka'] },
  'Behshahr': { lat: 36.6925, lon: 53.5525, aliases: ['behshahr'] },
  'Galugah': { lat: 36.7275, lon: 53.8089, aliases: ['galugah'] },
  'Nowshahr': { lat: 36.6489, lon: 51.4961, aliases: ['nowshahr'] },
  'Chalus': { lat: 36.6550, lon: 51.4200, aliases: ['chalus'] },
  'Ramsar': { lat: 36.9036, lon: 50.6583, aliases: ['ramsar'] },
  'Tonekabon': { lat: 36.8167, lon: 50.8833, aliases: ['tonekabon'] },
  'Amol': { lat: 36.4697, lon: 52.3508, aliases: ['amol'] },
  'Babol': { lat: 36.5513, lon: 52.6789, aliases: ['babol'] },
  'Qaem Shahr': { lat: 36.4639, lon: 52.8606, aliases: ['qaem shahr'] },
  'Juybar': { lat: 36.6411, lon: 52.9125, aliases: ['juybar'] },
  'Mahmudabad': { lat: 36.6319, lon: 52.2625, aliases: ['mahmudabad'] },
  'Nur': { lat: 36.5717, lon: 52.0153, aliases: ['nur'] },
  'Fereydunkenar': { lat: 36.6856, lon: 52.5231, aliases: ['fereydunkenar'] },
  'Babolsar': { lat: 36.7025, lon: 52.6575, aliases: ['babolsar'] },
  'Bandar-e Anzali': { lat: 37.4731, lon: 49.4578, aliases: ['anzali'] },
  'Astara': { lat: 38.4306, lon: 48.8714, aliases: ['astara'] },
  'Astaneh-ye Ashrafiyeh': { lat: 37.2597, lon: 49.9431, aliases: ['astaneh'] },
  'Lahijan': { lat: 37.1972, lon: 50.0039, aliases: ['lahijan'] },
  'Langarud': { lat: 37.1969, lon: 50.1536, aliases: ['langarud'] },
  'Rudsar': { lat: 37.1378, lon: 50.2881, aliases: ['rudsar'] },
  'Sowmeh Sara': { lat: 37.3119, lon: 49.3219, aliases: ['sowmeh'] },
  'Masal': { lat: 37.3622, lon: 49.1306, aliases: ['masal'] },
  'Fuman': { lat: 37.2242, lon: 49.3125, aliases: ['fuman'] },
  'Shaft': { lat: 37.1703, lon: 49.4000, aliases: ['shaft'] },
  'Rezvanshahr': { lat: 37.5556, lon: 49.1394, aliases: ['rezvanshahr'] },
  'Talesh': { lat: 37.7992, lon: 48.9047, aliases: ['talesh'] },
  'Hashtpar': { lat: 37.7967, lon: 48.9053, aliases: ['hashtpar'] },
  'Jolfa': { lat: 38.9358, lon: 45.6308, aliases: ['jolfa'] },
  'Marand': { lat: 38.4328, lon: 45.7747, aliases: ['marand'] },
  'Shabestar': { lat: 38.1803, lon: 45.7028, aliases: ['shabestar'] },
  'Ajab Shir': { lat: 37.4775, lon: 45.8942, aliases: ['ajab shir'] },
  'Malekan': { lat: 37.1458, lon: 46.1031, aliases: ['malekan'] },
  'Bonab': { lat: 37.3406, lon: 46.0561, aliases: ['bonab'] },
  'Varzaqan': { lat: 38.5097, lon: 46.6542, aliases: ['varzaqan'] },
  'Kaleybar': { lat: 38.8694, lon: 47.0356, aliases: ['kaleybar'] },
  'Ahar': { lat: 38.4775, lon: 47.0694, aliases: ['ahar'] },
  'Heris': { lat: 38.2481, lon: 47.1167, aliases: ['heris'] },
  'Meshgin Shahr': { lat: 38.3989, lon: 47.6819, aliases: ['meshgin'] },
  'Parsabad': { lat: 39.6481, lon: 47.9175, aliases: ['parsabad'] },
  'Bileh Savar': { lat: 39.3792, lon: 48.3547, aliases: ['bileh savar'] },
  'Germi': { lat: 39.0217, lon: 48.0800, aliases: ['germi'] },
  'Kivi': { lat: 37.7000, lon: 48.5000, aliases: ['kivi'] },
  'Khalkhal': { lat: 37.6189, lon: 48.5258, aliases: ['khalkhal'] },
  'Firuzabad': { lat: 28.8438, lon: 52.5706, aliases: ['firuzabad'] },
  'Kazerun': { lat: 29.6194, lon: 51.6542, aliases: ['kazerun'] },
  'Marvdasht': { lat: 29.8742, lon: 52.8025, aliases: ['marvdasht'] },
  'Sepidan': { lat: 30.2481, lon: 51.9833, aliases: ['sepidan'] },
  'Eqlid': { lat: 30.8986, lon: 52.6864, aliases: ['eqlid'] },
  'Abadeh': { lat: 31.1608, lon: 52.6506, aliases: ['abadeh'] },
  'Neyriz': { lat: 29.1986, lon: 54.3278, aliases: ['neyriz'] },
  'Darab': { lat: 28.7519, lon: 54.5444, aliases: ['darab'] },
  'Jahrom': { lat: 28.5000, lon: 53.5606, aliases: ['jahrom'] },
  'Lar': { lat: 27.6833, lon: 54.3417, aliases: ['lar'] },
  'Lamerd': { lat: 27.3333, lon: 53.1833, aliases: ['lamerd'] },
  'Mohr': { lat: 27.5550, lon: 52.8836, aliases: ['mohr'] },
  'Gerash': { lat: 27.6681, lon: 54.1369, aliases: ['gerash'] },
  'Evaz': { lat: 27.7606, lon: 54.0075, aliases: ['evaz'] },
  'Khonj': { lat: 27.8917, lon: 53.4347, aliases: ['khonj'] },
  'Fasa': { lat: 28.9383, lon: 53.6483, aliases: ['fasa'] },
  'Estahban': { lat: 29.1264, lon: 54.0422, aliases: ['estahban'] },
  'Niriz': { lat: 29.1986, lon: 54.3278, aliases: ['niriz'] },
  'Bavanat': { lat: 30.4844, lon: 53.6647, aliases: ['bavanat'] },
  'Kharameh': { lat: 29.4994, lon: 53.3139, aliases: ['kharameh'] },
  'Kavar': { lat: 29.2050, lon: 52.6897, aliases: ['kavar'] },
  'Sarvestan': { lat: 29.2739, lon: 53.2203, aliases: ['sarvestan'] },
  'Arsanjan': { lat: 29.9128, lon: 53.3086, aliases: ['arsanjan'] },
  'Pasargad': { lat: 30.2019, lon: 53.1794, aliases: ['pasargad'] },
  'Rostam': { lat: 30.3567, lon: 51.3667, aliases: ['rostam'] },
  'Mamasani': { lat: 30.1150, lon: 51.5450, aliases: ['mamasani'] },
  'Nurabad': { lat: 30.1142, lon: 51.5217, aliases: ['nurabad'] },
  'Kohgiluyeh': { lat: 30.6681, lon: 50.9494, aliases: ['kohgiluyeh'] },
  'Gachsaran': { lat: 30.3525, lon: 50.7981, aliases: ['gachsaran'] },
  'Dogonbadan': { lat: 30.3586, lon: 50.7981, aliases: ['dogonbadan'] },
  'Basht': { lat: 30.3608, lon: 51.1561, aliases: ['basht'] },
  'Landeh': { lat: 30.4100, lon: 50.4239, aliases: ['landeh'] },
  'Dehdasht': { lat: 30.7939, lon: 50.5647, aliases: ['dehdasht'] },
  'Behbahan': { lat: 30.5958, lon: 50.2417, aliases: ['behbahan'] },
  'Ramhormoz': { lat: 31.2800, lon: 49.6036, aliases: ['ramhormoz'] },
  'Shadegan': { lat: 30.6497, lon: 48.6647, aliases: ['shadegan'] },
  'Mahshahr': { lat: 30.5569, lon: 49.1889, aliases: ['mahshahr'] },
  'Omidiyeh': { lat: 30.7458, lon: 49.7083, aliases: ['omidiyeh'] },
  'Baghmalek': { lat: 31.5236, lon: 49.8864, aliases: ['baghmalek'] },
  'Masjed Soleyman': { lat: 31.9364, lon: 49.3039, aliases: ['masjed soleyman'] },
  'Andimeshk': { lat: 32.4500, lon: 48.3500, aliases: ['andimeshk'] },
  'Shush': { lat: 32.1942, lon: 48.2436, aliases: ['shush'] },
  'Shushtar': { lat: 32.0436, lon: 48.8483, aliases: ['shushtar'] },
  'Gotvand': { lat: 32.2417, lon: 48.8167, aliases: ['gotvand'] },
  'Hendijan': { lat: 30.2364, lon: 49.7119, aliases: ['hendijan'] },
  'Izeh': { lat: 31.8342, lon: 49.8672, aliases: ['izeh'] },
  'Bavi': { lat: 31.4333, lon: 48.8667, aliases: ['bavi'] },
  'Hamidiyeh': { lat: 31.4975, lon: 48.4450, aliases: ['hamidiyeh'] },
  'Susa': { lat: 32.1942, lon: 48.2436, aliases: ['susa'] },
  'Dezful': { lat: 32.3800, lon: 48.4000, aliases: ['dezful'] },

  // Israel
  'Tel Aviv': { lat: 32.0853, lon: 34.7818, aliases: ['tel aviv', 'tel-aviv', 'yafo'] },
  'Jerusalem': { lat: 31.7683, lon: 35.2137, aliases: ['jerusalem', 'al-quds', 'yerushalayim'] },
  'Haifa': { lat: 32.7940, lon: 34.9896, aliases: ['haifa'] },
  'Dimona': { lat: 31.0708, lon: 35.0337, aliases: ['dimona'] },
  'Ashdod': { lat: 31.8044, lon: 34.6558, aliases: ['ashdod'] },
  'Ashkelon': { lat: 31.6688, lon: 34.5742, aliases: ['ashkelon'] },
  'Beersheba': { lat: 31.2529, lon: 34.7915, aliases: ['beersheba', 'beer sheva'] },
  'Eilat': { lat: 29.5577, lon: 34.9519, aliases: ['eilat'] },
  'Nahariya': { lat: 33.0058, lon: 35.0989, aliases: ['nahariya'] },
  'Akko': { lat: 32.9278, lon: 35.0828, aliases: ['akko', 'acre'] },
  'Tiberias': { lat: 32.7956, lon: 35.5310, aliases: ['tiberias'] },
  'Safed': { lat: 32.9648, lon: 35.4980, aliases: ['safed', 'tzfat'] },
  'Nazareth': { lat: 32.6996, lon: 35.3035, aliases: ['nazareth'] },
  'Netanya': { lat: 32.3215, lon: 34.8532, aliases: ['netanya'] },
  'Rishon LeZion': { lat: 31.9730, lon: 34.7925, aliases: ['rishon'] },
  'Petah Tikva': { lat: 32.0871, lon: 34.8878, aliases: ['petah tikva'] },
  'Holon': { lat: 32.0109, lon: 34.7794, aliases: ['holon'] },
  'Bnei Brak': { lat: 32.0807, lon: 34.8338, aliases: ['bnei brak'] },
  'Ramat Gan': { lat: 32.0684, lon: 34.8244, aliases: ['ramat gan'] },
  'Bat Yam': { lat: 32.0132, lon: 34.7482, aliases: ['bat yam'] },
  'Herzliya': { lat: 32.1663, lon: 34.8436, aliases: ['herzliya'] },
  'Kfar Saba': { lat: 32.1782, lon: 34.9076, aliases: ['kfar saba'] },
  'Ra'anana': { lat: 32.1848, lon: 34.8713, aliases: ['raanana'] },
  'Modiin': { lat: 31.8988, lon: 35.0092, aliases: ['modiin'] },
  'Lod': { lat: 31.9518, lon: 34.8886, aliases: ['lod'] },
  'Ramla': { lat: 31.9310, lon: 34.8636, aliases: ['ramla'] },
  'Rehovot': { lat: 31.8928, lon: 34.8113, aliases: ['rehovot'] },
  'Yavne': { lat: 31.8780, lon: 34.7393, aliases: ['yavne'] },
  'Hadera': { lat: 32.4345, lon: 34.9196, aliases: ['hadera'] },
  'Umm al-Fahm': { lat: 32.5153, lon: 35.1536, aliases: ['umm al-fahm'] },
  'Sderot': { lat: 31.5228, lon: 34.5956, aliases: ['sderot'] },
  'Netivot': { lat: 31.4213, lon: 34.5888, aliases: ['netivot'] },
  'Ofakim': { lat: 31.3130, lon: 34.6225, aliases: ['ofakim'] },
  'Arad': { lat: 31.2600, lon: 35.2147, aliases: ['arad'] },
  'Mitzpe Ramon': { lat: 30.6096, lon: 34.8019, aliases: ['mitzpe ramon'] },
  'Kiryat Shmona': { lat: 33.2078, lon: 35.5697, aliases: ['kiryat shmona'] },
  'Karmiel': { lat: 32.9141, lon: 35.2935, aliases: ['karmiel'] },
  'Maalot-Tarshiha': { lat: 33.0167, lon: 35.2667, aliases: ['maalot'] },
  'Kiryat Yam': { lat: 32.8497, lon: 35.0697, aliases: ['kiryat yam'] },
  'Kiryat Motzkin': { lat: 32.8383, lon: 35.0775, aliases: ['motzkin'] },
  'Kiryat Bialik': { lat: 32.8325, lon: 35.0875, aliases: ['bialik'] },
  'Kiryat Ata': { lat: 32.8089, lon: 35.1075, aliases: ['kiryat ata'] },
  'Kiryat Tivon': { lat: 32.7197, lon: 35.1289, aliases: ['tivon'] },
  'Yokneam Illit': { lat: 32.6600, lon: 35.1042, aliases: ['yokneam'] },
  'Migdal HaEmek': { lat: 32.6750, lon: 35.2419, aliases: ['migdal haemek'] },
  'Nof HaGalil': { lat: 32.7069, lon: 35.3167, aliases: ['nof hagalil'] },
  'Afula': { lat: 32.6078, lon: 35.2889, aliases: ['afula'] },
  'Beit Shean': { lat: 32.4972, lon: 35.4961, aliases: ['beit shean'] },
  'Givatayim': { lat: 32.0722, lon: 34.8125, aliases: ['givatayim'] },
  'Kiryat Ono': { lat: 32.0631, lon: 34.8572, aliases: ['kiryat ono'] },
  'Or Yehuda': { lat: 32.0292, lon: 34.8575, aliases: ['or yehuda'] },
  'Tira': { lat: 32.2342, lon: 34.9500, aliases: ['tira'] },
  'Kafr Qasim': { lat: 32.1119, lon: 34.9764, aliases: ['kafr qasim'] },
  'Tayibe': { lat: 32.2667, lon: 35.0167, aliases: ['tayibe'] },
  'Qalansawe': { lat: 32.2850, lon: 34.9786, aliases: ['qalansawe'] },
  'Tulkarm': { lat: 32.3111, lon: 35.0278, aliases: ['tulkarm'] },
  'Qalqilya': { lat: 32.1897, lon: 34.9706, aliases: ['qalqilya'] },
  'Jenin': { lat: 32.4594, lon: 35.3006, aliases: ['jenin'] },
  'Nablus': { lat: 32.2211, lon: 35.2544, aliases: ['nablus'] },
  'Ramallah': { lat: 31.9074, lon: 35.2042, aliases: ['ramallah'] },
  'Bethlehem': { lat: 31.7054, lon: 35.2024, aliases: ['bethlehem'] },
  'Hebron': { lat: 31.5326, lon: 35.0998, aliases: ['hebron', 'al-khalil'] },
  'Jericho': { lat: 31.8667, lon: 35.4500, aliases: ['jericho'] },
  'Gaza': { lat: 31.5017, lon: 34.4668, aliases: ['gaza', 'gaza city'] },
  'Khan Yunis': { lat: 31.3462, lon: 34.3040, aliases: ['khan yunis'] },
  'Rafah': { lat: 31.2875, lon: 34.2592, aliases: ['rafah'] },
  'Deir al-Balah': { lat: 31.4167, lon: 34.3500, aliases: ['deir al-balah'] },

  // Lebanon
  'Beirut': { lat: 33.8938, lon: 35.5018, aliases: ['beirut'] },
  'Tripoli': { lat: 34.4367, lon: 35.8344, aliases: ['tripoli'] },
  'Sidon': { lat: 33.5600, lon: 35.3758, aliases: ['sidon', 'saida'] },
  'Tyre': { lat: 33.2722, lon: 35.2033, aliases: ['tyre', 'sour'] },
  'Zahle': { lat: 33.8450, lon: 35.9150, aliases: ['zahle'] },
  'Baalbek': { lat: 34.0069, lon: 36.2086, aliases: ['baalbek'] },
  'Nabatieh': { lat: 33.3794, lon: 35.4819, aliases: ['nabatieh'] },
  'Jounieh': { lat: 33.9808, lon: 35.6181, aliases: ['jounieh'] },
  'Byblos': { lat: 34.1197, lon: 35.6478, aliases: ['byblos', 'jbeil'] },
  'Batroun': { lat: 34.2553, lon: 35.6581, aliases: ['batroun'] },

  // Syria
  'Damascus': { lat: 33.5138, lon: 36.2765, aliases: ['damascus'] },
  'Aleppo': { lat: 36.2025, lon: 37.1583, aliases: ['aleppo', 'halab'] },
  'Homs': { lat: 34.7308, lon: 36.7094, aliases: ['homs'] },
  'Latakia': { lat: 35.5167, lon: 35.7833, aliases: ['latakia'] },
  'Hama': { lat: 35.1333, lon: 36.7500, aliases: ['hama'] },
  'Raqqa': { lat: 35.9500, lon: 39.0167, aliases: ['raqqa'] },
  'Deir ez-Zor': { lat: 35.3333, lon: 40.1500, aliases: ['deir ez-zor'] },
  'Hasakah': { lat: 36.4833, lon: 40.7500, aliases: ['hasakah'] },
  'Qamishli': { lat: 37.0500, lon: 41.2167, aliases: ['qamishli'] },
  'Tartus': { lat: 34.8833, lon: 35.8833, aliases: ['tartus'] },
  'Daraa': { lat: 32.6167, lon: 36.1000, aliases: ['daraa'] },
  'Suwayda': { lat: 32.7000, lon: 36.5667, aliases: ['suwayda'] },
  'Idlib': { lat: 35.9333, lon: 36.6333, aliases: ['idlib'] },

  // Iraq
  'Baghdad': { lat: 33.3152, lon: 44.3661, aliases: ['baghdad'] },
  'Basra': { lat: 30.5000, lon: 47.8167, aliases: ['basra'] },
  'Mosul': { lat: 36.3400, lon: 43.1300, aliases: ['mosul'] },
  'Erbil': { lat: 36.1911, lon: 44.0094, aliases: ['erbil', 'hawler'] },
  'Sulaymaniyah': { lat: 35.5570, lon: 45.4350, aliases: ['sulaymaniyah'] },
  'Kirkuk': { lat: 35.4667, lon: 44.3167, aliases: ['kirkuk'] },
  'Najaf': { lat: 32.0000, lon: 44.3350, aliases: ['najaf'] },
  'Karbala': { lat: 32.6167, lon: 44.0333, aliases: ['karbala'] },
  'Hillah': { lat: 32.4833, lon: 44.4333, aliases: ['hillah'] },
  'Ramadi': { lat: 33.4167, lon: 43.3000, aliases: ['ramadi'] },
  'Fallujah': { lat: 33.3500, lon: 43.7833, aliases: ['fallujah'] },
  'Tikrit': { lat: 34.6000, lon: 43.6833, aliases: ['tikrit'] },
  'Samarra': { lat: 34.1959, lon: 43.8856, aliases: ['samarra'] },
  'Baqubah': { lat: 33.7500, lon: 44.6333, aliases: ['baqubah'] },
  'Nasiriyah': { lat: 31.0500, lon: 46.2667, aliases: ['nasiriyah'] },
  'Amara': { lat: 31.8333, lon: 47.1500, aliases: ['amara'] },
  'Kut': { lat: 32.5000, lon: 45.8333, aliases: ['kut'] },
  'Dhi Qar': { lat: 31.0000, lon: 46.0000, aliases: ['dhi qar'] },
  'Maysan': { lat: 31.5000, lon: 47.0000, aliases: ['maysan'] },

  // Jordan
  'Amman': { lat: 31.9454, lon: 35.9284, aliases: ['amman'] },
  'Zarqa': { lat: 32.0833, lon: 36.1000, aliases: ['zarqa'] },
  'Irbid': { lat: 32.5556, lon: 35.8500, aliases: ['irbid'] },
  'Aqaba': { lat: 29.5167, lon: 35.0000, aliases: ['aqaba'] },
  'Ma'an': { lat: 30.2000, lon: 35.7333, aliases: ['maan'] },
  'Karak': { lat: 31.1833, lon: 35.7000, aliases: ['karak'] },
  'Salt': { lat: 32.0333, lon: 35.7333, aliases: ['salt'] },
  'Mafraq': { lat: 32.3500, lon: 36.2167, aliases: ['mafraq'] },

  // Saudi Arabia
  'Riyadh': { lat: 24.7136, lon: 46.6753, aliases: ['riyadh'] },
  'Jeddah': { lat: 21.5433, lon: 39.1728, aliases: ['jeddah'] },
  'Mecca': { lat: 21.3891, lon: 39.8579, aliases: ['mecca', 'makkah'] },
  'Medina': { lat: 24.5247, lon: 39.5692, aliases: ['medina', 'madinah'] },
  'Dammam': { lat: 26.4333, lon: 50.1000, aliases: ['dammam'] },
  'Khobar': { lat: 26.2833, lon: 50.2000, aliases: ['khobar'] },
  'Dhahran': { lat: 26.2667, lon: 50.1500, aliases: ['dhahran'] },
  'Tabuk': { lat: 28.3833, lon: 36.5500, aliases: ['tabuk'] },
  'Buraidah': { lat: 26.3333, lon: 43.9667, aliases: ['buraidah'] },
  'Hail': { lat: 27.5167, lon: 41.6833, aliases: ['hail'] },
  'Abha': { lat: 18.2167, lon: 42.5000, aliases: ['abha'] },
  'Najran': { lat: 17.5000, lon: 44.2000, aliases: ['najran'] },
  'Jizan': { lat: 16.8892, lon: 42.5611, aliases: ['jizan'] },
  'Yanbu': { lat: 24.0833, lon: 38.0000, aliases: ['yanbu'] },
  'Al Jawf': { lat: 29.8333, lon: 39.8667, aliases: ['al jawf'] },
  'Al Qassim': { lat: 26.0000, lon: 43.0000, aliases: ['qassim'] },
  'Al Bahah': { lat: 20.0000, lon: 41.5000, aliases: ['bahah'] },

  // Yemen
  'Sanaa': { lat: 15.3694, lon: 44.1910, aliases: ['sanaa'] },
  'Aden': { lat: 12.8000, lon: 45.0333, aliases: ['aden'] },
  'Taiz': { lat: 13.5667, lon: 44.0333, aliases: ['taiz'] },
  'Hodeidah': { lat: 14.8000, lon: 42.9500, aliases: ['hodeidah'] },
  'Mukalla': { lat: 14.5333, lon: 49.1333, aliases: ['mukalla'] },
  'Ibb': { lat: 13.9667, lon: 44.1667, aliases: ['ibb'] },
  'Dhamar': { lat: 14.5667, lon: 44.4000, aliases: ['dhamar'] },
  'Marib': { lat: 15.4167, lon: 45.3333, aliases: ['marib'] },
  'Sa'dah': { lat: 16.9333, lon: 43.7667, aliases: ['saadah'] },
  'Al Ghaydah': { lat: 16.2000, lon: 52.1667, aliases: ['al ghaydah'] },

  // Oman
  'Muscat': { lat: 23.5880, lon: 58.3829, aliases: ['muscat'] },
  'Salalah': { lat: 17.0197, lon: 54.0897, aliases: ['salalah'] },
  'Sohar': { lat: 24.3422, lon: 56.7297, aliases: ['sohar'] },
  'Nizwa': { lat: 22.9333, lon: 57.5333, aliases: ['nizwa'] },
  'Sur': { lat: 22.5667, lon: 59.5333, aliases: ['sur'] },
  'Ibri': { lat: 23.2333, lon: 56.5000, aliases: ['ibri'] },
  'Barka': { lat: 23.7078, lon: 57.8819, aliases: ['barka'] },
  'Rustaq': { lat: 23.4000, lon: 57.4333, aliases: ['rustaq'] },
  'Khasab': { lat: 26.1833, lon: 56.2500, aliases: ['khasab'] },
  'Duqm': { lat: 19.6619, lon: 57.7056, aliases: ['duqm'] },

  // UAE
  'Abu Dhabi': { lat: 24.4539, lon: 54.3773, aliases: ['abu dhabi'] },
  'Dubai': { lat: 25.2048, lon: 55.2708, aliases: ['dubai'] },
  'Sharjah': { lat: 25.3573, lon: 55.4033, aliases: ['sharjah'] },
  'Ajman': { lat: 25.3994, lon: 55.4797, aliases: ['ajman'] },
  'Ras Al Khaimah': { lat: 25.7895, lon: 55.9432, aliases: ['ras al khaimah'] },
  'Fujairah': { lat: 25.1288, lon: 56.3265, aliases: ['fujairah'] },
  'Umm Al Quwain': { lat: 25.5648, lon: 55.5552, aliases: ['umm al quwain'] },
  'Al Ain': { lat: 24.2075, lon: 55.7447, aliases: ['al ain'] },

  // Qatar
  'Doha': { lat: 25.2854, lon: 51.5310, aliases: ['doha'] },
  'Al Rayyan': { lat: 25.2919, lon: 51.4244, aliases: ['al rayyan'] },
  'Al Wakrah': { lat: 25.1714, lon: 51.6036, aliases: ['al wakrah'] },
  'Al Khor': { lat: 25.6833, lon: 51.5167, aliases: ['al khor'] },
  'Mesaieed': { lat: 24.9833, lon: 51.5500, aliases: ['mesaieed'] },
  'Umm Salal': { lat: 25.4167, lon: 51.4000, aliases: ['umm salal'] },

  // Bahrain
  'Manama': { lat: 26.2285, lon: 50.5865, aliases: ['manama'] },
  'Riffa': { lat: 26.1300, lon: 50.5550, aliases: ['riffa'] },
  'Muharraq': { lat: 26.2578, lon: 50.6119, aliases: ['muharraq'] },
  'Hamad Town': { lat: 26.1153, lon: 50.5139, aliases: ['hamad town'] },
  'Isa Town': { lat: 26.1736, lon: 50.5478, aliases: ['isa town'] },
  'Sitra': { lat: 26.1533, lon: 50.6197, aliases: ['sitra'] },

  // Kuwait
  'Kuwait City': { lat: 29.3759, lon: 47.9774, aliases: ['kuwait city'] },
  'Hawalli': { lat: 29.3333, lon: 48.0286, aliases: ['hawalli'] },
  'Salmiya': { lat: 29.3339, lon: 48.0761, aliases: ['salmiya'] },
  'Jahra': { lat: 29.3375, lon: 47.6581, aliases: ['jahra'] },
  'Fahaheel': { lat: 29.0833, lon: 48.1306, aliases: ['fahaheel'] },
  'Mubarak Al-Kabeer': { lat: 29.2167, lon: 48.0667, aliases: ['mubarak'] },
  'Sabah Al-Salem': { lat: 29.2500, lon: 48.0667, aliases: ['sabah al salem'] },
  'Abdullah Al-Salem': { lat: 29.3500, lon: 47.9667, aliases: ['abdullah al salem'] },

  // Turkey
  'Ankara': { lat: 39.9334, lon: 32.8597, aliases: ['ankara'] },
  'Istanbul': { lat: 41.0082, lon: 28.9784, aliases: ['istanbul'] },
  'Izmir': { lat: 38.4189, lon: 27.1287, aliases: ['izmir'] },
  'Bursa': { lat: 40.1833, lon: 29.0667, aliases: ['bursa'] },
  'Adana': { lat: 37.0000, lon: 35.3167, aliases: ['adana'] },
  'Gaziantep': { lat: 37.0667, lon: 37.3833, aliases: ['gaziantep'] },
  'Konya': { lat: 37.8667, lon: 32.4833, aliases: ['konya'] },
  'Antalya': { lat: 36.9000, lon: 30.6833, aliases: ['antalya'] },
  'Diyarbakir': { lat: 37.9167, lon: 40.2333, aliases: ['diyarbakir'] },
  'Mersin': { lat: 36.8000, lon: 34.6333, aliases: ['mersin'] },
  'Kayseri': { lat: 38.7333, lon: 35.4833, aliases: ['kayseri'] },
  'Eskisehir': { lat: 39.7667, lon: 30.5167, aliases: ['eskisehir'] },
  'Samsun': { lat: 41.2833, lon: 36.3333, aliases: ['samsun'] },
  'Malatya': { lat: 38.3500, lon: 38.3167, aliases: ['malatya'] },
  'Erzurum': { lat: 39.9000, lon: 41.2667, aliases: ['erzurum'] },
  'Van': { lat: 38.4833, lon: 43.4167, aliases: ['van'] },
  'Batman': { lat: 37.8833, lon: 41.1333, aliases: ['batman'] },
  'Elazig': { lat: 38.6833, lon: 39.2167, aliases: ['elazig'] },
  'Trabzon': { lat: 41.0000, lon: 39.7333, aliases: ['trabzon'] },
  'Ordu': { lat: 40.9833, lon: 37.8833, aliases: ['ordu'] },
  'Giresun': { lat: 40.9167, lon: 38.3833, aliases: ['giresun'] },
  'Rize': { lat: 41.0167, lon: 40.5167, aliases: ['rize'] },
  'Artvin': { lat: 41.1833, lon: 41.8167, aliases: ['artvin'] },
  'Ardahan': { lat: 41.1167, lon: 42.7000, aliases: ['ardahan'] },
  'Kars': { lat: 40.6000, lon: 43.0833, aliases: ['kars'] },
  'Igdir': { lat: 39.9167, lon: 44.0500, aliases: ['igdir'] },
  'Agri': { lat: 39.7167, lon: 43.0500, aliases: ['agri'] },
  'Mus': { lat: 38.7333, lon: 41.4833, aliases: ['mus'] },
  'Bitlis': { lat: 38.4000, lon: 42.1167, aliases: ['bitlis'] },
  'Siirt': { lat: 37.9333, lon: 41.9500, aliases: ['siirt'] },
  'Sirnak': { lat: 37.5167, lon: 42.4667, aliases: ['sirnak'] },
  'Hakkari': { lat: 37.5833, lon: 43.7333, aliases: ['hakkari'] },

  // Egypt
  'Cairo': { lat: 30.0444, lon: 31.2357, aliases: ['cairo'] },
  'Alexandria': { lat: 31.2000, lon: 29.9167, aliases: ['alexandria'] },
  'Giza': { lat: 30.0131, lon: 31.2089, aliases: ['giza'] },
  'Port Said': { lat: 31.2500, lon: 32.2833, aliases: ['port said'] },
  'Suez': { lat: 29.9667, lon: 32.5500, aliases: ['suez'] },
  'Luxor': { lat: 25.6969, lon: 32.6422, aliases: ['luxor'] },
  'Aswan': { lat: 24.0889, lon: 32.8997, aliases: ['aswan'] },
  'Ismailia': { lat: 30.5833, lon: 32.2667, aliases: ['ismailia'] },
  'Damietta': { lat: 31.4167, lon: 31.8167, aliases: ['damietta'] },
  'Mansoura': { lat: 31.0500, lon: 31.3833, aliases: ['mansoura'] },
  'Tanta': { lat: 30.7833, lon: 31.0000, aliases: ['tanta'] },
  'Zagazig': { lat: 30.5667, lon: 31.5000, aliases: ['zagazig'] },
  'Fayoum': { lat: 29.3000, lon: 30.8333, aliases: ['fayoum'] },
  'Beni Suef': { lat: 29.0667, lon: 31.0833, aliases: ['beni suef'] },
  'Minya': { lat: 28.1167, lon: 30.7500, aliases: ['minya'] },
  'Asyut': { lat: 27.1833, lon: 31.1667, aliases: ['asyut'] },
  'Sohag': { lat: 26.5500, lon: 31.7000, aliases: ['sohag'] },
  'Qena': { lat: 26.1667, lon: 32.7167, aliases: ['qena'] },
  'Hurghada': { lat: 27.2578, lon: 33.8117, aliases: ['hurghada'] },
  'Sharm el-Sheikh': { lat: 27.9158, lon: 34.3300, aliases: ['sharm'] },

  // Sudan
  'Khartoum': { lat: 15.5000, lon: 32.5000, aliases: ['khartoum'] },
  'Omdurman': { lat: 15.6500, lon: 32.4800, aliases: ['omdurman'] },
  'Port Sudan': { lat: 19.6167, lon: 37.2167, aliases: ['port sudan'] },
  'Kassala': { lat: 15.4500, lon: 36.4000, aliases: ['kassala'] },
  'El Obeid': { lat: 13.1833, lon: 30.2167, aliases: ['el obeid'] },
  'Nyala': { lat: 12.0500, lon: 24.8833, aliases: ['nyala'] },
  'Wad Madani': { lat: 14.4000, lon: 33.5333, aliases: ['wad madani'] },
  'Al Fashir': { lat: 13.6333, lon: 25.3500, aliases: ['al fashir'] },
  'Geneina': { lat: 13.4500, lon: 22.4500, aliases: ['geneina'] },

  // Pakistan
  'Islamabad': { lat: 33.6844, lon: 73.0479, aliases: ['islamabad'] },
  'Karachi': { lat: 24.8607, lon: 67.0011, aliases: ['karachi'] },
  'Lahore': { lat: 31.5497, lon: 74.3436, aliases: ['lahore'] },
  'Rawalpindi': { lat: 33.5651, lon: 73.0169, aliases: ['rawalpindi'] },
  'Peshawar': { lat: 34.0150, lon: 71.5806, aliases: ['peshawar'] },
  'Quetta': { lat: 30.1798, lon: 66.9750, aliases: ['quetta'] },
  'Multan': { lat: 30.1575, lon: 71.5249, aliases: ['multan'] },
  'Faisalabad': { lat: 31.4504, lon: 73.1350, aliases: ['faisalabad'] },
  'Gujranwala': { lat: 32.1617, lon: 74.1883, aliases: ['gujranwala'] },
  'Sialkot': { lat: 32.4945, lon: 74.5229, aliases: ['sialkot'] },
  'Hyderabad': { lat: 25.3960, lon: 68.3738, aliases: ['hyderabad'] },
  'Sukkur': { lat: 27.7052, lon: 68.8574, aliases: ['sukkur'] },
  'Larkana': { lat: 27.5600, lon: 68.2200, aliases: ['larkana'] },
  'Bahawalpur': { lat: 29.3956, lon: 71.6722, aliases: ['bahawalpur'] },
  'Sargodha': { lat: 32.0837, lon: 72.6711, aliases: ['sargodha'] },
  'Mardan': { lat: 34.1983, lon: 72.0450, aliases: ['mardan'] },
  'Abbottabad': { lat: 34.1490, lon: 73.2142, aliases: ['abbottabad'] },
  'Gilgit': { lat: 35.9189, lon: 74.3088, aliases: ['gilgit'] },
  'Skardu': { lat: 35.2900, lon: 75.6300, aliases: ['skardu'] },
  'Muzaffarabad': { lat: 34.3570, lon: 73.4718, aliases: ['muzaffarabad'] },

  // Afghanistan
  'Kabul': { lat: 34.5553, lon: 69.2075, aliases: ['kabul'] },
  'Kandahar': { lat: 31.6289, lon: 65.7372, aliases: ['kandahar'] },
  'Herat': { lat: 34.3525, lon: 62.2042, aliases: ['herat'] },
  'Mazar-i-Sharif': { lat: 36.7069, lon: 67.1128, aliases: ['mazar'] },
  'Jalalabad': { lat: 34.4300, lon: 70.4500, aliases: ['jalalabad'] },
  'Kunduz': { lat: 36.7286, lon: 68.8681, aliases: ['kunduz'] },
  'Balkh': { lat: 36.7550, lon: 66.8975, aliases: ['balkh'] },
  'Ghazni': { lat: 33.5500, lon: 68.4167, aliases: ['ghazni'] },

  // India
  'New Delhi': { lat: 28.6139, lon: 77.2090, aliases: ['new delhi', 'delhi'] },
  'Mumbai': { lat: 19.0760, lon: 72.8777, aliases: ['mumbai', 'bombay'] },
  'Bengaluru': { lat: 12.9716, lon: 77.5946, aliases: ['bengaluru', 'bangalore'] },
  'Chennai': { lat: 13.0827, lon: 80.2707, aliases: ['chennai'] },
  'Kolkata': { lat: 22.5726, lon: 88.3639, aliases: ['kolkata', 'calcutta'] },
  'Ahmedabad': { lat: 23.0225, lon: 72.5714, aliases: ['ahmedabad'] },
  'Hyderabad': { lat: 17.3850, lon: 78.4867, aliases: ['hyderabad'] },
  'Pune': { lat: 18.5204, lon: 73.8567, aliases: ['pune'] },
  'Jaipur': { lat: 26.9124, lon: 75.7873, aliases: ['jaipur'] },
  'Lucknow': { lat: 26.8467, lon: 80.9462, aliases: ['lucknow'] },
  'Kanpur': { lat: 26.4499, lon: 80.3319, aliases: ['kanpur'] },
  'Nagpur': { lat: 21.1458, lon: 79.0882, aliases: ['nagpur'] },
  'Indore': { lat: 22.7196, lon: 75.8577, aliases: ['indore'] },
  'Bhopal': { lat: 23.2599, lon: 77.4126, aliases: ['bhopal'] },
  'Vadodara': { lat: 22.3072, lon: 73.1812, aliases: ['vadodara'] },
  'Surat': { lat: 21.1702, lon: 72.8311, aliases: ['surat'] },
  'Coimbatore': { lat: 11.0168, lon: 76.9558, aliases: ['coimbatore'] },
  'Visakhapatnam': { lat: 17.6868, lon: 83.2185, aliases: ['visakhapatnam'] },
  'Patna': { lat: 25.5941, lon: 85.1376, aliases: ['patna'] },
  'Guwahati': { lat: 26.1445, lon: 91.7362, aliases: ['guwahati'] },
  'Chandigarh': { lat: 30.7333, lon: 76.7794, aliases: ['chandigarh'] },
  'Srinagar': { lat: 34.0837, lon: 74.7973, aliases: ['srinagar'] },
  'Jammu': { lat: 32.7266, lon: 74.8570, aliases: ['jammu'] },
  'Leh': { lat: 34.1526, lon: 77.5771, aliases: ['leh'] },

  // China
  'Beijing': { lat: 39.9042, lon: 116.4074, aliases: ['beijing'] },
  'Shanghai': { lat: 31.2304, lon: 121.4737, aliases: ['shanghai'] },
  'Guangzhou': { lat: 23.1291, lon: 113.2644, aliases: ['guangzhou'] },
  'Shenzhen': { lat: 22.5431, lon: 114.0579, aliases: ['shenzhen'] },
  'Chengdu': { lat: 30.5728, lon: 104.0668, aliases: ['chengdu'] },
  'Chongqing': { lat: 29.4316, lon: 106.9123, aliases: ['chongqing'] },
  'Tianjin': { lat: 39.0841, lon: 117.2000, aliases: ['tianjin'] },
  'Wuhan': { lat: 30.5928, lon: 114.3055, aliases: ['wuhan'] },
  'Nanjing': { lat: 32.0603, lon: 118.7969, aliases: ['nanjing'] },
  'Xi’an': { lat: 34.3416, lon: 108.9402, aliases: ['xian'] },
  'Urumqi': { lat: 43.8256, lon: 87.6168, aliases: ['urumqi'] },
  'Lhasa': { lat: 29.6500, lon: 91.1400, aliases: ['lhasa'] },

  // Russia
  'Moscow': { lat: 55.7558, lon: 37.6173, aliases: ['moscow'] },
  'Saint Petersburg': { lat: 59.9343, lon: 30.3351, aliases: ['st petersburg'] },
  'Kazan': { lat: 55.7871, lon: 49.1231, aliases: ['kazan'] },
  'Sochi': { lat: 43.6028, lon: 39.7342, aliases: ['sochi'] },
  'Novosibirsk': { lat: 55.0304, lon: 82.9204, aliases: ['novosibirsk'] },
  'Yekaterinburg': { lat: 56.8389, lon: 60.6057, aliases: ['yekaterinburg'] },
  'Vladivostok': { lat: 43.1333, lon: 131.9000, aliases: ['vladivostok'] },
  'Sevastopol': { lat: 44.6167, lon: 33.5333, aliases: ['sevastopol'] },
  'Kaliningrad': { lat: 54.7167, lon: 20.5000, aliases: ['kaliningrad'] },
  'Rostov-on-Don': { lat: 47.2333, lon: 39.7000, aliases: ['rostov'] },
  'Volgograd': { lat: 48.7080, lon: 44.5133, aliases: ['volgograd'] },
  'Nizhny Novgorod': { lat: 56.3269, lon: 44.0059, aliases: ['nizhny'] },
  'Chelyabinsk': { lat: 55.1547, lon: 61.4298, aliases: ['chelyabinsk'] },
  'Omsk': { lat: 54.9885, lon: 73.3242, aliases: ['omsk'] },
  'Krasnoyarsk': { lat: 56.0097, lon: 92.7917, aliases: ['krasnoyarsk'] },

  // United States
  'Washington': { lat: 38.9072, lon: -77.0369, aliases: ['washington dc', 'dc'] },
  'New York': { lat: 40.7128, lon: -74.0060, aliases: ['new york', 'nyc'] },
  'Los Angeles': { lat: 34.0522, lon: -118.2437, aliases: ['los angeles', 'la'] },
  'Chicago': { lat: 41.8781, lon: -87.6298, aliases: ['chicago'] },
  'Houston': { lat: 29.7604, lon: -95.3698, aliases: ['houston'] },
  'San Francisco': { lat: 37.7749, lon: -122.4194, aliases: ['san francisco'] },
  'Seattle': { lat: 47.6062, lon: -122.3321, aliases: ['seattle'] },
  'Boston': { lat: 42.3601, lon: -71.0589, aliases: ['boston'] },
  'Miami': { lat: 25.7617, lon: -80.1918, aliases: ['miami'] },
  'Dallas': { lat: 32.7767, lon: -96.7970, aliases: ['dallas'] },
  'Atlanta': { lat: 33.7490, lon: -84.3880, aliases: ['atlanta'] },
  'Denver': { lat: 39.7392, lon: -104.9903, aliases: ['denver'] },
  'Phoenix': { lat: 33.4484, lon: -112.0740, aliases: ['phoenix'] },
  'Philadelphia': { lat: 39.9526, lon: -75.1652, aliases: ['philadelphia'] },
  'Detroit': { lat: 42.3314, lon: -83.0458, aliases: ['detroit'] },
  'San Diego': { lat: 32.7157, lon: -117.1611, aliases: ['san diego'] },
  'Portland': { lat: 45.5152, lon: -122.6784, aliases: ['portland'] },
  'Las Vegas': { lat: 36.1699, lon: -115.1398, aliases: ['las vegas'] },
  'New Orleans': { lat: 29.9511, lon: -90.0715, aliases: ['new orleans'] },
  'Nashville': { lat: 36.1627, lon: -86.7816, aliases: ['nashville'] },
  'Austin': { lat: 30.2672, lon: -97.7431, aliases: ['austin'] },
  'Salt Lake City': { lat: 40.7608, lon: -111.8910, aliases: ['salt lake'] },

  // Europe
  'London': { lat: 51.5074, lon: -0.1278, aliases: ['london'] },
  'Paris': { lat: 48.8566, lon: 2.3522, aliases: ['paris'] },
  'Berlin': { lat: 52.5200, lon: 13.4050, aliases: ['berlin'] },
  'Rome': { lat: 41.9028, lon: 12.4964, aliases: ['rome'] },
  'Madrid': { lat: 40.4168, lon: -3.7038, aliases: ['madrid'] },
  'Vienna': { lat: 48.2082, lon: 16.3738, aliases: ['vienna'] },
  'Brussels': { lat: 50.8503, lon: 4.3517, aliases: ['brussels'] },
  'Amsterdam': { lat: 52.3676, lon: 4.9041, aliases: ['amsterdam'] },
  'Stockholm': { lat: 59.3293, lon: 18.0686, aliases: ['stockholm'] },
  'Copenhagen': { lat: 55.6761, lon: 12.5683, aliases: ['copenhagen'] },
  'Oslo': { lat: 59.9139, lon: 10.7522, aliases: ['oslo'] },
  'Helsinki': { lat: 60.1699, lon: 24.9384, aliases: ['helsinki'] },
  'Warsaw': { lat: 52.2297, lon: 21.0122, aliases: ['warsaw'] },
  'Prague': { lat: 50.0755, lon: 14.4378, aliases: ['prague'] },
  'Budapest': { lat: 47.4979, lon: 19.0402, aliases: ['budapest'] },
  'Bucharest': { lat: 44.4268, lon: 26.1025, aliases: ['bucharest'] },
  'Sofia': { lat: 42.6977, lon: 23.3219, aliases: ['sofia'] },
  'Athens': { lat: 37.9838, lon: 23.7275, aliases: ['athens'] },
  'Belgrade': { lat: 44.7866, lon: 20.4489, aliases: ['belgrade'] },
  'Zagreb': { lat: 45.8150, lon: 15.9819, aliases: ['zagreb'] },
  'Ljubljana': { lat: 46.0569, lon: 14.5058, aliases: ['ljubljana'] },
  'Bratislava': { lat: 48.1486, lon: 17.1077, aliases: ['bratislava'] },
  'Vilnius': { lat: 54.6872, lon: 25.2797, aliases: ['vilnius'] },
  'Riga': { lat: 56.9496, lon: 24.1052, aliases: ['riga'] },
  'Tallinn': { lat: 59.4370, lon: 24.7536, aliases: ['tallinn'] },
  'Minsk': { lat: 53.9045, lon: 27.5615, aliases: ['minsk'] },
  'Kyiv': { lat: 50.4501, lon: 30.5234, aliases: ['kyiv', 'kiev'] },
  'Chisinau': { lat: 47.0105, lon: 28.8638, aliases: ['chisinau'] },
  'Tbilisi': { lat: 41.7151, lon: 44.8271, aliases: ['tbilisi'] },
  'Yerevan': { lat: 40.1792, lon: 44.4991, aliases: ['yerevan'] },
  'Baku': { lat: 40.4093, lon: 49.8671, aliases: ['baku'] },
  'Nicosia': { lat: 35.1667, lon: 33.3667, aliases: ['nicosia'] },

  // Waterways and regions
  'Strait of Hormuz': { lat: 26.5000, lon: 56.0000, aliases: ['strait of hormuz', 'hormuz strait'] },
  'Persian Gulf': { lat: 27.0000, lon: 52.0000, aliases: ['persian gulf', 'arabian gulf'] },
  'Gulf of Oman': { lat: 24.0000, lon: 60.0000, aliases: ['gulf of oman'] },
  'Red Sea': { lat: 22.0000, lon: 38.0000, aliases: ['red sea'] },
  'Mediterranean Sea': { lat: 35.0000, lon: 18.0000, aliases: ['mediterranean', 'med sea'] },
  'Caspian Sea': { lat: 40.0000, lon: 50.0000, aliases: ['caspian'] },
  'Black Sea': { lat: 43.0000, lon: 34.0000, aliases: ['black sea'] },
  'Arabian Sea': { lat: 15.0000, lon: 65.0000, aliases: ['arabian sea'] },
  'Gulf of Aden': { lat: 12.0000, lon: 48.0000, aliases: ['gulf of aden'] },
  'Bab el-Mandeb': { lat: 12.5000, lon: 43.0000, aliases: ['bab el-mandeb'] },
  'Suez Canal': { lat: 30.0000, lon: 32.5000, aliases: ['suez canal'] },
  'Nile River': { lat: 24.0000, lon: 30.0000, aliases: ['nile'] },
  'Tigris River': { lat: 33.0000, lon: 44.0000, aliases: ['tigris'] },
  'Euphrates River': { lat: 33.0000, lon: 44.0000, aliases: ['euphrates'] },
  'Jordan River': { lat: 32.0000, lon: 35.5000, aliases: ['jordan river'] },
  'Dead Sea': { lat: 31.5000, lon: 35.5000, aliases: ['dead sea'] },
  'Lake Urmia': { lat: 37.5000, lon: 45.5000, aliases: ['urmia lake'] },

  // Countries (fallback)
  'Iran': { lat: 32.0000, lon: 53.0000, aliases: ['iran'] },
  'Israel': { lat: 31.0000, lon: 34.8000, aliases: ['israel'] },
  'Palestine': { lat: 31.9000, lon: 35.2000, aliases: ['palestine', 'west bank'] },
  'Lebanon': { lat: 33.9000, lon: 35.5000, aliases: ['lebanon'] },
  'Syria': { lat: 35.0000, lon: 38.0000, aliases: ['syria'] },
  'Iraq': { lat: 33.0000, lon: 44.0000, aliases: ['iraq'] },
  'Jordan': { lat: 31.0000, lon: 36.0000, aliases: ['jordan'] },
  'Saudi Arabia': { lat: 24.0000, lon: 45.0000, aliases: ['saudi arabia', 'ksa'] },
  'Yemen': { lat: 15.0000, lon: 48.0000, aliases: ['yemen'] },
  'Oman': { lat: 21.0000, lon: 57.0000, aliases: ['oman'] },
  'UAE': { lat: 24.0000, lon: 54.0000, aliases: ['uae', 'united arab emirates'] },
  'Qatar': { lat: 25.0000, lon: 51.0000, aliases: ['qatar'] },
  'Kuwait': { lat: 29.5000, lon: 47.7500, aliases: ['kuwait'] },
  'Bahrain': { lat: 26.0000, lon: 50.5500, aliases: ['bahrain'] },
  'Turkey': { lat: 39.0000, lon: 35.0000, aliases: ['turkey'] },
  'Egypt': { lat: 26.0000, lon: 30.0000, aliases: ['egypt'] },
  'Sudan': { lat: 15.0000, lon: 30.0000, aliases: ['sudan'] },
  'Afghanistan': { lat: 33.0000, lon: 65.0000, aliases: ['afghanistan'] },
  'Pakistan': { lat: 30.0000, lon: 70.0000, aliases: ['pakistan'] },
  'India': { lat: 20.0000, lon: 77.0000, aliases: ['india'] },
  'China': { lat: 35.0000, lon: 105.0000, aliases: ['china'] },
  'Russia': { lat: 60.0000, lon: 100.0000, aliases: ['russia'] },
  'United States': { lat: 38.0000, lon: -97.0000, aliases: ['usa', 'united states'] },
  'United Kingdom': { lat: 54.0000, lon: -2.0000, aliases: ['uk', 'united kingdom'] },
  'France': { lat: 46.0000, lon: 2.0000, aliases: ['france'] },
  'Germany': { lat: 51.0000, lon: 10.0000, aliases: ['germany'] },
  'European Union': { lat: 50.0000, lon: 10.0000, aliases: ['eu', 'european union'] },
  'United Nations': { lat: 40.0000, lon: -74.0000, aliases: ['un', 'united nations'] },
  'NATO': { lat: 50.0000, lon: 4.0000, aliases: ['nato'] },
  'Gulf Cooperation Council': { lat: 24.0000, lon: 45.0000, aliases: ['gcc'] }
};

function geocodeArticle(title: string, summary: string): { lat: number | null; lon: number | null } {
  const text = (title + ' ' + summary).toLowerCase();
  for (const [place, data] of Object.entries(LOCATION_MAP)) {
    if (text.includes(place.toLowerCase())) {
      return { lat: data.lat, lon: data.lon };
    }
    for (const alias of data.aliases) {
      if (text.includes(alias.toLowerCase())) {
        return { lat: data.lat, lon: data.lon };
      }
    }
  }
  return { lat: null, lon: null };
}


// ========== Helper: Fetch with retries ==========
async function fetchFeedWithRetry(url: string, maxRetries = 2): Promise<any> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': getRandomUserAgent() },
      });
      return await parser.parseString(response.data);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Attempt ${attempt}/${maxRetries} failed for ${url}: ${errorMsg}`);
      lastError = error;
      if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw lastError;
}

// ========== Helper: Extract image URL (enhanced) ==========
async function extractImageUrl(item: any, link: string): Promise<string> {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item['media:content']?.['$']?.url) return item['media:content']['$'].url;
  if (item['media:thumbnail']?.['$']?.url) return item['media:thumbnail']['$'].url;
  if (item['content:encoded']) {
    const imgMatch = item['content:encoded'].match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
  }
  if (item.content) {
    const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
  }
  if (link) {
    try {
      const response = await axios.get(link, { timeout: 8000, headers: { 'User-Agent': getRandomUserAgent() } });
      const html = response.data;
      let ogMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);
      if (ogMatch) return ogMatch[1];
      let twitterMatch = html.match(/<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"/);
      if (twitterMatch) return twitterMatch[1];
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
      if (jsonLdMatch) {
        try {
          const jsonData = JSON.parse(jsonLdMatch[1]);
          if (jsonData.image?.url) return jsonData.image.url;
          if (jsonData.image) return jsonData.image;
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
  }
  return '';
}

// ========== Helper: Check if article is on or after March 1, 2026 ==========
function isOnOrAfterMinDate(pubDate: string | Date | undefined): boolean {
  if (!pubDate) return false;
  try {
    const articleDate = new Date(pubDate);
    if (isNaN(articleDate.getTime())) return false;
    return articleDate >= MIN_DATE;
  } catch {
    return false;
  }
}

// ========== Process a single feed ==========
async function processFeed(sourceName: string, feedUrl: string, maxItems = 10): Promise<number> {
  let addedCount = 0;
  try {
    console.log(`🔍 Processing ${sourceName} from: ${feedUrl}`);
    const feed = await fetchFeedWithRetry(feedUrl);
    const items = feed.items?.slice(0, maxItems) || [];
    if (items.length === 0) {
      console.warn(`No items found in feed: ${feedUrl}`);
      return 0;
    }
    for (const item of items) {
      if (!item.link) continue;

      const pubDate = item.isoDate || item.pubDate;
      if (!isOnOrAfterMinDate(pubDate)) {
        console.log(`⏭️ Skipping article older than March 1, 2026: ${item.title?.substring(0, 50)} (${pubDate})`);
        continue;
      }

      const { data: existing } = await supabase.from('articles').select('url').eq('url', item.link);
      if (existing && existing.length > 0) continue;

      const imageUrl = await extractImageUrl(item, item.link);
      const title = item.title?.trim() || 'No title';
      const content = item.content || item.contentSnippet || '';
      const summary = item.contentSnippet || content.slice(0, 300);
      const publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
      const now = new Date().toISOString();
      const fingerprint = Buffer.from(`${item.link}${title}`).toString('base64');

      // Geocode location based on title and summary
      const { lat: location_lat, lon: location_lon } = geocodeArticle(title, summary);

      const article = {
        title,
        content,
        summary,
        url: item.link,
        source_name: sourceName,
        source_type: 'rss',
        published_at: publishedAt,
        ingested_at: now,
        first_seen_at: now,
        last_updated_at: now,
        fingerprint,
        tag_ids: [],
        image_url: imageUrl,
        is_breaking: title.toLowerCase().includes('breaking') || title.toLowerCase().includes('urgent'),
        content_origin: 'live_rss',
        is_verified: false,
        location_lat,
        location_lon,
      };

      const { error } = await supabase.from('articles').insert(article);
      if (error) {
        console.error(`Insert error for ${title}:`, error.message);
        continue;
      }
      addedCount++;
      console.log(`✅ [${sourceName}] Added: ${title.substring(0, 70)}... (published ${publishedAt})`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to process ${sourceName} (${feedUrl}): ${errorMsg}`);
  }
  return addedCount;
}

// ========== Main Ingestion Function ==========
export async function runFullIngestion() {
  console.log(`📡 Starting news ingestion (only articles from ${MIN_DATE.toISOString()} onwards)`);
  let totalAdded = 0;

  const feedGroups = [
    { name: 'Iran General News', feeds: [
      'https://news.google.com/rss/search?q=iran&hl=en-US&gl=US&ceid=US:en',
      'https://rss.nytimes.com/services/xml/rss/nyt/Iran.xml',
      'https://feeds.bbci.co.uk/news/world/middle_east/iran/rss.xml',
      'https://www.aljazeera.com/xml/rss/iran.xml',
    ]},
    { name: 'Israel General News', feeds: [
      'https://news.google.com/rss/search?q=israel&hl=en-US&gl=US&ceid=US:en',
      'https://rss.nytimes.com/services/xml/rss/nyt/Israel.xml',
      'https://feeds.bbci.co.uk/news/world/middle_east/israel/rss.xml',
    ]},
    { name: 'Iran-Israel Conflict', feeds: [
      'https://news.google.com/rss/search?q=iran+israel+conflict&hl=en-US&gl=US&ceid=US:en',
      'https://news.yahoo.com/rss/topic/iran-israel-conflict',
      'https://www.timesofisrael.com/feed/',
    ]},
    { name: 'Al Jazeera', feeds: [
      'https://www.aljazeera.com/xml/rss/all.xml',
      'https://www.aljazeera.com/xml/rss/news.xml',
    ]},
    { name: 'CNN', feeds: [
      'http://rss.cnn.com/rss/edition_world.rss',
      'http://www.cnn.com/rss/cnn_topstories.rss',
      'http://rss.cnn.com/rss/edition_meast.rss',
    ]},
    { name: 'Dawn (Pakistan)', feeds: [
      'https://www.dawn.com/feed/',
      'https://www.dawn.com/feed/pakistan/',
    ]},
    { name: 'Geo News (Pakistan)', feeds: ['https://www.geo.tv/rss/1'] },
    { name: 'The Express Tribune (Pakistan)', feeds: ['https://tribune.com.pk/feed/'] },
    { name: 'Pakistan Today', feeds: ['https://www.pakistantoday.com.pk/feed/'] },
    { name: 'The News International (Pakistan)', feeds: ['https://www.thenews.com.pk/feed'] },
    { name: 'Middle East General', feeds: [
      'https://news.google.com/rss/search?q=middle+east&hl=en-US&gl=US&ceid=US:en',
      'https://www.aljazeera.com/xml/rss/middle-east.xml',
    ]},
    { name: 'International – BBC', feeds: [
      'http://feeds.bbci.co.uk/news/world/rss.xml',
      'https://feeds.bbci.co.uk/news/world/rss.xml',
    ]},
  ];

  for (const group of feedGroups) {
    let success = false;
    for (const feedUrl of group.feeds) {
      if (success) break;
      const added = await processFeed(group.name, feedUrl, 8);
      if (added > 0) {
        totalAdded += added;
        success = true;
        console.log(`✅ Successfully ingested from ${group.name} via ${feedUrl}`);
      } else {
        console.log(`⚠️ No recent items from ${feedUrl} for ${group.name}, trying fallback...`);
      }
    }
    if (!success) console.error(`❌ All feeds failed for group: ${group.name}`);
  }

  console.log(`🏁 Ingestion completed. Total new articles added (from ${MIN_DATE.toISOString()} onwards): ${totalAdded}`);
  return { totalAdded };
}
