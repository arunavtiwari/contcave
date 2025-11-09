"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ListingCard from "./ListingCard";
import useIndianCities from "@/hook/useCities";
import { SafeUser, safeListing } from "@/types";

type Props = {
  listings: safeListing[];
  currentUser?: SafeUser | null;
  autoSortByLocation?: boolean;
};

const GEO_TIMEOUT = 8000;

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function ListingFeed({ listings, currentUser, autoSortByLocation = false }: Props) {
  const { getAll } = useIndianCities();
  const cities = useMemo(() => getAll(), [getAll]);
  const [sortedListings, setSortedListings] = useState(listings);
  const [userCity, setUserCity] = useState<string | null>(null);
  const hasAttemptedSortingRef = useRef(false);
  const listingsRef = useRef(listings);

  useEffect(() => {
    listingsRef.current = listings;
    setSortedListings(listings);
  }, [listings]);

  const prioritizeListings = useCallback((cityValue: string) => {
    const baseline = listingsRef.current.map((listing, index) => ({ listing, index }));
    baseline.sort((a, b) => {
      const aMatch = Number(a.listing.locationValue === cityValue);
      const bMatch = Number(b.listing.locationValue === cityValue);
      if (aMatch !== bMatch) {
        return bMatch - aMatch;
      }
      return a.index - b.index;
    });
    setSortedListings(baseline.map((item) => item.listing));
  }, []);

  useEffect(() => {
    if (!autoSortByLocation || typeof window === "undefined" || hasAttemptedSortingRef.current) {
      return;
    }
    if (!("geolocation" in navigator)) {
      hasAttemptedSortingRef.current = true;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        hasAttemptedSortingRef.current = true;
        const { latitude, longitude } = position.coords;
        let closestCityValue: string | null = null;
        let closestDistance = Number.POSITIVE_INFINITY;

        cities.forEach((city) => {
          if (!Array.isArray(city.latlng) || city.latlng.length < 2) return;
          const [cityLat, cityLon] = city.latlng;
          const distance = haversineDistance(latitude, longitude, cityLat, cityLon);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestCityValue = city.value;
          }
        });

        if (closestCityValue) {
          setUserCity(closestCityValue);
          prioritizeListings(closestCityValue);
        }
      },
      () => {
        hasAttemptedSortingRef.current = true;
      },
      { enableHighAccuracy: false, timeout: GEO_TIMEOUT }
    );
  }, [autoSortByLocation, cities, prioritizeListings]);

  const userCityLabel = useMemo(() => {
    if (!userCity) return null;
    return cities.find((city) => city.value === userCity)?.label ?? userCity;
  }, [cities, userCity]);

  return (
    <div className="space-y-4">
      {userCityLabel && (
        <p className="text-sm text-neutral-600">
          Showing spaces near <span className="font-semibold">{userCityLabel}</span>
        </p>
      )}
      <div className="pb-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 overflow-x-hidden">
        {sortedListings.map((item) => (
          <ListingCard key={item.id} data={item} currentUser={currentUser} />
        ))}
      </div>
    </div>
  );
}

export default ListingFeed;
