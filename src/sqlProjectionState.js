import mongoose from 'mongoose';

let key = 'sql.projectionState';

class ProjectionStateSchema extends mongoose.Schema {
  constructor() {
    super({
      id: String,
      bookmark: Number
    });
  }
}

let ProjectionStateModel = mongoose.model.call(mongoose, 'sql.ProjectionState', new ProjectionStateSchema());

export default class ProjectionState {

  bookmark = async () => {
    var state = await ProjectionStateModel.findOne({ id: key });

    if (!state) {
      state = new ProjectionStateModel();
      state.id = key;
    }

    if (!state.bookmark) {
      state.bookmark = 0;
      await state.save();
    }

    return state.bookmark;
  }

  setBookmark = async bookmark => {
    console.log('Bookmark: setting projection bookmark to', bookmark);
    let state = await ProjectionStateModel.findOne({ id: key });

    if (!state) {
      state = new ProjectionStateModel();
      state.id = key;
    }

    state.bookmark = bookmark;
    await state.save();
  }

  reset = async () => {
    await ProjectionStateModel
      .findOneAndUpdate({ id: key }, { bookmark: 0 }, { upsert: true });
  }
}
