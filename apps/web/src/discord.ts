import { DiscordSDK } from '@discord/embedded-app-sdk';
import { type Auth, exchangeCode } from './api';
import { step } from './errors';

/** Discord opens Activities with frame_id and instance_id in the query. */
export const inDiscord = () => new URLSearchParams(location.search).has('frame_id');

/**
 * Signs in through the Discord client: authorize (a consent prompt the first
 * time), then the server swaps the code for a token and a Rollhouse session.
 */
export async function discordSignIn(clientId: string): Promise<Auth> {
  const sdk = new DiscordSDK(clientId);
  await step('connecting to Discord', () => sdk.ready());
  const { code } = await step('authorize', () =>
    sdk.commands.authorize({
      client_id: clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify'],
    }),
  );
  const { accessToken, session, user } = await step('server sign-in', () => exchangeCode(code));
  await step('authenticate', () => sdk.commands.authenticate({ access_token: accessToken }));
  return { session, user, instanceId: sdk.instanceId, cdnBase: '/discord-cdn', discord: true };
}
