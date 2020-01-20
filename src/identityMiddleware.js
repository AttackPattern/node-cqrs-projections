import Identity from './identity';

export default class IdentityMiddleware {
  constructor(authTokenMapper) {
    this.authTokenMapper = authTokenMapper;
  }

  inject = async (ctx, next) => {
    try {
      const identity = await this.getIdentity(ctx);
      if (identity?.claims?.require2fa) throw new Error('2FA verification required');
      ctx.$identity = identity;
      await next();
    }
    catch (err) {
      console.log('Failed validating authentication token', err.message);
      ctx.status = 401;
      ctx.body = {
        error: err.message || 'Failed validating authentication token'
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
