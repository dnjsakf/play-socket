function ChatSocket(settings){
  let socket = null; // Socket.io Object
  const config = Object.assign({
    url: "http://localhost:3000",
    namespace: null,
    options: {}
  }, settings);
  
  config.options = Object.assign({
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttemps: 3,
    agent: false,
    upgrade: false,
    rejectUnauthorized: false,
    //transports: ['websocket','pooling'],
  }, config.options);

  if( config.url && config.url.endsWith("/") ){
    config.url = config.url.slice(0, config.url.length-1);
  }

  this.getSocket = ()=>(socket);
  this.setSocket = (v)=>(socket=v);
  this.getConfig = (k)=>(config[k]);
  this.setConfig = (k,v)=>(config[k] = v);
  this.getURL = ()=>([config.url].concat(config.namespace||[]).join("/"));
  this.getOptions = (v)=>(Object.assign(config.options, v||{}));
}
ChatSocket.prototype = (()=>{
  // Client-side events for socket.io object
  const initSocketIoEvents = (socket) => {
    // Fired upon a connection error
    socket.io.on("error", (error)=>{
      console.log("socket.io.error", error);
    });
    // Fired upon a connection error.
    socket.io.on("connect_error", (error) => {
      console.log("socket.io.connect_error", error);
    });

    // Fired upon a connection timeout.
    socket.io.on("connect_timeout", ()=>{
      console.log("socket.io.connect_timeout");
    });

    // Fired upon a successful reconnection.
    socket.io.on("reconnect", (attempt)=>{
      console.log("socket.io.reconnect", attempt);
    });

    // Fired upon an attempt to reconnect.
    socket.io.on("reconnecting", ()=>{
      console.log("socket.io.reconnecting");
    });

    // Fired upon a reconnection attempt error.
    socket.io.on("reconnect_error", (error)=>{
      console.log("socket.io.reconnect_error", error);
    });

    // Fired when couldn’t reconnect within reconnectionAttempts
    socket.io.on("reconnect_failed", ()=>{
      console.log("socket.io.reconnect_failed");
    });
  }

  // Client-side events for socket.io.engine object
  const initSocketIoEngineEvents = (socket) => {
    const engine = socket.io.engine;
    console.log("socket.io.engine.name", engine.transport.name); // in most cases, prints "polling"

    engine.once("upgrade", () => {
      // called when the transport is upgraded (i.e. from HTTP long-polling to WebSocket)
      console.log("socket.io.engine.upgrade", engine.transport.name); // in most cases, prints "websocket"
    });

    engine.on("packet", ({ type, data }) => {
      // called for each packet received
      console.log("socket.io.engine.packet", type, data);
    });

    engine.on("packetCreate", ({ type, data }) => {
      // called for each packet sent
      console.log("socket.io.engine.packetCreate", type, data);
    });

    engine.on("drain", () => {
      // called when the write buffer is drained
      console.log("socket.io.engine.drain");
    });

    engine.on("close", (reason) => {
      // called when the underlying connection is closed
      console.log("socket.io.engine.close", reason);
    });

    engine.on("drainError", () => {
      // called when the write buffer is drained
      console.log("socket.io.engine.drainError");
    });

    engine.on("packetError", (error) => {
      console.log("socket.io.engine.packetError", error);
    });
  }
  
  // Client-side events for socket object
  const initSocketEvents = (socket) => {
    // Fired upon connecting.
    socket.on("connect", ()=>{
      initSocketIoEngineEvents(socket);
      console.log("socket.connect", socket.id);
    });
    // Fired upon a disconnection.
    socket.on("disconnect", (reason)=>{
      console.log("socket.disconnect", reason);
    });
    // Fired upon a connection error
    socket.on("error", (error)=>{
      console.log("socket.error", error);
    });
    // Fired upon a successful reconnection.
    socket.on("reconnect", (attempt)=>{ console.log("socket.reconnect", attempt); });
    // Fired upon an attempt to reconnect.
    socket.on("reconnect_attempt", ()=>{ console.log("socket.reconnect_attempt"); });
    // Fired upon an attempt to reconnect.
    socket.on("reconnecting", (attempt)=>{ console.log("socket.reconnecting", attempt); });
    // Fired upon an attempt to reconnect.
    socket.on("reconnect_error", (error)=>{ console.log("socket.reconnect_error", error); });
    // Fired upon an attempt to reconnect.
    socket.on("reconnect_failed", ()=>{ console.log("socket.reconnect_failed"); });
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
  const _connect = (self, _opts) => {
    const socket = self.getSocket();
    if( socket.disconnected ){
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
  const _reconnect = (self, _opts) => {
    const socket = self.getSocket();
    if( socket ){
      if( socket.connected ){
        socket.disconnect(); // 연결 중단
      }
      socket.connect();
    } else {
      self.connect(_opts);
    }
  }

  /**
   * 연결중단
   */
  const _disconnect = (self) => {
    const socket = self.getSocket();
    if( socket ){
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
    connect(opts){
      _connect(this, opts);
    },
    reconnect(opts){
      _reconnect(this, opts);
    },
    send(){

    }
  }
})();