import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useHints } from "./useHints";

const apiRequestMock = vi.fn();

vi.mock("@/lib/api-client", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

const FALLBACK = [
  "Как я себя чувствую сегодня?",
  "Что меня больше всего занимает сейчас?",
  "Что я хочу изменить в своей жизни?",
];

const makeOkResponse = (hints: string[]) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ hints }),
  } as unknown as Response);

const makeErrorResponse = (status: number) =>
  Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  } as unknown as Response);

describe("useHints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches hints on mount when messages is empty (initial state)", async () => {
    apiRequestMock.mockReturnValue(makeOkResponse(["Q1", "Q2", "Q3"]));

    const { result } = renderHook(() => useHints([], true));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(result.current.hints).toEqual(["Q1", "Q2", "Q3"]);
  });

  it("does not fetch when enabled=false", async () => {
    const { result } = renderHook(() => useHints([], false));

    await new Promise((r) => setTimeout(r, 50));
    expect(apiRequestMock).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("uses fallback hints when API throws", async () => {
    apiRequestMock.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useHints([], true));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hints).toEqual(FALLBACK);
  });

  it("uses fallback and stops retrying on 4xx response", async () => {
    apiRequestMock.mockReturnValue(makeErrorResponse(405));

    const { result } = renderHook(() => useHints([], true));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hints).toEqual(FALLBACK);
    // Второй вызов не должен делать запрос (apiUnavailableRef = true)
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
  });

  it("uses fallback when API returns empty array", async () => {
    apiRequestMock.mockReturnValue(makeOkResponse([]));

    const { result } = renderHook(() => useHints([], true));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hints).toEqual(FALLBACK);
  });

  it("does not fetch when last message is not AI", async () => {
    const messages = [{ id: "1", type: "human", content: "Hello" }] as any;

    renderHook(() => useHints(messages, true));

    await new Promise((r) => setTimeout(r, 50));
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("fetches when last message is AI", async () => {
    apiRequestMock.mockReturnValue(makeOkResponse(["A", "B", "C"]));

    const messages = [
      { id: "1", type: "human", content: "Hi" },
      { id: "2", type: "ai", content: "Hello!" },
    ] as any;

    const { result } = renderHook(() => useHints(messages, true));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(result.current.hints).toEqual(["A", "B", "C"]);
  });

  it("passes only last 6 messages to request", async () => {
    apiRequestMock.mockReturnValue(makeOkResponse(["Q1", "Q2", "Q3"]));

    const many = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      type: i % 2 === 0 ? "human" : "ai",
      content: `msg ${i}`,
    }));

    renderHook(() => useHints(many as any, true));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalled());
    const body = JSON.parse(apiRequestMock.mock.calls[0][1].body);
    expect(body.messages.length).toBeLessThanOrEqual(6);
  });
});
