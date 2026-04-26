import { weatherDailyEndpoint, weatherHourlyEndpoint } from '../urls-and-end-points';

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

const getDaily = async (): Promise<DailyWeatherRow[]> => {
  const res = await fetch(weatherDailyEndpoint());
  if (!res.ok) return [];
  const json = await res.json();
  return json.rows ?? [];
};

const getHourly = async (): Promise<HourlyWeatherRow[]> => {
  const res = await fetch(weatherHourlyEndpoint());
  if (!res.ok) return [];
  const json = await res.json();
  return json.rows ?? [];
};

export const WeatherActions = { getDaily, getHourly };
