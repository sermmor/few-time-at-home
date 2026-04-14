import { scheduleJob } from 'node-schedule';
import fetch from 'node-fetch';
import { MailService } from './mail.service';

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

// Extracts the descripcion attribute of <estado_cielo> for a given periodo
const getSkyDescription = (dayXml: string, periodo: string): string => {
  const patterns = [
    new RegExp(`<estado_cielo[^>]*periodo="${periodo}"[^>]*descripcion="([^"]*)"[^>]*>`),
    new RegExp(`<estado_cielo[^>]*descripcion="([^"]*)"[^>]*periodo="${periodo}"[^>]*>`),
  ];
  for (const regex of patterns) {
    const match = dayXml.match(regex);
    if (match) return match[1];
  }
  return 'No disponible';
};

// Extracts the numeric content of <prob_precipitacion> for a given periodo
const getRainProbability = (dayXml: string, periodo: string): number => {
  const escapedPeriodo = periodo.replace('-', '\\-');
  const regex = new RegExp(`<prob_precipitacion[^>]*periodo="${escapedPeriodo}"[^>]*>(\\d+)<\\/prob_precipitacion>`);
  const match = dayXml.match(regex);
  return match ? parseInt(match[1], 10) : 0;
};

const getTemperature = (dayXml: string, type: 'maxima' | 'minima'): string => {
  const tempBlockMatch = dayXml.match(/<temperatura>([\s\S]*?)<\/temperatura>/);
  if (!tempBlockMatch) return '--';
  const typeMatch = tempBlockMatch[1].match(new RegExp(`<${type}>(\\d+)<\\/${type}>`));
  return typeMatch ? typeMatch[1] : '--';
};

const descriptionIndicatesRain = (description: string): boolean => {
  const rainKeywords = ['lluvia', 'llovizna', 'chubasco', 'tormenta', 'precipitac'];
  const lower = description.toLowerCase();
  return rainKeywords.some(keyword => lower.includes(keyword));
};

interface RainPeriodInfo {
  label: string;
  probability: number;
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

const formatWeatherMessage = (
  skyMorning: string,
  skyAfternoon: string,
  skyNight: string,
  tempMax: string,
  tempMin: string,
  rainProb: number,
  rainPeriods: RainPeriodInfo[],
  dateStr: string,
): string => {
  const willRain =
    rainProb >= RAIN_PROBABILITY_THRESHOLD ||
    descriptionIndicatesRain(skyMorning) ||
    descriptionIndicatesRain(skyAfternoon) ||
    descriptionIndicatesRain(skyNight);

  const lines: string[] = [
    `Tiempo en ${CITY_NAME} - ${dateStr}`,
    '',
    `Manana: ${skyMorning}`,
    `Tarde: ${skyAfternoon}`,
    `Noche: ${skyNight}`,
    '',
    `Temperatura: min. ${tempMin} grados / max. ${tempMax} grados`,
  ];

  if (willRain) {
    lines.push('');
    if (rainPeriods.length > 0) {
      lines.push('Lluvia prevista en las siguientes franjas horarias:');
      for (const { label, probability } of rainPeriods) {
        lines.push(`  - ${label} (${probability}%)`);
      }
    } else {
      lines.push(`Probabilidad de lluvia: ${rainProb}%`);
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
      const message = await this.buildWeatherMessage();
      if (message) {
        this.sendMessageToTelegram(message);
        MailService.Instance.sendMessageByEmail(`Tiempo en ${CITY_NAME}`, message);
      }
    } catch (error) {
      console.error(`> AEMET: Error sending weather notification: ${error}`);
    }
  };

  private buildWeatherMessage = async (): Promise<string | null> => {
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

    const skyMorning = getSkyDescription(todayDailyXml, 'M');
    const skyAfternoon = getSkyDescription(todayDailyXml, 'T');
    const skyNight = getSkyDescription(todayDailyXml, 'N');
    const tempMax = getTemperature(todayDailyXml, 'maxima');
    const tempMin = getTemperature(todayDailyXml, 'minima');
    const rainProb = getRainProbability(todayDailyXml, '00-24');
    const rainPeriods = extractRainPeriods(todayHourlyXml, todayDailyXml);

    return formatWeatherMessage(
      skyMorning,
      skyAfternoon,
      skyNight,
      tempMax,
      tempMin,
      rainProb,
      rainPeriods,
      getSpanishDateString(),
    );
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
