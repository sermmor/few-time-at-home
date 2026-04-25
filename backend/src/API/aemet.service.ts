import { scheduleJob } from 'node-schedule';
import fetch from 'node-fetch';
import { MailService } from './mail.service';
import { SupabaseNotificationService } from './supabaseNotification.service';
import { FcmNotificationService } from './fcmNotification.service';

const AEMET_DAILY_URL = 'https://www.aemet.es/xml/municipios/localidad_29067.xml';
const AEMET_HOURLY_URL = 'https://www.aemet.es/xml/municipios_h/localidad_h_29067.xml';
const RAIN_PROBABILITY_THRESHOLD = 30;
const CITY_NAME = 'Málaga';

// Periods in hourly XML that AEMET uses for prob_precipitacion
const HOURLY_RAIN_PERIODS: { periodo: string; label: string }[] = [
  { periodo: '00-06', label: '00:00 - 06:00' },
  { periodo: '07-12', label: '07:00 - 12:00' },
  { periodo: '13-18', label: '13:00 - 18:00' },
  { periodo: '19-24', label: '19:00 - 24:00' },
];

// Periods in daily XML (M=Mañana, T=Tarde, N=Noche) as fallback
const DAILY_RAIN_PERIODS: { periodo: string; label: string }[] = [
  { periodo: 'M', label: 'Mañana (07:00 - 13:00)' },
  { periodo: 'T', label: 'Tarde (13:00 - 19:00)' },
  { periodo: 'N', label: 'Noche (19:00 - 07:00)' },
];

const getTodayString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getSpanishDateString = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
};

const extractDayXml = (xml: string, dateStr: string): string | null => {
  const regex = new RegExp(`<dia fecha="${dateStr}"[^>]*>[\\s\\S]*?<\\/dia>`);
  const match = xml.match(regex);
  return match ? match[0] : null;
};

// Sub-periods that AEMET uses in the daily XML for today / tomorrow.
// Index 0 = 00-06 (pre-dawn), 1 = 06-12 (Mañana), 2 = 12-18 (Tarde), 3 = 18-24 (Noche).
const DAILY_SKY_SUBPERIODS = ['00-06', '06-12', '12-18', '18-24'] as const;

/**
 * Extracts the `descripcion` attribute of <estado_cielo> for one sub-period.
 * Returns '' (empty string) when the period is absent or its description is empty,
 * so callers can distinguish "no data" from "data is No disponible".
 */
const getSkyDescriptionRaw = (dayXml: string, periodo: string): string => {
  const patterns = [
    new RegExp(`<estado_cielo[^>]*periodo="${periodo}"[^>]*descripcion="([^"]*)"[^>]*>`),
    new RegExp(`<estado_cielo[^>]*descripcion="([^"]*)"[^>]*periodo="${periodo}"[^>]*>`),
  ];
  for (const regex of patterns) {
    const match = dayXml.match(regex);
    if (match) return match[1].trim();
  }
  return '';
};

/**
 * Fills empty slots in a string array with adjacent non-empty values.
 * Rule: prefer the nearest PREVIOUS non-empty value; if none exists, use the nearest NEXT.
 */
const fillGaps = (values: string[]): string[] => {
  const result = [...values];

  // Forward pass — propagate last known value rightward.
  let last = '';
  for (let i = 0; i < result.length; i++) {
    if (result[i]) { last = result[i]; }
    else if (last) { result[i] = last; }
  }

  // Backward pass — fill any remaining empties from the nearest future value.
  last = '';
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i]) { last = result[i]; }
    else if (last) { result[i] = last; }
  }

  return result;
};

/**
 * Returns sky descriptions for Morning (06-12), Afternoon (12-18) and Night (18-24).
 * Empty sub-periods are filled from the nearest non-empty one (previous first, then next),
 * so a day with only one populated sub-period propagates that description to all three slots.
 */
const getDailySkyDescriptions = (dayXml: string): { morning: string; afternoon: string; night: string } => {
  const raw = DAILY_SKY_SUBPERIODS.map(p => getSkyDescriptionRaw(dayXml, p));
  const filled = fillGaps(raw);
  // Indices: 0=00-06, 1=06-12 (morning), 2=12-18 (afternoon), 3=18-24 (night)
  return {
    morning:   filled[1] || 'No disponible',
    afternoon: filled[2] || 'No disponible',
    night:     filled[3] || 'No disponible',
  };
};

// Extracts the numeric content of <prob_precipitacion> for a given periodo
const getRainProbability = (dayXml: string, periodo: string): number => {
  const escapedPeriodo = periodo.replace('-', '\\-');
  const regex = new RegExp(`<prob_precipitacion[^>]*periodo="${escapedPeriodo}"[^>]*>(\\d+)<\\/prob_precipitacion>`);
  const match = dayXml.match(regex);
  return match ? parseInt(match[1], 10) : 0;
};

/** Returns the temperature value, or null when the XML element is absent. */
const getTemperature = (dayXml: string, type: 'maxima' | 'minima'): number | null => {
  const tempBlockMatch = dayXml.match(/<temperatura>([\s\S]*?)<\/temperatura>/);
  if (!tempBlockMatch) return null;
  const typeMatch = tempBlockMatch[1].match(new RegExp(`<${type}>(\\d+)<\\/${type}>`));
  return typeMatch ? parseInt(typeMatch[1], 10) : null;
};

const descriptionIndicatesRain = (description: string): boolean => {
  const rainKeywords = ['lluvia', 'llovizna', 'chubasco', 'tormenta', 'precipitac'];
  const lower = description.toLowerCase();
  return rainKeywords.some(keyword => lower.includes(keyword));
};

export interface RainPeriodInfo {
  label:       string;
  probability: number;
}

