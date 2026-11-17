import { Room, type Client } from '@colyseus/core';
import { MSG_PING, MSG_PONG } from '@rollhouse/shared';

/** Trivial room for the deploy smoke test: echoes ping as pong. */
export class HelloRoom extends Room {
  override maxClients = 16;

  override messages = {
    [MSG_PING]: (client: Client, message: unknown) => {
      client.send(MSG_PONG, message);
    },
  };
}
