"use client";

import { useCallback, useEffect, useState } from "react";
import { getOrCreateDeviceId } from "@/lib/device-id";

/**
 * Kirjaajanne — Stripe-maksuintegraatio (SaaS-maksumuuri).
 *
 * Hakee käyttäjän (device_id:n) tilaustilanteen `/api/subscription-status`-
 * reitiltä ja tarjoaa `startCheckout()`-funktion, joka luo Stripe Checkout
 * -session `/api/checkout`-reitin kautta ja ohjaa selaimen sinne.
 *
 * TIETOTURVA: Client käsittelee ainoastaan julkisia tietoja (tilan nimi,
 * deviceId) — Stripen ja Supabasen salaiset avaimet eivät koskaan kulje
 * tämän hookin kautta, ne pysyvät palvelimen `/api/*`-reiteillä.
 */

export type SubscriptionStatus =
  | "loading"
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "error"
  | "unconfigured";

export interface SubscriptionState {
  status: SubscriptionStatus;
  isActive: boolean;
  isLoading: boolean;
  isStartingCheckout: boolean;
  startCheckout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const [status, setStatus] = useState<SubscriptionStatus>("loading");
  const [isActive, setIsActive] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);

  // Huom: haku on tarkoituksella toteutettu Promise-ketjuna (`.then`/`.catch`)
  // eikä `async/await`-funktiona jota kutsuttaisiin suoraan effektin
  // rungosta — sama malli kuin `dictation-panel.tsx`:n sanelupohjien haussa.
  // Tämä välttää `react-hooks/set-state-in-effect`-säännön laukeamisen,
  // koska setState-kutsut tapahtuvat vasta asynkronisessa `.then`-
  // callbackissa, ei effektin synkronisessa suoritusosassa.
  const fetchStatus = useCallback((): Promise<void> => {
    const deviceId = getOrCreateDeviceId();
    return fetch(`/api/subscription-status?deviceId=${encodeURIComponent(deviceId)}`)
      .then((response) => response.json())
      .then((data: { isActive?: boolean; status?: SubscriptionStatus }) => {
        setIsActive(Boolean(data.isActive));
        setStatus(data.status ?? "error");
      })
      .catch((fetchError) => {
        console.error(
          "[Kirjaajanne] Tilaustilanteen haku (/api/subscription-status) epäonnistui:",
          fetchError
        );
        setStatus("error");
        setIsActive(false);
      });
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Julkinen `refresh()`-funktio (esim. Checkoutista paluun jälkeen) —
  // tätä kutsutaan aina tapahtumakäsittelijästä/effektin `.then`-
  // haarasta, ei koskaan suoraan effektin synkronisesta rungosta.
  const refresh = fetchStatus;

  const startCheckout = useCallback(async () => {
    setIsStartingCheckout(true);
    try {
      const deviceId = getOrCreateDeviceId();
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          errorBody?.error || `Checkoutin käynnistys epäonnistui (tila ${response.status}).`
        );
      }

      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error("Checkout-session URL-osoitetta ei vastaanotettu.");
      }

      // Ohjataan selain suoraan Stripen isännöimään Checkout-sivuun.
      window.location.href = data.url;
    } catch (checkoutError) {
      console.error(
        "[Kirjaajanne] Stripe Checkoutin käynnistys epäonnistui:",
        checkoutError
      );
      setIsStartingCheckout(false);
      throw checkoutError;
    }
  }, []);

  return {
    status,
    isActive,
    isLoading: status === "loading",
    isStartingCheckout,
    startCheckout,
    refresh,
  };
}
