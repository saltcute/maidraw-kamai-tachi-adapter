import camelcaseKeys from "camelcase-keys";
import type { ApiResponse } from "./response";

/**
 * Small helpers that maidraw used to expose internally but no longer exports
 * from its public API as of v0.13.0. Reimplemented here to keep the adapters
 * self-contained.
 */

/**
 * Kamaitachi returns keys such as `inGameID` / `chartID` / `songID`, while the
 * adapter's type definitions use camelCase. Deeply camelCase a response body so
 * the runtime shape matches the declared types.
 *
 * `camelcase-keys` is ESM-only; this relies on Node's synchronous `require()`
 * of ESM modules (Node >= 20.19 / 22.12).
 */
export function camelizeResponse<T>(
    res: ApiResponse<unknown> | undefined,
): ApiResponse<T> | undefined {
    if (!res) return undefined;
    if (!res.success) return res;
    return {
        ...res,
        body: camelcaseKeys(res.body as Record<string, unknown>, {
            deep: true,
        }) as T,
    };
}

/**
 * Pretty much ignores percision loss.
 */
export function truncate(
    payload: number,
    percision: number,
    roundingPosition = 10,
): string {
    const str = payload.toFixed(roundingPosition);
    let [int, dec] = str.split(".");
    if (!int) int = "";
    if (!dec) dec = "";
    if (percision <= 0) return int;
    return `${int}.${dec.substring(0, percision).padEnd(percision, "0")}`;
}

export function truncateNumber(
    payload: number,
    percision: number,
    roundingPosition = 10,
): number {
    return parseFloat(truncate(payload, percision, roundingPosition));
}

/**
 * Strips the user identifier out of a Kamaitachi error message so it isn't
 * leaked back to the caller verbatim.
 */
export function sanitizeKamaitachiErrorMessage(
    msg: string,
    payload: string,
): string {
    return msg.replaceAll(payload, "");
}
