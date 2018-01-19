import Router from 'koa-router';

export default class TestRouter extends Router {

  constructor(stores, sqlEventFeed) {
    super();

    this.get('/reset', async ctx => {
      console.log('Resetting projections');

      await Promise.all(stores.map(async p => p.reset && await p.reset()));
      await sqlEventFeed.reset();

      ctx.status = 200;
      return ctx.body = 'Reset all projections and state';
    });

    this.get('/version', async ctx => {
      ctx.status = 200;
      return ctx.body = 'Projection with subscriber dependency';
    });
  }
}
