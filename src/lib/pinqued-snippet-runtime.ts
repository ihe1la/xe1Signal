export async function runPinquedSnippet(code: string, input: string) {
  if (typeof document === "undefined") {
    throw new Error("Snippets can only run in the browser");
  }

  return new Promise<string>((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.style.display = "none";
    const token = `pinqued-snippet-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const finish = (error: string | null, result?: string) => {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      frame.remove();
      if (error) reject(new Error(error));
      else resolve(result ?? "");
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) return;
      const data = event.data as { token?: string; error?: string; result?: unknown };
      if (!data || data.token !== token) return;
      if (data.error) {
        finish(data.error);
        return;
      }
      const value = data.result;
      finish(null, value == null ? "" : typeof value === "string" ? value : JSON.stringify(value, null, 2));
    };

    const timer = window.setTimeout(() => finish("Snippet timed out"), 20_000);
    window.addEventListener("message", onMessage);

    const payload = JSON.stringify({ token, code, input });
    frame.srcdoc = `<!doctype html><meta charset="utf-8"><script>
      (function () {
        var payload = ${payload};
        function send(data) {
          parent.postMessage(Object.assign({ token: payload.token }, data), "*");
        }
        window.onerror = function (message) {
          send({ error: String(message) });
        };
        try {
          var input = payload.input;
          var result = Function("input", payload.code)(input);
          Promise.resolve(result).then(function (value) {
            send({ result: value });
          }).catch(function (error) {
            send({ error: error && error.message ? error.message : String(error) });
          });
        } catch (error) {
          send({ error: error && error.message ? error.message : String(error) });
        }
      })();
    </script>`;
    document.body.appendChild(frame);
  });
}
