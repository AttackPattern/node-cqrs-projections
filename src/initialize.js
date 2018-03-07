import AuthTokenMapper from './authTokenMapper';
import IdentityMiddleware from './identityMiddleware';
import ProjectionRouter from './projectionRouter';
import TestRouter from './testRouter';

import SqlProjectionState from './sqlProjectionState';
import SqlEventFeed from './sqlEventFeed';

import projectionStore from './projectionStore';

export default class Projections {
  static initialize = async ({ container, config, db, storeFolder, viewFolder }) => {
    container.register('db', () => db);

    const stores = Object.entries(storeFolder)
      .reduce((result, { [0]: name, [1]: Store }) => {
        result[name] = container.resolve(Store);
        return result;
      }, {});

    const views = Object.entries(viewFolder)
      .reduce((result, { [0]: client, [1]: clientViews }) => {
        result[client] = Object.entries(clientViews).map(({ [1]: View }) => container.resolve(View, [stores]));
        return result;
      }, {});

    const sqlEventFeed = new SqlEventFeed({
      db,
      projectionState: new SqlProjectionState()
    });
    Object.values(stores).filter(store => store.onEvent).forEach(p => sqlEventFeed.subscribe(e => p.onEvent(e)));

    await projectionStore(config('connections').mongoUrl);

    return {
      routers: {
        projection: new ProjectionRouter(views),
        test: new TestRouter(Object.values(stores), sqlEventFeed)
      },
      middleware: {
        identity: new IdentityMiddleware(new AuthTokenMapper({
          secret: config.decrypt(config('authentication').secret)
        })).inject
      }
    };
  }
}
