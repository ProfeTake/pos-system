import { Request, Response } from "express";

export const eventsHandler = (req: Request, res: Response) => {
  // NOTE: Do NOT send `Connection: keep-alive` — it is forbidden in HTTP/2
  // and causes Caddy to drop the stream with ERR_HTTP2_PROTOCOL_ERROR.
  // `X-Accel-Buffering: no` tells Caddy/nginx not to buffer SSE frames.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Tell the browser to wait 15s before reconnecting (instead of the default 3s)
  // This prevents hammering the server on transient drops.
  res.write("retry: 15000\n\n");

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  // Heartbeat every 30s to keep the connection alive through proxies
  const keepAlive = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(keepAlive);
    }
  }, 30000);

  req.on("close", () => {
    clearInterval(keepAlive);
  });
};
