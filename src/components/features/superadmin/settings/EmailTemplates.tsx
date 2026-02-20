/**
 * Email Templates Configuration
 * Configuración de plantillas de email
 */

import { useState } from "react";
import {
  Mail,
  Edit2,
  Eye,
  Save,
  X,
  Send,
  FileText,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  UserPlus,
  Key,
  Bell,
} from "lucide-react";
import { toast } from "sonner";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  category: "auth" | "billing" | "notification";
  lastModified: Date;
  isActive: boolean;
  icon: typeof Mail;
}

const mockTemplates: EmailTemplate[] = [
  {
    id: "welcome",
    name: "Bienvenida",
    subject: "¡Bienvenido a POS Pro!",
    description: "Email enviado cuando se crea una nueva cuenta",
    category: "auth",
    lastModified: new Date(),
    isActive: true,
    icon: UserPlus,
  },
  {
    id: "password-reset",
    name: "Reseteo de Contraseña",
    subject: "Restablecer tu contraseña",
    description: "Email con link para resetear contraseña",
    category: "auth",
    lastModified: new Date(Date.now() - 86400000),
    isActive: true,
    icon: Key,
  },
  {
    id: "password-changed",
    name: "Contraseña Cambiada",
    subject: "Tu contraseña fue actualizada",
    description: "Confirmación de cambio de contraseña",
    category: "auth",
    lastModified: new Date(Date.now() - 172800000),
    isActive: true,
    icon: CheckCircle,
  },
  {
    id: "invoice",
    name: "Factura Mensual",
    subject: "Tu factura de {{month}}",
    description: "Factura automática mensual",
    category: "billing",
    lastModified: new Date(Date.now() - 259200000),
    isActive: true,
    icon: CreditCard,
  },
  {
    id: "payment-failed",
    name: "Pago Fallido",
    subject: "Problema con tu pago",
    description: "Notificación de pago rechazado",
    category: "billing",
    lastModified: new Date(Date.now() - 345600000),
    isActive: true,
    icon: AlertTriangle,
  },
  {
    id: "subscription-expiring",
    name: "Suscripción por Vencer",
    subject: "Tu suscripción vence pronto",
    description: "Recordatorio antes de vencimiento",
    category: "billing",
    lastModified: new Date(Date.now() - 432000000),
    isActive: true,
    icon: Bell,
  },
  {
    id: "low-stock",
    name: "Stock Bajo",
    subject: "Alerta: Productos con stock bajo",
    description: "Notificación de productos con poco stock",
    category: "notification",
    lastModified: new Date(Date.now() - 518400000),
    isActive: false,
    icon: AlertTriangle,
  },
];

const categoryLabels: Record<string, { label: string; color: string }> = {
  auth: { label: "Autenticación", color: "bg-purple-500/20 text-purple-400" },
  billing: { label: "Facturación", color: "bg-green-500/20 text-green-400" },
  notification: {
    label: "Notificaciones",
    color: "bg-blue-500/20 text-blue-400",
  },
};

export function EmailTemplates() {
  const [templates, setTemplates] = useState(mockTemplates);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedSubject, setEditedSubject] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const filteredTemplates = templates.filter(
    (t) => filterCategory === "all" || t.category === filterCategory
  );

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedSubject(template.subject);
    setEditMode(true);
  };

  const handleSave = () => {
    if (selectedTemplate) {
      setTemplates(
        templates.map((t) =>
          t.id === selectedTemplate.id
            ? { ...t, subject: editedSubject, lastModified: new Date() }
            : t
        )
      );
      toast.success("Plantilla guardada");
      setEditMode(false);
    }
  };

  const handleToggleActive = (templateId: string) => {
    setTemplates(
      templates.map((t) =>
        t.id === templateId ? { ...t, isActive: !t.isActive } : t
      )
    );
    toast.success("Estado actualizado");
  };

  const handleSendTest = (template: EmailTemplate) => {
    toast.success(`Email de prueba enviado: ${template.name}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Plantillas de Email</h1>
        <p className="text-slate-400 mt-1">
          Configura las plantillas de correo electrónico del sistema
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterCategory === "all"
              ? "bg-white text-slate-900"
              : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          Todas
        </button>
        {Object.entries(categoryLabels).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setFilterCategory(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterCategory === key
                ? "bg-white text-slate-900"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Templates List */}
      <div className="space-y-3">
        {filteredTemplates.map((template) => {
          const Icon = template.icon;
          const category = categoryLabels[template.category];

          return (
            <div
              key={template.id}
              className={`bg-slate-900 border border-slate-800 rounded-xl p-4 ${
                !template.isActive ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <Icon className="size-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-white">
                        {template.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${category.color}`}
                      >
                        {category.label}
                      </span>
                      {!template.isActive && (
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-500/20 text-slate-400">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {template.description}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Asunto:{" "}
                      <span className="text-slate-400">{template.subject}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSendTest(template)}
                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Enviar prueba"
                  >
                    <Send className="size-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="size-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(template.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      template.isActive
                        ? "text-slate-400 hover:text-red-400 hover:bg-slate-800"
                        : "text-slate-400 hover:text-green-400 hover:bg-slate-800"
                    }`}
                    title={template.isActive ? "Desactivar" : "Activar"}
                  >
                    {template.isActive ? (
                      <X className="size-4" />
                    ) : (
                      <CheckCircle className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Dialog */}
      {editMode && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">
                Editar: {selectedTemplate.name}
              </h2>
              <button
                onClick={() => setEditMode(false)}
                className="p-2 text-slate-400 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Asunto
                </label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Variables disponibles: {"{{name}}"}, {"{{email}}"},{" "}
                  {"{{month}}"}, {"{{amount}}"}
                </p>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Vista Previa
                </label>
                <div className="bg-slate-800 rounded-lg p-4 min-h-[200px]">
                  <div className="border-b border-slate-700 pb-3 mb-3">
                    <p className="text-xs text-slate-500">
                      De: POS Pro {"<noreply@pospro.cl>"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Para: cliente@ejemplo.cl
                    </p>
                    <p className="text-sm text-white mt-2">
                      Asunto: {editedSubject}
                    </p>
                  </div>
                  <div className="text-sm text-slate-400">
                    <p>Hola {"{{name}}"},</p>
                    <br />
                    <p>
                      Este es el contenido del email de {selectedTemplate.name}.
                    </p>
                    <br />
                    <p>
                      Saludos,
                      <br />
                      Equipo POS Pro
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-800">
              <button
                onClick={() => handleSendTest(selectedTemplate)}
                className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                <Send className="size-4" />
                Enviar Prueba
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="size-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmailTemplates;
