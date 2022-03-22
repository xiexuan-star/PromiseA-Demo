let PROMISE_STATE;
(function (PROMISE_STATE) {
  PROMISE_STATE["FULFILLED"] = "fulfilled";
  PROMISE_STATE["PENDING"] = "pending";
  PROMISE_STATE["REJECTED"] = "rejected";
})(PROMISE_STATE || (PROMISE_STATE = {}));

function isThenable(v) {
  let result = false;
  try {
    result = (typeof Reflect.get(v, 'then')) === 'function';
  } catch (e) {
    //
  }
  return result;
}

class PromiseMe {
  state = PROMISE_STATE.PENDING;
  fulfilledEvents = [];
  rejectedEvents = [];

  constructor(fn) {
    fn(this.setFulfilled.bind(this), this.setRejected.bind(this));
  }

  static resolve(any) {
    console.log('resolve=>', any);
    if (!isThenable(any)) return new PromiseMe(r => r(any));
    return new PromiseMe((r, j) => {
      try {
        any.then(r, j);
      } catch (e) {
        j(e);
      }
    }).then(v => {
      if (isThenable(v)) {
        return PromiseMe.resolve(v);
      }
      return v;
    });
  }

  trigger(type) {
    if (this.state === PROMISE_STATE.PENDING) return;
    if (type === PROMISE_STATE.FULFILLED) {
      this.fulfilledEvents.forEach(event => {
        queueMicrotask(event.bind(undefined, this.value));
      });
      this.fulfilledEvents.length = 0;
    } else {
      this.rejectedEvents.forEach(event => {
        queueMicrotask(event.bind(undefined, this.reason));
      });
      this.rejectedEvents.length = 0;
    }
  }

  setFulfilled(value) {
    if (this.state !== PROMISE_STATE.PENDING) return;
    this.unThen(value, v => {
      this.value = v;
      this.state = PROMISE_STATE.FULFILLED;
      this.trigger(PROMISE_STATE.FULFILLED);
    }, reason => {
      this.setRejected(reason);
    });
  }

  setRejected(reason) {
    if (this.state !== PROMISE_STATE.PENDING) return;
    this.state = PROMISE_STATE.REJECTED;
    this.reason = reason;
    this.trigger(PROMISE_STATE.REJECTED);
  }

  unThen(instance, resolve, reject) {
    if (isThenable(instance)) {
      return PromiseMe.resolve(instance).then(resolve, reject);
    } else {
      return resolve(instance);
    }
  }

  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : (v => v);
    onRejected = typeof onRejected === 'function' ? onRejected : (r => {throw r;});
    const result = new PromiseMe((resolve, reject) => {
      this.fulfilledEvents.push(value => {
        try {
          const res = this.unThen(value, onFulfilled);
          if (res === result) throw new TypeError(`promise and x refer to the same object,`);
          console.log(res, value);
          this.unThen(res, resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
      this.rejectedEvents.push(reason => {
        try {
          const res = onRejected(reason);
          if (res === result) throw new TypeError(`promise and x refer to the same object,`);
          resolve(res);
        } catch (e) {
          reject(e);
        }
      });
      if (this.state !== PROMISE_STATE.PENDING) {
        this.trigger(this.state);
      }
    });
    return result;
  }

  static deferred() {
    const result = {};
    result.promise = new PromiseMe(function (resolve, reject) {
      result.resolve = resolve;
      result.reject = reject;
    });

    return result;
  }
}

const a = new PromiseMe((resolve, rejected) => {
  const res = { then: Object.create(null) };
  resolve(res);
});
const b = new Promise((resolve, rejected) => {
  const res = { then: Object.create(null) };
  resolve(res);
});

setTimeout(() => {
  console.log(a, b);
});
module.exports = PromiseMe;
