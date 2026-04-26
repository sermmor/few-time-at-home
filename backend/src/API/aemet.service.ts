import { scheduleJob } from 'node-schedule';
import fetch from 'node-fetch';
import { SupabaseNotificationService } from './supabaseNotification.service';
import { FcmNotificationService } from './fcmNotification.service';

const AEMET_DAILY_URL = 'https://www.aemet.es/xml/municipios/localidad_29067.xml';
const AEMET_HOURLY_URL = 'https://www.aemet.es/xml/municipios_h/localidad_h_29067.xml';
const RAIN_PROBABILITY_THRESHOLD = 30;
const CITY_NAME = 'Málaga';

// Periods in hourly XML that AEMET uses for prob_precipitacion.
// AEMET encodes these as 4-digit strings (HHHH) without a hyphen separator.
const HOURLY_RAIN_PERIODS: { periodo: string; label: string }[] = [
  { periodo: '0208', label: '02:00 - 08:00' },
  { periodo: '0814', label: '08:00 - 14:00' },
  { periodo: '1420', label: '14:00 - 20:00' },
  { periodo: '2002', label: '20:00 - 02:00' },
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

// ── XML extraction helpers ────────────────────────────────────────────────────

const extractDayXml = (xml: string, dateStr: string): string | null => {
  const regex = new RegExp(`<dia fecha="${dateStr}"[^>]*>[\\s\\S]*?<\\/dia>`);
  const match = xml.match(regex);
  return match ? match[0] : null;
};

/** Extracts every <dia> block from the XML with its date attribute. */
const extractAllDayXmls = (xml: string): Array<{ date: string; xml: string }> => {
  const regex = /<dia fecha="(\d{4}-\d{2}-\d{2})"[^>]*>([\s\S]*?)<\/dia>/g;
  const days: Array<{ date: string; xml: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    days.push({ date: match[1], xml: match[0] });
  }
  return days;
};

// Sub-periods that AEMET uses in the daily XML for today / tomorrow.
const DAILY_SKY_SUBPERIODS = ['00-06', '06-12', '12-18', '18-24'] as const;

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
 * Reads the sky description from a tag WITHOUT any periodo attribute.
 * AEMET uses this format for days 5-7 where only a single global value is available.
 * e.g. <estado_cielo descripcion="Intervalos nubosos">13</estado_cielo>
 */
const getSkyDescriptionGlobal = (dayXml: string): string => {
  // Negative lookahead ensures we don't accidentally match periodo-qualified tags.
  const regex = /<estado_cielo(?![^>]*\bperiodo\b)[^>]*descripcion="([^"]*)"[^>]*>/;
  const match = dayXml.match(regex);
  return match ? match[1].trim() : '';
};

const fillGaps = (values: string[]): string[] => {
  const result = [...values];
  let last = '';
  for (let i = 0; i < result.length; i++) {
    if (result[i]) { last = result[i]; }
    else if (last) { result[i] = last; }
  }
  last = '';
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i]) { last = result[i]; }
    else if (last) { result[i] = last; }
  }
  return result;
};

const getDailySkyDescriptions = (dayXml: string): { morning: string; afternoon: string; night: string } => {
  // ── Try fine-grained periods first (days 1-2: 00-06 / 06-12 / 12-18 / 18-24)
  const raw = DAILY_SKY_SUBPERIODS.map(p => getSkyDescriptionRaw(dayXml, p));
  const filled = fillGaps(raw);
  // Indices: 0=00-06, 1=06-12 (morning), 2=12-18 (afternoon), 3=18-24 (night)
  let morning   = filled[1];
  let afternoon = filled[2];
  let night     = filled[3];

  // ── Fallback to coarser periods used from day 3 onwards (00-12 / 12-24 / 00-24)
  if (!morning)   morning   = getSkyDescriptionRaw(dayXml, '00-12') || getSkyDescriptionRaw(dayXml, '00-24');
  if (!afternoon) afternoon = getSkyDescriptionRaw(dayXml, '12-24') || getSkyDescriptionRaw(dayXml, '00-24');
  if (!night)     night     = getSkyDescriptionRaw(dayXml, '12-24') || getSkyDescriptionRaw(dayXml, '00-24');

  // ── Ultimate fallback: single global tag without any periodo (days 5-7)
  const globalSky = (!morning || !afternoon || !night) ? getSkyDescriptionGlobal(dayXml) : '';
  if (!morning)   morning   = globalSky;
  if (!afternoon) afternoon = globalSky;
  if (!night)     night     = globalSky;

  return {
    morning:   morning   || 'No disponible',
    afternoon: afternoon || 'No disponible',
    night:     night     || 'No disponible',
  };
};

