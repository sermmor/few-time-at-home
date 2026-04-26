/// Data models for the AEMET weather forecast.
/// These mirror the TypeScript interfaces in backend/src/API/aemet.service.ts.

class DailyWeatherRow {
  final String date;
  final int?   tempMin;
  final int?   tempMax;
  final int?   thermalSensMin;
  final int?   thermalSensMax;
  final int?   humidityMin;
  final int?   humidityMax;
  final int?   uvMax;
  final String skyMorning;
  final String skyAfternoon;
  final String skyNight;
  final int    rainProb;
  final int    rainProbMorning;
  final int    rainProbAfternoon;
  final int    rainProbNight;
  final String windMorningDir;
  final int?   windMorningSpeed;
  final String windAfternoonDir;
  final int?   windAfternoonSpeed;
  final String windNightDir;
  final int?   windNightSpeed;
  final int?   maxGust;

  const DailyWeatherRow({
    required this.date,
    this.tempMin,
    this.tempMax,
    this.thermalSensMin,
    this.thermalSensMax,
    this.humidityMin,
    this.humidityMax,
    this.uvMax,
    required this.skyMorning,
    required this.skyAfternoon,
    required this.skyNight,
    required this.rainProb,
    required this.rainProbMorning,
    required this.rainProbAfternoon,
    required this.rainProbNight,
    required this.windMorningDir,
    this.windMorningSpeed,
    required this.windAfternoonDir,
    this.windAfternoonSpeed,
    required this.windNightDir,
    this.windNightSpeed,
    this.maxGust,
  });
}

class HourlyWeatherRow {
  final String date;
  final String hour;
  final int?   temperature;
  final int?   thermalSens;
  final String sky;
  final int?   precipMm;
  final int    rainProb;
  final String windDir;
  final int?   windSpeed;
  final int?   maxGust;
  final int?   humidity;

  const HourlyWeatherRow({
    required this.date,
    required this.hour,
    this.temperature,
    this.thermalSens,
    required this.sky,
    this.precipMm,
    required this.rainProb,
    required this.windDir,
    this.windSpeed,
    this.maxGust,
    this.humidity,
  });
}
