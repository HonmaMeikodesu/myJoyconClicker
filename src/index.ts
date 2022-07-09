class GamePadManager {
  
  private _lastState: Gamepad["buttons"] = [];

  private readonly gamepadId: string;
  private offRAF: number;

  getGamepadId() {
    return this.gamepadId;
  }
  private get gamepadInstance(): Gamepad {
    // navigator.getGamepads()拿到的是gamepad的snapshot状态
    return navigator.getGamepads().filter(Boolean).filter((gamepad) => gamepad.id === this.gamepadId)[0];
  };

  private listenersMap: {[key: number]: () => void};

  constructor(gamepadId: string) {
    this.gamepadId = gamepadId;
  }

  registerListeners(listenersMap: typeof this.listenersMap) {
    this.listenersMap = listenersMap;
  }

  unregisterListeners(buttonIdx: number) {
    Reflect.deleteProperty(this.listenersMap, buttonIdx);
  }

  startListen() {
    // 用户点击按钮触发gamepadConnect，需要在开始监听时手动触发一次listener
    this._lastState = this.gamepadInstance.buttons;
    const pressedButtonIdxs = this._lastState.map(((button) => button.pressed));
    Reflect.ownKeys(this.listenersMap).map((idx) => {
      const buttonIdx = parseInt(idx as string);
      if (pressedButtonIdxs[buttonIdx] === true) {
        this.listenersMap[buttonIdx]?.();
      }
    });
    const raqCb = () => {
      const nextState = this.gamepadInstance.buttons;
      const pressedButtonIdxs = nextState.map(((button, idx) => !this._lastState[idx].pressed && button.pressed));
      Reflect.ownKeys(this.listenersMap).map((idx) => {
        const buttonIdx = parseInt(idx as string);
        if (pressedButtonIdxs[buttonIdx] === true) {
          this.listenersMap[buttonIdx]?.();
        }
      });
      this._lastState = nextState;
      requestAnimationFrame(raqCb);
    };
    this.offRAF = requestAnimationFrame(raqCb);
  }

  offListen() {
    cancelAnimationFrame(this.offRAF);
  }

  dispose() {
    this.offListen();
  }

}

let offListeners: (() => void)[] = [];

function myJoyConClicker(listenersMap: {[key: number]: () => void}) {

  offListeners.forEach((off) => off?.());

  offListeners = [];

  let gamePadManagerList: GamePadManager[] = [];

  const connectedCb = () => {
    const gamePads = navigator.getGamepads().filter(Boolean);
    gamePads.forEach((connectedGamePad) => {
      if (gamePadManagerList.length ===0 || gamePadManagerList.some((gamePad) => gamePad.getGamepadId() !== connectedGamePad.id)) {
        // incoming new gamePad
        const newGamePadManager = new GamePadManager(connectedGamePad.id);
        gamePadManagerList.push(newGamePadManager);
        newGamePadManager.registerListeners(listenersMap);
        newGamePadManager.startListen();
      } 
    })
  };

  // 已经有gamePad连接进来，手动触发一次
  connectedCb();

  const disconnectedCb = () => {
    const gamePads = navigator.getGamepads().filter(Boolean);
    const disconnectedGamePadList: GamePadManager[] = [];
    gamePadManagerList.forEach((manager) => {
      if (gamePads.every((connectedGamePad) => connectedGamePad.id !== manager.getGamepadId())) {
        // existing gamePad disconnected...
        disconnectedGamePadList.push(manager);
      }
    });
    disconnectedGamePadList.forEach((manager) => {
      manager.dispose();
      const disconnectedManagerId = manager.getGamepadId();
      gamePadManagerList = gamePadManagerList.filter((currentManager) => currentManager.getGamepadId() === disconnectedManagerId);
    })
  };

  window.addEventListener("gamepadconnected", connectedCb);
  
  window.addEventListener("gamepaddisconnected", disconnectedCb);
  
  offListeners.push(() => window.removeEventListener("gamepadconnected", connectedCb), () => window.removeEventListener("gamepaddisconnected", disconnectedCb));
}

myJoyConClicker({0: () => console.log(132), 1: () => console.log(456)})