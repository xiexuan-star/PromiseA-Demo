enum PROMISE_STATE {
  FULFILLED = 'fulfilled',
  PENDING = 'pending',
  REJECTED = 'rejected'
}

type FulfilledHandler<T> = (p: T) => any
type RejectedHandler = (r: any) => any;

class PromiseMe<T extends any = any> {
  private state = PROMISE_STATE.PENDING;
  private value?: T;
  private reason: any;

  private onFulfilledHandler?: FulfilledHandler<T>;
  private onRejectedHandler?: RejectedHandler;

  private setFulfilled() {
    if (!this.updateState(PROMISE_STATE.FULFILLED)) return;
    this.onFulfilledHandler?.(this.value!);
  }

  private setRejected() {
    if (!this.updateState(PROMISE_STATE.REJECTED)) return;
    this.onRejectedHandler?.(this.reason);
  }

  private updateState(state: PROMISE_STATE) {
    if (this.state !== PROMISE_STATE.PENDING) return false;
    if ([PROMISE_STATE.FULFILLED, PROMISE_STATE.REJECTED].includes(state)) {
      this.state = state;
    }
    return true;
  }

  then(onFulfilled?: (p: T) => any, onRejected?: (r: any) => any) {
    onFulfilled = onFulfilled || (v => v);
    onRejected = onRejected || (r => {throw r;});
    if (typeof onFulfilled === 'function') {
      this.onFulfilledHandler = onFulfilled;
    }
    if (typeof onRejected === 'function') {
      this.onRejectedHandler = onRejected;
    }
  }
}
