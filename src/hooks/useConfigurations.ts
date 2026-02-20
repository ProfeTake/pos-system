import { useState, useEffect, useCallback } from "react";
import configurationsService, {
  FullConfig,
  CompanyData,
  OperationsConfig,
  FeaturesConfig,
  IntegrationsConfig,
  NotificationsConfig,
  DEFAULT_CONFIG,
} from "../services/configurations.service";

interface UseConfigurationsResult {
  config: FullConfig;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateCompany: (data: CompanyData) => Promise<void>;
  updateOperations: (data: OperationsConfig) => Promise<void>;
  updateFeatures: (data: FeaturesConfig) => Promise<void>;
  updateIntegrations: (data: IntegrationsConfig) => Promise<void>;
  updateNotifications: (data: NotificationsConfig) => Promise<void>;
  updateAll: (data: Partial<FullConfig>) => Promise<void>;
  isSaving: boolean;
}

/**
 * Hook para gestionar las configuraciones del sistema
 */
export function useConfigurations(): UseConfigurationsResult {
  const [config, setConfig] = useState<FullConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await configurationsService.getAll();
      setConfig(data);
    } catch (err: any) {
      console.error("Error loading configurations:", err);
      setError(err.message || "Error al cargar configuraciones");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const refresh = useCallback(async () => {
    configurationsService.clearCache();
    await loadConfig();
  }, [loadConfig]);

  const updateCompany = useCallback(async (data: CompanyData) => {
    setIsSaving(true);
    setError(null);
    try {
      await configurationsService.updateCompanyData(data);
      setConfig((prev: FullConfig) => ({ ...prev, company: data }));
    } catch (err: any) {
      setError(err.message || "Error al guardar datos de empresa");
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateOperations = useCallback(async (data: OperationsConfig) => {
    setIsSaving(true);
    setError(null);
    try {
      await configurationsService.update("operations", data);
      setConfig((prev: FullConfig) => ({ ...prev, operations: data }));
    } catch (err: any) {
      setError(err.message || "Error al guardar operaciones");
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateFeatures = useCallback(async (data: FeaturesConfig) => {
    setIsSaving(true);
    setError(null);
    try {
      await configurationsService.update("features", data);
      setConfig((prev: FullConfig) => ({ ...prev, features: data }));
    } catch (err: any) {
      setError(err.message || "Error al guardar características");
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateIntegrations = useCallback(async (data: IntegrationsConfig) => {
    setIsSaving(true);
    setError(null);
    try {
      await configurationsService.update("integrations", data);
      setConfig((prev: FullConfig) => ({ ...prev, integrations: data }));
    } catch (err: any) {
      setError(err.message || "Error al guardar integraciones");
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateNotifications = useCallback(async (data: NotificationsConfig) => {
    setIsSaving(true);
    setError(null);
    try {
      await configurationsService.update("notifications", data);
      setConfig((prev: FullConfig) => ({ ...prev, notifications: data }));
    } catch (err: any) {
      setError(err.message || "Error al guardar notificaciones");
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateAll = useCallback(async (data: Partial<FullConfig>) => {
    setIsSaving(true);
    setError(null);
    try {
      await configurationsService.updateAll(data);
      setConfig((prev: FullConfig) => ({ ...prev, ...data }));
    } catch (err: any) {
      setError(err.message || "Error al guardar configuraciones");
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    config,
    isLoading,
    error,
    refresh,
    updateCompany,
    updateOperations,
    updateFeatures,
    updateIntegrations,
    updateNotifications,
    updateAll,
    isSaving,
  };
}

/**
 * Hook simplificado para datos de empresa
 */
export function useCompanyData() {
  const [companyData, setCompanyData] = useState<CompanyData>(DEFAULT_CONFIG.company);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await configurationsService.getCompanyData();
        setCompanyData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const save = useCallback(async (data: CompanyData) => {
    setIsSaving(true);
    setError(null);
    try {
      await configurationsService.updateCompanyData(data);
      setCompanyData(data);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    companyData,
    isLoading,
    isSaving,
    error,
    save,
  };
}

/**
 * Hook para características habilitadas
 */
export function useFeatures() {
  const [features, setFeatures] = useState<FeaturesConfig>(DEFAULT_CONFIG.features);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const config = await configurationsService.getAll();
        setFeatures(config.features);
      } catch (err) {
        console.error("Error loading features:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const isEnabled = useCallback(
    (feature: keyof FeaturesConfig): boolean => {
      return features[feature] ?? false;
    },
    [features]
  );

  return {
    features,
    isLoading,
    isEnabled,
  };
}

export type {
  FullConfig,
  CompanyData,
  OperationsConfig,
  FeaturesConfig,
  IntegrationsConfig,
  NotificationsConfig,
};
