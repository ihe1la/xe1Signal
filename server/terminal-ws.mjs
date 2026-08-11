import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import pty from "node-pty";
import { WebSocketServer } from "ws";

const OWNER_USERNAME = "ihe1la";
const HOST = process.env.TERMINAL_WS_HOST || "127.0.0.1";
const PORT = Number(process.env.TERMINAL_WS_PORT || 3010);
const SHELL = process.env.TERMINAL_SHELL || "/bin/bash";
const SHELL_ARGS = (process.env.TERMINAL_SHELL_ARGS || "-l").split(" ").filter(Boolean);

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
  let term;
  try {
    term = pty.spawn(SHELL, SHELL_ARGS, {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: process.env.HOME || "/root",
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
      },
    });
  } catch (error) {
    ws.send(`\r\nfailed to spawn shell: ${error instanceof Error ? error.message : error}\r\n`);
    ws.close();
    return;
  }

  ws.send("\r\n\x1b[1;35mroot@xe1signal\x1b[0m — owner terminal\r\n\r\n");

  term.onData((data) => {
    if (ws.readyState === ws.OPEN) ws.send(data);
  });

  term.onExit(({ exitCode }) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(`\r\n[shell exited ${exitCode}]\r\n`);
      ws.close();
    }
  });

  ws.on("message", (raw) => {
    const text = typeof raw === "string" ? raw : raw.toString("utf8");
    if (text.startsWith("{")) {
      try {
        const msg = JSON.parse(text);
        if (msg.type === "resize" && msg.cols && msg.rows) {
          term.resize(Number(msg.cols), Number(msg.rows));
          return;
        }
      } catch {
        /* fall through as stdin */
      }
    }
    term.write(text);
  });

  ws.on("close", () => {
    try {
      term.kill();
    } catch {
      /* ignore */
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[terminal-ws] listening on ${HOST}:${PORT} shell=${SHELL}`);
});
