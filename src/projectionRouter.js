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

    Object.entries(projections).map(({
      [0]: name,
      [1]: projections
    }) => {
      projections.forEach(projection => {
        this.get(`/${name}/${projection.name()}`, async (ctx, next) => {
          try {
            let result = await projection.get(ctx.query, ctx.$identity);
            ctx.status = 200;
            return ctx.body = stripMetadata(result);
          }
          catch (e) {
            console.log(`Failed loading projection /${name}`, e);
            return next();
          }
        })
          .get(`/${name}/${projection.name()}/:id`, async (ctx, next) => {
            try {
              let id = ctx.params.id;
              let result = await projection.getById(id, ctx.$identity);
              ctx.body = stripMetadata(result);
              ctx.status = 200;
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
