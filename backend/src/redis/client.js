import Redis from "ioredis"

const client = new Redis()

client.on("error",(error)=>{
    console.error("redis client error:",error)
})

client.on("connect",()=>{
    console.log("redis connecting ....")
})
client.on("ready",()=>{
    console.log("redis is connected")
})
export default client;