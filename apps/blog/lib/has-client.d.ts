// generated with command
// npx -p typescript tsc node_modules/hive-auth-client/has-client.js --declaration --allowJs --emitDeclarationOnly --outDir apps/auth/lib/

declare module 'hive-auth-client' {
  export class HasClient {
    /**
     * Class constructor
     * @param {string} host
     * @param {string=} authKeySecret
     * @param {boolean=} debug
     */
    constructor(host: string, authKeySecret?: string | undefined, debug?: boolean | undefined);
    websocket: WebSocket;
    websocketConnectionCheckDelay: number;
    timeout: number;
    isConnected: boolean;
    debug: boolean;
    config: {
      host: string;
      auth_key_secret: string;
    };
    eventHandlers: {
      ConnectionSuccess: any[];
      ConnectionFailure: any[];
      AttachFailure: any[];
      AttachSuccess: any[];
      AuthPending: any[];
      AuthSuccess: any[];
      AuthFailure: any[];
      SignPending: any[];
      SignSuccess: any[];
      SignFailure: any[];
      SignError: any[];
      ChallengePending: any[];
      ChallengeSuccess: any[];
      ChallengeFailure: any[];
      ChallengeError: any[];
      Error: any[];
      RequestExpired: any[];
    };
    messages: any[];
    uuid: string;
    currentRequestExpire: any;
    expireCheckTimeoutId: NodeJS.Timeout;
    authKey: string;
    /**
     * Console.log wrapper
     */
    log(...args: any[]): void;
    /**
     * @callback eventHandler
     * @param {Object} event
     * @param {string} event.message
     */
    /**
     * Adds a handler function for HAS websocket message events
     * @param {string} eventName
     * @param {eventHandler} handlerFunction
     */
    addEventHandler(eventName: string, handlerFunction: (event: any, message: string) => any): void;
    /**
     * @callback eventHandler
     * @param {Object} event
     * @param {string} event.message
     */
    /**
     * Removes a handler function for HAS websocket message events
     * @param {string} eventName
     * @param {eventHandler} handlerFunction
     */
    removeEventHandler(eventName: string, handlerFunction: (event: any, message: string) => any): void;
    /**
     * Dispatch HAS websocket message events
     * @param {string} eventName
     * @param {Object} event
     * @param {string} event.message
     */
    dispatchEvent(
      eventName: string,
      event: {
        message: string;
      }
    ): void;
    /**
     * Clears the request expiry check timeout
     */
    clearExpireTimeout(): void;
    /**
     * Sets the request expiry check timeout
     */
    setExpireTimeout(): void;
    /** Returns the remaining time until the current request expires **/
    getTimeToRequestExpire(): number;
    processWebsocketMessage(event: any): void;
    processWebsocketOpen(): void;
    processWebsocketClose(event: any): void;
    /**
     * Open a new websocket connection if the browser supports it
     * @returns {boolean}
     */
    connectWebsocket(): boolean;
    /**
     * Attach a previous session to the new connection
     */
    attach(): void;
    /**
     * Promisified sleep helper
     * @param {number} ms
     * @returns {Promise<unknown>}
     */
    sleep(ms: number): Promise<unknown>;
    /**
     * Wait until the websocket is ready
     * @TODO add max wait time
     * @returns {Promise<void>}
     */
    waitForSocketConnection(): Promise<void>;
    /**
     * Verifies the websocket is opened and connected else do it
     * @returns {Promise<boolean>}
     */
    connect(): Promise<boolean>;
    /**
     * Asserts an object has required properties of valid types
     * @param {object} object
     * @param {string} objectName
     * @param {string[][]} requiredProperties
     */
    assert(object: object, objectName: string, requiredProperties: string[][]): void;
    /**
     * Sends messages to server via websocket
     * @param {string} message
     */
    send(message: string): Promise<void>;
    /**
     * Sends an authentication request to the server
     * @param {Object} authData
     * @param {string} authData.username
     * @param {string=} authData.token
     * @param {number=} authData.expire
     * @param {string=} authData.key
     * @param {Object} appData
     * @param {string} appData.name - Application name
     * @param {string} appData.description - Application description
     * @param {string} appData.icon - URL of application icon
     * @param {Object} challengeData
     * @param {string} challengeData.key_type
     * @param {string} challengeData.challenge
     */
    authenticate(
      authData: {
        username: string;
        token?: string | undefined;
        expire?: number | undefined;
        key?: string | undefined;
      },
      appData: {
        name: string;
        description: string;
        icon: string;
      },
      challengeData: {
        key_type: string;
        challenge: string;
      }
    ): void;
    /**
     * Sends a broadcast request to the server
     * @param {Object} authData
     * @param {string} authData.username
     * @param {string=} authData.token
     * @param {number=} authData.expire
     * @param {string=} authData.key
     * @param {string} keyType
     * @param {Array} ops
     */
    broadcast(
      authData: {
        username: string;
        token?: string | undefined;
        expire?: number | undefined;
        key?: string | undefined;
      },
      keyType: string,
      ops: any[]
    ): void;
    /**
     * Sends a challenge request to the server
     * @param {Object} authData
     * @param {string} authData.username
     * @param {string=} authData.token
     * @param {number=} authData.expire
     * @param {string=} authData.key
     * @param {Object} challengeData
     * @param {string} challengeData.key_type
     * @param {string} challengeData.challenge
     */
    challenge(
      authData: {
        username: string;
        token?: string | undefined;
        expire?: number | undefined;
        key?: string | undefined;
      },
      challengeData: {
        key_type: string;
        challenge: string;
      }
    ): void;
  }
}
