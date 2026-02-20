import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/switch";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { toast } from "sonner";
import {
  Building2,
  Clock,
  Settings as SettingsIcon,
  Bell,
  Link2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Mail,
  Shield,
  Zap,
  Package,
  Users,
  BarChart3,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { useConfigurations, type CompanyData, type OperationsConfig, type FeaturesConfig, type IntegrationsConfig, type NotificationsConfig } from "../../../hooks/useConfigurations";
import { Label } from "../../ui/label";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";

const DAYS_OF_WEEK = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
];

export default function SystemConfiguration() {
  const {
    config,
    isLoading,
    error,
    refresh,
    updateCompany,
    updateOperations,
    updateFeatures,
    updateIntegrations,
    updateNotifications,
    isSaving,
  } = useConfigurations();

  // Estado local para edición
  const [company, setCompany] = useState<CompanyData>(config.company);
  const [operations, setOperations] = useState<OperationsConfig>(config.operations);
  const [features, setFeatures] = useState<FeaturesConfig>(config.features);
  const [integrations, setIntegrations] = useState<IntegrationsConfig>(config.integrations);
  const [notifications, setNotifications] = useState<NotificationsConfig>(config.notifications);
  const [hasChanges, setHasChanges] = useState(false);

  // Sincronizar estado local cuando cambia config
  useEffect(() => {
    setCompany(config.company);
    setOperations(config.operations);
    setFeatures(config.features);
    setIntegrations(config.integrations);
    setNotifications(config.notifications);
    setHasChanges(false);
  }, [config]);

  // Guardar cambios según la sección
  const handleSaveCompany = async () => {
    try {
      await updateCompany(company);
      toast.success("Datos de empresa guardados");
      setHasChanges(false);
    } catch (err) {
      toast.error("Error al guardar datos de empresa");
    }
  };

  const handleSaveOperations = async () => {
    try {
      await updateOperations(operations);
      toast.success("Configuración operativa guardada");
      setHasChanges(false);
    } catch (err) {
      toast.error("Error al guardar configuración");
    }
  };

  const handleSaveFeatures = async () => {
    try {
      await updateFeatures(features);
      toast.success("Características guardadas");
      setHasChanges(false);
    } catch (err) {
      toast.error("Error al guardar características");
    }
  };

  const handleSaveIntegrations = async () => {
    try {
      await updateIntegrations(integrations);
      toast.success("Integraciones guardadas");
      setHasChanges(false);
    } catch (err) {
      toast.error("Error al guardar integraciones");
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await updateNotifications(notifications);
      toast.success("Notificaciones guardadas");
      setHasChanges(false);
    } catch (err) {
      toast.error("Error al guardar notificaciones");
    }
  };

  const toggleDay = (day: number) => {
    const days = operations.businessHours.days.includes(day)
      ? operations.businessHours.days.filter((d: number) => d !== day)
      : [...operations.businessHours.days, day].sort();
    setOperations({
      ...operations,
      businessHours: { ...operations.businessHours, days },
    });
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuración del Sistema</h2>
          <p className="text-muted-foreground">
            Gestiona la configuración general de tu negocio
          </p>
        </div>
        {hasChanges && (
          <Badge variant="outline" className="text-orange-500 border-orange-500">
            <AlertCircle className="h-3 w-3 mr-1" />
            Cambios sin guardar
          </Badge>
        )}
      </div>

      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="operations" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Operaciones</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Características</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Integraciones</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificaciones</span>
          </TabsTrigger>
        </TabsList>

        {/* ============== OPERACIONES ============== */}
        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Configuración Fiscal
              </CardTitle>
              <CardDescription>
                Configuración de impuestos y moneda para Chile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tasa de IVA (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    value={operations.taxRate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setOperations({ ...operations, taxRate: Number(e.target.value) });
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select
                    value={operations.currency}
                    onValueChange={(value: string) => {
                      setOperations({ ...operations, currency: value });
                      setHasChanges(true);
                    }}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLP">CLP (Peso Chileno)</SelectItem>
                      <SelectItem value="USD">USD (Dólar)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horario de Operación
              </CardTitle>
              <CardDescription>
                Define el horario de atención de tu negocio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="openTime">Hora de Apertura</Label>
                  <Input
                    id="openTime"
                    type="time"
                    value={operations.businessHours.open}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setOperations({
                        ...operations,
                        businessHours: { ...operations.businessHours, open: e.target.value },
                      });
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closeTime">Hora de Cierre</Label>
                  <Input
                    id="closeTime"
                    type="time"
                    value={operations.businessHours.close}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setOperations({
                        ...operations,
                        businessHours: { ...operations.businessHours, close: e.target.value },
                      });
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Días de Operación</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={operations.businessHours.days.includes(day.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDay(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveOperations} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Operaciones
            </Button>
          </div>
        </TabsContent>

        {/* ============== CARACTERÍSTICAS ============== */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Características del Sistema
              </CardTitle>
              <CardDescription>
                Activa o desactiva funcionalidades según tus necesidades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <FeatureToggle
                  icon={<Package className="h-5 w-5" />}
                  label="Promociones"
                  description="Permite crear descuentos, ofertas 2x1, bundles, etc."
                  checked={features.promotionsEnabled}
                  onChange={(checked) => {
                    setFeatures({ ...features, promotionsEnabled: checked });
                    setHasChanges(true);
                  }}
                />
                
                <Separator />

                <FeatureToggle
                  icon={<AlertCircle className="h-5 w-5" />}
                  label="Alertas de Stock Bajo"
                  description="Notifica cuando productos están por debajo del mínimo"
                  checked={features.lowStockAlerts}
                  onChange={(checked) => {
                    setFeatures({ ...features, lowStockAlerts: checked });
                    setHasChanges(true);
                  }}
                />

                <Separator />

                <FeatureToggle
                  icon={<CreditCard className="h-5 w-5" />}
                  label="Múltiples Métodos de Pago"
                  description="Permite pagos con efectivo, tarjeta, transferencia"
                  checked={features.multiplePaymentMethods}
                  onChange={(checked) => {
                    setFeatures({ ...features, multiplePaymentMethods: checked });
                    setHasChanges(true);
                  }}
                />

                <Separator />

                <FeatureToggle
                  icon={<Users className="h-5 w-5" />}
                  label="Gestión de Clientes"
                  description="Registra datos de clientes para facturación y fidelización"
                  checked={features.customerManagement}
                  onChange={(checked) => {
                    setFeatures({ ...features, customerManagement: checked });
                    setHasChanges(true);
                  }}
                />

                <Separator />

                <FeatureToggle
                  icon={<BarChart3 className="h-5 w-5" />}
                  label="Seguimiento de Inventario"
                  description="Control de stock, movimientos y alertas"
                  checked={features.inventoryTracking}
                  onChange={(checked) => {
                    setFeatures({ ...features, inventoryTracking: checked });
                    setHasChanges(true);
                  }}
                />

                <Separator />

                <FeatureToggle
                  icon={<Save className="h-5 w-5" />}
                  label="Exportación Automática"
                  description="Genera reportes diarios automáticamente"
                  checked={features.autoExportEnabled}
                  onChange={(checked) => {
                    setFeatures({ ...features, autoExportEnabled: checked });
                    setHasChanges(true);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveFeatures} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Características
            </Button>
          </div>
        </TabsContent>

        {/* ============== INTEGRACIONES ============== */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Servicio de Email
              </CardTitle>
              <CardDescription>
                Configura el envío de correos para reportes y notificaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Habilitar envío de emails</Label>
                <Switch
                  checked={integrations.emailService.enabled}
                  onCheckedChange={(checked: boolean) => {
                    setIntegrations({
                      ...integrations,
                      emailService: { ...integrations.emailService, enabled: checked },
                    });
                    setHasChanges(true);
                  }}
                />
              </div>

              {integrations.emailService.enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Proveedor de Email</Label>
                    <Select
                      value={integrations.emailService.provider || ""}
                      onValueChange={(value: string) => {
                        setIntegrations({
                          ...integrations,
                          emailService: {
                            ...integrations.emailService,
                            provider: value as any,
                          },
                        });
                        setHasChanges(true);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proveedor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="smtp">SMTP (Servidor propio)</SelectItem>
                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                        <SelectItem value="ses">Amazon SES</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountantEmail">Email del Contador</Label>
                    <Input
                      id="accountantEmail"
                      type="email"
                      placeholder="contador@empresa.cl"
                      value={integrations.emailService.accountantEmail || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setIntegrations({
                          ...integrations,
                          emailService: {
                            ...integrations.emailService,
                            accountantEmail: e.target.value,
                          },
                        });
                        setHasChanges(true);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Los reportes de documentación se enviarán a este correo
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Integración SII
              </CardTitle>
              <CardDescription>
                Conexión con el Servicio de Impuestos Internos de Chile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Integración con SII</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite emitir DTEs y sincronizar con el SII
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    Próximamente
                  </Badge>
                  <Switch
                    checked={integrations.siiIntegration}
                    disabled
                    onCheckedChange={(checked: boolean) => {
                      setIntegrations({ ...integrations, siiIntegration: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pasarelas de Pago
              </CardTitle>
              <CardDescription>
                Configura tus medios de pago electrónico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-300 font-bold text-xs">TBK</span>
                  </div>
                  <div>
                    <p className="font-medium">Transbank</p>
                    <p className="text-xs text-muted-foreground">Webpay Plus, Oneclick</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    Próximamente
                  </Badge>
                  <Switch
                    checked={integrations.paymentGateways.transbank.enabled}
                    disabled
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900 rounded-lg flex items-center justify-center">
                    <span className="text-cyan-600 dark:text-cyan-300 font-bold text-xs">MP</span>
                  </div>
                  <div>
                    <p className="font-medium">Mercado Pago</p>
                    <p className="text-xs text-muted-foreground">Checkout Pro, QR</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    Próximamente
                  </Badge>
                  <Switch
                    checked={integrations.paymentGateways.mercadopago.enabled}
                    disabled
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveIntegrations} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Integraciones
            </Button>
          </div>
        </TabsContent>

        {/* ============== NOTIFICACIONES ============== */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Preferencias de Notificaciones
              </CardTitle>
              <CardDescription>
                Configura cómo y cuándo recibir alertas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FeatureToggle
                icon={<Mail className="h-5 w-5" />}
                label="Notificaciones por Email"
                description="Recibe alertas importantes por correo electrónico"
                checked={notifications.emailNotifications}
                onChange={(checked) => {
                  setNotifications({ ...notifications, emailNotifications: checked });
                  setHasChanges(true);
                }}
              />

              <Separator />

              <FeatureToggle
                icon={<AlertCircle className="h-5 w-5" />}
                label="Alerta de Stock Bajo"
                description="Email cuando productos lleguen al mínimo"
                checked={notifications.lowStockEmail}
                onChange={(checked) => {
                  setNotifications({ ...notifications, lowStockEmail: checked });
                  setHasChanges(true);
                }}
              />

              <Separator />

              <FeatureToggle
                icon={<BarChart3 className="h-5 w-5" />}
                label="Reporte Diario"
                description="Resumen de ventas enviado cada día"
                checked={notifications.dailyReportEmail}
                onChange={(checked) => {
                  setNotifications({ ...notifications, dailyReportEmail: checked });
                  setHasChanges(true);
                }}
              />

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="salesThreshold">Umbral de Alerta de Ventas</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="salesThreshold"
                    type="number"
                    min="0"
                    placeholder="Ej: 100000"
                    value={notifications.salesAlertThreshold || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setNotifications({
                        ...notifications,
                        salesAlertThreshold: e.target.value ? Number(e.target.value) : undefined,
                      });
                      setHasChanges(true);
                    }}
                    className="w-48"
                  />
                  <span className="text-sm text-muted-foreground">CLP</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Notificar cuando las ventas diarias superen este monto (dejar vacío para desactivar)
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveNotifications} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Notificaciones
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente auxiliar para toggles de características
interface FeatureToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function FeatureToggle({
  icon,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: FeatureToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-start gap-3">
        <div className="text-muted-foreground mt-0.5">{icon}</div>
        <div>
          <Label className="text-base font-medium">{label}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
