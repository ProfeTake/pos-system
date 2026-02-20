import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { toast } from "sonner";
import {
  refreshBusinessHoursCache,
  formatTime,
} from "../../../utils/businessHours";
import { settingsService } from "../../../services/settings.service";
import { Clock, ArrowRight, Copy, ChevronRight, Sun, Moon } from "lucide-react";

type BHDay = {
  open: boolean;
  openTime: string; // "HH:MM"
  closeTime: string; // "HH:MM"
  closeNextDay: boolean;
};

type BusinessHoursV2 = {
  // 0..6 = Domingo..Sábado
  week: Record<string, BHDay>;
};

type LegacyBusinessHoursSetting = {
  openingHour: number;
  openingMinute: number;
  closeMinutesByWeekday: Record<string, number>;
};

type SettingsObject = {
  businessHoursV2?: BusinessHoursV2;
  businessHours?: LegacyBusinessHoursSetting; // compat
  lowStockThreshold?: number | null;
  requireCashSession?: boolean;
};

async function fetchSettings(): Promise<SettingsObject> {
  return await settingsService.getSettings();
}

async function saveSetting(key: string, value: any) {
  await settingsService.updateSetting(key, value);
}

const wdNames: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

export default function ScheduleControl() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsObject>({});
  const [currentCloseAt, setCurrentCloseAt] = useState<Date | null>(null);

  // carga inicial
  useEffect(() => {
    (async () => {
      try {
        const s = await fetchSettings();
        setSettings(s || {});
      } catch (e: any) {
        console.error(e);
        toast.error("No se pudo cargar configuraciones");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Cargar cierre actual del turno (si existe) para mostrar feedback en UI
  useEffect(() => {
    (async () => {
      try {
        const cs = await settingsService.getCashSession();
        if (cs?.open && cs?.windowClose)
          setCurrentCloseAt(new Date(cs.windowClose));
        else setCurrentCloseAt(null);
      } catch {
        setCurrentCloseAt(null);
      }
    })();
  }, [loading]);

  const bhV2 = useMemo<BusinessHoursV2>(() => {
    // defaults basados en regla actual
    const defWeek: Record<string, BHDay> = {
      "0": {
        open: true,
        openTime: "10:00",
        closeTime: "01:30",
        closeNextDay: true,
      },
      "1": {
        open: true,
        openTime: "10:00",
        closeTime: "01:30",
        closeNextDay: true,
      },
      "2": {
        open: true,
        openTime: "10:00",
        closeTime: "01:30",
        closeNextDay: true,
      },
      "3": {
        open: true,
        openTime: "10:00",
        closeTime: "01:30",
        closeNextDay: true,
      },
      "4": {
        open: true,
        openTime: "10:00",
        closeTime: "01:30",
        closeNextDay: true,
      },
      "5": {
        open: true,
        openTime: "10:00",
        closeTime: "03:30",
        closeNextDay: true,
      },
      "6": {
        open: true,
        openTime: "10:00",
        closeTime: "01:30",
        closeNextDay: true,
      },
    };
    // migración desde legacy si no existe V2
    if (settings.businessHoursV2?.week) {
      return { week: { ...defWeek, ...settings.businessHoursV2.week } };
    }
    const leg = settings.businessHours;
    if (leg) {
      const week: Record<string, BHDay> = { ...defWeek };
      const openH = leg.openingHour ?? 10;
      const openM = leg.openingMinute ?? 0;
      const opStr = `${String(openH).padStart(2, "0")}:${String(openM).padStart(
        2,
        "0"
      )}`;
      for (const k of Object.keys(week)) {
        const mins = leg.closeMinutesByWeekday?.[k] ?? (k === "5" ? 210 : 90);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        week[k] = {
          open: true,
          openTime: opStr,
          closeTime: `${String(h).padStart(2, "0")}:${String(m).padStart(
            2,
            "0"
          )}`,
          closeNextDay: true,
        };
      }
      return { week };
    }
    return { week: defWeek };
  }, [settings]);

  // Helper: convertir "HH:MM" a minutos desde 00:00
  function timeToMinutes(t: string | undefined) {
    const [h, m] = String(t || "00:00")
      .split(":")
      .map((x) => parseInt(x || "0", 10));
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  }

  // Helpers 24h <-> 12h
  function parse24To12(t: string): {
    h12: number;
    m: number;
    ampm: "AM" | "PM";
  } {
    const [hh, mm] = String(t || "00:00")
      .split(":")
      .map((x) => parseInt(x || "0", 10));
    const h = isNaN(hh) ? 0 : hh;
    const m = isNaN(mm) ? 0 : mm;
    const ampm: "AM" | "PM" = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return { h12, m, ampm };
  }
  function to24From12(h12: number, m: number, ampm: "AM" | "PM"): string {
    let h = h12 % 12;
    if (ampm === "PM") h += 12;
    if (ampm === "AM" && h12 === 12) h = 0; // 12 AM => 00
    const hs = String(h).padStart(2, "0");
    const ms = String(m).padStart(2, "0");
    return `${hs}:${ms}`;
  }

  async function saveBusinessHours() {
    setSaving(true);
    try {
      // Normalizar closeNextDay según horas (evita estados inconsistentes)
      const normalized = {
        week: Object.fromEntries(
          Object.entries(bhV2.week).map(([k, v]) => {
            const openM = timeToMinutes(v.openTime);
            const closeM = timeToMinutes(v.closeTime);
            const autoNextDay = closeM <= openM;
            return [k, { ...v, closeNextDay: autoNextDay }];
          })
        ),
      } as BusinessHoursV2;
      await saveSetting("businessHoursV2", normalized);
      toast.success("Horarios guardados");
      try {
        await refreshBusinessHoursCache();
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent("businessHours:changed"));
      } catch {}
      // Intentar aplicar automáticamente al turno abierto (si existe)
      try {
        await settingsService.recalculateWindow("current");
        try {
          window.dispatchEvent(new CustomEvent("cash:session-changed"));
        } catch {}
      } catch {}
      // Aviso del nuevo cierre y minutos restantes
      try {
        const cs = await settingsService.getCashSession();
        if (cs?.open && cs?.windowClose) {
          const closeAt = new Date(cs.windowClose);
          setCurrentCloseAt(closeAt);
          const minutes = Math.max(
            0,
            Math.floor((closeAt.getTime() - Date.now()) / 60000)
          );
          toast.info(
            `Cierre actualizado: hoy a ${formatTime(
              closeAt
            )} (quedan ${minutes} min)`
          );
          try {
            sessionStorage.setItem(
              "pos.settings.justSavedAt",
              String(Date.now())
            );
          } catch {}
        }
      } catch {}
      // Releer settings desde el backend para reflejar exactamente lo persistido
      try {
        const fresh = await fetchSettings();
        setSettings(fresh || {});
      } catch {}
    } catch (e: any) {
      console.error(e);
      toast.error("Error al guardar horarios");
    } finally {
      setSaving(false);
    }
  }

  async function applyToCurrentShift() {
    setSaving(true);
    try {
      // Primero asegurar que el backend recargó settings
      await settingsService.getSettings().catch(() => {});
      await settingsService.recalculateWindow("current");
      toast.success("Turno actualizado con nuevo horario de cierre");
      try {
        window.dispatchEvent(new CustomEvent("cash:session-changed"));
      } catch {}
      // Aviso del nuevo cierre tras aplicar al turno
      try {
        const cs = await settingsService.getCashSession();
        if (cs?.open && cs?.windowClose) {
          const closeAt = new Date(cs.windowClose);
          setCurrentCloseAt(closeAt);
          const minutes = Math.max(
            0,
            Math.floor((closeAt.getTime() - Date.now()) / 60000)
          );
          toast.info(
            `Cierre actualizado: hoy a ${formatTime(
              closeAt
            )} (quedan ${minutes} min)`
          );
          try {
            sessionStorage.setItem(
              "pos.settings.justSavedAt",
              String(Date.now())
            );
          } catch {}
        }
      } catch {}
    } catch (e: any) {
      console.error(e);
      toast.error(
        e?.message || "No se pudo aplicar el horario al turno actual"
      );
    } finally {
      setSaving(false);
    }
  }

  function setWeekDay(idx: string, patch: Partial<BHDay>) {
    setSettings((s) => ({
      ...s,
      businessHoursV2: {
        week: {
          ...(bhV2.week || {}),
          [idx]: { ...bhV2.week[idx], ...patch },
        },
      },
    }));
  }

  function copyDayToRange(from: string, range: string[]) {
    const src = bhV2.week[from];
    setSettings((s) => ({
      ...s,
      businessHoursV2: {
        week: range.reduce((acc, k) => ({ ...acc, [k]: { ...src } }), {
          ...bhV2.week,
        }),
      },
    }));
  }

  async function saveRequireCashSession() {
    setSaving(true);
    try {
      await saveSetting(
        "requireCashSession",
        settings.requireCashSession ?? false
      );
      toast.success("Configuración guardada");
      try {
        await refreshBusinessHoursCache();
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent("businessHours:changed"));
      } catch {}
    } catch (e: any) {
      console.error(e);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Cargando configuraciones...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>Control de Horario</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configura los horarios de operación de tu tienda por día de la
              semana
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyDayToRange("1", ["1", "2", "3", "4"])}
              title="Copiar lunes a L–J"
            >
              <Copy className="size-4 mr-1" /> Copiar L{" "}
              <ArrowRight className="size-4 inline mx-1" /> L–J
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                copyDayToRange("1", ["0", "1", "2", "3", "4", "5", "6"])
              }
              title="Copiar lunes a toda la semana"
            >
              <Copy className="size-4 mr-1" /> Copiar L{" "}
              <ArrowRight className="size-4 inline mx-1" /> todos
            </Button>
            <Button onClick={saveBusinessHours} disabled={saving} size="sm">
              Guardar horarios
            </Button>
            <Button
              variant="outline"
              onClick={applyToCurrentShift}
              disabled={saving}
              size="sm"
              title="Recalcula el cierre del turno abierto con los nuevos horarios"
            >
              Aplicar al turno actual
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentCloseAt && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              Cierre actual del turno: <b>{formatTime(currentCloseAt)}</b>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="[&>*]:py-2">
                  <TableHead className="w-32">Día</TableHead>
                  <TableHead className="w-28">Abierto</TableHead>
                  <TableHead>Horario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(wdNames).map(([idx, name]) => {
                  const row = bhV2.week[idx];
                  const open12 = parse24To12(row.openTime);
                  const close12 = parse24To12(row.closeTime);
                  return (
                    <TableRow key={idx} className="[&>*]:py-2">
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>
                        <div className="scale-90 origin-left">
                          <Switch
                            checked={row.open}
                            onCheckedChange={(v) =>
                              setWeekDay(idx, { open: v })
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 max-w-xl">
                          <span className="relative inline-flex items-center justify-center w-4 h-4 text-muted-foreground">
                            <Clock className="size-4" />
                            <Sun className="size-3 absolute -bottom-0.5 -right-0.5 text-amber-400" />
                          </span>
                          <Input
                            type="time"
                            step={60}
                            className="h-8 px-2 w-28"
                            value={row.openTime}
                            onChange={(e) => {
                              const nextOpen = e.target.value || "10:00";
                              const openM = timeToMinutes(nextOpen);
                              const closeM = timeToMinutes(row.closeTime);
                              const autoNextDay = closeM <= openM; // si cierre es <= apertura, asumimos madrugada
                              setWeekDay(idx, {
                                openTime: nextOpen,
                                closeNextDay: autoNextDay,
                              });
                            }}
                            disabled={!row.open}
                          />
                          <Select
                            value={open12.ampm}
                            onValueChange={(val: any) => {
                              const next = to24From12(
                                open12.h12,
                                open12.m,
                                val
                              );
                              const openM = timeToMinutes(next);
                              const closeM = timeToMinutes(row.closeTime);
                              const autoNextDay = closeM <= openM;
                              setWeekDay(idx, {
                                openTime: next,
                                closeNextDay: autoNextDay,
                              });
                            }}
                            disabled={!row.open}
                          >
                            <SelectTrigger size="sm" className="h-8 w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                          <ArrowRight className="size-4 text-muted-foreground" />
                          <span className="relative inline-flex items-center justify-center w-4 h-4 text-muted-foreground">
                            <Clock className="size-4" />
                            <Moon className="size-3 absolute -bottom-0.5 -right-0.5 text-sky-400" />
                          </span>
                          <Input
                            type="time"
                            step={60}
                            className="h-8 px-2 w-28"
                            value={row.closeTime}
                            onChange={(e) => {
                              const nextClose = e.target.value || "01:30";
                              const openM = timeToMinutes(row.openTime);
                              const closeM = timeToMinutes(nextClose);
                              const autoNextDay = closeM <= openM;
                              setWeekDay(idx, {
                                closeTime: nextClose,
                                closeNextDay: autoNextDay,
                              });
                            }}
                            disabled={!row.open}
                          />
                          <Select
                            value={close12.ampm}
                            onValueChange={(val: any) => {
                              const next = to24From12(
                                close12.h12,
                                close12.m,
                                val
                              );
                              const openM = timeToMinutes(row.openTime);
                              const closeM = timeToMinutes(next);
                              const autoNextDay = closeM <= openM;
                              setWeekDay(idx, {
                                closeTime: next,
                                closeNextDay: autoNextDay,
                              });
                            }}
                            disabled={!row.open}
                          >
                            <SelectTrigger size="sm" className="h-8 w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                          <label className="flex items-center gap-2 text-xs text-muted-foreground select-none">
                            <ChevronRight className="size-3" />
                            <Switch
                              checked={row.closeNextDay}
                              onCheckedChange={(v) =>
                                setWeekDay(idx, { closeNextDay: v })
                              }
                              disabled={!row.open}
                            />
                            <span title="Se activa automáticamente si la hora de cierre es menor o igual a la de apertura">
                              +1 día
                            </span>
                          </label>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opciones de Turno</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={Boolean(settings.requireCashSession)}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s, requireCashSession: v }))
                }
              />
              <span>Exigir abrir caja dentro de horario operativo</span>
            </div>
            <Button
              onClick={saveRequireCashSession}
              disabled={saving}
              size="sm"
              variant="outline"
            >
              Guardar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Si está activado, solo se podrá abrir una sesión de caja durante los
            horarios de operación configurados arriba.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
