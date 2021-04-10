const Worker = require('worker_threads');

module.exports = class WorkerPool {
  constructor (filepath, poolSize) {
    this.workersPool = [];
    for (let i = 0; i < poolSize; i++) {
      this.workersPool.push(new Worker(filepath));
    }
    this.idlePool = this.workersPool.slice();
    this.queue = [];
    this.filepath = filepath;
    this.poolSize = poolSize;
  }

  run (args) {
    return new Promise((resolve, reject) => {
      if (this.idlePool.length > 0) {
        const worker = this.idlePool.pop();
        this.runWorker(worker, args, resolve, reject);
      } else {
        this.queue.push({ args, resolve, reject });
      }
    });
  }

  executeInQueue () {
    if (this.idlePool.length > 0) {
      const worker = this.idlePool.pop();
      const element = this.queue.pop();
      if (element) {
        this.runWorker(worker, element.args, element.resolve, element.reject);
      }
    }
  }

  runWorker (worker, args, promiseResolve, promiseReject) {
    worker.on('message', (data) => {
      promiseResolve(data);
      this.idlePool.push(worker);
    });
    worker.on('error', (error) => {
      promiseReject(error);
      this.idlePool.push(worker);
    })
    worker.postMessage(args);
  }

  killAllWorkers() {
    this.workersPool.forEach((worker) => {
      worker.kill();
    });
  }
};
