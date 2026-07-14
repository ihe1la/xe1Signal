import { describe, expect, it } from "vitest";
import { isPrivateAddress } from "./safe-url";
describe("isPrivateAddress",()=>{it("blocks local and private ranges",()=>{expect(isPrivateAddress("127.0.0.1")).toBe(true);expect(isPrivateAddress("10.2.3.4")).toBe(true);expect(isPrivateAddress("192.168.1.2")).toBe(true);expect(isPrivateAddress("::1")).toBe(true)});it("allows public addresses",()=>{expect(isPrivateAddress("1.1.1.1")).toBe(false);expect(isPrivateAddress("8.8.8.8")).toBe(false)})});
