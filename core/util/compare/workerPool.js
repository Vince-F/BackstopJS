var WorkerThread = require("worker_threads");

module.exports = class WorkerPool {
    constructor(filePath, poolSize) {
        this.filePath = filePath;
        this.pool = [];
    }

    getWorker() {
        let availableWorkers = this.pool.filter((worker) => {
            return worker.isStarted === false;
        });
        if (availableWorkers.length > 0) {
            return availableWorkers[0];
        } else {
            const newWorker = new Worker(this.filePath);
            this.pool.push(newWorker);
            return newWorker;
        }
    }

    destroyAllWorker() {
        this.pool.forEach((worker) => {
            worker.destroy();
        });
    }
}

class Worker {
    constructor(filePath) {
        this.worker = new WorkerThread(filePath);
        this.isStarted = false;
    }

    execute(message) {
        this.worker.send(message);
        this.isStarted = true;
    }

    notifyFinished() {
        this.isStarted = false;
    }

    destroy() {
        this.worker.terminate();
    }
}