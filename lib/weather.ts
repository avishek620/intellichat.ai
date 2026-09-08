const WEATHER_CODE_MAP: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export interface GeoResult {
  name: string;
  lat: number;
  lon: number;
  country?: string;
}

export interface WeatherResult {
  temp: number;
  humidity: number;
  windSpeed: number;
  description: string;
  time: string;
}

export async function geocodeLocation(query: string): Promise<GeoResult | null> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.results?.[0];
    if (!result) return null;
    return {
      name: `${result.name}${result.admin1 ? ", " + result.admin1 : ""}${result.country ? ", " + result.country : ""}`,
      lat: result.latitude,
      lon: result.longitude,
      country: result.country,
    };
  } catch (err) {
    console.error("Geocoding failed:", err);
    return null;
  }
}

export async function getLocationFromIP(ip: string): Promise<GeoResult | null> {
  try {
    if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip === "::1") return null;

    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error || !data.latitude) return null;

    return {
      name: `${data.city}${data.region ? ", " + data.region : ""}${data.country_name ? ", " + data.country_name : ""}`,
      lat: data.latitude,
      lon: data.longitude,
      country: data.country_name,
    };
  } catch (err) {
    console.error("IP geolocation failed:", err);
    return null;
  }
}

export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherResult | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const c = data.current;
    if (!c) return null;

    return {
      temp: c.temperature_2m,
      humidity: c.relative_humidity_2m,
      windSpeed: c.wind_speed_10m,
      description: WEATHER_CODE_MAP[c.weather_code] || "Unknown conditions",
      time: c.time,
    };
  } catch (err) {
    console.error("Weather fetch failed:", err);
    return null;
  }
}