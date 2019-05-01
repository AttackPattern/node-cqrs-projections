import mongoose from 'mongoose';

const defaultKey = 'sql.projectionState';
const ProjectionStateSchema = new mongoose.Schema({
      id: String,
      bookmark: Number
  });

let activeDataKey = 'sql.activeKey';
const ActiveDataSchema = new mongoose.Schema({
    id: String,
    key: String
});

export default class ProjectionState {
  constructor() {
    this.key = defaultKey;
    this.ProjectionStateModel = mongoose.model(defaultKey, ProjectionStateSchema);
    this.ActiveDataModel = mongoose.model(activeDataKey, ActiveDataSchema);
  }
  getActiveKey = async () => {
      let state = await this.ActiveDataModel.findOne({ id: activeDataKey });
      // change over ProjectionState key as well.
      if (state?.key) {
        this.key = `${defaultKey}.${state?.key}`;
        this.ProjectionStateModel = mongoose.model(this.key, ProjectionStateSchema);
      }
      return state?.key || '';
  }

  setKey = async activeKey => {
    let state = await this.ActiveDataModel.findOne({ id: activeDataKey });

    if (!state) {
      state = new this.ActiveDataModel();
      // always set the id to the key, we only ever want to search against this one key
      state.id = activeDataKey;
    }

    state.key = activeKey;
    await state.save();
  }

  bookmark = async () => {
    // Ok this is confusing, so lets explain it.  We simply need a single entry in a collection.
    // thus we just tag the id as the defaultKey and search to see if it exists.  You might be
    // tempted to use this.key, but that's a mistake as that's what controls the model.  we always
    // want to store the value of of bookmarks (and projection state) in the defaultKey
    var state = await this.ProjectionStateModel.findOne({ id: defaultKey });

    if (!state) {
      state = new this.ProjectionStateModel();
      // remember always use default Key for storing the value in the collection
      state.id = defaultKey;
    }

    if (!state.bookmark) {
      state.bookmark = 0;
      await state.save();
    }

    return state.bookmark;
  }

  setBookmark = async bookmark => {
    let state = await this.ProjectionStateModel.findOne({ id: defaultKey });

    if (!state) {
      state = new this.ProjectionStateModel();
      // remember always use default Key for storing the value in the collection
      state.id = defaultKey;
    }

    state.bookmark = bookmark;
    await state.save();
  }

  reset = async activeState => {
    const newKey = `${defaultKey}.${activeState.key}`;
    const oldModel = this.ProjectionStateModel;
    // we update the schema to point to the new key
    this.ProjectionStateModel = mongoose.model(newKey, ProjectionStateSchema);
    // Really this is creating a new model all together since the model key
    // just changed.
    await this.ProjectionStateModel
      .findOneAndUpdate({ id: defaultKey }, { bookmark: 0 }, { upsert: true });

    oldModel.collection.drop();
    this.key = newKey;
    // save the key in the database so we don't have to rebuild the data on startup
    this.setKey(activeState.key);
  }
}
