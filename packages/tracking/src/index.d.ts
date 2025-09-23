// TypeScript 声明文件
export interface TrackingConfig {
  endpoint?: string;
  sender?: 'jsonp' | 'image' | 'xhr' | 'fetch';
  debug?: boolean;
  logToPage?: boolean;
  
  jsonp?: {
    callbackParam?: string;
    timeout?: number;
  };
  
  storage?: {
    enabled?: boolean;
    key?: string;
    maxSize?: number;
  };
  
  errorMonitoring?: {
    enabled?: boolean;
    captureJSErrors?: boolean;
    capturePromiseRejections?: boolean;
    captureResourceErrors?: boolean;
    captureNetworkErrors?: boolean;
    maxErrorsPerSession?: number;
    errorSamplingRate?: number;
    ignoreErrors?: (string | RegExp)[];
    beforeErrorSend?: (errorData: any) => any;
  };
  
  fallbackSender?: boolean;
  dataProcessor?: (data: any) => any;
  beforeSend?: (data: any) => any;
  afterSend?: (response: any, data: any) => void;
  onError?: (error: Error, data: any) => void;
}

export interface TrackingEventData {
  event?: string;
  action?: string;
  value?: any;
  custom?: Record<string, any>;
  [key: string]: any;
}

export interface TrackingStats {
  errorStats: {
    jsErrors: number;
    promiseRejections: number;
    resourceErrors: number;
    networkErrors: number;
    lastErrorTime: number | null;
  };
}

export class TrackingSDK {
  constructor(config?: TrackingConfig);
  
  // 公共方法
  start(): void;
  stop(): void;
  track(eventData: TrackingEventData, options?: any): void;
  sendTrack(data?: TrackingEventData): void;
  updateConfig(newConfig: Partial<TrackingConfig>): void;
  getStats(): TrackingStats;
  flush(): void;
}

export default TrackingSDK;
