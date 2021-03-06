import Router from 'koa-router';
import uuidV4 from 'uuid/v4';

export default class TestRouter extends Router {

    constructor(stores, sqlEventFeed) {
    super();

    this.get('/reset', async ctx => {
      const state = sqlEventFeed.getState();
      if (state === 'resetting' || state === 'reset-start') {
        ctx.status = 200;
        return ctx.body = 'Reset already in progress';
      }
      else if (state === 'starting') {
        ctx.status = 503;
        return ctx.body = 'Projections are still being built';
      }
      console.log('setting state to resetting');
      // generate a new active state key to swap our projection writes over to
      sqlEventFeed.setState('reset-start');
      const key = uuidV4();
      // have all stores switch their write model over to the new key
      await Promise.all(stores.map(async p => p.reset && await p.reset(key)));
      // reset the bookmark and start rebuilding projections on the new bookmark
      await sqlEventFeed.reset(key);

      ctx.status = 200;
      return ctx.body = 'Reset all projections and state';
    });

    this.get('/version', async ctx => {
      ctx.status = 200;
      return ctx.body = 'Projection with subscriber dependency';
    });
    this.get('/health', async ctx => {
      switch (sqlEventFeed.getState()) {
        case 'starting':
          ctx.status = 503;
          return ctx.body = 'Projections is building';
        default:
          ctx.status = 200;
          return ctx.body = 'OK';
      }

    });
  }
}