const getRainProbability = (dayXml: string, periodo: string): number => {
  const escapedPeriodo = periodo.replace(/-/g, '\\-');
  const regex = new RegExp(`<prob_precipitacion[^>]*periodo="${escapedPeriodo}"[^>]*>(\\d+)<\\/prob_precipitacion>`);
  const match = dayXml.match(regex);
  return match ? parseInt(match[1], 10) : 0;
};

/**
 * Returns the rain probability for the first periodo that actually EXISTS in the XML.
 * Falls back to 0 if none of the given periods are found.
 * This handles the fact that AEMET switches from M/T/N periods (days 1-2) to
 * 00-12/12-24 periods (days 3+) in the daily XML.
 */
const getRainProbWithFallback = (dayXml: string, ...periods: string[]): number => {
  for (const periodo of periods) {
    const escapedPeriodo = periodo.replace(/-/g, '\\-');
    const match = dayXml.match(
      new RegExp(`<prob_precipitacion[^>]*periodo="${escapedPeriodo}"[^>]*>(\\d+)<\\/prob_precipitacion>`)
    );
    if (match) return parseInt(match[1], 10);
  }
  // Ultimate fallback: global tag without any periodo attribute (days 5-7)
  // e.g. <prob_precipitacion>30</prob_precipitacion>
  const globalMatch = dayXml.match(/<prob_precipitacion>(\d+)<\/prob_precipitacion>/);
  return globalMatch ? parseInt(globalMatch[1], 10) : 0;
};

const getTemperature = (dayXml: string, type: 'maxima' | 'minima'): number | null => {
  const tempBlockMatch = dayXml.match(/<temperatura>([\s\S]*?)<\/temperatura>/);
  if (!tempBlockMatch) return null;
  const typeMatch = tempBlockMatch[1].match(new RegExp(`<${type}>(-?\\d+)<\\/${type}>`));
  return typeMatch ? parseInt(typeMatch[1], 10) : null;
};

/** Wind direction + speed for a given daily periodo (e.g. "06-12"). */
const getWindForPeriod = (dayXml: string, periodo: string): { dir: string; speed: number | null } => {
  const escapedPeriodo = periodo.replace(/-/g, '\\-');
  const regex = new RegExp(`<viento[^>]*periodo="${escapedPeriodo}"[^>]*>([\\s\\S]*?)<\\/viento>`);
  const match = dayXml.match(regex);
  if (!match) return { dir: '', speed: null };
  const dirMatch  = match[1].match(/<direccion>([^<]+)<\/direccion>/);
  const speedMatch = match[1].match(/<velocidad>(\d+)<\/velocidad>/);
  return {
    dir:   dirMatch  ? dirMatch[1].trim()           : '',
    speed: speedMatch ? parseInt(speedMatch[1], 10) : null,
  };
};

/**
 * Returns wind data for the first periodo that exists in the XML.
 * AEMET uses fine-grained periods (06-12, 12-18, 18-24) for days 1-2 and
 * coarser ones (00-12, 12-24, 00-24) for days 3+.
 */
const getWindWithFallbacks = (dayXml: string, ...periods: string[]): { dir: string; speed: number | null } => {
  for (const periodo of periods) {
    const w = getWindForPeriod(dayXml, periodo);
    if (w.dir || w.speed !== null) return w;
  }
  return { dir: '', speed: null };
};

/** Highest gust recorded for any period within the day XML. Tag is racha_max (with underscore). */
const getMaxGustForDay = (dayXml: string): number | null => {
  const regex = /<racha_max[^>]*>(\d+)<\/racha_max>/g;
  let maxGust: number | null = null;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(dayXml)) !== null) {
    const val = parseInt(match[1], 10);
    if (maxGust === null || val > maxGust) maxGust = val;
  }
  return maxGust;
};

const getHumidityFromDay = (dayXml: string, type: 'maxima' | 'minima'): number | null => {
  const blockMatch = dayXml.match(/<humedad_relativa>([\s\S]*?)<\/humedad_relativa>/);
  if (!blockMatch) return null;
  const typeMatch = blockMatch[1].match(new RegExp(`<${type}>(-?\\d+)<\\/${type}>`));
  return typeMatch ? parseInt(typeMatch[1], 10) : null;
};

