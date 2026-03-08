/**
 * Barrel exports para el módulo de escáner de código de barras.
 *
 * Uso:
 *   import { BarcodeScanner } from "@/components/common/barcode-scanner";
 *
 * El componente exportado tiene las mismas props que el BarcodeScanner v1
 * (backwards compatible), pero con toda la funcionalidad v2 mejorada.
 */

export { BarcodeScanner } from "./BarcodeScannerModal";

// Sub-componentes (para composición avanzada si se necesita)
export { CameraViewfinder } from "./CameraViewfinder";
export { ScannerControls } from "./ScannerControls";
export { ManualInput } from "./ManualInput";
export { ScanResultBanner } from "./ScanResultBanner";
export { ScanHistory } from "./ScanHistory";
