function SocketManager(settings){
  const config = Object.assign({
    url: "http://localhost:3000",
    namespace: null,
    options: {}
  }, settings);

  config.options = Object.assign({
    autoConnect: false,
    withCredentials: true, // https://socket.io/docs/v4/client-options/#withcredentials
    agent: false,
    upgrade: false,
    rejectUnauthorized: false,
    transports: ['websocket','pooling'],
    query: {},
    auth(cb){
      cb({ token: localStorage.token })
    }
  }, config.options);

  // Reconnection Options
  config.options = Object.assign({
    reconnection: false,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttemps: 3,
  }, config.options);

  // Query Options
  // https://socket.io/docs/v4/client-options/#query
  config.options.query = Object.assign({
    x: 42
  }, config.options.query);

  // Auth Options
  config.options.auth = Object.assign({
    token: "abcd"
  }, config.options.auth);

  if( config.url && config.url.endsWith("/") ){
    config.url = config.url.slice(0, config.url.length-1);
  }

  let socket = null; // Socket.io Instance

  this.getSocket = ()=>(socket);
  this.setSocket = (v)=>(socket=v);
  this.getConfig = (k)=>(config[k]);
  this.setConfig = (k,v)=>(config[k] = v);
  this.getURL = ()=>([config.url].concat(config.namespace||[]).join("/"));
  this.getOptions = (v)=>(Object.assign(config.options, v||{}));
}
SocketManager.prototype = (()=>{

  const initSocketIoEvents = (socket) => {
    /**
     * Client-side events for socket.io object
     * socket.io == <Manager>
     * Ref. https://socket.io/docs/v4/client-api/#event-error
     */
    socket.io.on("error", (error)=>{
      // Fired upon a connection error.
      console.log("socket.io.error", error);
    });
    socket.io.on("reconnect", (attempt)=>{
      // Fired upon a successful reconnection.
      console.log("socket.io.reconnect", attempt);
    });
    socket.io.on("reconnect_attempt", (attempt)=>{
      // Fired upon an attempt to reconnect.
      socket.io.opts.query.x++;
      console.log("socket.io.reconnect_attempt", attempt, socket.io.opts.query.x);
    });
    socket.io.on("reconnect_error", (error)=>{
      // Fired upon a reconnection attempt error.
      console.log("socket.io.reconnect_error", error);
    });
    socket.io.on("reconnect_failed", ()=>{
      // Fired when couldn’t reconnect within reconnectionAttempts
      console.log("socket.io.reconnect_failed");
    });
    socket.io.on("ping", () => {
      // Fired when a ping packet is received from the server.
      console.log("socket.io.ping", "pong");
    });
    socket.io.on("connect_error", (error) => {
      // Fired upon a connection error.
      console.log("socket.io.connect_error", error);
    });
    socket.io.on("connect_timeout", ()=>{
      // Fired upon a connection timeout.
      console.log("socket.io.connect_timeout");
    });
    socket.io.on("close", (reason) => {
      console.log("socket.io.close", reason);
    });
  }

  const initSocketIoEngineEvents = (socket) => {
    /**
     * Client-side events for socket.io.engine object
     */
    console.log("socket.io.engine.name", socket.io.engine.transport.name); // in most cases, prints "polling"

    socket.io.engine.once("upgrade", () => {
      // called when the transport is upgraded (i.e. from HTTP long-polling to WebSocket)
      console.log("socket.io.engine.upgrade", socket.io.engine.transport.name); // in most cases, prints "websocket"
    });
    socket.io.engine.on("packet", ({ type, data }) => {
      // called for each packet received
      console.log("socket.io.engine.packet", type, data);
    });
    socket.io.engine.on("packetCreate", ({ type, data }) => {
      // called for each packet sent
      console.log("socket.io.engine.packetCreate", type, data);
    });
    socket.io.engine.on("drain", () => {
      // called when the write buffer is drained
      console.log("socket.io.engine.drain");
    });
    socket.io.engine.on("close", (reason) => {
      // called when the underlying connection is closed
      console.log("socket.io.engine.close", reason);
    });
  }
  
  const initSocketEvents = (socket) => {
    /**
     * Client-side events for socket object
     */
    socket.on("connect", ()=>{
      /**
       * Fired upon connection to the Namespace (including a successful reconnection).
       * Please note that you shouldn't register event handlers in the connect handler itself,
       * as a new handler will be registered every time the Socket reconnects:    
       */ 
      initSocketIoEngineEvents(socket);
      console.log("socket.connect", socket.id);
    });
    socket.on("disconnect", (reason, details)=>{
      /**
       * Fired upon disconnection. The list of possible disconnection reasons:
       * 1) io server disconnect
       *    : The server has forcefully disconnected the socket with socket.disconnect()
       * 2) io client disconnect
       *    : The socket was manually disconnected using socket.disconnect()
       * 3) ping timeout
       *    : The server did not send a PING within the pingInterval + pingTimeout range
       * 4) transport close
       *    : The connection was closed (example: the user has lost connection, or the network was changed from WiFi to 4G)
       * 5) transport error
       *    : The connection has encountered an error (example: the server was killed during a HTTP long-polling cycle)
       */
      console.log("socket.disconnect", reason, details);
      if( reason === "io server disconnect" ){
        setTimeout(()=>{
          console.log("socket.disconnect.reconnect");
          socket.connect();
        }, 1*1000);
      }
    });
    socket.on("connect_error", (error)=>{
      // Fired when a namespace middleware error occurs.
      console.log("socket.connect_error", error);
    });
  }

  const _init = (self, _opts) => {
    const url = self.getURL();
    const opts = self.getOptions(_opts);
    const socket = io(url, opts);

    initSocketIoEvents(socket);
    initSocketEvents(socket);

    self.setSocket(socket);
  }

  /**
   * 연결
   */
  const _connect = (self) => {
    const socket = self.getSocket();
    if( socket && socket.disconnected ){
      socket.connect();
    }
  }
  
  /**
   * Socket이 생성된 경우, 재연결
   */
  const _ensureConnect = (self, _opts) => {
    let socket = self.getSocket();
    if( !socket ){
      socket = self.reconnect(_opts);
    } else {
      socket = self.connect(_opts);
    }
    return socket;
  }
  
  /**
   * 재연결
   */
  const _reconnect = (self) => {
    const socket = self.getSocket();
    if( socket ){
      if( socket.connected ){
        socket.disconnect(); // 연결 중단
      }
      socket.connect();
    }
  }

  /**
   * 연결중단
   */
  const _disconnect = (self) => {
    const socket = self.getSocket();
    if( socket && socket.connected ){
      socket.disconnect();
    }
  }

  /**
   * 
   */
  const _send = (self, eventName, args, cb) => {
    const socket = self.getSocket();

    socket.emit(eventName, args, cb);
  }

  return {
    init(_opts){
      return _init(this, _opts);
    },
    connect(){
      _connect(this);
    },
    disconnect(){
      _disconnect(this);
    },
    reconnect(){
      _reconnect(this);
    },
    send(){

    }
  }
})();