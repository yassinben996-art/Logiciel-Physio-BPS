// Point d'entrée du Worker Cloudflare.
import { D1Store, type D1Like } from './d1Store';
import { handle, type RelayEnv } from './handler';

export default {
  fetch(req: Request, env: RelayEnv & { DB: D1Like }): Promise<Response> {
    return handle(req, env, new D1Store(env.DB));
  },
};
