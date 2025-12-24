// server/controllers/syncController.js
const syncService = require('../services/syncService');
const jobManager = require('../services/jobManager');

async function postSyncGames(req, res) {
  try {
    const { seasons, per_page, dryRun, historical, maxPages, background } = req.body || {};
    const opts = {
      per_page: per_page ? Number(per_page) : undefined,
      seasons: Array.isArray(seasons) ? seasons : (typeof seasons === 'string' ? seasons.split(',').map(s => Number(s.trim())) : seasons),
      historical: Boolean(historical),
      dryRun: Boolean(dryRun),
      maxPages: maxPages ? Number(maxPages) : undefined
    };

    if (background) {
      const job = jobManager.createJob();
      res.json({ ok: true, jobId: job.id });

      // run job in background
      (async () => {
        try {
          jobManager.emit(job.id, 'progress', { msg: 'Starting games sync' });
          const result = await syncService.syncGames({ ...opts, onProgress: (p) => jobManager.emit(job.id, 'progress', p) });
          jobManager.emit(job.id, 'complete', result);
        } catch (err) {
          jobManager.emit(job.id, 'error', { message: err.message || String(err) });
        } finally {
          jobManager.finish(job.id);
        }
      })();

      return;
    }

    // not background: run and return result
    const result = await syncService.syncGames(opts);
    return res.json({ ok: true, result });
  } catch (err) {
    console.error('postSyncGames error', err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
}

async function postSyncPlayers(req, res) {
  try {
    const { per_page, dryRun, background } = req.body || {};
    const opts = { per_page: per_page ? Number(per_page) : undefined, dryRun: Boolean(dryRun) };

    if (background) {
      const job = jobManager.createJob();
      res.json({ ok: true, jobId: job.id });

      (async () => {
        try {
          jobManager.emit(job.id, 'progress', { msg: 'Starting players sync' });
          const result = await syncService.syncPlayers({ ...opts, onProgress: (p) => jobManager.emit(job.id, 'progress', p) });
          jobManager.emit(job.id, 'complete', result);
        } catch (err) {
          jobManager.emit(job.id, 'error', { message: err.message || String(err) });
        } finally {
          jobManager.finish(job.id);
        }
      })();

      return;
    }

    const result = await syncService.syncPlayers(opts);
    return res.json({ ok: true, result });
  } catch (err) {
    console.error('postSyncPlayers error', err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
}

// SSE stream endpoint - send progress events for a running job
function sseStream(req, res) {
  const jobId = req.params.jobId;
  if (!jobId) return res.status(400).send('jobId required');

  const emitter = jobManager.getEmitter(jobId);
  if (!emitter) return res.status(404).send('job not found or expired');

  // setup SSE headers
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();

  const onProgress = (data) => {
    res.write(`event: progress\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  const onComplete = (data) => {
    res.write(`event: complete\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  const onError = (data) => {
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  const onDone = () => {
    res.write(`event: done\n`);
    res.write(`data: ${JSON.stringify({ ok:true })}\n\n`);
    // close connection
    res.end();
  };

  emitter.on('progress', onProgress);
  emitter.on('complete', onComplete);
  emitter.on('error', onError);
  emitter.on('done', onDone);

  // if client closes connection, remove listeners
  req.on('close', () => {
    emitter.removeListener('progress', onProgress);
    emitter.removeListener('complete', onComplete);
    emitter.removeListener('error', onError);
    emitter.removeListener('done', onDone);
  });
}

module.exports = { postSyncGames, postSyncPlayers, sseStream };
