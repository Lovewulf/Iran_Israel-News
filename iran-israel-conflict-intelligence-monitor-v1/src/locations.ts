export const LOCATION_MAP: Record<string, { lat: number; lon: number; aliases: string[] }> = {
  // Iran
  'Tehran': { lat: 35.6892, lon: 51.3890, aliases: ['tehran', 'teheran'] },
  'Mashhad': { lat: 36.2972, lon: 59.6057, aliases: ['mashhad'] },
  'Isfahan': { lat: 32.6546, lon: 51.6680, aliases: ['isfahan', 'esfahan'] },
  'Shiraz': { lat: 29.5918, lon: 52.5837, aliases: ['shiraz'] },
  'Tabriz': { lat: 38.0800, lon: 46.2919, aliases: ['tabriz'] },
  'Qom': { lat: 34.6399, lon: 50.8759, aliases: ['qom'] },
  'Ahvaz': { lat: 31.3183, lon: 48.6706, aliases: ['ahvaz'] },
  'Bandar Abbas': { lat: 27.1832, lon: 56.2666, aliases: ['bandar abbas'] },
  'Bushehr': { lat: 28.9234, lon: 50.8203, aliases: ['bushehr'] },
  // Israel
  'Tel Aviv': { lat: 32.0853, lon: 34.7818, aliases: ['tel aviv', 'tel-aviv'] },
  'Jerusalem': { lat: 31.7683, lon: 35.2137, aliases: ['jerusalem', 'al-quds'] },
  'Haifa': { lat: 32.7940, lon: 34.9896, aliases: ['haifa'] },
  'Dimona': { lat: 31.0708, lon: 35.0337, aliases: ['dimona'] },
  'Gaza': { lat: 31.5017, lon: 34.4668, aliases: ['gaza', 'gaza city'] },
  // Lebanon
  'Beirut': { lat: 33.8938, lon: 35.5018, aliases: ['beirut'] },
  // Syria
  'Damascus': { lat: 33.5138, lon: 36.2765, aliases: ['damascus'] },
  // Iraq
  'Baghdad': { lat: 33.3152, lon: 44.3661, aliases: ['baghdad'] },
  // Jordan
  'Amman': { lat: 31.9454, lon: 35.9284, aliases: ['amman'] },
  // Saudi Arabia
  'Riyadh': { lat: 24.7136, lon: 46.6753, aliases: ['riyadh'] },
  // Turkey
  'Ankara': { lat: 39.9334, lon: 32.8597, aliases: ['ankara'] },
  'Istanbul': { lat: 41.0082, lon: 28.9784, aliases: ['istanbul'] },
  // Egypt
  'Cairo': { lat: 30.0444, lon: 31.2357, aliases: ['cairo'] },
  // Pakistan
  'Islamabad': { lat: 33.6844, lon: 73.0479, aliases: ['islamabad'] },
  'Karachi': { lat: 24.8607, lon: 67.0011, aliases: ['karachi'] },
  'Lahore': { lat: 31.5497, lon: 74.3436, aliases: ['lahore'] },
  // Waterways
  'Strait of Hormuz': { lat: 26.5000, lon: 56.0000, aliases: ['strait of hormuz', 'hormuz strait'] },
  'Persian Gulf': { lat: 27.0000, lon: 52.0000, aliases: ['persian gulf'] },
  // Countries
  'Iran': { lat: 32.0000, lon: 53.0000, aliases: ['iran'] },
  'Israel': { lat: 31.0000, lon: 34.8000, aliases: ['israel'] },
  'Pakistan': { lat: 30.0000, lon: 70.0000, aliases: ['pakistan'] },
};
