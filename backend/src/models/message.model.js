import mongoose, { Schema } from "mongoose";


const messageSchema = new Schema({
    sender:{
        type: Schema.Types.ObjectId,
      ref: "User",
    },
    content:{
        type:String,
        required:true
    },
    attachments:{
        type:[
           {
             url:String,
            localpath:String
           }
        ],
        default:[],
    },
    chat:{
        type:Schema.Types.ObjectId,
        ref:"Chat"
    }
},{timestamps:true})

export const ChatMessage = mongoose.model("ChatMessage",messageSchema)