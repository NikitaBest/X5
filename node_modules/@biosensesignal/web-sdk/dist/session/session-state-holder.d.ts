import { OnStateChange, SessionState } from './session.types';
export declare class SessionStateHolder {
    private state;
    private onStateChange;
    constructor();
    get(): SessionState;
    set(state: SessionState): void;
    addOnStateChangeListener(onStateChange: OnStateChange): void;
    onStart(): void;
    onStop(): void;
    onTerminate(): void;
    onFrameAvailable(): void;
}
