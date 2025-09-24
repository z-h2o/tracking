export interface TrackingData {
    [key: string]: any;
}
export interface ErrorData {
    type: string;
    message: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    stack?: string;
    timestamp: number;
    url: string;
    userAgent?: string;
    reason?: string;
    tagName?: string;
    source?: string;
}
export type SenderType = 'jsonp' | 'image' | 'xhr' | 'fetch';
export interface JsonpConfig {
    callbackParam: string;
    timeout: number;
}
export interface StorageConfig {
    enabled: boolean;
    key: string;
    maxSize: number;
}
export interface ErrorMonitoringConfig {
    enabled: boolean;
    captureJSErrors: boolean;
    capturePromiseRejections: boolean;
    captureResourceErrors: boolean;
    captureNetworkErrors: boolean;
    maxErrorsPerSession: number;
    errorSamplingRate: number;
    ignoreErrors: (string | RegExp)[];
    beforeErrorSend: (errorData: ErrorData) => ErrorData | null;
}
export interface PerformanceConfig {
    useIdleCallback: boolean;
    throttleInterval: number;
    debounceDelay: number;
}
export interface BatchConfig {
    enabled: boolean;
    maxSize: number;
    flushInterval: number;
    maxWaitTime: number;
}
export interface TrackingConfig {
    endpoint: string;
    sender: SenderType;
    jsonp: JsonpConfig;
    storage?: StorageConfig;
    errorMonitoring: ErrorMonitoringConfig;
    performance?: PerformanceConfig;
    batch?: BatchConfig;
    logToPage: boolean;
    fallbackSender: boolean;
    idleBatchSize: number;
    dataProcessor: (data: TrackingData) => TrackingData;
    beforeSend: (data: TrackingData) => TrackingData | null;
    afterSend: (response: any, data: TrackingData) => void;
    onError: (error: Error, data: TrackingData) => void;
}
export type SenderFunction = (url: string, data: TrackingData | TrackingData[]) => Promise<any>;
export interface SendItem {
    data: TrackingData;
    timestamp: number;
    attempts: number;
    options?: SendOptions;
}
export interface SendOptions {
    onSuccess?: (response: any) => void;
    onError?: (error: Error) => void;
}
export interface PageInfo {
    title: string;
    referrer: string;
    viewport: {
        width: number;
        height: number;
    };
}
export interface UserInfo {
    userAgent: string;
    language: string;
    timezone: string;
}
export interface ElementInfo {
    tagName: string;
    className: string;
    id: string;
    text: string;
    attributes: Record<string, string>;
}
export interface PositionInfo {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface EventInfo {
    type: string;
    clientX?: number;
    clientY?: number;
    button?: number;
}
export interface ErrorStats {
    jsErrors: number;
    promiseRejections: number;
    resourceErrors: number;
    networkErrors: number;
    lastErrorTime: number | null;
}
export interface TrackingStats {
    errorStats: ErrorStats;
    queueSize: number;
    isProcessing: boolean;
    batchConfig?: BatchConfig;
    performanceConfig?: PerformanceConfig;
}
export interface IdleDeadline {
    didTimeout: boolean;
    timeRemaining: () => number;
}
export type IdleCallback = (deadline: IdleDeadline) => void;
export type IdleCallbackId = number;
export interface TrackingElement extends Element {
    getAttribute(name: string): string | null;
    hasAttribute(name: string): boolean;
    setAttribute(name: string, value: string): void;
    getBoundingClientRect(): DOMRect;
    tagName: string;
    className: string;
    id: string;
    attributes: NamedNodeMap;
}
declare global {
    interface Window {
        [key: string]: any;
    }
}
//# sourceMappingURL=index.d.ts.map