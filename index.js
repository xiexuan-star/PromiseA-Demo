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
  value;
  reason;
  onFulfilledHandler = [];
  onRejectedHandler = [];

  static resolve(v) {
    if (v instanceof PromiseMe) return v;
    if (!v || !isThenable(v)) return new PromiseMe(resolve => resolve(v));
    return new PromiseMe((resolve, reject) => {
      try {

        v.then(resolve, reject);
      } catch (e) {
        reject(e);
      }
    }).then(sv => {
      if (isThenable(sv)) {
        return PromiseMe.resolve(sv);
      } else {
        return sv;
      }
    });
  }

  constructor(handler) {
    try {
      handler(this.setFulfilled.bind(this), this.setRejected.bind(this));
    } catch (e) {
      this.setRejected(e);
    }
  }

  trigger() {
    if (this.state === PROMISE_STATE.PENDING) return;
    if (this.state === PROMISE_STATE.FULFILLED) {
      this.onFulfilledHandler.forEach(cb => {
        queueMicrotask(cb.bind(undefined, this.value
        ))
        ;
      });
    } else {
      this.onRejectedHandler.forEach(cb => {
        queueMicrotask(cb.bind(undefined, this.reason));
      });
    }
    this.onRejectedHandler.length = 0;
    this.onFulfilledHandler.length = 0;
  }

  setFulfilled(value) {
    if (!this.updateState(PROMISE_STATE.FULFILLED)) return;
    this.value = value;
    this.trigger();
  }

  setRejected(reason) {
    if (!this.updateState(PROMISE_STATE.REJECTED)) return;
    this.reason = reason;
    this.trigger();
  }

  updateState(state) {
    if (this.state !== PROMISE_STATE.PENDING) return false;
    if ([PROMISE_STATE.FULFILLED, PROMISE_STATE.REJECTED].includes(state)) {
      this.state = state;
      return true;
    }
    return false;
  }

  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : (v => v);
    onRejected = typeof onRejected === 'function' ? onRejected : (r => {throw r;});
    return new PromiseMe((resolve, reject) => {
        const resolvePromise = (value) => {
          try {
            if (value === this) {
              throw new TypeError('[PromiseMe]:promise and value refer to the same object');
            }
            if (isThenable(value)) {
              PromiseMe.resolve(value).then(v => {
                resolve(onFulfilled(v));
              }, err => reject(err));
            } else {
              resolve(onFulfilled(value));
            }
          } catch (e) {
            reject(e);
          }
        };
        if (this.state === PROMISE_STATE.FULFILLED) {
          queueMicrotask(() => {
            resolvePromise(this.value);
          });
        } else {
          this.onFulfilledHandler.push(resolvePromise);
        }
        const rejectPromise = (reason) => {
          try {
            reject(onRejected(reason));
          } catch (e) {
            reject(e);
          }
        };
        if (this.state === PROMISE_STATE.REJECTED) {
          queueMicrotask(() => {
            rejectPromise(this.reason);
          });
        } else {
          this.onRejectedHandler.push(rejectPromise);
        }
      }
    );
  }

  static deferred() {
    const result = {};
    result.promise = new PromiseMe(function (resolve, reject) {
      result.resolve = resolve;
      result.reject = reject;
    });

    return result;
  }
};

new PromiseMe((r, j) => {
  j(22);
}).then(2, (r) => {
  console.log(r);
  return ++r;
}).then(2, r => {
  console.log(r);
});

module.exports = PromiseMe;
