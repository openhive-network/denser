import type { Request, Response } from 'express';

export type TSerializable = string | number | boolean | Record<string, unknown> | Array<unknown>;

export interface IJsonRpcResponse {
  id: number;
  jsonrpc: string;
  result?: TSerializable;
  error?: TSerializable;
}

export interface IJsonRpcMockData {
  [key: string]: (params: Record<string, unknown>) => IJsonRpcResponse | void;
}

export abstract class AProxyMockResolver {
  public abstract hasHandler(req: Request): boolean;
  public abstract handle(req: Request, res: Response): void;
}

export class JsonRpcMock extends AProxyMockResolver {
  public constructor(private readonly mockData: IJsonRpcMockData) {
    super();
  }

  public hasHandler(req: Request): boolean {
    if (req.method !== 'POST' || typeof req.body !== 'object') return false;

    const { method, params } = req.body;

    if (typeof method !== 'string' || typeof params !== 'object') return false;

    if (method in this.mockData && this.mockData[method](params)) return true;

    return false;
  }

  public handle(req: Request, res: Response): void {
    const { method, params } = req.body;

    if (Object.prototype.hasOwnProperty.call(this.mockData, method)) {
      const mockFn = this.mockData[method];
      if (typeof mockFn === 'function') {
        const response = mockFn(params);
        res.json(response);
        return;
      }
    }

    throw new Error(`Method ${method} is not implemented`);
  }
}
