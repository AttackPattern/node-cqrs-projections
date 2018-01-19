import Router from 'koa-router';

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
            let data = await projection.get(ctx.query, ctx.$identity);
            if (Array.isArray(data)) {
              data.forEach(r => {
                delete r._id;
                delete r.__v;
              });
            }
            ctx.status = 200;
            return ctx.body = data;
          }
          catch (e) {
            console.log(`Failed loading projection /${name}`, e);
            return next();
          }
        })
          .get(`/${name}/${projection.name()}/:id`, async (ctx, next) => {
            try {
              let identity = ctx.$identity;
              let id = ctx.params.id;
              if (id === 'mine') {
                if (!identity || identity.isAnonymous()) {
                  ctx.status = 401;
                  return ctx.body = { error: 'No authorization information supplied' };
                }
                if (!projection.getMine) {
                  ctx.status = 404;
                  return ctx.body = { error: `No mine endpoint for ${name}` };
                }
                let result = await projection.getMine(identity);
                let { _id, __v, ...data } = (Array.isArray(result) && result.length) ? result[0] : result;
                ctx.body = data;
              }
              else {
                let result = await projection.getById(id, ctx.$identity);
                let { _id, __v, ...data } = (Array.isArray(result) && result.length) ? result[0] : result;
                ctx.body = data;
                ctx.status = 200;
              }
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