const getThermalSensFromDay = (dayXml: string, type: 'maxima' | 'minima'): number | null => {
  const blockMatch = dayXml.match(/<sens_termica>([\s\S]*?)<\/sens_termica>/);
  if (!blockMatch) return null;
  const typeMatch = blockMatch[1].match(new RegExp(`<${type}>(-?\\d+)<\\/${type}>`));
  return typeMatch ? parseInt(typeMatch[1], 10) : null;
};

const getUvMaxFromDay = (dayXml: string): number | null => {
  const match = dayXml.match(/<uv_max>(\d+)<\/uv_max>/);
  return match ? parseInt(match[1], 10) : null;
};

// ── Hourly helpers ────────────────────────────────────────────────────────────

/** Numeric value of an hourly tag with periodo="HH". Returns null when absent. */
const getHourlyIntValue = (dayXml: string, tag: string, hour: string): number | null => {
  const regex = new RegExp(`<${tag}[^>]*periodo="${hour}"[^>]*>(-?[\\d.]+)<\\/${tag}>`);
  const match = dayXml.match(regex);
  return match ? Math.round(parseFloat(match[1])) : null;
};

const getHourlySkyDesc = (dayXml: string, hour: string): string => {
  const patterns = [
    new RegExp(`<estado_cielo[^>]*periodo="${hour}"[^>]*descripcion="([^"]*)"[^>]*>`),
    new RegExp(`<estado_cielo[^>]*descripcion="([^"]*)"[^>]*periodo="${hour}"[^>]*>`),
  ];
  for (const regex of patterns) {
    const match = dayXml.match(regex);
    if (match) return match[1].trim();
  }
  return '';
};

const getHourlyWind = (dayXml: string, hour: string): { dir: string; speed: number | null } => {
  const regex = new RegExp(`<viento[^>]*periodo="${hour}"[^>]*>([\\s\\S]*?)<\\/viento>`);
  const match = dayXml.match(regex);
  if (!match) return { dir: '', speed: null };
  const dirMatch  = match[1].match(/<direccion>([^<]+)<\/direccion>/);
  const speedMatch = match[1].match(/<velocidad>(\d+)<\/velocidad>/);
  return {
    dir:   dirMatch  ? dirMatch[1].trim()           : '',
    speed: speedMatch ? parseInt(speedMatch[1], 10) : null,
  };
};

