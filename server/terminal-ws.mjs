import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { WebSocket, WebSocketServer } from "ws";

const OWNER_USERNAME = "ihe1la";
const HOST = process.env.TERMINAL_WS_HOST || "127.0.0.1";
const PORT = Number(process.env.TERMINAL_WS_PORT || 3010);

function loadEnvFile() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.resolve(here, "../.env.production");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

function ticketSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET missing for terminal WS");
  return secret;
}

function verifyTerminalTicket(ticket, now = Date.now()) {
  const [payloadB64, signature] = String(ticket || "").split(".");
  if (!payloadB64 || !signature) return null;
  const expected = createHmac("sha256", ticketSecret()).update(payloadB64).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (payload.v !== 1) return null;
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    if (payload.u !== OWNER_USERNAME) return null;
    return payload;
  } catch {
    return null;
  }
}

const server = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });

server.on("upgrade", (request, socket, head) => {
  try {
    const url = new URL(request.url || "/", `http://${HOST}:${PORT}`);
    if (url.pathname !== "/ws/terminal" && url.pathname !== "/") {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }
    const ticket = url.searchParams.get("ticket") || "";
    const payload = verifyTerminalTicket(ticket);
    if (!payload) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, payload);
    });
  } catch {
    socket.destroy();
  }
});

wss.on("connection", (ws) => {
  const apiKey = process.env.PINQUED_API_KEY;
  if (!apiKey) {
    ws.send("\r\nPinqued API key is not configured.\r\n");
    ws.close();
    return;
  }
  const upstream = new WebSocket("wss://01x.site/socket.io/?EIO=4&transport=websocket", {
    headers: { Origin: "https://01x.site" },
  });
  let connected = false;

  upstream.on("message", (raw) => {
    const packet = raw.toString("utf8");
    if (packet.startsWith("0")) {
      upstream.send(`40/terminal,${JSON.stringify({ token: apiKey })}`);
      return;
    }
    if (packet === "2") {
      upstream.send("3");
      return;
    }
    if (packet.startsWith("40/terminal")) {
      connected = true;
      if (ws.readyState === WebSocket.OPEN) ws.send("\r\n\x1b[1;35mterminal@pinqued\x1b[0m\r\n\r\n");
      return;
    }
    if (!packet.startsWith("42/terminal,")) return;
    try {
      const [eventName, payload] = JSON.parse(packet.slice("42/terminal,".length));
      if (eventName === "terminal_output" && typeof payload === "string" && ws.readyState === WebSocket.OPEN) ws.send(payload);
      if (eventName === "api_key_revoked" && ws.readyState === WebSocket.OPEN) ws.send("\r\n[Pinqued API key revoked]\r\n");
      if ((eventName === "terminal_exit" || eventName === "api_key_revoked") && ws.readyState === WebSocket.OPEN) ws.close();
    } catch {
      /* ignore malformed upstream packet */
    }
  });

  upstream.on("error", () => {
    if (ws.readyState === WebSocket.OPEN) ws.send("\r\n[Pinqued terminal connection failed]\r\n");
  });

  upstream.on("close", () => {
    if (ws.readyState === WebSocket.OPEN) ws.close();
  });

  ws.on("message", (raw) => {
    const text = typeof raw === "string" ? raw : raw.toString("utf8");
    if (text.startsWith("{")) {
      try {
        const msg = JSON.parse(text);
        if (msg.type === "resize" && msg.cols && msg.rows) {
          if (connected && upstream.readyState === WebSocket.OPEN) upstream.send(`42/terminal,${JSON.stringify(["terminal_resize", { cols: Number(msg.cols), rows: Number(msg.rows) }])}`);
          return;
        }
      } catch {
        /* fall through as stdin */
      }
    }
    if (connected && upstream.readyState === WebSocket.OPEN) upstream.send(`42/terminal,${JSON.stringify(["terminal_input", text])}`);
  });

  ws.on("close", () => {
    if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) upstream.close();
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[terminal-ws] listening on ${HOST}:${PORT} upstream=01x.site`);
});
