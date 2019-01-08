import { queue } from 'async';
import bookshelf from 'bookshelf';

const pollingInterval = 100;
const eventBatchSize = 10;

function fromStoredEvent(event) {
  return {
    aggregate: event.aggregate,
    aggregateId: event.aggregateId,
    timestamp: event.timestamp,
    type: event.type,
    sequenceNumber: event.sequenceNumber,
    actor: event.actor,
    position: JSON.parse(event.position),
    ...JSON.parse(event.body)
  };
}

export default class EventStore {
  constructor({ db, projectionState }) {
    this.subscriptions = [];
    this.projectionState = projectionState;

    this.queue = queue(async (event, callback) => {
      console.log(`Event: ${event.aggregateId} ${event.aggregate}.${event.type}`);
      await Promise.all(this.subscriptions.map(async s => {
        try {
          return await s(event);
        }
        catch (err) {
          global.log ? global.log.note({
            error: err,
            aggregateId: event.aggregateId,
            aggregate: event.aggregate,
            type: event.type,
            event: event
          }) : console.log(err);
        }
      }));
      return callback();
    });

    this.Event = bookshelf(db.knex('eventstore'))
      .plugin('pagination')
      .Model.extend({
        tableName: 'events'
      });

    this.consumeEventStream();
  }

  subscribe(projection) {
    this.subscriptions.push(projection);
  }

  consumeEventStream = async () => {
    let bookmark = await this.projectionState.bookmark();
    let { events, bookmark: newBookmark, lastBookmark } = await this.getNextEvents(bookmark);

    if (events.length) {
      events.forEach(event => {
        this.queue.push(event);
      });

      await this.projectionState.setBookmark(newBookmark);
    }
    setTimeout(async () => await this.consumeEventStream(), newBookmark < lastBookmark ? 0 : pollingInterval);
  }

  getNextEvents = async bookmark => {
    try {
      let events = (await this.Event
        .where('id', '>', bookmark)
        .query(qb => qb.orderBy('id', 'asc'))
        .fetchPage({ pageSize: eventBatchSize })
      ).toJSON();

      let newBookmark = bookmark;
      if (events.length) {
        let { length: l, [l - 1]: lastEvent } = events;
        newBookmark = lastEvent.id;
      }

      let lastRecord = (await this.Event.query(qb => qb.orderBy('id', 'desc')).fetchPage({ pageSize: 1 })).toJSON()[0];
      let lastBookmark = lastRecord && lastRecord.id;

      return { events: events.map(e => fromStoredEvent(e)), bookmark: newBookmark, lastBookmark };
    }
    catch (e) {
      if (e.code !== 'ER_BAD_DB_ERROR') {
        console.log('Error loading events', e);
      }
      return { events: [], bookmark: bookmark };
    }
  }

  reset = async () => {
    await this.projectionState.reset();
  }
}
