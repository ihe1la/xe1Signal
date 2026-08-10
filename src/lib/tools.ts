export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-512";

function bytesToBinary(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return binary;
}

function binaryToBytes(binary: string) {
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function encodeBase64(value: string) {
  return btoa(bytesToBinary(new TextEncoder().encode(value)));
}

export function decodeBase64(value: string) {
  const binary = atob(value.replace(/\s+/g, ""));
  return new TextDecoder("utf-8", { fatal: true }).decode(binaryToBytes(binary));
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&apos;": "'",
  "&gt;": ">",
  "&lt;": "<",
  "&quot;": '"',
  "&#39;": "'",
};

export function encodeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    if (character === "&") return "&amp;";
    if (character === "<") return "&lt;";
    if (character === ">") return "&gt;";
    if (character === '"') return "&quot;";
    return "&#39;";
  });
}

export function decodeHtml(value: string) {
  return value.replace(/&(?:amp|apos|gt|lt|quot|#39|#\d+|#x[\da-f]+);/gi, (entity) => {
    const named = HTML_ENTITIES[entity.toLowerCase()];
    if (named) return named;
    const code = entity.toLowerCase().startsWith("&#x")
      ? Number.parseInt(entity.slice(3, -1), 16)
      : Number.parseInt(entity.slice(2, -1), 10);
    return Number.isSafeInteger(code) ? String.fromCodePoint(code) : entity;
  });
}

export function formatJson(value: string) {
  return JSON.stringify(JSON.parse(value), null, 2);
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return decodeBase64(normalized);
}

export function decodeJwt(value: string) {
  const [encodedHeader, encodedPayload] = value.trim().split(".");
  if (!encodedHeader || !encodedPayload) throw new Error("A JWT must contain a header and payload.");

  return {
    header: JSON.parse(decodeBase64Url(encodedHeader)) as unknown,
    payload: JSON.parse(decodeBase64Url(encodedPayload)) as unknown,
  };
}

export function formatJwt(value: string) {
  const decoded = decodeJwt(value);
  return `Header\n${JSON.stringify(decoded.header, null, 2)}\n\nPayload\n${JSON.stringify(decoded.payload, null, 2)}\n\nNote\nSignature verification is not performed locally.`;
}

export function parseUrl(value: string) {
  const url = new URL(value.trim());
  return JSON.stringify(
    {
      href: url.href,
      origin: url.origin,
      protocol: url.protocol,
      username: url.username,
      password: url.password,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      searchParams: Array.from(url.searchParams.entries()).map(([name, parameter]) => ({ name, value: parameter })),
    },
    null,
    2,
  );
}

export function convertTimestamp(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Enter a Unix timestamp or date.");

  const numeric = Number(trimmed);
  const milliseconds = Number.isFinite(numeric)
    ? Math.abs(numeric) < 100_000_000_000
      ? numeric * 1000
      : numeric
    : Date.parse(trimmed);
  const date = new Date(milliseconds);
  if (!Number.isFinite(milliseconds) || Number.isNaN(date.getTime())) throw new Error("That is not a valid timestamp or date.");

  return [
    `UTC       ${date.toISOString()}`,
    `Local     ${date.toString()}`,
    `Unix sec  ${Math.floor(milliseconds / 1000)}`,
    `Unix ms   ${Math.floor(milliseconds)}`,
  ].join("\n");
}

export type DiffLine = { type: "same" | "added" | "removed"; text: string };

export function diffLines(before: string, after: string): DiffLine[] {
  const left = before.split(/\r?\n/);
  const right = after.split(/\r?\n/);
  if (left.length * right.length > 100_000) {
    return [
      ...left.map((text) => ({ type: "removed" as const, text })),
      ...right.map((text) => ({ type: "added" as const, text })),
    ];
  }

  const table = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));
  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      table[leftIndex][rightIndex] = left[leftIndex] === right[rightIndex]
        ? table[leftIndex + 1][rightIndex + 1] + 1
        : Math.max(table[leftIndex + 1][rightIndex], table[leftIndex][rightIndex + 1]);
    }
  }

  const result: DiffLine[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      result.push({ type: "same", text: left[leftIndex] });
      leftIndex += 1;
      rightIndex += 1;
    } else if (table[leftIndex + 1][rightIndex] >= table[leftIndex][rightIndex + 1]) {
      result.push({ type: "removed", text: left[leftIndex] });
      leftIndex += 1;
    } else {
      result.push({ type: "added", text: right[rightIndex] });
      rightIndex += 1;
    }
  }
  while (leftIndex < left.length) result.push({ type: "removed", text: left[leftIndex++] });
  while (rightIndex < right.length) result.push({ type: "added", text: right[rightIndex++] });
  return result;
}

