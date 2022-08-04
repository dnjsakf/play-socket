const { Server } = require("socket.io");

const axios = require("axios");
const cheerio = require("cheerio");

const createSocketServer = (server, opt)=>{
  const io = new Server(server, Object.assign({
    transports: ['websocket', 'polling'],
    pingTimeout: 30*1000, // 20s
    pingInterval: 5*1000, // 25s
    maxHttpBufferSize: 1e7, // (1 MB)
    cors: {
        origin: "http://localhost",
        methods: ["GET", "POST"],
        credentials: true
    },
  }, opt));
  io.setMaxListeners(0);
  io.on("connection", (socket)=>{
    console.log("Socket Connection", socket.id, socket.handshake);
    
    socket.on("join room", (data, emit)=>{
      console.log("접속", data);
      try {
        socket.leave(data.room);
      } catch ( e ){
        console.log( e );
      }
      socket.join(data.room);
      io.to(data.room).emit("joined", data);
    });

    socket.on("send message", (data, emit)=>{
      console.log("send message", data);

      if( data.message.startsWith("/") ){
        const command = data.message.slice(data.message.indexOf("/")+1);
        console.log(command);

        if( command == "help" ){
          //
        } else if ( command == "crawler" ){
          crawler();
        }

        // io.emit(command);
      } else {
        io.to(data.room).emit("recv message", data);
        //io.emit("recv message", data);
      }
    });

    socket.on('disconnect', ()=>{
      console.log("Socket Disconnected", socket.id, socket.disconnected);
    });

    socket.on("crawler", async (type)=>{
      await crawler(type);
    });

    async function crawler(type){
      console.log(type);
      const response = await axios.get("https://comic.naver.com/webtoon/detail?titleId=183559&no=550&weekday=mon");
      const $ = cheerio.load(response.data);        
      $('#comic_view_area > div.wt_viewer img').map((idx, img) => {
        setTimeout(()=>{
          io.emit("crawler images", img.attribs.src);
        }, 1000);
      });
    }
  });

  return io;
}

if( require.main === module ){
  const app = require("express")();
  const server = require('http').createServer(app);
  const io = createSocketServer(server);

  app.use(require("cors")());
  app.listen(3001, ()=>{
    console.log("socket", 3001);
  });
}

module.exports = createSocketServer;