const getHourlyMaxGust = (dayXml: string, hour: string): number | null => {
  // AEMET uses racha_max (with underscore) in the hourly XML.
  const regex = new RegExp(`<racha_max[^>]*periodo="${hour}"[^>]*>(\\d+)<\\/racha_max>`);
  const match = dayXml.match(regex);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Maps a 0-23 hour number to its AEMET rain-probability band in the HOURLY XML.
 * AEMET encodes these as 4-digit strings without hyphens: 0208, 0814, 1420, 2002.
 */
const getRainProbForHour = (dayXml: string, hourNum: number): number => {
  let periodo: string;
  if (hourNum < 8)       periodo = '0208';  // 02:00 – 08:00
  else if (hourNum < 14) periodo = '0814';  // 08:00 – 14:00
  else if (hourNum < 20) periodo = '1420';  // 14:00 – 20:00
  else                   periodo = '2002';  // 20:00 – 02:00
  return getRainProbability(dayXml, periodo);
};

// ── Domain helpers ────────────────────────────────────────────────────────────

const descriptionIndicatesRain = (description: string): boolean => {
  const rainKeywords = ['lluvia', 'llovizna', 'chubasco', 'tormenta', 'precipitac'];
  const lower = description.toLowerCase();
  return rainKeywords.some(keyword => lower.includes(keyword));
};

const extractRainPeriods = (hourlyDayXml: string | null, dailyDayXml: string): RainPeriodInfo[] => {
  if (hourlyDayXml) {
    const hourlyPeriods = HOURLY_RAIN_PERIODS
      .map(({ periodo, label }) => ({ label, probability: getRainProbability(hourlyDayXml, periodo) }))
      .filter(({ probability }) => probability >= RAIN_PROBABILITY_THRESHOLD);
    if (hourlyPeriods.length > 0) return hourlyPeriods;
  }
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

// ── Public interfaces ─────────────────────────────────────────────────────────

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

/** One row in the daily forecast table (one per calendar day). */
export interface DailyWeatherRow {
  date:               string;
  tempMin:            number | null;
  tempMax:            number | null;
  thermalSensMin:     number | null;
  thermalSensMax:     number | null;
  humidityMin:        number | null;
  humidityMax:        number | null;
  uvMax:              number | null;
  skyMorning:         string;
  skyAfternoon:       string;
  skyNight:           string;
  rainProb:           number;
  rainProbMorning:    number;
  rainProbAfternoon:  number;
  rainProbNight:      number;
  windMorningDir:     string;
  windMorningSpeed:   number | null;
  windAfternoonDir:   string;
  windAfternoonSpeed: number | null;
  windNightDir:       string;
  windNightSpeed:     number | null;
  maxGust:            number | null;
}

/** One row in the hourly forecast table (one per hour). */
export interface HourlyWeatherRow {
  date:        string;
  hour:        string;
  temperature: number | null;
  thermalSens: number | null;
  sky:         string;
  precipMm:    number | null;
  rainProb:    number;
  windDir:     string;
  windSpeed:   number | null;
  maxGust:     number | null;
  humidity:    number | null;
}

// ── Service class ─────────────────────────────────────────────────────────────

export class AemetService {
  static Instance: AemetService;

  constructor(private sendMessageToTelegram?: (message: string) => void) {
    AemetService.Instance = this;

    if (sendMessageToTelegram) {
      scheduleJob('aemet-daily-weather', { hour: 7, minute: 0 }, async () => {
        await this.sendWeatherNotification();
      });
      scheduleJob('aemet-rain-warning', { hour: 7, minute: 3 }, async () => {
        await this.sendRainWarningIfNeeded();
      });
      scheduleJob('aemet-heat-warning', { hour: 7, minute: 5 }, async () => {
        await this.sendHeatWarningIfNeeded();
      });
      console.log('> AEMET scheduled: weather summary 07:00 · rain warning 07:03 · heat warning 07:05');
    } else {
      console.log('> AEMET service started (weather browser mode only — no Telegram)');
    }
  }

  sendWeatherNotification = async (): Promise<void> => {
    try {
      const data = await this.buildWeatherData();
      if (!data) return;

      const message = formatWeatherMessage(data);

      // Daily weather summary → Telegram only.
      // The APK fetches weather directly from AEMET XML; no push needed here.
      if (this.sendMessageToTelegram) {
        this.sendMessageToTelegram(message);
      }

    } catch (error) {
      console.error(`> AEMET: Error sending weather notification: ${error}`);
    }
  };

  /** Returns structured daily forecast for every day available in the AEMET daily XML. */
  public getWeatherAllDays = async (): Promise<DailyWeatherRow[]> => {
    const dailyXml = await this.fetchXml(AEMET_DAILY_URL);
    if (!dailyXml) return [];

    const days = extractAllDayXmls(dailyXml);
    return days.map(({ date, xml: dayXml }) => {
      const { morning: skyMorning, afternoon: skyAfternoon, night: skyNight } =
        getDailySkyDescriptions(dayXml);

      // Wind: days 1-2 use fine periods; days 3+ use coarser ones → try both.
      const windMorning   = getWindWithFallbacks(dayXml, '06-12', '00-12', '00-24');
      const windAfternoon = getWindWithFallbacks(dayXml, '12-18', '12-24', '00-24');
      const windNight     = getWindWithFallbacks(dayXml, '18-24', '12-24', '00-24');

      return {
        date,
        tempMin:            getTemperature(dayXml, 'minima'),
        tempMax:            getTemperature(dayXml, 'maxima'),
        thermalSensMin:     getThermalSensFromDay(dayXml, 'minima'),
        thermalSensMax:     getThermalSensFromDay(dayXml, 'maxima'),
        humidityMin:        getHumidityFromDay(dayXml, 'minima'),
        humidityMax:        getHumidityFromDay(dayXml, 'maxima'),
        uvMax:              getUvMaxFromDay(dayXml),
        skyMorning,
        skyAfternoon,
        skyNight,
        // Days 1-2: 00-24 period. Days 3-4: same. Days 5-7: global no-periodo tag.
        rainProb:          getRainProbWithFallback(dayXml, '00-24'),
        // Days 1-2: M/T/N. Days 3-4: 00-12/12-24. Days 5-7: global.
        rainProbMorning:   getRainProbWithFallback(dayXml, 'M', '00-12'),
        rainProbAfternoon: getRainProbWithFallback(dayXml, 'T', '12-24'),
        rainProbNight:     getRainProbWithFallback(dayXml, 'N', '12-24'),
        windMorningDir:     windMorning.dir,
        windMorningSpeed:   windMorning.speed,
        windAfternoonDir:   windAfternoon.dir,
        windAfternoonSpeed: windAfternoon.speed,
        windNightDir:       windNight.dir,
        windNightSpeed:     windNight.speed,
        maxGust:            getMaxGustForDay(dayXml),
      };
    });
  };

  /** Returns structured hourly forecast for every hour available in the AEMET hourly XML. */
  public getWeatherAllHours = async (): Promise<HourlyWeatherRow[]> => {
    const hourlyXml = await this.fetchXml(AEMET_HOURLY_URL);
    if (!hourlyXml) return [];

    const days = extractAllDayXmls(hourlyXml);
    const rows: HourlyWeatherRow[] = [];

    for (const { date, xml: dayXml } of days) {
      for (let h = 0; h < 24; h++) {
        const hour = String(h).padStart(2, '0');
        const temp = getHourlyIntValue(dayXml, 'temperatura', hour);
        if (temp === null) continue; // hour not present in XML
        const wind = getHourlyWind(dayXml, hour);
        rows.push({
          date,
          hour,
          temperature: temp,
          // Tags in AEMET hourly XML use snake_case (sens_termica, humedad_relativa)
          thermalSens: getHourlyIntValue(dayXml, 'sens_termica', hour),
          sky:         getHourlySkyDesc(dayXml, hour),
          precipMm:    getHourlyIntValue(dayXml, 'precipitacion', hour),
          rainProb:    getRainProbForHour(dayXml, h),
          windDir:     wind.dir,
          windSpeed:   wind.speed,
          maxGust:     getHourlyMaxGust(dayXml, hour),
          humidity:    getHourlyIntValue(dayXml, 'humedad_relativa', hour),
        });
      }
    }

    return rows;
  };

  private buildWeatherData = async (): Promise<WeatherData | null> => {
    const [dailyXml, hourlyXml] = await Promise.all([
      this.fetchXml(AEMET_DAILY_URL),
      this.fetchXml(AEMET_HOURLY_URL),
    ]);

    if (!dailyXml) return null;

    const today = getTodayString();
    const todayDailyXml  = extractDayXml(dailyXml, today);
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

  // ── Targeted alert notifications ────────────────────────────────────────────

  /**
   * Fired at 07:03. Sends a rain warning to Telegram + APK when today's
   * overall rain probability exceeds 10%.
   */
  private sendRainWarningIfNeeded = async (): Promise<void> => {
    try {
      const data = await this.buildWeatherData();
      if (!data) return;
      if (data.rainProbability <= 10) return;

      const lines: string[] = [
        `🌧️ AVISO DE LLUVIA — ${CITY_NAME} ${data.dateStr}`,
        '',
        `Probabilidad de lluvia hoy: ${data.rainProbability}%`,
      ];

      if (data.rainPeriods.length > 0) {
        lines.push('');
        lines.push('Franjas con mayor probabilidad:');
        for (const { label, probability } of data.rainPeriods) {
          lines.push(`  · ${label} (${probability}%)`);
        }
      }

      lines.push('');
      lines.push('Recuerda llevar paraguas o impermeable.');

      const message = lines.join('\n');

      this.sendMessageToTelegram?.(message);
      SupabaseNotificationService.Instance?.insertAlert(message, false);
      FcmNotificationService.Instance?.sendAlert(message);

      console.log(`> AEMET: Rain warning sent (${data.rainProbability}%)`);
    } catch (error) {
      console.error(`> AEMET: Error sending rain warning: ${error}`);
    }
  };

  /**
   * Fired at 07:05. Sends a heat warning to Telegram + APK when today's
   * forecast maximum temperature exceeds 35 °C.
   */
  private sendHeatWarningIfNeeded = async (): Promise<void> => {
    try {
      const data = await this.buildWeatherData();
      if (!data || data.tempMax === null) return;
      if (data.tempMax <= 35) return;

      const tempMinStr = data.tempMin !== null ? `${data.tempMin}°C` : '--';

      const lines: string[] = [
        `🌡️ ALERTA DE CALOR — ${CITY_NAME} ${data.dateStr}`,
        '',
        `Temperatura máxima prevista: ${data.tempMax}°C`,
        `Temperatura mínima prevista: ${tempMinStr}`,
        '',
        'Recomendaciones:',
        '  · Evita actividad física intensa en las horas centrales del día.',
        '  · Mantente hidratado y busca zonas de sombra.',
        '  · Protege a mayores, niños y mascotas del calor.',
      ];

      const message = lines.join('\n');

      this.sendMessageToTelegram?.(message);
      SupabaseNotificationService.Instance?.insertAlert(message, false);
      FcmNotificationService.Instance?.sendAlert(message);

      console.log(`> AEMET: Heat warning sent (max ${data.tempMax}°C)`);
    } catch (error) {
      console.error(`> AEMET: Error sending heat warning: ${error}`);
    }
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
