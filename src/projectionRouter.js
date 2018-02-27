import Router from 'koa-router';

function stripMetadata(data) {
  if (typeof data !== 'object' || data instanceof Date) {
    return data;
  }

  // TODO (brett) - This is messing up arrays
  const { _id, __v, ...stripped } = data;

  return Object.entries(stripped)
    .reduce((result, { [0]: key, [1]: value }) => {
      result[key] = stripMetadata(value);
      return result;
    }, {});
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
            return ctx.body = stripMetadata(Array.isArray(result) && result.length ? result[0] : result);
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
              ctx.body = stripMetadata(Array.isArray(result) && result.length ? result[0] : result);
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
