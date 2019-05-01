import Router from 'koa-router';
import uuidV4 from 'uuid/v4';

export default class TestRouter extends Router {

  constructor(stores, sqlEventFeed, activeState) {
    super();

    this.get('/reset', async ctx => {
      if (activeState.state === 'resetting') {
        ctx.status = 200;
        return ctx.body = 'Reset already in progress';
      }
      // generate a new active state key to swap our projection writes over to
      activeState.key = uuidV4();
      activeState.state = 'resetting';
      // have all stores switch their write model over to the new key
      await Promise.all(stores.map(async p => p.reset && await p.reset(activeState.key)));
      // reset the bookmark and start rebuilding projections on the new bookmark
      await sqlEventFeed.reset(activeState);
      // swap the stores read model over to the updated model.
      activeState.swap = async () => {
        await Promise.all(stores.map(async p => p.swap && await p.swap()));
        activeState.state = 'running';
      };

      ctx.status = 200;
      return ctx.body = 'Reset all projections and state';
    });

    this.get('/version', async ctx => {
      ctx.status = 200;
      return ctx.body = 'Projection with subscriber dependency';
    });
  }
}
