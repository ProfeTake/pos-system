declare module "xlsx";
declare module "jspdf";
declare module "jspdf-autotable";
declare module "*.css";
declare module "*.svg" {
  const src: string;
  export default src;
}

interface Window {
  desktop?: {
    getPrinters: () => Promise<string[]>;
    printHtml: (
      html: string,
      options?: { deviceName?: string; preview?: boolean }
    ) => Promise<void>;
  };
}
