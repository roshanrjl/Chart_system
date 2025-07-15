import mongoose,{Schema} from "mongoose";

const chatSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    isGroupChat:{
        type:Boolean,
        required:true
    },
    participaints:[
        {
            type:Schema.Types.ObjectId,
            ref:"User"

        }
    ],
    admin:{
        type:Schema.Types.ObjectId,
        ref:"User"

    }
    ,
    lastMessage:{
        type:Schema.Types.ObjectId,
        ref:"ChatMessage"
    }
},{timestamps:true})

export const  Chat = new mongoose.model("Chat", chatSchema) 


