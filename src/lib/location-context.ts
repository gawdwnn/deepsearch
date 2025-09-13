import { geolocation } from "@vercel/functions";

export interface UserLocation {
  latitude?: string;
  longitude?: string;
  city?: string;
  country?: string;
}


export function getLocationFromRequest(request: Request): UserLocation {
  // Mock location data for development
  if (process.env.NODE_ENV === "development") {
    request.headers.set("x-vercel-ip-country", "CA");
    request.headers.set("x-vercel-ip-country-region", "ON");
    request.headers.set("x-vercel-ip-city", "London");
  }

  const { longitude, latitude, city, country } = geolocation(request);

  return {
    longitude,
    latitude,
    city,
    country,
  };
}