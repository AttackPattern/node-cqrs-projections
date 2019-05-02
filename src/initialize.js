import AuthTokenMapper from './authTokenMapper';
import IdentityMiddleware from './identityMiddleware';
import ProjectionRouter from './projectionRouter';
import TestRouter from './testRouter';

import SqlProjectionState from './sqlProjectionState';
import SqlEventFeed from './sqlEventFeed';

import projectionStore from './projectionStore';
import Identity from './identity';

export default class Projections {

  static initialize = async ({ container, config, db, storeFolder, viewFolder, identityMapper = token => new Identity(token) }) => {
    container.register('db', () => db);

    await projectionStore(config('connections').mongoUrl);

    const projectionState = new SqlProjectionState();

    const key = await projectionState.getActiveKey();

    const stores = Object.entries(storeFolder)
      .reduce((result, { [0]: name, [1]: Store }) => {
        result[name] = container.resolve(Store, { activeKey: key });
        return result;
      }, {});

    const views = Object.entries(viewFolder)
      .reduce((result, { [0]: client, [1]: clientViews }) => {
        result[client] = Object.entries(clientViews).map(({ [0]: name, [1]: View }) => ({ name, view: container.resolve(View, [stores]) }));
        return result;
      }, {});

    const sqlEventFeed = new SqlEventFeed({
      db,
      projectionState,
      stores: Object.values(stores)
    });
    // if we have an active key, lets make sure and swap the projection stores over to the keyed version of the model
    if (key) {
      Object.values(stores).filter(store => store.reset).forEach(p => p.reset(key));
    }
    Object.values(stores).filter(store => store.onEvent).forEach(p => sqlEventFeed.subscribe(e => p.onEvent(e)));


    return {
      routers: {
        projection: new ProjectionRouter(views),
        test: new TestRouter(Object.values(stores), sqlEventFeed)
      },
      middleware: {
        identity: new IdentityMiddleware(new AuthTokenMapper({
          secret: config.decrypt(config('authentication').secret),
          identityMapper
        })).inject
      },
      stores,
      views
    };
  }
}
