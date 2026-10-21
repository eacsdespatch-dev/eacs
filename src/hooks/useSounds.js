/* ═══════════════════════════════════════════════════════════
 * useSounds — إدارة الأصوات + أصوات التنبيه
 * ═══════════════════════════════════════════════════════════ */
import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";
import {
  setSoundsEnabled as setSoundsEnabledModule,
  setSoundsVolume as setSoundsVolumeModule,
  setAlertSoundsEnabled as setAlertSoundsEnabledModule,
} from "../utils/sounds";

export function useSounds() {
  /* ⭐ الأصوات العامة */
  const [soundsEnabled, setSoundsEnabled] = useLocalStorage(
    "aeroops.soundsEnabled",
    true
  );

  /* ⭐ مستوى الصوت */
  const [soundsVolume, setSoundsVolume] = useLocalStorage(
    "aeroops.soundsVolume",
    0.5
  );

  /* ⭐ أصوات التنبيه (منفصلة) */
  const [alertSoundsEnabled, setAlertSoundsEnabled] = useLocalStorage(
    "aeroops.alertSoundsEnabled",
    true
  );

  /* ⭐ Sync with module */
  useEffect(() => {
    setSoundsEnabledModule(soundsEnabled);
  }, [soundsEnabled]);

  useEffect(() => {
    setSoundsVolumeModule(soundsVolume);
  }, [soundsVolume]);

  useEffect(() => {
    setAlertSoundsEnabledModule(alertSoundsEnabled);
  }, [alertSoundsEnabled]);

  return {
    soundsEnabled,
    setSoundsEnabled,
    soundsVolume,
    setSoundsVolume,
    alertSoundsEnabled,
    setAlertSoundsEnabled,
  };
}
