import { ProcessorState } from './processor.types';
export declare class ProcessorStateHolder {
    private state;
    constructor();
    get(): ProcessorState;
    set(state: ProcessorState): void;
    onStart(): void;
    onStop(): void;
    onClose(): void;
}