export function formatDiff(before: string, after: string) {
  return diffLines(before, after)
    .map(({ type, text }) => `${type === "same" ? " " : type === "added" ? "+" : "-"} ${text}`)
    .join("\n");
}

const LOREM_WORDS = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua".split(" ");

export function generateLorem(paragraphs: number, sentencesPerParagraph: number) {
  const safeParagraphs = Math.min(8, Math.max(1, Math.floor(paragraphs)));
  const safeSentences = Math.min(8, Math.max(1, Math.floor(sentencesPerParagraph)));
  let cursor = 0;
  return Array.from({ length: safeParagraphs }, () => Array.from({ length: safeSentences }, () => {
    const words = Array.from({ length: 16 }, () => {
      const word = LOREM_WORDS[cursor % LOREM_WORDS.length];
      cursor += 1;
      return word;
    });
    words[0] = words[0][0].toUpperCase() + words[0].slice(1);
    return `${words.join(" ")}.`;
  }).join(" ")).join("\n\n");
}

const MD5_SHIFT = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const MD5_K = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32));

function rotateLeft(value: number, amount: number) {
  return (value << amount) | (value >>> (32 - amount));
}

function md5(value: string) {
  const bytes = new TextEncoder().encode(value);
  const bitLength = bytes.length * 8;
  const paddedLength = (((bytes.length + 8) >>> 6) + 1) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, bitLength >>> 0, true);
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 2 ** 32), true);

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = Array.from({ length: 16 }, (_, index) => view.getUint32(offset + index * 4, true));
    const originalA = a;
    const originalB = b;
    const originalC = c;
    const originalD = d;

    for (let index = 0; index < 64; index += 1) {
      let functionValue: number;
      let wordIndex: number;
      if (index < 16) {
        functionValue = (b & c) | (~b & d);
        wordIndex = index;
      } else if (index < 32) {
        functionValue = (d & b) | (~d & c);
        wordIndex = (5 * index + 1) % 16;
      } else if (index < 48) {
        functionValue = b ^ c ^ d;
        wordIndex = (3 * index + 5) % 16;
      } else {
        functionValue = c ^ (b | ~d);
        wordIndex = (7 * index) % 16;
      }

      const next = d;
      const sum = (a + functionValue + MD5_K[index] + words[wordIndex]) >>> 0;
      d = c;
      c = b;
      b = (b + rotateLeft(sum, MD5_SHIFT[index])) >>> 0;
      a = next;
    }

    a = (a + originalA) >>> 0;
    b = (b + originalB) >>> 0;
    c = (c + originalC) >>> 0;
    d = (d + originalD) >>> 0;
  }

  return [a, b, c, d]
    .flatMap((word) => [word & 0xff, (word >>> 8) & 0xff, (word >>> 16) & 0xff, (word >>> 24) & 0xff])
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashText(value: string, algorithm: "MD5" | HashAlgorithm) {
  if (algorithm === "MD5") return md5(value);
  return toHex(await crypto.subtle.digest(algorithm, new TextEncoder().encode(value)));
}

export async function hashAll(value: string) {
  const [md5Hash, sha1, sha256, sha512] = await Promise.all([
    hashText(value, "MD5"),
    hashText(value, "SHA-1"),
    hashText(value, "SHA-256"),
    hashText(value, "SHA-512"),
  ]);
  return `MD5\n${md5Hash}\n\nSHA-1\n${sha1}\n\nSHA-256\n${sha256}\n\nSHA-512\n${sha512}`;
}