/** Structured weather data — shared with Supabase and FCM. */
export interface WeatherData {
  dateStr:         string;
  skyMorning:      string;
  skyAfternoon:    string;
  skyNight:        string;
  tempMin:         number | null;
  tempMax:         number | null;
  rainProbability: number;
  rainPeriods:     RainPeriodInfo[];
  willRain:        boolean;
}

const extractRainPeriods = (hourlyDayXml: string | null, dailyDayXml: string): RainPeriodInfo[] => {
  // Try hourly XML first
  if (hourlyDayXml) {
    const hourlyPeriods = HOURLY_RAIN_PERIODS
      .map(({ periodo, label }) => ({ label, probability: getRainProbability(hourlyDayXml, periodo) }))
      .filter(({ probability }) => probability >= RAIN_PROBABILITY_THRESHOLD);

    if (hourlyPeriods.length > 0) return hourlyPeriods;
  }

  // Fall back to daily M/T/N periods
  return DAILY_RAIN_PERIODS
    .map(({ periodo, label }) => ({ label, probability: getRainProbability(dailyDayXml, periodo) }))
    .filter(({ probability }) => probability >= RAIN_PROBABILITY_THRESHOLD);
};

const formatWeatherMessage = (data: WeatherData): string => {
  const tempMinStr = data.tempMin !== null ? `${data.tempMin}` : '--';
  const tempMaxStr = data.tempMax !== null ? `${data.tempMax}` : '--';

  const lines: string[] = [
    `Tiempo en ${CITY_NAME} - ${data.dateStr}`,
    '',
    `Mañana: ${data.skyMorning}`,
    `Tarde: ${data.skyAfternoon}`,
    `Noche: ${data.skyNight}`,
    '',
    `Temperatura: min. ${tempMinStr} grados / max. ${tempMaxStr} grados`,
  ];

  if (data.willRain) {
    lines.push('');
    if (data.rainPeriods.length > 0) {
      lines.push('Lluvia prevista en las siguientes franjas horarias:');
      for (const { label, probability } of data.rainPeriods) {
        lines.push(`  - ${label} (${probability}%)`);
      }
    } else {
      lines.push(`Probabilidad de lluvia: ${data.rainProbability}%`);
    }
  } else {
    lines.push('');
    lines.push('Sin prevision de lluvia.');
  }

  return lines.join('\n');
};

export class AemetService {
  constructor(private sendMessageToTelegram: (message: string) => void) {
    scheduleJob('aemet-daily-weather', { hour: 7, minute: 0 }, async () => {
      await this.sendWeatherNotification();
    });
    console.log('> AEMET weather notification scheduled daily at 07:00');
  }

  sendWeatherNotification = async (): Promise<void> => {
    try {
      const data = await this.buildWeatherData();
      if (!data) return;

      const message = formatWeatherMessage(data);

      // Telegram + email (existing channels)
      this.sendMessageToTelegram(message);
      // MailService.Instance.sendMessageByEmail(`Tiempo en ${CITY_NAME}`, message);

      // Supabase: upsert structured forecast so the Flutter app can display it
      SupabaseNotificationService.Instance?.upsertWeather(data);

      // FCM: push a brief summary notification to the 'ftah_weather' topic
      const tempStr = data.tempMin !== null && data.tempMax !== null
        ? `${data.tempMin}-${data.tempMax}°C`
        : 'temp. no disponible';
      const rainStr = data.willRain
        ? `Lluvia ${data.rainProbability}%`
        : 'Sin lluvia';
      const fcmSummary = `${data.skyMorning} · ${tempStr} · ${rainStr}`;
      FcmNotificationService.Instance?.sendWeatherNotification(fcmSummary);

    } catch (error) {
      console.error(`> AEMET: Error sending weather notification: ${error}`);
    }
  };

  private buildWeatherData = async (): Promise<WeatherData | null> => {
    const [dailyXml, hourlyXml] = await Promise.all([
      this.fetchXml(AEMET_DAILY_URL),
      this.fetchXml(AEMET_HOURLY_URL),
    ]);

    if (!dailyXml) return null;

    const today = getTodayString();
    const todayDailyXml = extractDayXml(dailyXml, today);
    const todayHourlyXml = hourlyXml ? extractDayXml(hourlyXml, today) : null;

    if (!todayDailyXml) {
      console.error(`> AEMET: No daily data found for ${today}`);
      return null;
    }

    const { morning: skyMorning, afternoon: skyAfternoon, night: skyNight } =
      getDailySkyDescriptions(todayDailyXml);
    const tempMax    = getTemperature(todayDailyXml, 'maxima');
    const tempMin    = getTemperature(todayDailyXml, 'minima');
    const rainProb   = getRainProbability(todayDailyXml, '00-24');
    const rainPeriods = extractRainPeriods(todayHourlyXml, todayDailyXml);
    const willRain   =
      rainProb >= RAIN_PROBABILITY_THRESHOLD ||
      descriptionIndicatesRain(skyMorning) ||
      descriptionIndicatesRain(skyAfternoon) ||
      descriptionIndicatesRain(skyNight);

    return {
      dateStr:         getSpanishDateString(),
      skyMorning,
      skyAfternoon,
      skyNight,
      tempMin,
      tempMax,
      rainProbability: rainProb,
      rainPeriods,
      willRain,
    };
  };

  private fetchXml = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FewTimeAtHome/1.0)' },
      });
      if (!response.ok) {
        console.error(`> AEMET: HTTP error ${response.status} fetching ${url}`);
        return null;
      }
      return await response.text();
    } catch (error) {
      console.error(`> AEMET: Error fetching ${url}: ${error}`);
      return null;
    }
  };
}
