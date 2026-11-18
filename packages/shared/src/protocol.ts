/** Room and message names shared by the server, the web client and the smoke test. */
export const HELLO_ROOM = 'hello';

export const MSG_PING = 'ping';
export const MSG_PONG = 'pong';

export interface HealthResponse {
  status: 'ok';
  sha: string;
  version: string;
}
