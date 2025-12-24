// server/services/jobManager.js
const EventEmitter = require('events');

const jobs = new Map();

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
}

function createJob() {
  const id = makeId();
  const emitter = new EventEmitter();
  // allow many listeners
  emitter.setMaxListeners(1000);
  jobs.set(id, emitter);
  return { id, emitter };
}

function getEmitter(id) {
  return jobs.get(id);
}

function emit(id, event, data) {
  const e = jobs.get(id);
  if (e) e.emit(event, data);
}

function finish(id) {
  const e = jobs.get(id);
  if (e) {
    try { e.emit('done'); } catch (err) {}
    // cleanup after a minute
    setTimeout(() => jobs.delete(id), 60 * 1000);
  }
}

module.exports = {
  createJob,
  getEmitter,
  emit,
  finish
};
