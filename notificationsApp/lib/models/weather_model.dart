class RainPeriod {
  final String label;
  final int    probability;

  const RainPeriod({required this.label, required this.probability});

  factory RainPeriod.fromJson(Map<String, dynamic> json) => RainPeriod(
        label:       (json['label']       as String?) ?? '',
        probability: (json['probability'] as int?)    ?? 0,
      );
}

class WeatherModel {
  final String           dateStr;
  final String           skyMorning;
  final String           skyAfternoon;
  final String           skyNight;
  final int?             tempMin;
  final int?             tempMax;
  final int              rainProbability;
  final List<RainPeriod> rainPeriods;
  final bool             willRain;
  final DateTime         updatedAt;

  const WeatherModel({
    required this.dateStr,
    required this.skyMorning,
    required this.skyAfternoon,
    required this.skyNight,
    this.tempMin,
    this.tempMax,
    required this.rainProbability,
    required this.rainPeriods,
    required this.willRain,
    required this.updatedAt,
  });

  factory WeatherModel.fromJson(Map<String, dynamic> json) {
    final periodsRaw = json['rain_periods'] as List<dynamic>? ?? [];
    return WeatherModel(
      dateStr:         (json['date_str']        as String?) ?? '',
      skyMorning:      (json['sky_morning']      as String?) ?? '',
      skyAfternoon:    (json['sky_afternoon']    as String?) ?? '',
      skyNight:        (json['sky_night']        as String?) ?? '',
      tempMin:          json['temp_min']         as int?,
      tempMax:          json['temp_max']         as int?,
      rainProbability: (json['rain_probability'] as int?)   ?? 0,
      rainPeriods:     periodsRaw
          .map((e) => RainPeriod.fromJson(e as Map<String, dynamic>))
          .toList(),
      willRain:        (json['will_rain']        as bool?)  ?? false,
      updatedAt:       DateTime.parse(
        (json['updated_at'] as String?) ?? DateTime.now().toIso8601String(),
      ),
    );
  }
}
