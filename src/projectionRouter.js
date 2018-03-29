import Router from 'koa-router';

function stripMetadata(data) {
  if (data && typeof data === 'object' && !(data instanceof Date)) {
    delete data._id;
    delete data.__v;
    Object.entries(data).forEach(({ [1]: i }) => stripMetadata(i));
  }
  return data;
}

export default class ProjectionRouter extends Router {
  constructor(projections) {
    super();

    Object.entries(projections).forEach(({
      [0]: name,
      [1]: clientProjections
    }) => {
      clientProjections.forEach(projection => {
        this.get(`/${name}/${projection.name}/:id?/:entity?`, async (ctx, next) => {
          try {
            let { id, entity } = ctx.params;
            let result = await projection.view.get(id ? { id, ...ctx.query } : ctx.query, ctx.$identity, entity);
            ctx.status = 200;
            ctx.body = stripMetadata(id && !entity ? result[0] : result);
          }
          catch (e) {
            console.log(`Failed loading projection /${name}`, e);
            return next();
          }
        });
      });
    });
  }
}
