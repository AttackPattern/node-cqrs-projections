import Identity from './identity';

export default class IdentityMiddleware {
  constructor(authTokenMapper) {
    this.authTokenMapper = authTokenMapper;
  }

  inject = async (ctx, next) => {
    try {
      ctx.$identity = await this.getIdentity(ctx);
      await next();
    }
    catch (err) {
      console.log('Failed validating authentication token', err);
      ctx.status = 401;
      ctx.body = {
        error: err.name || 'Failed validating authentication token'
      };
    }
  }

  getIdentity = ctx => {
    let { [0]: type, [1]: token } = ctx.headers.authorization?.split(' ') || [];

    token = token || type;
    if (!token) {
      return { identity: Identity.anonymous };
    }
    return this.authTokenMapper.verify(token);
  }
}
