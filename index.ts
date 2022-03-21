enum PROMISE_STATE {
  FULFILLED = 'fulfilled',
  PENDING = 'pending',
  REJECTED = 'rejected'
}

type FulfilledHandler<T> = (p: T) => any
type RejectedHandler = (r: any) => any;

type PromiseHandler<T> = (resolve: (value: T) => void, reject: (reason: any) => any) => any

class PromiseMe<T extends any = any> {
  private state = PROMISE_STATE.PENDING;
  private value?: T;
  private reason: any;
  private onFulfilledHandler: FulfilledHandler<T>[] = [];
  private onRejectedHandler: RejectedHandler[] = [];

  constructor(handler: PromiseHandler<T>) {
    try {
      handler(this.setFulfilled.bind(this), this.setRejected.bind(this));
    } catch (e: any) {
      this.setRejected(e);
    }
  }

  private trigger() {
    if (this.state === PROMISE_STATE.PENDING) return;
    if (this.state === PROMISE_STATE.FULFILLED) {
      this.onFulfilledHandler.forEach(cb => {
        queueMicrotask(cb.bind(undefined, this.value!));
      });
    } else {
      this.onRejectedHandler.forEach(cb => {
        queueMicrotask(cb.bind(undefined, this.reason));
      });
    }
    this.onRejectedHandler.length = 0;
    this.onFulfilledHandler.length = 0;
  }

  private setFulfilled(value: T) {
    if (!this.updateState(PROMISE_STATE.FULFILLED)) return;
    this.value = value;
    this.trigger();
  }

  private setRejected(reason: any) {
    if (!this.updateState(PROMISE_STATE.REJECTED)) return;
    this.reason = reason;
    this.trigger();
  }

  private updateState(state: PROMISE_STATE) {
    if (this.state !== PROMISE_STATE.PENDING) return false;
    if ([PROMISE_STATE.FULFILLED, PROMISE_STATE.REJECTED].includes(state)) {
      this.state = state;
      return true;
    }
    return false;
  }

  then(onFulfilled?: (p: T) => any, onRejected?: (r: any) => any) {
    onFulfilled = onFulfilled || (v => v);
    onRejected = onRejected || (r => {throw r;});

    const result = new PromiseMe((resolve, reject) => {
        if (typeof onFulfilled === 'function') {
          this.onFulfilledHandler.push((value: T) => {
            try {
              resolve(onFulfilled!(value));
            } catch (e) {
              reject(e);
            }
          });
          if (typeof onRejected === 'function') {
            this.onRejectedHandler.push((reason: any) => {
              try {
                resolve(onRejected!(reason));
              } catch (e) {
                reject(e);
              }
            });
          }
        }
      }
    );
    if (this.state !== PROMISE_STATE.PENDING) {
      this.trigger();
    }
    return result;
  }
}
