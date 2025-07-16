import Redis from "ioredis";

const subscriber = new Redis(); 

const startRedisSubscriber = (io)=>{
 
    subscriber.psubscribe("chat_*",(err, count)=>{
    if (err) {
      console.error("Redis subscription failed:", err);
    } else {
      console.log(`Subscribed to ${count} Redis channels.`);
    }
          
    })

    subscriber.on("pmessage",(patten , channel, message)=>{
        const chatId = channel.split("_")[1]
        const parseMessage = JSON.parse(message)

        io.to(chatId).emit("newmessage",parseMessage)
    });
};

export default startRedisSubscriber;