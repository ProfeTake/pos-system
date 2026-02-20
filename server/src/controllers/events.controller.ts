import { Request, Response } from "express";

export const eventsHandler = (req: Request, res: Response) => {
  const headers = {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  };
  res.writeHead(200, headers);

  // Send initial connection message
  const data = `data: ${JSON.stringify({ type: "connected" })}\n\n`;
  res.write(data);

  // Keep connection open - intervalo optimizado a 45s para reducir carga
  const keepAlive = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 45000);

  req.on("close", () => {
    clearInterval(keepAlive);
    res.end();
  });
};
